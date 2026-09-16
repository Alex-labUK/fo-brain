import { readFileSync } from "fs";
import path from "path";
import {
  MAX_CASE_MEMORY_BULLETS,
  RESOLVED_DETERMINING_FACT,
  SECTION_TITLES,
  normalizeAnalysisResult,
  normalizeCaseMemory,
} from "@/core/orchestration/analysis-core";
import { analysisCycleKey, appendDecisionCycle, buildDecisionCycleRecord } from "@/lib/decision-cycle";
import {
  activeCycleNumber,
  appendClosureFactToCaseMemory,
  archiveActiveDecisionRecord,
  buildClosurePreview,
  buildDecisionRecord,
  CLOSURE_MEMORY_PREFIX,
  determiningFactForRecord,
  decisionRecordCycleLabel,
  decisionRecordHeading,
  lifecycleCloseWrite,
  nextResolutionContext,
  parseDecisionRecord,
  shouldFinalizeDecisionRecord,
  shouldShowActiveDecisionRecord,
} from "@/lib/decision-record";
import { formatNextStepResultMessage } from "@/lib/next-step-result-flow";

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

const unresolved = normalizeAnalysisResult({
  decisionStatus: "unresolved",
  sections: rawSections({
    outcome: "Завершить сделку после подтверждения юридической допустимости.",
    fork: "Завершать сделку сейчас — или ждать исправления пристройки.",
    fact: "Юридический риск полностью снимается после исправления.",
    sources: [{ role: "Legal", result: "Подтвердить снятие риска." }],
    actions: ["Запросить заключение юриста."],
  }),
});

const resolved = normalizeAnalysisResult({
  decisionStatus: "resolved",
  sections: rawSections({
    outcome: "Завершить сделку после подтверждения юридической допустимости.",
    fork: "Решение определено: завершить сделку после подтверждения юридической допустимости.",
    fact: RESOLVED_DETERMINING_FACT,
    actions: ["Завершить сделку после подтверждения юридической допустимости."],
  }),
});

const laterUnresolved = normalizeAnalysisResult({
  decisionStatus: "unresolved",
  sections: rawSections({
    outcome: "Защитить сделку от отзыва согласования.",
    fork: "Оспаривать отзыв — или заново проходить рассмотрение.",
    fact: "Муниципалитет отозвал согласование пристройки.",
    sources: [{ role: "Legal", result: "Правовые последствия отзыва согласования." }],
    actions: ["Запросить оценку отзыва."],
  }),
});

const resolvedAt = new Date("2026-09-01T10:00:00.000Z");
const closedAt = new Date("2026-09-16T12:00:00.000Z");
const resolutionContext = nextResolutionContext({
  previousStatus: "unresolved",
  nextStatus: "resolved",
  previousDeterminingFact: unresolved.sections[2].content,
  resolvingEvidence: "Юрист подтвердил: риск снят после исправления.",
  nextAnalysisKey: analysisCycleKey(resolved),
  now: resolvedAt,
});
const resultResolutionContext = nextResolutionContext({
  previousStatus: "unresolved",
  nextStatus: "resolved",
  previousDeterminingFact: unresolved.sections[2].content,
  resolvingEvidence: formatNextStepResultMessage("Юрист подтвердил письменно, что риск снимается."),
  nextAnalysisKey: analysisCycleKey(resolved),
  now: resolvedAt,
});

const emptyExecution = {
  executionStep: null,
  executionOwner: null,
  executionStatus: null,
};

const completedExecution = {
  executionStep: "Подписать договор по согласованной цене.",
  executionOwner: "Юрист",
  executionStatus: "completed" as const,
};

const pendingExecution = {
  executionStep: "Подписать договор по согласованной цене.",
  executionOwner: "Юрист",
  executionStatus: "pending" as const,
};

// A. resolved case closure
const resolvedClose = lifecycleCloseWrite({
  closedAt,
  history: [],
  analysis: resolved,
  outcomeStatement: "Завершить сделку после подтверждения юридической допустимости.",
  resolutionContext,
  execution: emptyExecution,
  caseMemory: "",
});
assert(resolvedClose.decisionRecord.decisionStatusAtClose === "resolved", "A: status at close is resolved");
assert(resolvedClose.decisionRecord.closedAt === closedAt.toISOString(), "A: closedAt stored");
assert(resolvedClose.decisionRecord.decision.includes("завершить сделку"), "A: decision captured");
assert(resolvedClose.decisionRecord.outcome.includes("юридической допустимости"), "A: outcome captured");
assert(resolvedClose.decisionRecord.cycleNumber === 1, "A: first cycle");
assert(resolvedClose.decisionRecord.version === 1, "A: version 1");
assert(resolvedClose.decisionRecord.analysisKey === analysisCycleKey(resolved), "A: analysis key stored");

// B. unresolved → resolved preserves the prior determining fact
assert(resolutionContext !== null, "B: resolution context is captured");
assert(
  resolutionContext?.determiningFact === "Юридический риск полностью снимается после исправления.",
  "B: prior determining fact is preserved",
);
assert(resolutionContext?.resolvingEvidence === undefined, "C: arbitrary circumstance is not stored as resolving evidence");
assert(
  resultResolutionContext?.determiningFact === resolutionContext?.determiningFact,
  "D: Next Step Result still preserves the determining fact",
);
assert(
  resultResolutionContext?.resolvingEvidence === "Юрист подтвердил письменно, что риск снимается.",
  "D: explicit Next Step Result may be stored as resolving evidence",
);
assert(
  determiningFactForRecord({ analysis: resolved, resolutionContext }) ===
    "Юридический риск полностью снимается после исправления.",
  "B: resolved analysis can recover the real fact",
);
assert(
  determiningFactForRecord({ analysis: resolved, resolutionContext: null }) === undefined,
  "B: without context, terminal fact is not guessed",
);
assert(
  nextResolutionContext({
    previousStatus: "unresolved",
    nextStatus: "resolved",
    previousDeterminingFact: RESOLVED_DETERMINING_FACT,
    nextAnalysisKey: "key",
  }) === null,
  "B: terminal placeholder is not stored as the determining fact",
);
assert(
  nextResolutionContext({
    previousStatus: "resolved",
    nextStatus: "resolved",
    previousDeterminingFact: RESOLVED_DETERMINING_FACT,
    nextAnalysisKey: "later",
    previousContext: resolutionContext,
  })?.determiningFact === resolutionContext?.determiningFact,
  "B: later resolved updates keep the captured fact",
);

// C. factual outcome stored as entered
const withOutcome = lifecycleCloseWrite({
  closedAt,
  history: [],
  analysis: resolved,
  resolutionContext,
  execution: emptyExecution,
  caseMemory: "- Юрист подтвердил снятие риска.",
  factualOutcome: "  Сделка завершена по согласованной цене.  ",
});
assert(withOutcome.decisionRecord.factualOutcome === "Сделка завершена по согласованной цене.", "C: human text stored");
assert(
  withOutcome.caseMemory.includes(`${CLOSURE_MEMORY_PREFIX} Сделка завершена по согласованной цене.`),
  "C: closure fact is appended to caseMemory",
);

// D. unresolved case closure
const unresolvedClose = buildDecisionRecord({
  closedAt,
  cycleNumber: 1,
  analysis: unresolved,
  resolutionContext: null,
  execution: emptyExecution,
  factualOutcome: "Принципал решил не продолжать.",
});
assert(unresolvedClose.decisionStatusAtClose === "unresolved", "D: remains unresolved");
assert(unresolvedClose.decision.includes("Завершать сделку сейчас"), "D: current fork retained");
assert(
  unresolvedClose.determiningFact === "Юридический риск полностью снимается после исправления.",
  "D: current determining fact retained",
);
assert(unresolvedClose.resolvingEvidence === undefined, "D: no fake resolving evidence");
assert(unresolvedClose.decisionStatusAtClose === "unresolved", "E: factualOutcome cannot mutate decisionStatus");
assert(decisionRecordHeading(unresolvedClose) === "Итог кейса", "A: unresolved closure uses case-ending semantics");
assert(decisionRecordHeading(resolvedClose.decisionRecord) === "Итог решения", "C: resolved closure uses decision-ending semantics");
assert(decisionRecordCycleLabel(2) === "Цикл 2", "F: cycle label does not imply history count");
assert(
  shouldShowActiveDecisionRecord({
    lifecycleState: "closed",
    decisionRecord: unresolvedClose,
    analysis: unresolved,
  }),
  "D: unresolved closure still shows its own Decision Record",
);

// E. completed execution → close
const completedClose = buildDecisionRecord({
  closedAt,
  cycleNumber: 1,
  analysis: resolved,
  resolutionContext,
  execution: completedExecution,
});
assert(completedClose.executionStep === completedExecution.executionStep, "E: completed step captured");
assert(completedClose.executionStatus === "completed", "E: completed status captured");
assert(completedClose.executionOwner === "Юрист", "E: owner captured");

// F. pending execution → close
const pendingClose = buildDecisionRecord({
  closedAt,
  cycleNumber: 1,
  analysis: resolved,
  resolutionContext,
  execution: pendingExecution,
});
assert(pendingClose.executionStatus === "pending", "F: pending remains pending");
assert(pendingClose.executionStep === pendingExecution.executionStep, "F: pending step recorded as stored");

// G. closed resolved cycle → new unresolved evidence archives the record
const firstRecord = buildDecisionRecord({
  closedAt,
  cycleNumber: 1,
  analysis: resolved,
  resolutionContext,
  execution: completedExecution,
  factualOutcome: "Сделка завершена по согласованной цене.",
});
const archived = appendDecisionCycle(
  [],
  buildDecisionCycleRecord({
    analysis: resolved,
    execution: completedExecution,
    closedAt,
    decisionRecord: firstRecord,
  }),
);
const afterNewUncertainty = archiveActiveDecisionRecord({
  history: archived,
  decisionRecord: firstRecord,
  analysis: laterUnresolved,
  execution: completedExecution,
  closedAt,
});
assert(afterNewUncertainty.clearActive, "G: active record is detached after new uncertainty");
assert(
  parseDecisionRecord(archived[0].decisionRecord)?.determiningFact === firstRecord.determiningFact,
  "G: archived record keeps the original determining fact",
);
assert(
  parseDecisionRecord(archived[0].decisionRecord)?.factualOutcome === firstRecord.factualOutcome,
  "G: archived factual outcome is unchanged",
);
assert(
  shouldShowActiveDecisionRecord({
    lifecycleState: "closed",
    decisionRecord: firstRecord,
    analysis: resolved,
  }),
  "A: resolved close displays the Decision Record",
);
assert(
  !shouldShowActiveDecisionRecord({
    lifecycleState: "closed",
    decisionRecord: firstRecord,
    analysis: laterUnresolved,
  }),
  "G: leftover previous record is not shown as the new cycle",
);

// H. apply reopen: old record stays in history, new cycle has no current record
assert(
  !shouldShowActiveDecisionRecord({
    lifecycleState: "waiting_for_fact",
    decisionRecord: null,
    analysis: laterUnresolved,
  }),
  "H: reopened cycle does not show the previous Decision Record as its own",
);
assert(
  parseDecisionRecord(archived[0].decisionRecord)?.cycleNumber === 1,
  "H: previous record remains in history",
);

// I. close second cycle
const secondRecord = buildDecisionRecord({
  closedAt: new Date("2026-10-01T12:00:00.000Z"),
  cycleNumber: activeCycleNumber(archived),
  analysis: laterUnresolved,
  execution: emptyExecution,
  factualOutcome: "Поданы возражения.",
});
assert(secondRecord.cycleNumber === 2, "I: second close belongs to cycle 2");
assert(parseDecisionRecord(archived[0].decisionRecord)?.cycleNumber === 1, "I: first record unchanged");
assert(secondRecord.decision !== firstRecord.decision, "I: second record captures the new decision");

assert(
  !shouldFinalizeDecisionRecord({
    currentLifecycle: "closed",
    nextLifecycle: "closed",
    existingRecord: firstRecord,
  }),
  "E: repeated close of the same cycle does not rebuild the record",
);
assert(
  !shouldFinalizeDecisionRecord({
    currentLifecycle: "waiting_for_fact",
    nextLifecycle: "closed",
    existingRecord: firstRecord,
  }),
  "E: leftover same-cycle record is not overwritten",
);
assert(
  shouldFinalizeDecisionRecord({
    currentLifecycle: "waiting_for_fact",
    nextLifecycle: "closed",
    existingRecord: null,
  }),
  "F: later cycle with no active record can create a new Decision Record",
);
assert(activeCycleNumber(archived) === 2, "F: later cycle number is distinct");

// J. factual outcome remains in caseMemory after later reopen
const fifteen = Array.from({ length: MAX_CASE_MEMORY_BULLETS }, (_, index) => `- old ${index + 1}`).join("\n");
const memoryAfterClose = appendClosureFactToCaseMemory(fifteen, "Сделка завершена по согласованной цене.");
assert(memoryAfterClose.startsWith(`- ${CLOSURE_MEMORY_PREFIX} Сделка завершена`), "J: closure fact is kept at the front");
assert(memoryAfterClose.split("\n").length === MAX_CASE_MEMORY_BULLETS, "J: 15-line cap is unchanged");
assert(!memoryAfterClose.includes("old 15"), "J: oldest trailing line yields to the closure fact");
assert(
  appendClosureFactToCaseMemory(memoryAfterClose, "Сделка завершена по согласованной цене.") === memoryAfterClose,
  "J: duplicate closure fact is not added",
);
assert(normalizeCaseMemory(memoryAfterClose).includes(CLOSURE_MEMORY_PREFIX), "J: later reopen still sees the closure fact");

// Preview / compatibility
const preview = buildClosurePreview({
  analysis: resolved,
  resolutionContext,
  execution: pendingExecution,
});
assert(preview.decisionStatus === "resolved", "preview: resolved");
assert(preview.determiningFact === resolutionContext?.determiningFact, "preview: uses preserved fact");
assert(parseDecisionRecord(null) === null, "compat: missing record parses as null");
assert(
  !shouldShowActiveDecisionRecord({
    lifecycleState: "closed",
    decisionRecord: null,
    analysis: resolved,
  }),
  "compat: old closed cases without a record do not invent one",
);

const root = process.cwd();
const actions = readFileSync(path.join(root, "src/app/cases/[id]/actions.ts"), "utf8");
const dialogue = readFileSync(path.join(root, "src/app/cases/[id]/dialogue-actions.ts"), "utf8");
const executionPanel = readFileSync(path.join(root, "src/app/cases/[id]/CaseExecutionPanel.tsx"), "utf8");
const lifecyclePanel = readFileSync(path.join(root, "src/app/cases/[id]/CaseLifecyclePanel.tsx"), "utf8");
const suggestionCard = readFileSync(
  path.join(root, "src/app/cases/[id]/CaseLifecycleSuggestionCard.tsx"),
  "utf8",
);
const detailControls = readFileSync(path.join(root, "src/app/cases/[id]/CaseDetailControls.tsx"), "utf8");
const page = readFileSync(path.join(root, "src/app/cases/[id]/page.tsx"), "utf8");
const recordLib = readFileSync(path.join(root, "src/lib/decision-record.ts"), "utf8");
const schema = readFileSync(path.join(root, "prisma/schema.prisma"), "utf8");

assert(actions.includes("lifecycleCloseWrite"), "K: close writes the Decision Record in updateCaseLifecycle");
assert(actions.includes("factualOutcome: input.factualOutcome"), "K: optional factual outcome uses the same path");
assert(actions.includes("export async function closeCase("), "K: named closeCase still uses updateCaseLifecycle");
assert(actions.includes("await closeCase(id)"), "K: closeCaseAfterExecution is not a second writer");
assert(!actions.includes("continueAnalysis"), "A: close path makes no AI call");
assert(!actions.includes("generateLifecycleSuggestion"), "A: close path makes no lifecycle AI call");
assert(!recordLib.includes("openai"), "A: Decision Record builder has no AI client");
assert(dialogue.includes("nextResolutionContext"), "B: unresolved→resolved capture happens on analysis write");
assert(dialogue.includes("caseUpdate.decisionRecord = Prisma.DbNull"), "G: analysis archive clears the active record");
assert(executionPanel.includes("CaseClosureDialog"), "K: execution close uses the closure dialog");
assert(!executionPanel.includes("closeCaseAfterExecution"), "K: execution panel cannot skip the record dialog");
assert(lifecyclePanel.includes('selectedState === "closed" && lifecycleState !== "closed"'), "K: lifecycle panel intercepts closed");
assert(lifecyclePanel.includes("CaseClosureDialog"), "K: lifecycle closed goes through the dialog");
assert(suggestionCard.includes('suggestion.state === "closed"'), "K: apply-closed opens the dialog");
assert(suggestionCard.includes("CaseClosureDialog"), "K: suggestion closed cannot skip the dialog");
assert(!detailControls.includes("Завершить"), "A/B: Действия no longer has a finish/close control");
assert(!detailControls.includes('handleStatusChange("real_closed")'), "A/B: CaseStatus.real_closed is not a user-facing close");
assert(actions.includes("shouldFinalizeDecisionRecord"), "E: close writer refuses to overwrite an existing record");
assert(page.includes("CaseDecisionRecordCard"), "closed UI: Decision Record surface exists");
assert(page.includes("shouldShowActiveDecisionRecord"), "closed UI: old record is hidden on a new unresolved cycle");
assert(page.includes("shouldShowActiveWorkspaceNextStep"), "B: closed workspace hides active Next Step");
const recordCard = readFileSync(path.join(root, "src/app/cases/[id]/CaseDecisionRecordCard.tsx"), "utf8");
assert(recordCard.includes("Итог кейса") || recordCard.includes("decisionRecordHeading"), "A: unresolved record heading is distinct");
assert(recordCard.includes("Решение не было определено"), "A: unresolved record does not imply a resolved decision");
assert(recordCard.includes("Ключевая неопределённость"), "A: unanswered question is not labeled as a resolved determining fact");
assert(recordCard.includes("decisionRecordCycleLabel"), "F: cycle wording is explicit");
assert(schema.includes("resolutionContext"), "schema: resolutionContext exists");
assert(schema.includes("decisionRecord"), "schema: decisionRecord exists");

console.log("Case closure and Decision Record test passed.");
