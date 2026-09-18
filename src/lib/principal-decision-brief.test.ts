import { readFileSync } from "fs";
import path from "path";
import {
  RESOLVED_DETERMINING_FACT,
  SECTION_TITLES,
  normalizeAnalysisResult,
  type AnalysisResult,
} from "@/core/orchestration/analysis-core";
import { analysisPromptThinkingAndRules } from "@/core/orchestration/analysis-ai";
import { analysisCycleKey } from "@/lib/decision-cycle";
import type { ResolutionContext } from "@/lib/decision-record";
import {
  PRINCIPAL_BRIEF_KICKER,
  PRINCIPAL_BRIEF_LABELS,
  derivePrincipalDecisionBrief,
  formatPrincipalDecisionBriefText,
  shouldShowPrincipalDecisionBrief,
} from "@/lib/principal-decision-brief";

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

const PRINCIPAL_QUESTION = "Готовы ли мы принять остаточный юридический риск ради завершения сделки?";
const FORK_UNRESOLVED = "Завершить сделку с остаточным риском — или отказаться от сделки.";
const FORK_RESOLVED = "Решение определено: завершить сделку, приняв остаточный юридический риск.";
const DETERMINING_FACT = "Можно ли полностью снять юридический риск до completion?";
const LAWYER_EVIDENCE = "Юрист письменно подтвердил, что риск полностью снимается.";
const INVALIDATION = "Юрист отзовёт письменное подтверждение или риск окажется неснимаемым.";
const REVIEW_TRIGGER = "Появится новое юридическое препятствие до completion.";
const PRECEDENT_MARK = "В похожем кейсе мы отказались от сделки из-за репутации.";
const PRINCIPLE_MARK = "Принцип Family Office: не принимать юридический риск без полного снятия.";
const GENERIC_REASON = "Требуется решение Principal.";

const helper = readFileSync(path.join(root, "src/lib/principal-decision-brief.ts"), "utf8");
const page = readFileSync(path.join(root, "src/app/cases/[id]/page.tsx"), "utf8");
const briefUi = readFileSync(path.join(root, "src/app/cases/[id]/PrincipalDecisionBriefCard.tsx"), "utf8");
const copyUi = readFileSync(path.join(root, "src/app/cases/[id]/CopyPrincipalBriefButton.tsx"), "utf8");
const generateSource = readFileSync(path.join(root, "src/core/orchestration/analysis-generate.ts"), "utf8");
const analysisAi = readFileSync(path.join(root, "src/core/orchestration/analysis-ai.ts"), "utf8");
const analysisType = readFileSync(path.join(root, "src/core/orchestration/analysis-core.ts"), "utf8");
const schema = readFileSync(path.join(root, "prisma/schema.prisma"), "utf8");
const recordLib = readFileSync(path.join(root, "src/lib/decision-record.ts"), "utf8");
const changeSummary = readFileSync(path.join(root, "src/lib/decision-change-summary.ts"), "utf8");
const promptRules = analysisPromptThinkingAndRules();

function currentContext(
  analysis: AnalysisResult,
  extra?: Partial<ResolutionContext>,
): ResolutionContext {
  const context: ResolutionContext = {
    determiningFact: extra?.determiningFact ?? DETERMINING_FACT,
    resolvedAt: extra?.resolvedAt ?? "2026-09-18T10:00:00.000Z",
    analysisKey: extra?.analysisKey ?? analysisCycleKey(analysis),
  };
  if (extra && Object.prototype.hasOwnProperty.call(extra, "resolvingEvidence")) {
    if (extra.resolvingEvidence) context.resolvingEvidence = extra.resolvingEvidence;
  } else {
    context.resolvingEvidence = extra?.resolvingEvidence ?? LAWYER_EVIDENCE;
  }
  return context;
}

const resolvedPrincipal = normalizeAnalysisResult({
  decisionStatus: "resolved",
  sections: rawSections({
    outcome: "Завершить сделку без недопустимого правового риска.",
    fork: FORK_RESOLVED,
    fact: RESOLVED_DETERMINING_FACT,
    sources: [{ role: "Юрист", result: "Письменное заключение." }],
    actions: ["Получить решение Principal"],
  }),
  decisionAuthority: {
    owner: "principal",
    escalationRequired: true,
    reason: "Остаточный юридический риск — ценностное суждение, а не факт юриста.",
    principalQuestion: PRINCIPAL_QUESTION,
  },
  decisionChallenge: {
    invalidationCondition: INVALIDATION,
    openAssumption: "Письменное подтверждение юриста остаётся в силе.",
    reviewTrigger: REVIEW_TRIGGER,
  },
  reply: `${PRECEDENT_MARK} ${PRINCIPLE_MARK}`,
  precedentContextRefs: [{ caseId: "past-gift", cycleNumber: 1 }],
  caseMemory: `${PRECEDENT_MARK} ${PRINCIPLE_MARK}`,
});

const unresolvedPrincipal = normalizeAnalysisResult({
  decisionStatus: "unresolved",
  sections: rawSections({
    outcome: "Завершить сделку без недопустимого правового риска.",
    fork: FORK_UNRESOLVED,
    fact: DETERMINING_FACT,
    sources: [{ role: "Юрист", result: "Письменное заключение, снимается ли риск." }],
    actions: ["Получить письменное заключение юриста"],
  }),
  decisionAuthority: {
    owner: "principal",
    reason: "Нужно определить, допустим ли остаточный риск.",
    principalQuestion: PRINCIPAL_QUESTION,
  },
  reply: `${PRECEDENT_MARK} ${PRINCIPLE_MARK}`,
  precedentContextRefs: [{ caseId: "past-gift", cycleNumber: 1 }],
  caseMemory: `${PRECEDENT_MARK} ${PRINCIPLE_MARK}`,
});

const familyOffice = normalizeAnalysisResult({
  decisionStatus: "unresolved",
  sections: rawSections({
    outcome: "Снять юридический риск пристройки.",
    fork: "Исправление снимает риск, либо риск остаётся.",
    fact: DETERMINING_FACT,
    sources: [{ role: "Юрист", result: "Письменное заключение, снимается ли риск." }],
    actions: ["Получить письменное заключение юриста"],
  }),
  decisionAuthority: {
    owner: "family_office",
    reason: "Сначала нужно получить факт: снимается ли юридический риск.",
  },
});

const functionOwner = normalizeAnalysisResult({
  decisionStatus: "resolved",
  sections: rawSections({
    outcome: "Подать уведомление в срок.",
    fork: "Решение определено: юрист подаёт уведомление.",
    fact: RESOLVED_DETERMINING_FACT,
    sources: [{ role: "Юрист", result: "Уведомление в мандате юриста." }],
    actions: ["Подать уведомление"],
  }),
  decisionAuthority: {
    owner: "function_owner",
    functionOwner: "Юрист",
    reason: "Узкая процедурная подача в мандате юриста.",
  },
});

const withoutAuthority = normalizeAnalysisResult({
  decisionStatus: "resolved",
  sections: rawSections({
    outcome: "Завершить ремонт тамбура.",
    fork: "Решение определено: подрядчик устраняет протечку.",
    fact: RESOLVED_DETERMINING_FACT,
    sources: [{ role: "Подрядчик", result: "Устранение протечки." }],
    actions: ["Устранить протечку"],
  }),
});

const principalWithoutQuestion = normalizeAnalysisResult({
  decisionStatus: "resolved",
  sections: rawSections({
    outcome: "Принять остаточный риск.",
    fork: FORK_RESOLVED,
    fact: RESOLVED_DETERMINING_FACT,
    sources: [{ role: "Юрист", result: "Письменное заключение." }],
    actions: ["Зафиксировать маршрут"],
  }),
  decisionAuthority: {
    owner: "principal",
    reason: "Нужно суждение.",
  },
});

const alreadyDecided = normalizeAnalysisResult({
  decisionStatus: "resolved",
  sections: rawSections({
    outcome: "Завершить сделку.",
    fork: "Решение определено: Principal уже принял остаточный риск.",
    fact: RESOLVED_DETERMINING_FACT,
    sources: [{ role: "Юрист", result: "Письменное заключение." }],
    actions: ["Исполнить утверждённый маршрут"],
  }),
  decisionAuthority: {
    owner: "family_office",
    reason: "Principal уже зафиксировал допустимость остаточного риска.",
  },
});

const resolvedBrief = derivePrincipalDecisionBrief({
  analysis: resolvedPrincipal,
  resolutionContext: currentContext(resolvedPrincipal),
});
const unresolvedBrief = derivePrincipalDecisionBrief({ analysis: unresolvedPrincipal });

assert(resolvedBrief !== null, "A: principal-owned resolved case produces a brief");
assert(resolvedBrief?.question === PRINCIPAL_QUESTION, "A: question is principalQuestion verbatim");
assert(resolvedBrief?.currentRoute === FORK_RESOLVED, "A: current FO Brain position is the resolved route");
assert(resolvedBrief?.remainingUncertainty === undefined, "A: resolved brief omits remaining uncertainty");
assert(resolvedBrief?.routes === undefined, "A: resolved brief does not restate the fork as options");
assert(
  shouldShowPrincipalDecisionBrief({ lifecycleState: "under_analysis", brief: resolvedBrief }),
  "A: brief is visible on an active Principal-owned resolved case",
);

assert(unresolvedBrief !== null, "B: principal-owned unresolved case produces a brief");
assert(unresolvedBrief?.remainingUncertainty === DETERMINING_FACT, "B: remaining uncertainty is the current Determining Fact");
assert(unresolvedBrief?.currentRoute === undefined, "B: unresolved brief does not fake a resolved recommendation");
assert(unresolvedBrief?.routes?.length === 1, "B: unresolved fork is shown as one options block");
assert(unresolvedBrief?.routes?.[0]?.text === FORK_UNRESOLVED, "B: options use the existing fork");
assert(unresolvedBrief?.routes?.[0]?.label === undefined, "B: no invented A/B labels");
assert(
  shouldShowPrincipalDecisionBrief({ lifecycleState: "waiting", brief: unresolvedBrief }),
  "B: brief is visible on an active Principal-owned unresolved case",
);

assert(derivePrincipalDecisionBrief({ analysis: familyOffice }) === null, "C: family_office owner has no brief");
assert(
  !shouldShowPrincipalDecisionBrief({
    lifecycleState: "under_analysis",
    brief: derivePrincipalDecisionBrief({ analysis: familyOffice }),
  }),
  "C: family_office brief stays hidden",
);

assert(derivePrincipalDecisionBrief({ analysis: functionOwner }) === null, "D: function_owner has no brief");
assert(derivePrincipalDecisionBrief({ analysis: withoutAuthority }) === null, "E: missing authority has no brief");
assert(principalWithoutQuestion.decisionAuthority === undefined, "F: principal without question is dropped by normalization");
assert(derivePrincipalDecisionBrief({ analysis: principalWithoutQuestion }) === null, "F: invalid principal authority has no brief");

assert(resolvedBrief?.evidenceNote === LAWYER_EVIDENCE, "G: supported evidence is a concise basis line");

const unresolvedSupport = derivePrincipalDecisionBrief({ analysis: unresolvedPrincipal });
assert(unresolvedSupport?.evidenceNote === undefined, "G/H: missing_evidence is not duplicated as basis");
assert(unresolvedSupport?.remainingUncertainty === DETERMINING_FACT, "G: missing evidence stays in remaining uncertainty");

const resolvedWithoutEvidence = derivePrincipalDecisionBrief({
  analysis: resolvedPrincipal,
  resolutionContext: currentContext(resolvedPrincipal, { resolvingEvidence: undefined }),
});
assert(
  resolvedWithoutEvidence?.evidenceNote === "Подтверждающее основание зафиксировано не полностью.",
  "H: support_not_recorded does not fabricate evidence",
);
assert(!resolvedWithoutEvidence?.evidenceNote?.includes("Юрист письменно подтвердил"), "H: no invented supporting evidence");

assert(resolvedBrief?.reconsiderIf === INVALIDATION, "I: challenge uses invalidationCondition");
assert(resolvedBrief?.reconsiderIf !== REVIEW_TRIGGER, "I: reviewTrigger is fallback only");

const duplicateChallenge = normalizeAnalysisResult({
  ...resolvedPrincipal,
  decisionChallenge: {
    invalidationCondition: INVALIDATION,
    reviewTrigger: INVALIDATION,
  },
});
const duplicateBrief = derivePrincipalDecisionBrief({
  analysis: duplicateChallenge,
  resolutionContext: currentContext(duplicateChallenge),
});
const duplicateText = formatPrincipalDecisionBriefText(duplicateBrief!);
assert(duplicateBrief?.reconsiderIf === INVALIDATION, "J: duplicate challenge rows collapse to one condition");
assert(duplicateText.split(INVALIDATION).length === 2, "J: the condition appears once in the copied brief");

assert(unresolvedBrief?.routes?.length === 1, "K: current fork is not parsed into invented routes");
assert(!("A." === unresolvedBrief?.routes?.[0]?.label), "K: no A/B fabrication");
assert(formatPrincipalDecisionBriefText(unresolvedBrief!).includes(FORK_UNRESOLVED), "K: existing fork is used as-is");
assert(!formatPrincipalDecisionBriefText(unresolvedBrief!).includes("A. "), "K: copy does not invent alternative labels");

const resolvedCopy = formatPrincipalDecisionBriefText(resolvedBrief!);
const unresolvedCopy = formatPrincipalDecisionBriefText(unresolvedBrief!);
assert(!resolvedCopy.includes(PRECEDENT_MARK), "L: historical precedent is not a current known fact");
assert(!unresolvedCopy.includes(PRECEDENT_MARK), "L: precedent mark stays out of the unresolved brief");
assert(!helper.includes("selectPrecedentsForAnalysis"), "L: brief does not read historical precedent");
assert(!helper.includes("historicalPrecedents"), "L: brief does not scan precedent records");
assert(!resolvedCopy.includes(PRINCIPLE_MARK), "M: Family Office principle is not a current known fact");
assert(!unresolvedCopy.includes(PRINCIPLE_MARK), "M: principle mark stays out of the unresolved brief");
assert(!helper.includes("findRelevantPrinciples"), "M: brief does not copy principles");
assert(!helper.includes("parseCaseMemory"), "M: brief does not extract from caseMemory");
assert(resolvedBrief?.knownFacts === undefined, "L/M: known facts are omitted rather than filled from memory");

assert(resolvedCopy.startsWith(PRINCIPAL_BRIEF_KICKER), "N: plain-text copy uses the same kicker");
assert(resolvedCopy.includes(`${PRINCIPAL_BRIEF_LABELS.question}:\n${PRINCIPAL_QUESTION}`), "N: copy uses the same question");
assert(resolvedCopy.includes(`${PRINCIPAL_BRIEF_LABELS.currentRoute}:\n${FORK_RESOLVED}`), "N: copy uses the same current route");
assert(resolvedCopy.includes(`${PRINCIPAL_BRIEF_LABELS.evidenceNote}:\n${LAWYER_EVIDENCE}`), "N: copy uses the same evidence line");
assert(resolvedCopy.includes(`${PRINCIPAL_BRIEF_LABELS.reconsiderIf}:\n${INVALIDATION}`), "N: copy uses the same challenge line");
assert(briefUi.includes("formatPrincipalDecisionBriefText(brief)"), "N: UI copy action uses the same formatter");
assert(briefUi.includes("<CopyPrincipalBriefButton text={copyText} />"), "N: copied text is the formatted brief model");
assert(!unresolvedCopy.includes(PRINCIPAL_BRIEF_LABELS.currentRoute), "N: unresolved copy has no fake position");

assert(copyUi.includes('"use client"'), "O: copy action is client-side");
assert(copyUi.includes("navigator.clipboard.writeText"), "O: copy writes to the clipboard only");
assert(!copyUi.includes("use server"), "O: copy is not a server action");
assert(!copyUi.includes("prisma"), "O: copy does not write to the database");
assert(!copyUi.includes("fetch("), "O: copy does not call an API");
assert(!copyUi.includes("generateAnalysis"), "O: copy does not trigger analysis");

assert(!analysisAi.includes("Principal Decision Brief"), "P: Decision Engine prompt does not ask for a brief");
assert(!analysisAi.includes("principalDecisionBrief"), "P: prompt schema does not add a brief field");
assert(!promptRules.includes("напиши brief"), "P: prompt does not ask the model to write a brief");
assert(!helper.includes("openai"), "P: brief derivation has no AI client");
assert(!helper.includes("generateAnalysis"), "P: brief derivation does not call generateAnalysis");
assert(!generateSource.includes("principal-decision-brief"), "P: analysis generate path is unchanged");
assert(!analysisType.includes("principalDecisionBrief"), "P: AnalysisResult is not extended with a brief field");

assert(!schema.includes("principalBrief"), "Q: no Prisma brief column");
assert(!schema.includes("PrincipalDecisionBrief"), "Q: no Prisma brief model");
assert(!recordLib.includes("principalDecisionBrief"), "Q: Decision Record schema is unchanged");

assert(
  !shouldShowPrincipalDecisionBrief({ lifecycleState: "closed", brief: resolvedBrief }),
  "R: normal closed case hides the brief",
);
assert(
  !shouldShowPrincipalDecisionBrief({ lifecycleState: "closed", brief: unresolvedBrief }),
  "R: closed unresolved analysis still hides the brief",
);

assert(derivePrincipalDecisionBrief({ analysis: alreadyDecided }) === null, "S: Principal already decided / FO owner hides the brief");
assert(alreadyDecided.decisionAuthority?.owner === "family_office", "S: authority layer owns the already-decided case");

assert(!helper.includes("prisma"), "T: brief does not write lifecycle");
assert(!helper.includes("updateCaseLifecycle"), "T: brief does not mutate lifecycle");
assert(!helper.includes("decisionStatus:"), "U: brief does not assign decisionStatus");
assert(!helper.includes("executionStatus"), "V: brief does not mutate execution");
assert(!changeSummary.includes("principal-decision-brief"), "brief is not a Decision Change Summary input");

const genericReason = normalizeAnalysisResult({
  ...resolvedPrincipal,
  decisionAuthority: {
    owner: "principal",
    principalQuestion: PRINCIPAL_QUESTION,
    reason: GENERIC_REASON,
  },
});
assert(
  derivePrincipalDecisionBrief({ analysis: genericReason })?.reason === undefined,
  "generic Principal reason is omitted",
);

assert(page.includes("PrincipalDecisionBriefCard"), "workspace can render the brief");
assert(page.includes("showPrincipalBrief"), "brief is gated");
assert(page.includes("showPrimaryDecision &&"), "brief follows active-workspace semantics");
const authorityUiIdx = page.indexOf("showDecisionAuthority && decisionAuthority");
const briefUiIdx = page.indexOf("showPrincipalBrief && principalBrief");
assert(authorityUiIdx > -1 && briefUiIdx > authorityUiIdx, "UI: brief sits below Decision Authority");
assert(briefUiIdx < page.indexOf("Следующий шаг"), "UI: brief sits before Next Step");
assert(!briefUi.includes("border-amber"), "brief is not an amber warning");
assert(!briefUi.includes("border-emerald"), "brief is not resolved-green");
assert(!briefUi.includes("border-sky"), "brief is not the Next Step surface");
assert(!briefUi.includes("bg-red"), "brief does not use red urgency");
assert(briefUi.includes("border-zinc-300"), "brief uses a stronger zinc memo surface");
assert(!briefUi.includes("Решение Principal"), "v1 has no Principal response field");
assert(!briefUi.includes("Approve"), "v1 has no approve action");
assert(!copyUi.includes("Send to Principal"), "v1 does not send the brief");
assert(!page.includes("Email Principal"), "v1 has no email-Principal action");

console.log("Principal Decision Brief test passed.");
