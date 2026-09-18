import { readFileSync } from "fs";
import path from "path";
import {
  LEGACY_ROUTES_SECTION_TITLE,
  RESOLVED_DETERMINING_FACT,
  SECTION_TITLES,
  normalizeAnalysisResult,
  parseDecisionChallenge,
  parseDecisionStatus,
  type AnalysisResult,
} from "@/core/orchestration/analysis-core";
import { analysisPromptThinkingAndRules } from "@/core/orchestration/analysis-ai";
import { generateDeterministicAnalysis } from "@/core/orchestration/analysis-fallback";
import { hasPendingExecution } from "@/lib/case-execution";
import {
  DECISION_CHALLENGE_KICKER,
  hasDecisionChallenge,
  shouldShowDecisionChallenge,
  visibleDecisionChallengeRows,
} from "@/lib/decision-challenge";
import { deriveDecisionSupportState } from "@/lib/decision-support";

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

const unresolvedRaw = {
  decisionStatus: "unresolved" as const,
  sections: rawSections({
    outcome: "Снять юридический риск пристройки.",
    fork: "Исправление снимает риск, либо риск остаётся.",
    fact: "Снимет ли письменное заключение юриста юридический риск.",
    sources: [{ role: "Юрист", result: "Письменное заключение." }],
    actions: ["Получить письменное заключение юриста"],
  }),
  decisionChallenge: {
    invalidationCondition: "Юридическое заключение будет ограничено или отозвано.",
    openAssumption: "Банк не изменит условия финансирования до completion.",
    reviewTrigger: "Муниципалитет изменит или отзовёт ранее выданное согласование.",
  },
};

const resolvedRaw = {
  decisionStatus: "resolved" as const,
  sections: rawSections({
    outcome: "Снять юридический риск пристройки.",
    fork: "Решение определено: исправление снимает риск.",
    fact: RESOLVED_DETERMINING_FACT,
    sources: [{ role: "Юрист", result: "Письменное заключение." }],
    actions: ["Направить уведомление продавцу"],
  }),
  decisionChallenge: {
    invalidationCondition: "Выяснится, что юридический риск сохраняется после исправления документов.",
    openAssumption: "Банк не изменит условия финансирования до completion.",
    reviewTrigger: "Муниципалитет изменит или отзовёт ранее выданное согласование.",
  },
};

const helper = readFileSync(path.join(root, "src/lib/decision-challenge.ts"), "utf8");
const core = readFileSync(path.join(root, "src/core/orchestration/analysis-core.ts"), "utf8");
const page = readFileSync(path.join(root, "src/app/cases/[id]/page.tsx"), "utf8");
const challengeUi = readFileSync(path.join(root, "src/app/cases/[id]/DecisionChallenge.tsx"), "utf8");
const generateSource = readFileSync(path.join(root, "src/core/orchestration/analysis-generate.ts"), "utf8");
const analysisAi = readFileSync(path.join(root, "src/core/orchestration/analysis-ai.ts"), "utf8");
const fallback = readFileSync(path.join(root, "src/core/orchestration/analysis-fallback.ts"), "utf8");
const changeSummary = readFileSync(path.join(root, "src/lib/decision-change-summary.ts"), "utf8");
const recordLib = readFileSync(path.join(root, "src/lib/decision-record.ts"), "utf8");
const schema = readFileSync(path.join(root, "prisma/schema.prisma"), "utf8");
const promptRules = analysisPromptThinkingAndRules();

// A. resolved with grounded invalidation condition
const resolved = normalizeAnalysisResult(resolvedRaw);
assert(resolved.decisionStatus === "resolved", "A: stays resolved");
assert(
  resolved.decisionChallenge?.invalidationCondition ===
    "Выяснится, что юридический риск сохраняется после исправления документов.",
  "A: grounded invalidation condition is kept",
);
assert(
  shouldShowDecisionChallenge({
    lifecycleState: "executing",
    challenge: resolved.decisionChallenge,
  }),
  "A: challenge is shown on an active resolved case",
);

// B. unresolved analysis — challenge absent even if raw challenge exists
const unresolved = normalizeAnalysisResult(unresolvedRaw);
assert(unresolved.decisionStatus === "unresolved", "B: stays unresolved");
assert(unresolved.decisionChallenge === undefined, "B: malformed raw challenge is stripped");
assert(
  parseDecisionChallenge(unresolvedRaw, parseDecisionStatus(unresolvedRaw)) === undefined,
  "B: parser ignores unresolved challenge",
);
assert(
  !shouldShowDecisionChallenge({
    lifecycleState: "waiting_for_fact",
    challenge: unresolved.decisionChallenge,
  }),
  "B: unresolved workspace hides the block",
);

// C. resolved with all three useful fields
const rows = visibleDecisionChallengeRows(resolved.decisionChallenge);
assert(rows.length === 3, "C: max three concise rows");
assert(rows[0]?.label === "Решение нужно пересмотреть, если", "C: invalidation row label");
assert(rows[1]?.label === "Остаётся допущение", "C: assumption row label");
assert(rows[2]?.label === "Вернуться к решению, если", "C: review-trigger row label");

// D. duplicate invalidationCondition / reviewTrigger
const duplicated = normalizeAnalysisResult({
  ...resolvedRaw,
  decisionChallenge: {
    invalidationCondition: "Юридическое заключение будет ограничено или отозвано.",
    reviewTrigger: "Юридическое заключение будет ограничено или отозвано.",
  },
});
assert(
  duplicated.decisionChallenge?.invalidationCondition ===
    "Юридическое заключение будет ограничено или отозвано.",
  "D: invalidation condition is kept",
);
assert(duplicated.decisionChallenge?.reviewTrigger === undefined, "D: duplicate reviewTrigger is dropped");
assert(visibleDecisionChallengeRows(duplicated.decisionChallenge).length === 1, "D: one remaining row");

// E. no meaningful challenge fields
const empty = normalizeAnalysisResult({
  ...resolvedRaw,
  decisionChallenge: {
    invalidationCondition: "Нет",
    openAssumption: "N/A",
    reviewTrigger: "Пересмотреть, если ситуация изменится.",
  },
});
assert(empty.decisionChallenge === undefined, "E: placeholders and generic filler are omitted");
assert(!hasDecisionChallenge(empty.decisionChallenge), "E: entire block is hidden");

// F. resolved → unresolved: old challenge not carried forward
assert(
  normalizeAnalysisResult({
    ...unresolvedRaw,
    decisionChallenge: resolvedRaw.decisionChallenge,
  }).decisionChallenge === undefined,
  "F: new unresolved analysis does not keep the old challenge",
);

// G. later unresolved → resolved: new challenge belongs to the new analysis
const nextResolved = normalizeAnalysisResult({
  ...resolvedRaw,
  decisionChallenge: {
    invalidationCondition: "Муниципалитет отзовёт согласование по новой пристройке.",
  },
});
assert(
  nextResolved.decisionChallenge?.invalidationCondition ===
    "Муниципалитет отзовёт согласование по новой пристройке.",
  "G: new resolved analysis has its own challenge",
);
assert(
  nextResolved.decisionChallenge?.invalidationCondition !==
    resolved.decisionChallenge?.openAssumption,
  "G: previous-cycle assumption is not copied",
);

// H. pending execution
assert(
  shouldShowDecisionChallenge({
    lifecycleState: "executing",
    challenge: resolved.decisionChallenge,
  }),
  "H: challenge remains visible during pending execution",
);
assert(
  hasPendingExecution({
    executionStep: "Подписать договор",
    executionOwner: "Юрист",
    executionStatus: "pending",
  }),
  "H: execution remains pending",
);
assert(!helper.includes("executionStatus"), "H: challenge helper does not write execution");

// I. challenge + support_not_recorded
const unsupported = deriveDecisionSupportState({ analysis: resolved, resolutionContext: null });
assert(unsupported?.status === "support_not_recorded", "I: missing structured evidence stays support_not_recorded");
assert(hasDecisionChallenge(resolved.decisionChallenge), "I: challenge may still exist");
assert(!challengeUi.includes("Ключевой факт подтверждён"), "I: challenge UI does not claim evidence was confirmed");
assert(
  !resolved.decisionChallenge?.invalidationCondition?.includes("подтверждён"),
  "I: fixture does not pretend evidence was recorded",
);

// J. historical precedent is not current challenge fact
assert(!helper.includes("precedentContextRefs"), "J: challenge helper does not read precedent refs");
assert(!core.includes("selectPrecedentsForAnalysis"), "J: normalization does not use precedent selection");
const withPrecedent = normalizeAnalysisResult({
  ...resolvedRaw,
  precedentContextRefs: [{ caseId: "past-1", cycleNumber: 1 }],
  decisionChallenge: undefined,
});
assert(withPrecedent.precedentContextRefs?.[0]?.caseId === "past-1", "J: precedent refs still attach");
assert(withPrecedent.decisionChallenge === undefined, "J: precedent does not become a challenge");

// K. principle is not a current fact/assumption
assert(!helper.includes("findRelevantPrinciples"), "K: no principle extractor");
assert(!core.includes("findRelevantPrinciples"), "K: normalization does not consult principles");

// L. caseMemory — no new assumption extractor / no mutation
assert(!helper.includes("parseCaseMemory"), "L: challenge helper does not scan caseMemory");
assert(!helper.includes("caseMemory"), "L: no caseMemory assumption extractor");
const memoryParser = core.slice(core.indexOf("export function parseCaseMemory"), core.indexOf("export function normalizeAnalysisResult"));
assert(!memoryParser.includes("decisionChallenge"), "L: caseMemory parser is unchanged");

// M–P. challenge does not mutate operational fields
assert(resolved.decisionStatus === "resolved", "M: decisionStatus unchanged");
assert(!helper.includes("updateCaseLifecycle"), "N: challenge does not write lifecycle");
assert(!helper.includes("priorityUrgency"), "O: challenge does not write priority");
assert(!helper.includes("completeCaseExecution"), "P: challenge does not write execution");
assert(!core.includes("updateCaseLifecycle"), "N: parser does not write lifecycle");

// Q. normal closed case
assert(
  !shouldShowDecisionChallenge({
    lifecycleState: "closed",
    challenge: resolved.decisionChallenge,
  }),
  "Q: active challenge is hidden on a normally closed case",
);

// R. no extra AI call
assert(!helper.includes("openai"), "R: presentation helper does not call the model");
assert(!helper.includes("generateAnalysis"), "R: presentation helper does not call generateAnalysis");
const generateAiCalls = generateSource.split("generateAnalysisWithAI(").length - 1;
const continueAiCalls = generateSource.split("continueAnalysisWithAI(").length - 1;
assert(generateAiCalls === 1, `R: generateAnalysis still has one AI call, got ${generateAiCalls}`);
assert(continueAiCalls === 1, `R: continueAnalysis still has one AI call, got ${continueAiCalls}`);
assert(!generateSource.includes("challengeAnalysis"), "R: no challengeAnalysis pipeline");

// S. no schema migration
assert(!schema.includes("decisionChallenge"), "S: no Prisma decisionChallenge column");
assert(!recordLib.includes("decisionChallenge"), "S: Decision Record schema is unchanged");

// T. Decision Engine ordering: facts/outcome/fork before calibration/challenge
const outcomeIdx = promptRules.indexOf("1. Outcome");
const forkIdx = promptRules.indexOf("2. Main Decision Fork");
const calibIdx = promptRules.indexOf("4. Principle / Pattern / Historical Precedent Calibration");
const challengeIdx = promptRules.indexOf("6d. Decision Challenge");
const priorityIdx = promptRules.indexOf("7. Priority");
assert(outcomeIdx > -1 && outcomeIdx < forkIdx, "T: outcome before fork");
assert(forkIdx < calibIdx, "T: fork before calibration");
assert(calibIdx < challengeIdx, "T: calibration before challenge");
assert(challengeIdx < priorityIdx, "T: challenge is a final check before priority");
assert(promptRules.includes("только для unresolved"), "T: unresolved route-change check remains internal");
assert(analysisAi.includes("Internal Route-Change Check"), "T: existing unresolved check is still in the prompt");
assert(!analysisAi.includes("challengeAnalysis"), "T: no second challenge pipeline");

// Fallback omits challenge
assert(!fallback.includes("decisionChallenge"), "fallback does not invent challenge text");
const fallbackResult = generateDeterministicAnalysis({ whatHappened: "Протечка в тамбуре." });
assert(fallbackResult.decisionChallenge === undefined, "fallback analysis omits decisionChallenge");

// UI placement / copy / no action buttons
assert(DECISION_CHALLENGE_KICKER === "Проверка решения", "user-facing kicker is Проверка решения");
assert(page.includes("DecisionChallenge"), "active workspace can render Decision Challenge");
assert(page.includes("showDecisionChallenge"), "challenge is gated");
const supportIdx = page.indexOf("showDecisionSupport && supportState");
const challengeUiIdx = page.indexOf("showDecisionChallenge && decisionChallenge");
const nextIdx = page.indexOf("Следующий шаг");
assert(supportIdx > -1 && challengeUiIdx > supportIdx, "UI: challenge sits below Устойчивость решения");
assert(challengeUiIdx > -1 && challengeUiIdx < nextIdx, "UI: challenge sits before Next Step");
assert(!challengeUi.includes("Пересмотреть решение"), "v1 has no challenge action button");
assert(!challengeUi.includes("Подтвердить"), "v1 has no confirm button");
assert(!challengeUi.includes("border-amber"), "challenge is not an amber alarm");
assert(!challengeUi.includes("border-emerald"), "challenge is not a success surface");
assert(!challengeUi.includes("border-sky"), "challenge is not the operational next-step surface");
assert(challengeUi.includes("border-zinc-200"), "challenge uses neutral zinc treatment");
assert(!changeSummary.includes("decisionChallenge"), "Decision Change Summary ignores challenge in v1");

// Legacy six-section route-change is still discarded
const withLegacySection = normalizeAnalysisResult({
  ...resolvedRaw,
  decisionChallenge: undefined,
  sections: [
    ...resolvedRaw.sections,
    {
      title: LEGACY_ROUTES_SECTION_TITLE,
      content: "Если факт подтверждён — маршрут A отпадает.",
    },
  ],
});
assert(withLegacySection.decisionChallenge === undefined, "legacy Route Change section is not surfaced as challenge");

console.log("Decision Challenge test passed.");
