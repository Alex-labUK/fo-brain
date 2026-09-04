import {
  RESOLVED_DETERMINING_FACT,
  SECTION_TITLES,
  normalizeAnalysisResult,
} from "@/core/orchestration/analysis-core";
import { hasStoredExecution, normalizeExecutionWrite } from "@/lib/case-execution";
import { visibleLifecycleSuggestion } from "@/lib/case-lifecycle";
import {
  analysisCycleKey,
  appendDecisionCycle,
  buildDecisionCycleRecord,
  clearedExecutionAfterReopen,
  deriveReopenSuggestion,
  dismissStoredReopenSuggestion,
  nextStoredReopenSuggestion,
  parseDecisionCycleHistory,
  reopenLifecycleUpdate,
  shouldArchiveResolvedCycle,
  visibleReopenSuggestion,
} from "@/lib/decision-cycle";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function rawSections(input: {
  outcome: string;
  fork: string;
  fact: string;
  sources?: { role: string; result: string }[];
  actions?: string[];
}) {
  return [
    { title: SECTION_TITLES[0], content: input.outcome },
    { title: SECTION_TITLES[1], content: input.fork },
    { title: SECTION_TITLES[2], content: input.fact },
    { title: SECTION_TITLES[3], roleAssignments: input.sources ?? [] },
    { title: SECTION_TITLES[4], actions: input.actions ?? [] },
  ];
}

const resolvedAnalysis = normalizeAnalysisResult({
  decisionStatus: "resolved",
  sections: rawSections({
    outcome: "Завершить сделку в согласованный срок.",
    fork: "Решение определено: завершить сделку в согласованный срок.",
    fact: RESOLVED_DETERMINING_FACT,
    actions: ["Завершить сделку в согласованный срок."],
  }),
});

const irrelevantUpdate = normalizeAnalysisResult({
  decisionStatus: "resolved",
  sections: rawSections({
    outcome: "Завершить сделку в согласованный срок.",
    fork: "Решение определено: завершить сделку в согласованный срок.",
    fact: RESOLVED_DETERMINING_FACT,
    actions: ["Завершить сделку в согласованный срок."],
  }),
});

const materialReopen = normalizeAnalysisResult({
  decisionStatus: "unresolved",
  sections: rawSections({
    outcome: "Защитить сделку от отмены согласования пристройки.",
    fork: "Оспаривать отзыв согласования — или заново проходить муниципальное рассмотрение.",
    fact: "Муниципалитет отозвал согласование пристройки как ошибочно выданное.",
    sources: [{ role: "Legal", result: "Правовые последствия отзыва согласования и доступные маршруты." }],
    actions: ["Запросить у юриста оценку отзыва согласования."],
  }),
});

const laterMaterial = normalizeAnalysisResult({
  decisionStatus: "unresolved",
  sections: rawSections({
    outcome: "Защитить сделку от отмены согласования пристройки.",
    fork: "Срочно подавать возражения — или ждать формального предписания муниципалитета.",
    fact: "Есть ли уже письменное предписание муниципалитета об отмене согласования.",
    sources: [{ role: "Legal", result: "Подтверждение, выдано ли письменное предписание." }],
    actions: ["Запросить у юриста копию предписания, если оно есть."],
  }),
});

const completed = normalizeExecutionWrite({
  step: "Завершить сделку в согласованный срок.",
  owner: "Юрист / transaction team",
});
const storedCompleted = {
  executionStep: completed.executionStep,
  executionOwner: completed.executionOwner,
  executionStatus: "completed" as const,
};

const reopenInput = {
  lifecycleState: "closed" as const,
  previousDecisionStatus: "resolved" as const,
  nextAnalysis: materialReopen,
  previousStored: null,
};

assert(!shouldArchiveResolvedCycle("resolved", "resolved"), "A: irrelevant update is not archived");
assert(
  nextStoredReopenSuggestion({
    lifecycleState: "closed",
    previousDecisionStatus: "resolved",
    nextAnalysis: irrelevantUpdate,
    previousStored: null,
  }) === null,
  "A: no reopen recommendation for an irrelevant resolved update",
);
assert(
  visibleReopenSuggestion(null, { lifecycleState: "closed", analysis: irrelevantUpdate }) === null,
  "A: closed + resolved shows no reopen card",
);
assert(irrelevantUpdate.decisionStatus === "resolved", "A: stays resolved");

assert(shouldArchiveResolvedCycle("resolved", "unresolved"), "B: material fact archives the resolved cycle");
const reopenRec = nextStoredReopenSuggestion(reopenInput);
assert(reopenRec !== null && !reopenRec.dismissed, "B: reopen recommendation appears");
assert(reopenRec!.fork.includes("согласован"), "B: includes the new fork");
assert(materialReopen.decisionStatus === "unresolved", "B: analysis becomes unresolved");
assert(
  visibleLifecycleSuggestion(
    { state: "waiting_for_fact", reason: "нужен факт", dismissed: false },
    { lifecycleState: "closed", blockerNote: null },
  ) === null,
  "B: ordinary lifecycle suggestion stays hidden while closed",
);
assert(
  visibleReopenSuggestion(reopenRec, { lifecycleState: "closed", analysis: materialReopen }) !== null,
  "B: reopen card is visible while the case remains closed",
);

const applyUpdate = reopenLifecycleUpdate(reopenRec!);
assert(applyUpdate.lifecycleState === "waiting_for_fact", "C: Apply uses waiting_for_fact from the new analysis");
assert(applyUpdate.blockerType === "fact", "C: Apply goes through a lifecycle update payload");
assert(applyUpdate.lifecycleState !== "closed", "C: Apply leaves closed");

const history = appendDecisionCycle(
  [],
  buildDecisionCycleRecord({
    analysis: resolvedAnalysis,
    execution: storedCompleted,
    executionUpdatedAt: "2026-09-04T11:03:00.000Z",
    closedAt: "2026-09-04T11:04:00.000Z",
  }),
);
assert(history.length === 1, "D: previous cycle stored");
assert(parseDecisionCycleHistory(history)[0]?.executionStatus === "completed", "D: completed execution preserved");
assert(
  JSON.stringify(parseDecisionCycleHistory(history)[0]?.analysis).includes("Решение определено"),
  "D: previous resolved analysis preserved",
);

assert(hasStoredExecution(storedCompleted), "pre-reopen execution is stored");
assert(!hasStoredExecution(clearedExecutionAfterReopen), "E: old step is not the active step after reopen");
assert(clearedExecutionAfterReopen.executionStep === null, "E: active execution cleared");
assert(history[0]?.executionStep === storedCompleted.executionStep, "E: history still holds the old step");

const leftClosed = dismissStoredReopenSuggestion(reopenRec);
assert(leftClosed?.dismissed === true, "F: Leave closed dismisses the recommendation");
assert(
  visibleReopenSuggestion(leftClosed, { lifecycleState: "closed", analysis: materialReopen }) === null,
  "F: lifecycle remains closed and the card is gone",
);

const afterReload = nextStoredReopenSuggestion({
  lifecycleState: "closed",
  previousDecisionStatus: "unresolved",
  nextAnalysis: materialReopen,
  previousStored: leftClosed,
});
assert(afterReload?.dismissed === true, "G: same analysis cycle stays dismissed");
assert(
  afterReload?.analysisKey === analysisCycleKey(materialReopen),
  "G: dismissed key matches the current analysis",
);
assert(
  visibleReopenSuggestion(afterReload, { lifecycleState: "closed", analysis: materialReopen }) === null,
  "G: reload does not resurrect the dismissed recommendation",
);

const fresh = nextStoredReopenSuggestion({
  lifecycleState: "closed",
  previousDecisionStatus: "unresolved",
  nextAnalysis: laterMaterial,
  previousStored: leftClosed,
});
assert(fresh !== null && !fresh.dismissed, "H: later material information creates a fresh recommendation");
assert(fresh?.analysisKey === analysisCycleKey(laterMaterial), "H: new analysisKey");
assert(fresh?.analysisKey !== leftClosed?.analysisKey, "H: not the dismissed cycle");
assert(
  visibleReopenSuggestion(fresh, { lifecycleState: "closed", analysis: laterMaterial }) !== null,
  "H: fresh reopen card is visible",
);

assert(deriveReopenSuggestion(resolvedAnalysis) === null, "resolved analysis cannot derive a reopen suggestion");

console.log("Decision cycle reopen test passed.");
