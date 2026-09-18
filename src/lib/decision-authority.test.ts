import { readFileSync } from "fs";
import path from "path";
import {
  RESOLVED_DETERMINING_FACT,
  SECTION_TITLES,
  normalizeAnalysisResult,
  parseDecisionAuthority,
} from "@/core/orchestration/analysis-core";
import { analysisPromptThinkingAndRules } from "@/core/orchestration/analysis-ai";
import { generateDeterministicAnalysis } from "@/core/orchestration/analysis-fallback";
import {
  DECISION_AUTHORITY_KICKER,
  decisionAuthorityHeadline,
  shouldShowDecisionAuthority,
} from "@/lib/decision-authority";

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

const factualUnresolved = {
  decisionStatus: "unresolved" as const,
  sections: rawSections({
    outcome: "Завершить сделку без правового риска.",
    fork: "Завершать сделку сейчас — или ждать снятия юридического риска.",
    fact: "Снимет ли письменное заключение юриста юридический риск.",
    sources: [{ role: "Юрист", result: "Письменное заключение, снимается ли риск." }],
    actions: ["Получить письменное заключение юриста"],
  }),
};

const helper = readFileSync(path.join(root, "src/lib/decision-authority.ts"), "utf8");
const core = readFileSync(path.join(root, "src/core/orchestration/analysis-core.ts"), "utf8");
const page = readFileSync(path.join(root, "src/app/cases/[id]/page.tsx"), "utf8");
const authorityUi = readFileSync(path.join(root, "src/app/cases/[id]/DecisionAuthorityCard.tsx"), "utf8");
const generateSource = readFileSync(path.join(root, "src/core/orchestration/analysis-generate.ts"), "utf8");
const fallback = readFileSync(path.join(root, "src/core/orchestration/analysis-fallback.ts"), "utf8");
const changeSummary = readFileSync(path.join(root, "src/lib/decision-change-summary.ts"), "utf8");
const recordLib = readFileSync(path.join(root, "src/lib/decision-record.ts"), "utf8");
const schema = readFileSync(path.join(root, "prisma/schema.prisma"), "utf8");
const promptRules = analysisPromptThinkingAndRules();

// A. factual unresolved question — no premature Principal escalation
const factual = normalizeAnalysisResult({
  ...factualUnresolved,
  decisionAuthority: {
    owner: "family_office",
    reason: "Сначала нужно получить факт: снимается ли юридический риск.",
  },
});
assert(factual.decisionAuthority?.owner === "family_office", "A: factual gap stays with Family Office");
assert(factual.decisionAuthority?.escalationRequired === false, "A: no premature Principal escalation");
assert(factual.decisionAuthority?.principalQuestion === undefined, "A: no Principal question while the fact is missing");
assert(promptRules.includes("не эскалируй к Principal"), "A: prompt forbids premature Principal escalation");

// B. fact owner lawyer + value judgment Principal
const splitRoles = normalizeAnalysisResult({
  ...factualUnresolved,
  decisionStatus: "resolved",
  sections: rawSections({
    outcome: "Завершить сделку, если остаточный риск приемлем.",
    fork: "Решение определено: риск снят, сделку можно завершать при принятии остаточного риска.",
    fact: RESOLVED_DETERMINING_FACT,
    sources: [{ role: "Юрист", result: "Письменное заключение." }],
    actions: ["Получить позицию Principal по остаточному риску"],
  }),
  decisionAuthority: {
    owner: "principal",
    escalationRequired: true,
    reason: "Нужно определить, допустим ли остаточный риск.",
    principalQuestion: "Готовы ли мы принять остаточный юридический риск ради завершения сделки?",
  },
});
assert(
  splitRoles.sections.find((section) => section.title === SECTION_TITLES[3])?.roleAssignments?.length === 0,
  "B: resolved fact-owner section stays empty",
);
assert(splitRoles.decisionAuthority?.owner === "principal", "B: decision owner is Principal");
assert(decisionAuthorityHeadline(splitRoles.decisionAuthority!) === "Нужна позиция Principal", "B: Principal headline");
assert(!helper.includes("roleAssignments"), "B: decision owner is not inferred from fact owner");

const unresolvedSplit = normalizeAnalysisResult({
  ...factualUnresolved,
  decisionAuthority: {
    owner: "principal",
    reason: "Нужно определить, допустим ли остаточный риск.",
    principalQuestion: "Готовы ли мы принять остаточный юридический риск ради завершения сделки?",
  },
});
assert(
  unresolvedSplit.sections.find((section) => section.title === SECTION_TITLES[3])?.roleAssignments?.[0]?.role ===
    "Юрист",
  "B: fact owner remains lawyer",
);
assert(unresolvedSplit.decisionAuthority?.owner === "principal", "B: decision owner remains Principal");

// C. explicit Principal value judgment
assert(unresolvedSplit.decisionAuthority?.escalationRequired === true, "C: principal owner implies escalation");
assert(
  unresolvedSplit.decisionAuthority?.principalQuestion ===
    "Готовы ли мы принять остаточный юридический риск ради завершения сделки?",
  "C: concise Principal question is kept",
);

// D. Principal already made relevant decision
assert(promptRules.includes("Не спрашивай Principal снова"), "D: prompt does not re-ask a given Principal decision");
assert(!core.includes("parseCaseMemory(raw.decisionAuthority"), "D: authority parser does not scan caseMemory");
assert(
  parseDecisionAuthority({
    decisionAuthority: { owner: "principal", principalQuestion: "N/A" },
  }) === undefined,
  "D: placeholder Principal question is not a re-ask",
);

// E. operational implementation within approved boundary
const operational = normalizeAnalysisResult({
  decisionStatus: "resolved",
  sections: rawSections({
    outcome: "Завершить сделку в согласованный срок.",
    fork: "Решение определено: завершить сделку в согласованный срок.",
    fact: RESOLVED_DETERMINING_FACT,
    actions: ["Направить уведомление продавцу"],
  }),
  decisionAuthority: {
    owner: "family_office",
    reason: "Решение операционное и находится в пределах уже определённой позиции.",
    principalQuestion: "Готовы ли мы принять этот риск?",
  },
});
assert(operational.decisionAuthority?.owner === "family_office", "E: operational route stays Family Office");
assert(operational.decisionAuthority?.principalQuestion === undefined, "E: no fake Principal question");
assert(operational.decisionAuthority?.escalationRequired === false, "E: no escalation");

function assertConsistentAuthority(
  value: ReturnType<typeof parseDecisionAuthority>,
  message: string,
): void {
  if (!value) return;
  if (value.escalationRequired) {
    assert(value.owner === "principal", `${message}: escalation requires principal owner`);
    assert(Boolean(value.principalQuestion?.trim()), `${message}: escalation requires principalQuestion`);
  }
  if (value.owner === "family_office" || value.owner === "function_owner") {
    assert(value.escalationRequired === false, `${message}: non-principal owner cannot escalate`);
  }
}

const contradictoryFo = parseDecisionAuthority({
  decisionAuthority: {
    owner: "family_office",
    escalationRequired: true,
    principalQuestion: "Готовы ли мы принять остаточный юридический риск ради завершения сделки?",
    reason: "Операционный этап.",
  },
});
assert(contradictoryFo?.owner === "family_office", "contradiction FO+escalation: owner stays Family Office");
assert(contradictoryFo?.escalationRequired === false, "contradiction FO+escalation: escalationRequired forced false");
assert(contradictoryFo?.principalQuestion === undefined, "contradiction FO+escalation: Principal question stripped");
assertConsistentAuthority(contradictoryFo, "contradiction FO+escalation");

const contradictoryFn = parseDecisionAuthority({
  decisionAuthority: {
    owner: "function_owner",
    functionOwner: "Юрист",
    escalationRequired: true,
    principalQuestion: "Готовы ли мы принять остаточный юридический риск ради завершения сделки?",
    reason: "Процедурный мандат юриста.",
  },
});
assert(contradictoryFn?.owner === "function_owner", "contradiction function+escalation: owner stays function_owner");
assert(contradictoryFn?.escalationRequired === false, "contradiction function+escalation: escalationRequired forced false");
assert(contradictoryFn?.principalQuestion === undefined, "contradiction function+escalation: Principal question stripped");
assertConsistentAuthority(contradictoryFn, "contradiction function+escalation");

const principalWithoutEscalationFlag = parseDecisionAuthority({
  decisionAuthority: {
    owner: "principal",
    escalationRequired: false,
    principalQuestion: "Готовы ли мы принять остаточный юридический риск ради завершения сделки?",
  },
});
assert(principalWithoutEscalationFlag?.owner === "principal", "principal owner stays principal");
assert(principalWithoutEscalationFlag?.escalationRequired === true, "principal owner forces escalationRequired");
assertConsistentAuthority(principalWithoutEscalationFlag, "principal without escalation flag");
assertConsistentAuthority(factual.decisionAuthority, "factual FO");
assertConsistentAuthority(unresolvedSplit.decisionAuthority, "principal value judgment");

// F. function owner procedural matter
const procedural = normalizeAnalysisResult({
  ...factualUnresolved,
  decisionAuthority: {
    owner: "function_owner",
    functionOwner: "Юрист",
    reason: "Требуется процедурное решение в рамках юридического мандата.",
  },
});
assert(procedural.decisionAuthority?.owner === "function_owner", "F: function owner is kept");
assert(procedural.decisionAuthority?.functionOwner === "Юрист", "F: role is kept");
assert(decisionAuthorityHeadline(procedural.decisionAuthority!) === "Юрист", "F: headline is the role");
assert(procedural.decisionAuthority?.principalQuestion === undefined, "F: specialist is not Principal");
assertConsistentAuthority(procedural.decisionAuthority, "function owner");

// G. expensive case without explicit authority boundary
assert(promptRules.includes("Не своди «дорого / важно» к Principal"), "G: expensive is not automatically Principal");
const expensive = normalizeAnalysisResult({
  ...factualUnresolved,
  decisionAuthority: { owner: "family_office", reason: "Текущий пробел — факт юриста, а не порог траты." },
});
assert(expensive.decisionAuthority?.owner === "family_office", "G: no automatic Principal from cost");

// H. explicit hard-money/delegation boundary
assert(promptRules.includes("Не выдумывай денежный порог"), "H: no invented spending threshold");
const bounded = normalizeAnalysisResult({
  ...factualUnresolved,
  decisionAuthority: {
    owner: "principal",
    principalQuestion: "Разрешить ли расход сверх уже утверждённого лимита по этому проекту?",
    reason: "В фактах кейса есть явная утверждённая граница расходов.",
  },
});
assert(bounded.decisionAuthority?.owner === "principal", "H: current-case money boundary may escalate");

// I. protective urgent action
assert(promptRules.includes("защитн"), "I: prompt keeps protective-action exception");
assert(promptRules.includes("не должна ждать"), "I: authority must not delay protective FO action");

// J. malformed owner
assert(parseDecisionAuthority({ decisionAuthority: { owner: "ceo" } }) === undefined, "J: unknown owner is dropped");
assert(
  parseDecisionAuthority({ decisionAuthority: { owner: "unclear", reason: "Неясно." } }) === undefined,
  "J: unclear is omitted rather than shown as fake governance",
);

// K. principal owner without question
assert(
  parseDecisionAuthority({
    decisionAuthority: { owner: "principal", reason: "Нужно суждение." },
  }) === undefined,
  "K: principal without a question is hidden",
);

// L. stale authority from old analysis
const withoutAuthority = normalizeAnalysisResult(factualUnresolved);
assert(withoutAuthority.decisionAuthority === undefined, "L: omitted authority is not carried forward");

// M. new cycle
const nextCycle = normalizeAnalysisResult({
  ...factualUnresolved,
  decisionAuthority: {
    owner: "family_office",
    reason: "Новый цикл: сначала получить факт муниципалитета.",
  },
});
assert(
  Boolean(nextCycle.decisionAuthority?.reason?.includes("Новый цикл")),
  "M: new analysis has its own authority",
);
assert(withoutAuthority.decisionAuthority !== nextCycle.decisionAuthority, "M: previous authority is not reused");

// N. closed case
assert(
  !shouldShowDecisionAuthority({
    lifecycleState: "closed",
    authority: operational.decisionAuthority,
  }),
  "N: active authority is hidden on a normally closed case",
);
assert(
  shouldShowDecisionAuthority({
    lifecycleState: "waiting_for_fact",
    authority: factual.decisionAuthority,
  }),
  "N: active unresolved cases may show Family Office authority",
);

// O–R. no operational mutation
assert(!helper.includes("updateCaseLifecycle"), "O: authority does not write lifecycle");
assert(factual.decisionStatus === "unresolved", "P: decisionStatus unchanged");
assert(!helper.includes("priorityUrgency"), "Q: authority does not write priority");
assert(!helper.includes("parseCaseMemory"), "R: authority helper does not mutate caseMemory");
assert(!core.includes("updateCaseLifecycle"), "O: parser does not write lifecycle");

// S. no extra AI call
assert(!helper.includes("openai"), "S: presentation helper does not call the model");
const generateAiCalls = generateSource.split("generateAnalysisWithAI(").length - 1;
const continueAiCalls = generateSource.split("continueAnalysisWithAI(").length - 1;
assert(generateAiCalls === 1, `S: generateAnalysis still has one AI call, got ${generateAiCalls}`);
assert(continueAiCalls === 1, `S: continueAnalysis still has one AI call, got ${continueAiCalls}`);
assert(!generateSource.includes("authorityAnalysis"), "S: no second authority pipeline");

// T. no schema migration
assert(!schema.includes("decisionAuthority"), "T: no Prisma decisionAuthority column");
assert(!recordLib.includes("decisionAuthority"), "T: Decision Record schema is unchanged");

// U. Decision Engine ordering
const calibIdx = promptRules.indexOf("4. Principle / Pattern / Historical Precedent Calibration");
const challengeIdx = promptRules.indexOf("6d. Decision Challenge");
const authorityIdx = promptRules.indexOf("6e. Decision Authority");
const priorityIdx = promptRules.indexOf("7. Priority");
assert(calibIdx > -1 && calibIdx < challengeIdx, "U: calibration before challenge");
assert(challengeIdx > -1 && challengeIdx < authorityIdx, "U: challenge before authority");
assert(authorityIdx > -1 && authorityIdx < priorityIdx, "U: authority before priority");
assert(promptRules.includes("FACT OWNER ≠ DECISION OWNER"), "U: fact owner stays distinct from decision owner");

assert(!fallback.includes("decisionAuthority"), "fallback does not invent authority");
assert(
  generateDeterministicAnalysis({ whatHappened: "Протечка в тамбуре." }).decisionAuthority === undefined,
  "fallback omits decisionAuthority",
);

assert(DECISION_AUTHORITY_KICKER === "Кто принимает решение", "user-facing kicker");
assert(page.includes("DecisionAuthorityCard"), "active workspace can render authority");
assert(page.includes("showDecisionAuthority"), "authority is gated");
const challengeUiIdx = page.indexOf("showDecisionChallenge && decisionChallenge");
const authorityUiIdx = page.indexOf("showDecisionAuthority && decisionAuthority");
assert(challengeUiIdx > -1 && authorityUiIdx > challengeUiIdx, "UI: authority sits below Проверка решения");
assert(authorityUiIdx < page.indexOf("Следующий шаг"), "UI: authority sits before Next Step");
assert(!authorityUi.includes("border-amber"), "authority is not an amber alarm");
assert(!authorityUi.includes("border-emerald"), "authority is not resolved-green");
assert(!authorityUi.includes("border-sky"), "authority is not the Next Step surface");
assert(authorityUi.includes("border-zinc-200"), "authority uses zinc governance treatment");
assert(!changeSummary.includes("decisionAuthority"), "Decision Change Summary ignores authority in v1");
assert(parseDecisionAuthority({ decisionAuthority: { owner: "function_owner" } }) === undefined, "function_owner requires a role");

console.log("Decision Authority / Escalation test passed.");
