import { readFileSync } from "fs";
import path from "path";
import {
  RESOLVED_DETERMINING_FACT,
  SECTION_TITLES,
  normalizeAnalysisResult,
  type AnalysisResult,
} from "@/core/orchestration/analysis-core";
import { analysisPromptThinkingAndRules } from "@/core/orchestration/analysis-ai";
import { hasPendingExecution } from "@/lib/case-execution";
import { workspaceExecutionPlacement } from "@/lib/case-workspace";
import { analysisCycleKey } from "@/lib/decision-cycle";
import type { ResolutionContext } from "@/lib/decision-record";
import {
  DECISION_SUPPORT_KICKER,
  currentResolutionContext,
  decisionSupportDetail,
  decisionSupportHeadline,
  deriveDecisionSupportState,
  shouldShowDecisionSupport,
} from "@/lib/decision-support";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

const root = process.cwd();

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

const municipalFact = "Снимет ли письменное заключение юриста юридический риск?";
const lawyerEvidence = "Юрист письменно подтвердил, что после исправления риск полностью снимается.";

const unresolved = normalizeAnalysisResult({
  decisionStatus: "unresolved",
  sections: rawSections({
    outcome: "Снять юридический риск пристройки.",
    fork: "Исправление снимает риск, либо риск остаётся.",
    fact: municipalFact,
    sources: [{ role: "Юрист", result: "Подтвердить, снимает ли исправление риск." }],
    actions: ["Получить письменное заключение юриста"],
  }),
  precedentContextRefs: [{ caseId: "past-1", cycleNumber: 1 }],
  reply: "Принцип Family Office: не принимать юридический риск без письменного подтверждения.",
});

const unresolvedWithoutFact: AnalysisResult = {
  decisionStatus: "unresolved",
  sections: rawSections({
    outcome: "Снять юридический риск пристройки.",
    fork: "Исправление снимает риск, либо риск остаётся.",
    fact: RESOLVED_DETERMINING_FACT,
    sources: [{ role: "Юрист", result: "Подтвердить." }],
    actions: ["Запросить заключение"],
  }),
};

const resolved = normalizeAnalysisResult({
  decisionStatus: "resolved",
  sections: rawSections({
    outcome: "Снять юридический риск пристройки.",
    fork: "Решение определено: исправление снимает риск.",
    fact: RESOLVED_DETERMINING_FACT,
    sources: [{ role: "Юрист", result: "Письменное заключение." }],
    actions: ["Направить уведомление продавцу"],
  }),
  precedentContextRefs: [{ caseId: "past-approved", cycleNumber: 2 }],
  reply: "Муниципалитет ранее одобрял похожую схему. Принцип: снимать риск до сделки.",
});

const reopened = normalizeAnalysisResult({
  decisionStatus: "unresolved",
  sections: rawSections({
    outcome: "Снять юридический риск пристройки.",
    fork: "Муниципалитет одобрит схему, либо сделку нельзя закрывать.",
    fact: "Будет ли муниципалитетом одобрено разрешение?",
    sources: [{ role: "Муниципалитет", result: "Письменное решение по разрешению." }],
    actions: ["Получить письменное заключение муниципалитета"],
  }),
});

function currentContext(
  analysis: AnalysisResult,
  extra?: Partial<ResolutionContext>,
): ResolutionContext {
  const context: ResolutionContext = {
    determiningFact: extra?.determiningFact ?? "Можно ли устранить юридический риск до завершения сделки?",
    resolvedAt: extra?.resolvedAt ?? "2026-09-17T10:00:00.000Z",
    analysisKey: extra?.analysisKey ?? analysisCycleKey(analysis),
  };
  if (extra && Object.prototype.hasOwnProperty.call(extra, "resolvingEvidence")) {
    if (extra.resolvingEvidence) context.resolvingEvidence = extra.resolvingEvidence;
  } else {
    context.resolvingEvidence = extra?.resolvingEvidence ?? lawyerEvidence;
  }
  return context;
}

const helper = readFileSync(path.join(root, "src/lib/decision-support.ts"), "utf8");
const page = readFileSync(path.join(root, "src/app/cases/[id]/page.tsx"), "utf8");
const supportUi = readFileSync(path.join(root, "src/app/cases/[id]/DecisionSupport.tsx"), "utf8");
const recordCard = readFileSync(path.join(root, "src/app/cases/[id]/CaseDecisionRecordCard.tsx"), "utf8");
const generateSource = readFileSync(path.join(root, "src/core/orchestration/analysis-generate.ts"), "utf8");
const analysisAi = readFileSync(path.join(root, "src/core/orchestration/analysis-ai.ts"), "utf8");
const analysisType = readFileSync(path.join(root, "src/core/orchestration/analysis-core.ts"), "utf8");
const schema = readFileSync(path.join(root, "prisma/schema.prisma"), "utf8");
const promptRules = analysisPromptThinkingAndRules();

// A. unresolved + valid determining fact
const missing = deriveDecisionSupportState({ analysis: unresolved, resolutionContext: null });
assert(missing?.status === "missing_evidence", "A: unresolved with a valid determining fact is missing_evidence");
assert(missing?.missingEvidence === municipalFact, "A: missing evidence is the current Determining Fact");
assert(missing?.supportingEvidence === undefined, "A: unresolved does not invent supporting evidence");
assert(decisionSupportHeadline(missing!) === "Не хватает подтверждения", "A: unresolved headline");
assert(
  decisionSupportDetail(missing!, { determiningFactVisible: true }) === "Не хватает подтверждения этого факта.",
  "A: do not duplicate the Determining Fact already shown above",
);
assert(
  decisionSupportDetail(missing!) === `Нужно установить: ${municipalFact}`,
  "A: standalone copy uses the Determining Fact",
);

// B. unresolved + no valid determining fact
assert(
  deriveDecisionSupportState({ analysis: unresolvedWithoutFact }) === null,
  "B: malformed/legacy determining fact is hidden, not invented",
);
assert(
  deriveDecisionSupportState({ analysis: null }) === null,
  "B: missing analysis is hidden",
);

// C. resolved + current resolutionContext + reliable resolvingEvidence
const supportedContext = currentContext(resolved);
const supported = deriveDecisionSupportState({
  analysis: resolved,
  resolutionContext: supportedContext,
});
assert(supported?.status === "supported", "C: current resolvingEvidence is supported");
assert(supported?.supportingEvidence === lawyerEvidence, "C: preserved Next Step Result evidence is shown");
assert(supported?.determiningFact === supportedContext.determiningFact, "C: preserved determining fact is kept");
assert(decisionSupportHeadline(supported!) === "Ключевой факт подтверждён", "C: supported headline");
assert(decisionSupportDetail(supported!) === lawyerEvidence, "C: supported detail is the evidence text");

// D. resolved + determining fact preserved but no resolvingEvidence
const contextWithoutEvidence = currentContext(resolved, { resolvingEvidence: undefined });
const notRecordedWithoutEvidence = deriveDecisionSupportState({
  analysis: resolved,
  resolutionContext: contextWithoutEvidence,
});
assert(
  notRecordedWithoutEvidence?.status === "support_not_recorded",
  "D: preserved determining fact without resolvingEvidence is not supported",
);
assert(
  notRecordedWithoutEvidence?.supportingEvidence === undefined,
  "D: no fabricated supporting evidence",
);

// E. resolved legacy case without resolutionContext
const legacy = deriveDecisionSupportState({ analysis: resolved, resolutionContext: null });
assert(legacy?.status === "support_not_recorded", "E: resolved without resolutionContext is support_not_recorded");
assert(legacy?.supportingEvidence === undefined, "E: legacy resolved does not invent evidence");
assert(
  decisionSupportHeadline(legacy!) === "Основание решения зафиксировано не полностью",
  "E: incomplete-basis headline",
);

// F. stale resolutionContext from prior analysis/cycle
const stale = deriveDecisionSupportState({
  analysis: resolved,
  resolutionContext: currentContext(resolved, {
    analysisKey: "resolved\nprevious fork\nprevious fact",
    resolvingEvidence: "Старое подтверждение предыдущего цикла.",
  }),
});
assert(stale?.status === "support_not_recorded", "F: stale analysisKey is not current evidence");
assert(stale?.supportingEvidence === undefined, "F: stale evidence text is not shown as current support");
assert(
  currentResolutionContext(resolved, currentContext(resolved, { analysisKey: "other-cycle" })) === null,
  "F: currentResolutionContext rejects a mismatched analysisKey",
);

// G. resolved → unresolved
const afterReopen = deriveDecisionSupportState({
  analysis: reopened,
  resolutionContext: supportedContext,
});
assert(afterReopen?.status === "missing_evidence", "G: new unresolved cycle is missing_evidence");
assert(
  afterReopen?.missingEvidence === "Будет ли муниципалитетом одобрено разрешение?",
  "G: missing evidence is the NEW determining fact",
);
assert(afterReopen?.supportingEvidence === undefined, "G: old resolving evidence is not current support");

// H. historical precedent supplied to AI
assert(
  deriveDecisionSupportState({ analysis: unresolved, resolutionContext: null })?.status === "missing_evidence",
  "H: precedentContextRefs do not resolve an unresolved case",
);
assert(
  deriveDecisionSupportState({ analysis: resolved, resolutionContext: null })?.status === "support_not_recorded",
  "H: a supplied historical precedent does not count as current evidence",
);
assert(!helper.includes("precedentContextRefs"), "H: support derivation never reads precedent refs");
assert(!helper.includes("selectPrecedentsForAnalysis"), "H: support derivation does not use precedent selection");

// I. relevant Family Office principle
assert(!helper.includes("findRelevantPrinciples"), "I: principles are not evidence");
assert(!helper.includes("principle"), "I: support helper does not consult principles");
assert(
  deriveDecisionSupportState({
    analysis: { ...resolved, reply: "Принцип: не принимать риск без письменного снятия." },
    resolutionContext: null,
  })?.status === "support_not_recorded",
  "I: principle-shaped model reply does not upgrade support",
);

// J. arbitrary caseMemory text
assert(!helper.includes("caseMemory"), "J: caseMemory is not treated as resolving evidence");
assert(!helper.includes("parseCaseMemory"), "J: caseMemory lines are not scanned");

// K. factualOutcome
assert(!helper.includes("factualOutcome"), "K: closure factualOutcome does not resolve support status");
assert(
  deriveDecisionSupportState({ analysis: resolved, resolutionContext: { factualOutcome: "Сделка закрыта без риска." } })
    ?.status === "support_not_recorded",
  "K: a factualOutcome-shaped payload is not a resolutionContext",
);

// L. supported decision + pending execution
assert(supported?.status === "supported", "L: support remains supported");
assert(
  hasPendingExecution({
    executionStep: "Подписать договор купли-продажи",
    executionOwner: "Юрист",
    executionStatus: "pending",
  }),
  "L: execution can still be pending",
);
assert(
  workspaceExecutionPlacement({
    hasExecution: true,
    decisionStatus: "resolved",
    executionStatus: "pending",
    lifecycleState: "executing",
  }) === "primary",
  "L: pending execution stays an execution concern",
);
const deriveBody = helper.slice(
  helper.indexOf("export function deriveDecisionSupportState"),
  helper.indexOf("export function decisionSupportHeadline"),
);
assert(!deriveBody.includes("lifecycleState"), "L: derivation does not read lifecycle");
assert(!deriveBody.includes("executionStatus"), "L: derivation does not read execution");

// M. closed resolved Decision Record with resolvingEvidence
assert(recordCard.includes("Подтверждение"), "M: historical resolvingEvidence is labeled Подтверждение");
assert(
  recordCard.includes("{!unresolved && record.resolvingEvidence && record.resolvingEvidence !== record.determiningFact"),
  "M: confirmation is shown only when stored resolvingEvidence exists",
);

// N. closed unresolved record
assert(recordCard.includes("Решение не было определено"), "N: unresolved record keeps unresolved semantics");
assert(
  recordCard.includes("{unresolved ? \"Ключевая неопределённость\" : \"Определяющий факт\"}"),
  "N: unanswered question is not labeled as resolved evidence",
);
assert(
  recordCard.includes("{!unresolved && !record.resolvingEvidence"),
  "N: incomplete-basis line is only for resolved records without evidence",
);
assert(!recordCard.includes("Ключевой факт подтверждён"), "N: unresolved records do not fake supporting evidence");

// O. initial resolved analysis without structured evidence
assert(
  deriveDecisionSupportState({ analysis: resolved })?.status === "support_not_recorded",
  "O: initial resolved analysis without resolutionContext is support_not_recorded",
);

// Visibility / copy / no probability language
assert(DECISION_SUPPORT_KICKER === "Устойчивость решения", "user-facing kicker is Устойчивость решения");
assert(
  shouldShowDecisionSupport({
    lifecycleState: "waiting_for_fact",
    reopenSuggestionVisible: false,
    state: missing,
  }),
  "active unresolved cases can show the support layer",
);
assert(
  !shouldShowDecisionSupport({
    lifecycleState: "closed",
    reopenSuggestionVisible: false,
    state: supported,
  }),
  "normally closed cases do not get an active support card",
);
assert(
  shouldShowDecisionSupport({
    lifecycleState: "closed",
    reopenSuggestionVisible: true,
    state: missing,
  }),
  "closed + reopen suggestion may show support for the new analysis",
);
assert(
  !shouldShowDecisionSupport({
    lifecycleState: "under_analysis",
    reopenSuggestionVisible: false,
    state: null,
  }),
  "no invented card when derivation returns null",
);

assert(page.includes("DecisionSupport"), "active workspace renders DecisionSupport");
assert(page.includes("showDecisionSupport"), "active support is gated");
const factIdx = page.indexOf("Что определит решение");
const supportIdx = page.indexOf("showDecisionSupport && supportState");
const nextIdx = page.indexOf("Следующий шаг");
assert(factIdx > -1 && supportIdx > factIdx, "UI: support sits below Determining Fact");
assert(supportIdx > -1 && supportIdx < nextIdx, "UI: support sits before Next Step");
assert(page.includes("shouldShowPrimaryDecision"), "UI: closed historical Decision does not get a competing support card");
assert(supportUi.includes("border-amber-100"), "missing_evidence uses existing amber treatment");
assert(supportUi.includes("border-emerald-100"), "supported uses existing emerald treatment");
assert(supportUi.includes("border-zinc-200"), "support_not_recorded uses existing zinc treatment");
assert(!supportUi.includes("confidence"), "UI has no confidence language");
assert(!page.includes("confidenceScore"), "workspace does not expose a confidence score");
assert(!analysisType.includes("confidenceScore"), "P/Q: AnalysisResult has no confidenceScore");
assert(!/%/.test(supportUi), "UI has no percentage confidence");

// P. no AI calls added
assert(!helper.includes("openai"), "P: support helper does not import OpenAI");
assert(!helper.includes("generateAnalysis"), "P: support helper does not call generateAnalysis");
assert(!helper.includes("continueAnalysis"), "P: support helper does not call continueAnalysis");
const generateAiCalls = generateSource.split("generateAnalysisWithAI(").length - 1;
const continueAiCalls = generateSource.split("continueAnalysisWithAI(").length - 1;
assert(generateAiCalls === 1, `P: generateAnalysis still has one AI call, got ${generateAiCalls}`);
assert(continueAiCalls === 1, `P: continueAnalysis still has one AI call, got ${continueAiCalls}`);

// Q. no Decision Engine prompt change for this feature
assert(!promptRules.includes("confidence"), "Q: Decision Engine prompt does not ask for confidence");
assert(!promptRules.includes("missingEvidence"), "Q: Decision Engine prompt does not ask for missingEvidence");
assert(!promptRules.includes("evidenceScore"), "Q: Decision Engine prompt does not ask for evidenceScore");
assert(!analysisAi.includes("confidenceScore"), "Q: analysis-ai does not emit a confidence score");
assert(!schema.includes("decisionSupport"), "schema: support state is not persisted");

console.log("Decision Support / Missing Evidence test passed.");
