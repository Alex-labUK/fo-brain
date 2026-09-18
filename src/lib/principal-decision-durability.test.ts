import { readFileSync } from "fs";
import path from "path";
import {
  RESOLVED_DETERMINING_FACT,
  SECTION_TITLES,
  normalizeAnalysisResult,
} from "@/core/orchestration/analysis-core";
import {
  PRINCIPAL_ANALYSIS_RETRY_ACTION,
  PRINCIPAL_ANALYSIS_RETRY_NOTICE,
  PRINCIPAL_DECISION_MEMORY_PREFIX,
  buildPrincipalDecision,
  formatPrincipalDecisionMessage,
  isPrincipalDecisionHistoryMessage,
  planPrincipalCapture,
  rememberPrincipalDecision,
  type PrincipalDecisionRecord,
} from "@/lib/principal-decision";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

const root = process.cwd();
const helper = readFileSync(path.join(root, "src/lib/principal-decision.ts"), "utf8");
const captureAction = readFileSync(path.join(root, "src/app/cases/[id]/principal-decision-actions.ts"), "utf8");
const dialogueActions = readFileSync(path.join(root, "src/app/cases/[id]/dialogue-actions.ts"), "utf8");
const captureUi = readFileSync(path.join(root, "src/app/cases/[id]/CapturePrincipalDecisionButton.tsx"), "utf8");
const capturedNoteUi = readFileSync(path.join(root, "src/app/cases/[id]/CapturedPrincipalDecisionNote.tsx"), "utf8");
const page = readFileSync(path.join(root, "src/app/cases/[id]/page.tsx"), "utf8");

const QUESTION = "Готовы ли мы принять остаточный юридический риск ради завершения сделки?";
const DECISION = "Продолжать сделку только при полном снятии юридического риска.";
const OTHER_DECISION = "Отказаться от сделки.";

const principalOwned = normalizeAnalysisResult({
  decisionStatus: "resolved",
  sections: [
    { title: SECTION_TITLES[0], content: "Завершить сделку без недопустимого правового риска." },
    { title: SECTION_TITLES[1], content: "Решение определено: завершить сделку, приняв остаточный юридический риск." },
    { title: SECTION_TITLES[2], content: RESOLVED_DETERMINING_FACT },
    { title: SECTION_TITLES[3], roleAssignments: [{ role: "Юрист", result: "Письменное заключение." }] },
    { title: SECTION_TITLES[4], actions: ["Получить решение Principal"] },
  ],
  decisionAuthority: {
    owner: "principal",
    principalQuestion: QUESTION,
    reason: "Остаточный риск — ценностное суждение.",
  },
});

const next = buildPrincipalDecision({
  decision: DECISION,
  question: QUESTION,
  analysis: principalOwned,
  cycleNumber: 1,
  decidedAt: new Date("2026-09-18T12:00:00.000Z"),
});
assert(next !== null, "fixture capture can be built");

type CaptureState = {
  principalDecision: PrincipalDecisionRecord | null;
  memory: string;
  history: { role: string; content: string }[];
  analysisCalls: number;
};

function historyCount(state: CaptureState, decision: string): number {
  return state.history.filter(
    (message) => message.role === "user" && isPrincipalDecisionHistoryMessage(message.content, decision),
  ).length;
}

function memoryCount(memory: string, decision: string): number {
  return memory.split(/\r?\n/).filter((line) => line.includes(`${PRINCIPAL_DECISION_MEMORY_PREFIX} ${decision}`)).length;
}

function persistHumanCapture(state: CaptureState, record: PrincipalDecisionRecord): void {
  state.principalDecision = record;
  state.memory = rememberPrincipalDecision(state.memory, record.decision);
  if (historyCount(state, record.decision) === 0) {
    state.history.push({
      role: "user",
      content: formatPrincipalDecisionMessage(record.decision),
    });
  }
}

function runPrincipalCapture(
  state: CaptureState,
  record: PrincipalDecisionRecord,
  input: { persistFails?: boolean; aiFails?: boolean } = {},
): { persistCalled: boolean; aiCalled: boolean; persistFailed: boolean; analysisUpdated: boolean } {
  const plan = planPrincipalCapture({ stored: state.principalDecision, next: record });
  if (plan === "noop") {
    return { persistCalled: false, aiCalled: false, persistFailed: false, analysisUpdated: false };
  }
  let persistCalled = false;
  if (plan === "persist_then_analyze") {
    if (input.persistFails) {
      return { persistCalled: false, aiCalled: false, persistFailed: true, analysisUpdated: false };
    }
    persistHumanCapture(state, record);
    persistCalled = true;
  }
  state.analysisCalls += 1;
  if (input.aiFails) {
    return { persistCalled, aiCalled: true, persistFailed: false, analysisUpdated: false };
  }
  return { persistCalled, aiCalled: true, persistFailed: false, analysisUpdated: true };
}

const persistIdx = captureAction.indexOf("await prisma.$transaction");
const analyzeAfterPersistIdx = captureAction.indexOf("return rerunPrincipalCaptureAnalysis(caseId, next)");
const retryPlanIdx = captureAction.indexOf('plan === "retry_analysis"');
assert(persistIdx >= 0, "capture persists in a transaction");
assert(analyzeAfterPersistIdx > persistIdx, "C: continueAnalysis runs only after human persistence");
assert(retryPlanIdx >= 0 && retryPlanIdx < persistIdx, "duplicate capture skips the persist transaction");
assert(captureAction.includes("createUserMessage: false"), "analysis retry does not create another user message");
assert(dialogueActions.includes("splitHistoryAroundMessage"), "existing continue path can reuse the stored Principal message");
assert(
  /if \(createUserMessage\) \{\s*await prisma\.caseMessage\.create\(\{[\s\S]*AI_UNAVAILABLE_REPLY/.test(dialogueActions),
  "AI unavailable assistant line is not written on a Principal analysis retry",
);

const failedAi: CaptureState = { principalDecision: null, memory: "- Подтверждён факт юриста.", history: [], analysisCalls: 0 };
const failedResult = runPrincipalCapture(failedAi, next!, { aiFails: true });
assert(failedResult.persistCalled, "A: human capture is persisted before analysis");
assert(failedResult.aiCalled, "A: existing continueAnalysis still runs once");
assert(!failedResult.analysisUpdated, "A: AI failure does not count as an updated analysis");
assert(failedAi.principalDecision?.decision === DECISION, "A: principalDecision remains stored");
assert(memoryCount(failedAi.memory, DECISION) === 1, "A: memory remains stored once");
assert(historyCount(failedAi, DECISION) === 1, "A: one history entry remains stored");

const retryAfterFailure = runPrincipalCapture(failedAi, next!, { aiFails: false });
assert(!retryAfterFailure.persistCalled, "B: retry after AI failure does not persist again");
assert(retryAfterFailure.aiCalled, "B: retry reruns analysis");
assert(retryAfterFailure.analysisUpdated, "B: retry can complete analysis");
assert(failedAi.analysisCalls === 2, "B: analysis ran twice total");
assert(memoryCount(failedAi.memory, DECISION) === 1, "B: no duplicate memory line");
assert(historyCount(failedAi, DECISION) === 1, "B: no duplicate Principal user-history line");
assert(failedAi.principalDecision?.decision === DECISION, "B: no second principalDecision");

const success: CaptureState = { principalDecision: null, memory: "", history: [], analysisCalls: 0 };
const successResult = runPrincipalCapture(success, next!, { aiFails: false });
assert(successResult.persistCalled, "C: normal capture persists human input once");
assert(successResult.aiCalled, "C: normal capture runs continueAnalysis once");
assert(success.analysisCalls === 1, "C: one continueAnalysis");
assert(memoryCount(success.memory, DECISION) === 1, "C: one memory line");
assert(historyCount(success, DECISION) === 1, "C: one history entry");

const persistFail: CaptureState = { principalDecision: null, memory: "", history: [], analysisCalls: 0 };
const persistFailResult = runPrincipalCapture(persistFail, next!, { persistFails: true, aiFails: false });
assert(persistFailResult.persistFailed, "D: persistence transaction can fail");
assert(!persistFailResult.aiCalled, "D: AI is not called when persistence fails");
assert(persistFail.principalDecision === null, "D: no partial principalDecision write");
assert(persistFail.memory === "", "D: no partial memory write");
assert(persistFail.history.length === 0, "D: no partial history write");
assert(captureAction.indexOf("prisma.case.update") > persistIdx, "D: decision and memory are inside the transaction");
assert(captureAction.indexOf("prisma.caseMessage.create") > persistIdx, "D: history is inside the transaction");

const afterSuccess = runPrincipalCapture(success, next!, { aiFails: false });
assert(!afterSuccess.persistCalled, "E: duplicate same capture after success does not persist again");
assert(memoryCount(success.memory, DECISION) === 1, "E: no duplicate memory");
assert(historyCount(success, DECISION) === 1, "E: no duplicate history");
assert(planPrincipalCapture({ stored: success.principalDecision, next: next! }) === "retry_analysis", "E: same capture is analysis-only");
const edited = buildPrincipalDecision({
  decision: OTHER_DECISION,
  question: QUESTION,
  analysis: principalOwned,
  cycleNumber: 1,
  decidedAt: new Date("2026-09-18T12:05:00.000Z"),
});
assert(planPrincipalCapture({ stored: success.principalDecision, next: edited! }) === "noop", "E: same analysisKey does not overwrite a different decision");

assert(!captureAction.includes("decisionStatus:"), "F: capture does not assign decisionStatus");
assert(!captureAction.includes("updateCaseLifecycle"), "F: capture does not change lifecycle directly");
assert(!captureAction.includes("completeCaseExecution"), "F: capture does not mark execution completed");
assert(!/caseUpdate[\s\S]*lifecycleState:/.test(dialogueActions), "F: continue update does not assign lifecycleState");
assert(!/caseUpdate[\s\S]*executionStatus:/.test(dialogueActions), "F: continue update does not assign executionStatus");
assert(!helper.includes("decisionStatus:"), "F: helper does not force resolution");

assert(!captureAction.includes("principalDecision: Prisma.DbNull"), "AI failure does not roll back principalDecision");
assert(!captureAction.includes("caseMessage.delete"), "AI failure does not delete the Principal history line");
assert(PRINCIPAL_ANALYSIS_RETRY_NOTICE === "Решение Principal сохранено. Не удалось обновить разбор.", "UI keeps the saved-decision wording after analysis failure");
assert(captureUi.includes("PRINCIPAL_ANALYSIS_RETRY_NOTICE"), "capture dialog uses the saved-decision retry notice");
assert(captureUi.includes("analysisUpdated"), "UI distinguishes saved decision from failed analysis");
assert(PRINCIPAL_ANALYSIS_RETRY_ACTION === "Обновить разбор", "retry action does not ask to retype the decision");
assert(capturedNoteUi.includes("PRINCIPAL_ANALYSIS_RETRY_ACTION"), "page retry does not ask the user to retype the decision");
assert(page.includes("showRetryPrincipalAnalysis"), "workspace exposes analysis retry after capture");
assert(page.includes("showCapture={showPrincipalCapture}"), "capture form stays gated after the decision is stored");

console.log("Principal Decision Capture durability test passed.");
