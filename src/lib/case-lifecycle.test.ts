import type { AnalysisResult } from "@/core/orchestration/analysis-core";
import { RESOLVED_DETERMINING_FACT, SECTION_TITLES } from "@/core/orchestration/analysis-core";
import { analysisCycleKey } from "@/lib/decision-cycle";
import {
  deriveLifecycleSuggestion,
  lifecycleSuggestionCompatibleWithAnalysis,
  nextStoredLifecycleSuggestion,
  storedLifecycleSuggestionAfterClose,
  toStoredLifecycleSuggestion,
  visibleLifecycleSuggestion,
  type StoredLifecycleSuggestion,
} from "@/lib/case-lifecycle";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function rawSections(input: {
  outcome?: string;
  fork?: string;
  fact?: string;
  actions?: string[];
}): AnalysisResult["sections"] {
  return [
    { title: SECTION_TITLES[0], content: input.outcome ?? "Цель" },
    { title: SECTION_TITLES[1], content: input.fork ?? "Развилка" },
    { title: SECTION_TITLES[2], content: input.fact ?? "Факт" },
    { title: SECTION_TITLES[3], roleAssignments: [] },
    { title: SECTION_TITLES[4], actions: input.actions ?? [] },
  ];
}

const staleSuggestion: StoredLifecycleSuggestion = {
  state: "executing",
  blockerNote: "Завершение сделки в согласованный срок",
  reason: "Все условия выполнены, остаётся провести сделку.",
  dismissed: false,
};

assert(
  visibleLifecycleSuggestion(staleSuggestion, {
    lifecycleState: "closed",
    blockerNote: null,
  }) === null,
  "closed case never shows a lifecycle suggestion",
);

assert(
  visibleLifecycleSuggestion(staleSuggestion, {
    lifecycleState: "executing",
    blockerNote: "Другая заметка",
  }) !== null,
  "legacy suggestion without analysisKey remains visible when analysis is omitted",
);

const afterClose = storedLifecycleSuggestionAfterClose(staleSuggestion);
assert(afterClose?.dismissed === true, "closing dismisses the stored suggestion");
assert(
  visibleLifecycleSuggestion(afterClose, {
    lifecycleState: "executing",
    blockerNote: "Другая заметка",
  }) === null,
  "dismissed pre-closure suggestion cannot reappear after reopen",
);

const unresolvedAnalysis: AnalysisResult = {
  decisionStatus: "unresolved",
  sections: rawSections({
    fork: "Можно легализовать или нет",
    fact: "Нужен ответ муниципалитета",
    actions: ["Получить ответ муниципалитета"],
  }),
};

const waitingThirdPartyStored = toStoredLifecycleSuggestion(
  {
    state: "waiting_for_third_party",
    blockerNote: "Ждём итоговое заключение муниципалитета",
    reason: "Кейс блокирует ответ внешней стороны.",
  },
  analysisCycleKey(unresolvedAnalysis),
);

const resolvedAnalysis: AnalysisResult = {
  decisionStatus: "resolved",
  sections: rawSections({
    fork: "Решение определено: легализовать объект",
    fact: RESOLVED_DETERMINING_FACT,
    actions: ["Подписать договор с подрядчиком"],
  }),
};

const resolvedKey = analysisCycleKey(resolvedAnalysis);

// A. unresolved waiting suggestion cannot remain visible after resolved analysis
assert(
  visibleLifecycleSuggestion(waitingThirdPartyStored, {
    lifecycleState: "waiting_for_third_party",
    blockerNote: "Ждём итоговое заключение муниципалитета",
  }, resolvedAnalysis) === null,
  "A: stale waiting_for_third_party suggestion is hidden when analysis is resolved",
);

const resolvedStored = nextStoredLifecycleSuggestion({
  lifecycleState: "waiting_for_third_party",
  nextAnalysis: resolvedAnalysis,
  previousStored: waitingThirdPartyStored,
  aiSuggestion: {
    state: "waiting_for_third_party",
    blockerNote: "Ждём итоговое заключение муниципалитета",
    reason: "Старое AI-ожидание после resolved.",
  },
});
assert(resolvedStored?.analysisKey === resolvedKey, "A: new stored suggestion is tied to resolved analysis");
assert(resolvedStored?.state === "executing", "A: resolved + execution action recommends executing");
assert(
  visibleLifecycleSuggestion(resolvedStored, {
    lifecycleState: "waiting_for_third_party",
    blockerNote: "Ждём итоговое заключение муниципалитета",
  }, resolvedAnalysis)?.state === "executing",
  "A: current recommendation corresponds to resolved state",
);

// B. failed lifecycle generation after successful analysis must not preserve stale suggestion
const afterFailedGeneration = nextStoredLifecycleSuggestion({
  lifecycleState: "under_analysis",
  nextAnalysis: resolvedAnalysis,
  previousStored: waitingThirdPartyStored,
  aiSuggestion: null,
});
assert(afterFailedGeneration?.state === "executing", "B: deterministic fallback applies on AI failure");
assert(
  visibleLifecycleSuggestion(waitingThirdPartyStored, {
    lifecycleState: "under_analysis",
    blockerNote: null,
  }, resolvedAnalysis) === null,
  "B: previous lifecycle suggestion cannot render as current after analysis change",
);

// C. unresolved -> unresolved with changed determining fact invalidates old suggestion
const laterUnresolved: AnalysisResult = {
  decisionStatus: "unresolved",
  sections: rawSections({
    fork: "Продолжать ремонт или ждать",
    fact: "Нужно заключение инженера",
    actions: ["Запросить заключение инженера"],
  }),
};

assert(
  visibleLifecycleSuggestion(waitingThirdPartyStored, {
    lifecycleState: "under_analysis",
    blockerNote: null,
  }, laterUnresolved) === null,
  "C: lifecycle suggestion tied to previous analysis/fact is not rendered as current",
);

const freshUnresolvedStored = nextStoredLifecycleSuggestion({
  lifecycleState: "under_analysis",
  nextAnalysis: laterUnresolved,
  previousStored: waitingThirdPartyStored,
  aiSuggestion: null,
});
assert(
  freshUnresolvedStored?.analysisKey === analysisCycleKey(laterUnresolved),
  "C: new unresolved cycle gets a fresh analysisKey",
);
assert(
  freshUnresolvedStored?.state === "waiting_for_fact",
  "C: new unresolved cycle derives waiting_for_fact from the new determining fact",
);

// D/E/F smoke checks on compatibility + derive helpers
assert(
  !lifecycleSuggestionCompatibleWithAnalysis(
    {
      state: "waiting_for_third_party",
      reason: "Ждём.",
    },
    resolvedAnalysis,
  ),
  "resolved analysis rejects waiting_for_third_party guidance",
);
assert(
  deriveLifecycleSuggestion({ analysis: resolvedAnalysis })?.state === "executing",
  "deriveLifecycleSuggestion maps resolved + action to executing",
);
assert(
  nextStoredLifecycleSuggestion({
    lifecycleState: "closed",
    nextAnalysis: resolvedAnalysis,
    previousStored: waitingThirdPartyStored,
    aiSuggestion: null,
  }) === null,
  "closed lifecycle clears stored lifecycle suggestion on analysis write",
);

console.log("Case lifecycle suggestion visibility test passed.");
