import { readFileSync } from "fs";
import path from "path";
import {
  RESOLVED_DETERMINING_FACT,
  SECTION_TITLES,
  normalizeAnalysisResult,
  normalizeCaseMemory,
} from "@/core/orchestration/analysis-core";
import { analysisPromptThinkingAndRules } from "@/core/orchestration/analysis-ai";
import { analysisCycleKey, appendDecisionCycle, buildDecisionCycleRecord, parseDecisionCycleHistory } from "@/lib/decision-cycle";
import { buildDecisionRecord, parseDecisionRecord } from "@/lib/decision-record";
import { derivePrincipalDecisionBrief } from "@/lib/principal-decision-brief";
import {
  PRINCIPAL_ANALYSIS_RETRY_ACTION,
  PRINCIPAL_ANALYSIS_RETRY_NOTICE,
  PRINCIPAL_DECISION_KICKER,
  PRINCIPAL_DECISION_MEMORY_PREFIX,
  PRINCIPAL_DECISION_MESSAGE_PREFIX,
  buildPrincipalDecision,
  formatPrincipalDecisionMessage,
  isDuplicatePrincipalCapture,
  isPrincipalDecisionHistoryMessage,
  parsePrincipalDecision,
  planPrincipalCapture,
  principalDecisionPromptBlock,
  rememberPrincipalDecision,
  shouldRetryPrincipalAnalysis,
  shouldShowCapturedPrincipalDecision,
  shouldShowPrincipalDecisionCapture,
  toHistoricalPrincipalDecision,
} from "@/lib/principal-decision";

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

const QUESTION = "Готовы ли мы принять остаточный юридический риск ради завершения сделки?";
const DECISION = "Продолжать сделку только при полном снятии юридического риска.";

const helper = readFileSync(path.join(root, "src/lib/principal-decision.ts"), "utf8");
const captureAction = readFileSync(path.join(root, "src/app/cases/[id]/principal-decision-actions.ts"), "utf8");
const dialogueActions = readFileSync(path.join(root, "src/app/cases/[id]/dialogue-actions.ts"), "utf8");
const page = readFileSync(path.join(root, "src/app/cases/[id]/page.tsx"), "utf8");
const briefUi = readFileSync(path.join(root, "src/app/cases/[id]/PrincipalDecisionBriefCard.tsx"), "utf8");
const captureUi = readFileSync(path.join(root, "src/app/cases/[id]/CapturePrincipalDecisionButton.tsx"), "utf8");
const capturedNoteUi = readFileSync(path.join(root, "src/app/cases/[id]/CapturedPrincipalDecisionNote.tsx"), "utf8");
const generateSource = readFileSync(path.join(root, "src/core/orchestration/analysis-generate.ts"), "utf8");
const analysisAi = readFileSync(path.join(root, "src/core/orchestration/analysis-ai.ts"), "utf8");
const schema = readFileSync(path.join(root, "prisma/schema.prisma"), "utf8");
const lifecycleActions = readFileSync(path.join(root, "src/app/cases/[id]/actions.ts"), "utf8");
const promptRules = analysisPromptThinkingAndRules();

const principalOwned = normalizeAnalysisResult({
  decisionStatus: "resolved",
  sections: rawSections({
    outcome: "Завершить сделку без недопустимого правового риска.",
    fork: "Решение определено: завершить сделку, приняв остаточный юридический риск.",
    fact: RESOLVED_DETERMINING_FACT,
    sources: [{ role: "Юрист", result: "Письменное заключение." }],
    actions: ["Получить решение Principal"],
  }),
  decisionAuthority: {
    owner: "principal",
    principalQuestion: QUESTION,
    reason: "Остаточный риск — ценностное суждение.",
  },
});

const familyOffice = normalizeAnalysisResult({
  decisionStatus: "unresolved",
  sections: rawSections({
    outcome: "Снять юридический риск.",
    fork: "Исправление снимает риск, либо риск остаётся.",
    fact: "Снимает ли заключение юриста риск.",
    sources: [{ role: "Юрист", result: "Письменное заключение." }],
    actions: ["Получить заключение юриста"],
  }),
  decisionAuthority: {
    owner: "family_office",
    reason: "Сначала нужен факт юриста.",
  },
});

const functionOwner = normalizeAnalysisResult({
  decisionStatus: "resolved",
  sections: rawSections({
    outcome: "Подать уведомление.",
    fork: "Решение определено: юрист подаёт уведомление.",
    fact: RESOLVED_DETERMINING_FACT,
    sources: [{ role: "Юрист", result: "Уведомление." }],
    actions: ["Подать уведомление"],
  }),
  decisionAuthority: {
    owner: "function_owner",
    functionOwner: "Юрист",
  },
});

const brief = derivePrincipalDecisionBrief({ analysis: principalOwned });
const captured = buildPrincipalDecision({
  decision: DECISION,
  question: QUESTION,
  analysis: principalOwned,
  cycleNumber: 1,
  decidedAt: new Date("2026-09-18T12:00:00.000Z"),
});

assert(brief !== null, "A: principal-owned case produces a brief");
assert(
  shouldShowPrincipalDecisionCapture({
    lifecycleState: "waiting_for_principal",
    authority: principalOwned.decisionAuthority,
    brief,
    analysis: principalOwned,
  }),
  "A: capture action is visible on a Principal-owned case",
);
assert(page.includes("showPrincipalCapture"), "A: workspace gates capture");
assert(briefUi.includes("CapturePrincipalDecisionButton"), "A: capture sits on the brief");
assert(captureUi.includes("Зафиксировать решение Principal"), "A: capture label");

assert(
  !shouldShowPrincipalDecisionCapture({
    lifecycleState: "under_analysis",
    authority: familyOffice.decisionAuthority,
    brief: derivePrincipalDecisionBrief({ analysis: familyOffice }),
    analysis: familyOffice,
  }),
  "B: family_office has no capture",
);
assert(
  !shouldShowPrincipalDecisionCapture({
    lifecycleState: "under_analysis",
    authority: functionOwner.decisionAuthority,
    brief: derivePrincipalDecisionBrief({ analysis: functionOwner }),
    analysis: functionOwner,
  }),
  "B: function_owner has no capture",
);
assert(
  !shouldShowPrincipalDecisionCapture({
    lifecycleState: "under_analysis",
    authority: undefined,
    brief: null,
    analysis: familyOffice,
  }),
  "B: missing authority has no capture",
);

assert(captured !== null, "C: structured capture can be built");
assert(captured?.decision === DECISION, "C: decision text is persisted");
assert(parsePrincipalDecision(captured)?.decision === DECISION, "C: parse round-trips");

assert(captured?.question === QUESTION, "D: question snapshot is stored");
assert(captured?.analysisKey === analysisCycleKey(principalOwned), "D: analysisKey is stored");
assert(captured?.cycleNumber === 1, "D: cycleNumber is stored");

const memory = rememberPrincipalDecision("- Подтверждён факт юриста.", DECISION);
assert(memory.includes(`${PRINCIPAL_DECISION_MEMORY_PREFIX} ${DECISION}`), "E: Principal decision is in caseMemory");
assert(rememberPrincipalDecision(memory, DECISION) === memory, "E: the same capture is not duplicated in memory");
assert(normalizeCaseMemory(memory).startsWith("- Решение Principal:"), "E: memory uses the existing cap helper");

assert(captureAction.includes("continueCaseAnalysis("), "F: capture reuses the existing continue path");
assert(captureAction.split("continueCaseAnalysis(").length - 1 === 1, "F: capture triggers one continue path");
assert(!captureAction.includes("postCaseMessage("), "F: capture does not create a duplicate user-message path");
assert(dialogueActions.split("continueAnalysis(").length - 1 === 1, "F: continueAnalysis still runs once");
assert(!captureAction.includes("generateAnalysis("), "F: no extra generateAnalysis");
assert(!captureAction.includes("openai"), "F: capture has no interpretation client");

assert(!captureAction.includes("decisionStatus:"), "G: capture does not assign decisionStatus");
assert(!helper.includes("decisionStatus:"), "G: helper does not force resolution");
assert(promptRules.includes("Do not force decisionStatus=resolved solely because Principal answered") || analysisAi.includes("не делает decisionStatus resolved") || analysisAi.includes("не форсирует resolved"), "G: prompt does not force resolved");

assert(analysisAi.includes("условное решение Principal не подтверждает внешний факт") || analysisAi.includes("Условное решение Principal"), "H: conditional decision is governing context");
assert(principalDecisionPromptBlock(captured).includes("A conditional decision"), "H: structured block keeps unresolved if X is unknown");

assert(principalDecisionPromptBlock(captured).includes("do not set decisionAuthority.owner=principal with the same principalQuestion again"), "I: same judgment is not re-asked");
assert(analysisAi.includes("CURRENT PRINCIPAL DECISION"), "I: continue analysis receives structured capture");
assert(dialogueActions.includes("currentPrincipalDecision"), "I: continue path passes structured capture");
assert(!helper.includes("startsWith(\"Решение Principal\")"), "I: later detection is not prefix matching");

assert(principalDecisionPromptBlock(captured).includes("If the remaining judgment is materially different, Principal may be needed again"), "J: a new Principal judgment remains possible");

assert(!captureAction.includes("updateCaseLifecycle"), "K: capture does not change lifecycle directly");
assert(!/caseUpdate[\s\S]*lifecycleState:/.test(dialogueActions), "K: continue update does not assign lifecycleState");

assert(!captureAction.includes("completeCaseExecution"), "L: capture does not mark execution completed");
assert(!/caseUpdate[\s\S]*executionStatus:/.test(dialogueActions), "L: continue update does not assign executionStatus");

assert(!captureAction.includes("closeCase"), "M: capture does not close the case");

assert(
  isDuplicatePrincipalCapture({ stored: captured, next: captured! }),
  "N: exact same capture is a duplicate",
);
assert(planPrincipalCapture({ stored: captured, next: captured! }) === "retry_analysis", "N: duplicate capture retries analysis only");
assert(captureAction.includes("planPrincipalCapture"), "N: capture uses the Principal-specific plan");
assert(captureAction.includes('plan === "retry_analysis"'), "N: duplicate capture does not rewrite structured fields");
assert(captureAction.includes('createUserMessage: false'), "N: analysis retry does not write another user message");

const archived = appendDecisionCycle(
  [],
  buildDecisionCycleRecord({
    analysis: principalOwned,
    execution: { executionStep: null, executionOwner: null, executionStatus: null },
    principalDecision: captured,
  }),
);
assert(Boolean(parseDecisionCycleHistory(archived)[0]?.principalDecision), "O: cycle archive keeps Principal decision");
assert(dialogueActions.includes("principalDecision: storedPrincipalDecision"), "O: continue archive writes principalDecision onto the cycle");
assert(dialogueActions.includes("caseUpdate.principalDecision = Prisma.DbNull"), "O: active capture is cleared after archive");

assert(lifecycleActions.includes("principalDecision: Prisma.DbNull"), "P: reopen/close clears active capture");
assert(
  !shouldShowPrincipalDecisionCapture({
    lifecycleState: "under_analysis",
    authority: principalOwned.decisionAuthority,
    brief,
    stored: captured,
    analysis: principalOwned,
  }),
  "P: same analysisKey capture does not stay as a new-cycle answer control",
);

const record = buildDecisionRecord({
  closedAt: "2026-09-18T12:00:00.000Z",
  cycleNumber: 1,
  analysis: principalOwned,
  execution: { executionStep: null, executionOwner: null, executionStatus: null },
  principalDecision: captured,
});
assert(record.principalDecision?.decision === DECISION, "Q: Decision Record can keep historical Principal decision");
assert(record.principalDecision?.question === QUESTION, "Q: Decision Record keeps the question snapshot");
assert(parseDecisionRecord(record)?.principalDecision?.decision === DECISION, "Q: old records remain parseable with the optional field");
assert(!("analysisKey" in (toHistoricalPrincipalDecision(captured) ?? {})), "Q: historical record omits analysisKey");
assert(parseDecisionRecord({ ...record, principalDecision: undefined })?.principalDecision === undefined, "Q: old cases without the field stay valid");

assert(
  !shouldShowPrincipalDecisionCapture({
    lifecycleState: "closed",
    authority: principalOwned.decisionAuthority,
    brief,
    analysis: principalOwned,
  }),
  "R: normal closed case has no active capture",
);
assert(
  !shouldShowCapturedPrincipalDecision({
    lifecycleState: "closed",
    briefVisible: false,
    stored: captured,
  }),
  "R: closed case does not show the active capture note",
);

assert(principalDecisionPromptBlock(captured).includes("Do not treat Principal opinion as confirmation of an external fact"), "S: Principal opinion is not external evidence");
assert(analysisAi.includes("не подтверждает внешний факт"), "S: prompt preserves fact/judgment distinction");
assert(!helper.includes("resolvingEvidence"), "S: capture helper does not write Decision Support evidence");

assert(generateSource.includes("continueAnalysisWithAI"), "T: the existing continue call remains the analysis path");
assert(!captureAction.includes("continueAnalysisWithAI"), "T: capture adds no extra AI client");
assert((analysisAi.match(/callOpenAIAnalysis/g) ?? []).length > 0, "T: continue still uses the one analysis call");

assert(captureAction.includes("DecisionChangeSummaryPayload"), "U: capture returns the existing change summary");
assert(captureUi.includes("storeDecisionChangeSummary"), "U: UI stores Что изменилось from the same payload");
assert(dialogueActions.includes("buildDecisionChangeSummary"), "U: Decision Change Summary still runs after continue");

assert(page.includes("showPrincipalBrief && principalBrief"), "V: brief remains the Principal request surface");
assert(captureUi.includes("formatPrincipalDecisionBriefText") === false, "V: capture does not rewrite the brief copy");
assert(briefUi.includes("formatPrincipalDecisionBriefText(brief)"), "V: copied brief stays the request model");
assert(PRINCIPAL_DECISION_KICKER === "Решение Principal зафиксировано", "V: wording is recorded, not approved");
assert(!captureUi.includes("Principal approved"), "V: no approval semantics");
assert(!captureUi.includes("Approve"), "V: no approve button");
assert(formatPrincipalDecisionMessage(DECISION).startsWith(PRINCIPAL_DECISION_MESSAGE_PREFIX), "dialogue history uses a labeled line");

assert(schema.includes("principalDecision"), "schema adds nullable current-cycle JSON");
assert(!schema.includes("model PrincipalApproval"), "no approvals table");
assert(captureUi.includes("submitLockRef"), "client lock prevents double submit");
assert(captureUi.includes('"use client"'), "dialog is client-side");
assert(!captureUi.includes("bg-emerald"), "no approval-green buttons");
assert(!captureUi.includes("bg-red-"), "no reject-red buttons");
assert(PRINCIPAL_ANALYSIS_RETRY_NOTICE === "Решение Principal сохранено. Не удалось обновить разбор.", "UI names analysis retry without implying the decision was lost");
assert(captureUi.includes("PRINCIPAL_ANALYSIS_RETRY_NOTICE"), "capture dialog uses the saved-decision retry notice");
assert(PRINCIPAL_ANALYSIS_RETRY_ACTION === "Обновить разбор", "retry action does not ask to retype the decision");
assert(capturedNoteUi.includes("PRINCIPAL_ANALYSIS_RETRY_ACTION"), "captured note can retry analysis");
assert(page.includes("showRetryPrincipalAnalysis"), "workspace can retry analysis after a stored Principal decision");
assert(
  !shouldShowPrincipalDecisionCapture({
    lifecycleState: "waiting_for_principal",
    authority: principalOwned.decisionAuthority,
    brief,
    stored: captured,
    analysis: principalOwned,
  }),
  "same stored capture hides the capture form even if analysis still says owner=principal",
);
assert(
  shouldShowCapturedPrincipalDecision({
    lifecycleState: "waiting_for_principal",
    briefVisible: true,
    stored: captured,
    analysis: principalOwned,
  }),
  "stored capture remains visible while the old analysis still asks Principal",
);
assert(
  shouldRetryPrincipalAnalysis({
    lifecycleState: "waiting_for_principal",
    stored: captured,
    analysis: principalOwned,
  }),
  "stored capture on the current analysisKey can retry analysis",
);
assert(
  isPrincipalDecisionHistoryMessage(formatPrincipalDecisionMessage(DECISION), DECISION),
  "history matching is exact formatted Principal capture text",
);

console.log("Principal Decision Capture test passed.");
