import { readFileSync } from "fs";
import path from "path";
import {
  RESOLVED_DETERMINING_FACT,
  SECTION_TITLES,
  normalizeAnalysisResult,
} from "@/core/orchestration/analysis-core";
import {
  nextStoredReopenSuggestion,
  shouldArchiveResolvedCycle,
  visibleReopenSuggestion,
} from "@/lib/decision-cycle";
import {
  buildDecisionChangeSummary,
  decisionChangeDismissedKey,
  decisionChangeStorageKey,
  deriveDecisionChangeTransitionKey,
  dismissDecisionChangeSummary,
  priorityDisplayLabel,
  storeDecisionChangeSummary,
  type DecisionChangeSummaryPayload,
} from "@/lib/decision-change-summary";

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

const emptyExecution = {
  executionStep: null,
  executionOwner: null,
  executionStatus: null,
};

const unresolvedLegal = normalizeAnalysisResult({
  decisionStatus: "unresolved",
  priority: { urgency: "urgent", stake: "high_irreversible", note: "" },
  sections: rawSections({
    outcome: "Снять юридический риск пристройки.",
    fork: "Покупать только если риск снимается; иначе не идти в сделку.",
    fact: "Снимет ли исправление пристройки юридический риск.",
    sources: [{ role: "Юрист", result: "Письменное заключение." }],
    actions: ["Получить письменное заключение юриста"],
  }),
});

const unresolvedSameLogic = normalizeAnalysisResult({
  decisionStatus: "unresolved",
  priority: { urgency: "urgent", stake: "high_irreversible", note: "" },
  sections: rawSections({
    outcome: "Снять юридический риск пристройки.",
    fork: "Покупать только если риск снимается; иначе не идти в сделку.",
    fact: "Снимет ли исправление пристройки юридический риск.",
    sources: [{ role: "Юрист", result: "Письменное заключение." }],
    actions: ["Получить письменное заключение юриста"],
  }),
});

const unresolvedNewFact = normalizeAnalysisResult({
  decisionStatus: "unresolved",
  sections: rawSections({
    outcome: "Снять юридический риск пристройки.",
    fork: "Покупать только если риск снимается; иначе не идти в сделку.",
    fact: "Подтвердит ли муниципалитет исправление в установленный срок.",
    sources: [{ role: "Юрист", result: "Письменное заключение." }],
    actions: ["Получить ответ муниципалитета"],
  }),
});

const resolvedLegal = normalizeAnalysisResult({
  decisionStatus: "resolved",
  priority: { urgency: "no_deadline", stake: "moderate", note: "" },
  sections: rawSections({
    outcome: "Снять юридический риск пристройки.",
    fork: "Решение определено: исправление полностью снимает юридический риск.",
    fact: RESOLVED_DETERMINING_FACT,
    sources: [{ role: "Юрист", result: "Письменное заключение." }],
    actions: ["Завершить сделку в согласованный срок"],
  }),
});

const resolvedReopened = normalizeAnalysisResult({
  decisionStatus: "unresolved",
  sections: rawSections({
    outcome: "Снять юридический риск пристройки.",
    fork: "Продолжать сделку или остановить её из-за нового ограничения.",
    fact: "Потребует ли муниципалитет дополнительного согласования.",
    sources: [{ role: "Юрист", result: "Письменное заключение." }],
    actions: ["Получить окончательное решение муниципалитета"],
  }),
});

const closedResolvedBefore = normalizeAnalysisResult({
  decisionStatus: "resolved",
  sections: rawSections({
    outcome: "Завершить сделку в согласованный срок.",
    fork: "Решение определено: завершить сделку в согласованный срок.",
    fact: RESOLVED_DETERMINING_FACT,
    actions: ["Завершить сделку в согласованный срок."],
  }),
});

const closedUnresolvedAfter = normalizeAnalysisResult({
  decisionStatus: "unresolved",
  sections: rawSections({
    outcome: "Защитить сделку от отмены согласования пристройки.",
    fork: "Оспаривать отзыв согласования — или заново проходить муниципальное рассмотрение.",
    fact: "Муниципалитет отозвал согласование пристройки как ошибочно выданное.",
    sources: [{ role: "Юрист", result: "Правовые последствия отзыва." }],
    actions: ["Запросить у юриста оценку отзыва согласования."],
  }),
});

const resolvedWithNewStep = normalizeAnalysisResult({
  decisionStatus: "resolved",
  priority: { urgency: "no_deadline", stake: "moderate", note: "" },
  sections: rawSections({
    outcome: "Снять юридический риск пристройки.",
    fork: "Решение определено: исправление полностью снимает юридический риск.",
    fact: RESOLVED_DETERMINING_FACT,
    sources: [{ role: "Юрист", result: "Письменное заключение." }],
    actions: ["Завершить сделку в согласованный срок"],
  }),
});

const formattingVariant = normalizeAnalysisResult({
  decisionStatus: "unresolved",
  priority: { urgency: "urgent", stake: "high_irreversible", note: "" },
  sections: rawSections({
    outcome: "Снять юридический риск пристройки.",
    fork: "Покупать только если риск снимается; иначе не идти в сделку.",
    fact: "Снимет ли исправление пристройки юридический риск.",
    sources: [{ role: "Юрист", result: "Письменное заключение." }],
    actions: ["  Получить   письменное   заключение юриста  "],
  }),
});

function build(
  before: unknown,
  after: ReturnType<typeof normalizeAnalysisResult>,
  options?: {
    beforePriority?: { urgency: string | null; stake: string | null };
    afterPriority?: (typeof after)["priority"];
  },
) {
  return buildDecisionChangeSummary({
    transitionKey: "test-transition",
    beforeAnalysis: before,
    afterAnalysis: after,
    beforePriority: options?.beforePriority ?? { urgency: "urgent", stake: "high_irreversible" },
    afterPriority: options?.afterPriority ?? after.priority,
    execution: emptyExecution,
    lifecycleState: "under_analysis",
  });
}

// A. initial case creation — no before analysis
assert(build(null, unresolvedLegal) === null, "A: no summary without before analysis");

// B. unresolved → unresolved, same logic
const sameLogic = build(unresolvedLegal, unresolvedSameLogic);
assert(Boolean(sameLogic?.noMaterialChange), "B: same logic marked as no material change");
assert(Boolean(sameLogic?.stableNextStep?.includes("заключение")), "B: stable next step preserved");

// C. unresolved → unresolved, fact changes
const factDelta = build(unresolvedLegal, unresolvedNewFact);
assert(Boolean(factDelta?.determiningFactChanged), "C: determining fact delta shown");
assert(Boolean(factDelta?.currentFact?.includes("муниципалитет")), "C: new fact visible");

// D. unresolved → resolved
const toResolved = build(unresolvedLegal, resolvedLegal, {
  afterPriority: { urgency: "no_deadline", stake: "moderate", note: "Риск снят" },
});
assert(toResolved?.statusTransition === "to_resolved", "D: unresolved→resolved transition");
assert(Boolean(toResolved?.currentNextStep?.includes("Завершить")), "D: new next step shown");
assert(Boolean(toResolved?.currentFact?.includes("Подтверждён")), "D: fact resolution note shown");

// E. resolved → unresolved
const toUnresolved = build(resolvedLegal, resolvedReopened, {
  beforePriority: { urgency: "no_deadline", stake: "moderate" },
});
assert(toUnresolved?.statusTransition === "to_unresolved", "E: resolved→unresolved transition");
assert(Boolean(toUnresolved?.currentDecision?.includes("Продолжать")), "E: new fork shown");
assert(Boolean(toUnresolved?.currentFact?.includes("муниципалитет")), "E: new fact shown");

// F. priority change
const priorityChange = build(unresolvedLegal, unresolvedLegal, {
  afterPriority: { urgency: "no_deadline", stake: "low_reversible", note: "Сроки стали мягче" },
});
assert(Boolean(priorityChange?.priorityChanged), "F: priority changed");
assert(priorityChange?.previousPriority === "Срочно", "F: previous label");
assert(priorityChange?.currentPriority === "Обычный", "F: current label");

// G. next-step change
const nextStepChange = build(unresolvedLegal, unresolvedNewFact);
assert(Boolean(nextStepChange?.nextStepChanged), "G: next step changed");
assert(Boolean(nextStepChange?.previousNextStep?.includes("заключение")), "G: old step");
assert(Boolean(nextStepChange?.currentNextStep?.includes("муниципалитета")), "G: new step");

// H. formatting-only differences
const formattingOnly = build(unresolvedLegal, formattingVariant);
assert(Boolean(formattingOnly?.noMaterialChange), "H: formatting-only diff ignored");

// I. dismiss — dismissed transition hidden
class MemoryStorage {
  private data = new Map<string, string>();
  getItem(key: string) {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.data.set(key, value);
  }
}

const memory = new MemoryStorage();
const originalSessionStorage = globalThis.sessionStorage;
const originalWindow = globalThis.window;
Object.defineProperty(globalThis, "sessionStorage", { value: memory, configurable: true });
Object.defineProperty(globalThis, "window", {
  value: { dispatchEvent: () => undefined },
  configurable: true,
});

const payload: DecisionChangeSummaryPayload = {
  transitionKey: "transition-1",
  summary: build(unresolvedLegal, unresolvedNewFact)!,
};
storeDecisionChangeSummary("case-1", payload);
assert(memory.getItem(decisionChangeStorageKey("case-1")) !== null, "I: summary stored");
dismissDecisionChangeSummary("case-1", "transition-1");
assert(
  memory.getItem(decisionChangeDismissedKey("case-1", "transition-1")) === "1",
  "I: dismissal recorded",
);

Object.defineProperty(globalThis, "sessionStorage", { value: originalSessionStorage, configurable: true });
Object.defineProperty(globalThis, "window", { value: originalWindow, configurable: true });

// J. duplicate store — same transitionKey is idempotent (in-memory replay, not a second HTTP call)
const duplicateMemory = new MemoryStorage();
Object.defineProperty(globalThis, "sessionStorage", { value: duplicateMemory, configurable: true });
Object.defineProperty(globalThis, "window", {
  value: { dispatchEvent: () => undefined },
  configurable: true,
});
storeDecisionChangeSummary("case-2", payload);
const first = duplicateMemory.getItem(decisionChangeStorageKey("case-2"));
storeDecisionChangeSummary("case-2", payload);
const second = duplicateMemory.getItem(decisionChangeStorageKey("case-2"));
assert(first === second, "J: same transitionKey store is not rewritten");

// J2. duplicate parallel submits share one derived transitionKey (same before→after)
const derivedKeyA = deriveDecisionChangeTransitionKey(unresolvedLegal, unresolvedNewFact);
const derivedKeyB = deriveDecisionChangeTransitionKey(unresolvedLegal, unresolvedNewFact);
assert(Boolean(derivedKeyA && derivedKeyA === derivedKeyB), "J2: duplicate requests derive same transitionKey");
const parallelMemory = new MemoryStorage();
Object.defineProperty(globalThis, "sessionStorage", { value: parallelMemory, configurable: true });
Object.defineProperty(globalThis, "window", {
  value: { dispatchEvent: () => undefined },
  configurable: true,
});
const parallelPayloadA: DecisionChangeSummaryPayload = {
  transitionKey: derivedKeyA!,
  summary: build(unresolvedLegal, unresolvedNewFact)!,
};
const parallelPayloadB: DecisionChangeSummaryPayload = {
  transitionKey: derivedKeyB!,
  summary: build(unresolvedLegal, unresolvedNewFact)!,
};
storeDecisionChangeSummary("case-3", parallelPayloadA);
storeDecisionChangeSummary("case-3", parallelPayloadB);
assert(
  parallelMemory.getItem(decisionChangeStorageKey("case-3")) ===
    JSON.stringify(parallelPayloadA),
  "J2: second duplicate transition does not replace stored summary",
);

Object.defineProperty(globalThis, "sessionStorage", { value: originalSessionStorage, configurable: true });
Object.defineProperty(globalThis, "window", { value: originalWindow, configurable: true });

// K. no extra AI call — dialogue action still uses single continueAnalysis path
const root = path.join(process.cwd());
const dialogueSource = readFileSync(path.join(root, "src/app/cases/[id]/dialogue-actions.ts"), "utf8");
assert(dialogueSource.includes("continueAnalysis("), "K: continueAnalysis still used");
assert(!dialogueSource.includes("continueAnalysisWithAI"), "K: no direct extra AI call");
assert(dialogueSource.includes("buildDecisionChangeSummary"), "K: summary built deterministically");

// A. closed + resolved → unresolved (runtime path primitives)
assert(
  shouldArchiveResolvedCycle("resolved", "unresolved"),
  "A: resolved→unresolved archives previous cycle",
);
const closedReopen = nextStoredReopenSuggestion({
  lifecycleState: "closed",
  previousDecisionStatus: "resolved",
  nextAnalysis: closedUnresolvedAfter,
  previousStored: null,
});
assert(Boolean(closedReopen && !closedReopen.dismissed), "A: reopen suggestion is created while closed");
assert(
  visibleReopenSuggestion(closedReopen, {
    lifecycleState: "closed",
    analysis: closedUnresolvedAfter,
  }) !== null,
  "A: reopen card is visible while lifecycle remains closed",
);
const closedTransitionSummary = build(closedResolvedBefore, closedUnresolvedAfter, {
  beforePriority: { urgency: "no_deadline", stake: "moderate" },
});
assert(closedTransitionSummary?.statusTransition === "to_unresolved", "A: change summary is to_unresolved");
assert(
  Boolean(closedTransitionSummary?.currentDecision?.includes("Оспаривать")),
  "A: change summary shows new fork",
);

// B. reopen card and change summary are not mutually exclusive in page layout
const pageSource = readFileSync(path.join(root, "src/app/cases/[id]/page.tsx"), "utf8");
assert(pageSource.includes("CaseReopenSuggestionCard"), "B: reopen card is rendered");
assert(pageSource.includes("DecisionChangeSummaryBanner"), "B: change summary banner is rendered");
assert(pageSource.includes("dialogueRevision={messages.at(-1)?.id"), "B: banner re-reads after dialogue refresh");
const reopenRender = pageSource.indexOf("{reopenSuggestion &&");
const summaryRender = pageSource.indexOf("<DecisionChangeSummaryBanner");
assert(reopenRender > 0 && summaryRender > reopenRender, "B: reopen and change summary can coexist near the top");

assert(priorityDisplayLabel("green") === "Обычный", "priority label: green → Обычный");

console.log("decision-change-summary.test.ts: all assertions passed");
