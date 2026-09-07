import { readFileSync } from "node:fs";
import path from "node:path";
import {
  formatNextStepResultMessage,
  NEXT_STEP_RESULT_PREFIX,
  shouldShowNextStepResultAction,
  visibleNextStepReportText,
} from "./next-step-result-flow";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

// A. open unresolved case with next step → action visible
assert(
  shouldShowNextStepResultAction({
    visibleStepText: "Получить письменное заключение юриста",
    lifecycleState: "under_analysis",
    reopenSuggestionVisible: false,
    showFactGathering: true,
    executionPlacement: "none",
    executionStatus: null,
  }),
  "A: unresolved case with next step shows result action",
);

// B. visibility helpers derive report text from analysis next step
const unresolvedText = visibleNextStepReportText({
  showFactGathering: true,
  nextStepPrimary: "Получить ответ муниципалитета",
  executionPlacement: "none",
  executionStep: null,
  executionStatus: null,
});
assert(unresolvedText === "Получить ответ муниципалитета", "B: report text comes from fact-gathering next step");

// F. closed + reopenSuggestion → hidden
assert(
  !shouldShowNextStepResultAction({
    visibleStepText: "Получить ответ муниципалитета",
    lifecycleState: "closed",
    reopenSuggestionVisible: true,
    showFactGathering: true,
    executionPlacement: "none",
    executionStatus: null,
  }),
  "F: closed case with reopen suggestion hides result action on obsolete step",
);

// G. resolved + pending execution step → may show
assert(
  shouldShowNextStepResultAction({
    visibleStepText: "Подписать договор",
    lifecycleState: "executing",
    reopenSuggestionVisible: false,
    showFactGathering: false,
    executionPlacement: "primary",
    executionStatus: "pending",
  }),
  "G: resolved case with pending execution may show result action",
);

const executionText = visibleNextStepReportText({
  showFactGathering: false,
  nextStepPrimary: null,
  executionPlacement: "primary",
  executionStep: "Подписать договор",
  executionStatus: "pending",
});
assert(executionText === "Подписать договор", "G: report text comes from pending execution step");

// hide when no step
assert(
  !shouldShowNextStepResultAction({
    visibleStepText: null,
    lifecycleState: "under_analysis",
    reopenSuggestionVisible: false,
    showFactGathering: false,
    executionPlacement: "none",
    executionStatus: null,
  }),
  "hide when no visible next step",
);

// hide historical execution
assert(
  !shouldShowNextStepResultAction({
    visibleStepText: "Старый шаг",
    lifecycleState: "closed",
    reopenSuggestionVisible: false,
    showFactGathering: false,
    executionPlacement: "history",
    executionStatus: "completed",
  }),
  "hide for historical/completed execution only",
);

// closed without pending execution
assert(
  !shouldShowNextStepResultAction({
    visibleStepText: "Получить ответ",
    lifecycleState: "closed",
    reopenSuggestionVisible: false,
    showFactGathering: true,
    executionPlacement: "none",
    executionStatus: null,
  }),
  "closed case without active operational step hides result action",
);

// C. message framing for submit
assert(
  formatNextStepResultMessage("Юрист подтвердил письменно, что риск снимается.") ===
    `${NEXT_STEP_RESULT_PREFIX}Юрист подтвердил письменно, что риск снимается.`,
  "C: result message is framed for dialogue history without completion assumptions",
);

const root = process.cwd();
const dialogue = readFileSync(path.join(root, "src/app/cases/[id]/CaseDialogue.tsx"), "utf8");
const dialogueLauncher = readFileSync(path.join(root, "src/app/cases/[id]/CaseDialogueLauncher.tsx"), "utf8");
const dialogueActions = readFileSync(path.join(root, "src/app/cases/[id]/dialogue-actions.ts"), "utf8");
const page = readFileSync(path.join(root, "src/app/cases/[id]/page.tsx"), "utf8");
const executionPanel = readFileSync(path.join(root, "src/app/cases/[id]/CaseExecutionPanel.tsx"), "utf8");
const schema = readFileSync(path.join(root, "prisma/schema.prisma"), "utf8");

// C. same postCaseMessage path, no extra server action
assert(dialogue.includes("postCaseMessage(caseId, messageText)"), "C: submit uses postCaseMessage");
assert(!dialogueActions.includes("next_step_result"), "C: server action has no separate result mode");
assert(!dialogueActions.includes("nextStepResult"), "C: server action has no duplicate result path");

// B. dialogue mode wiring
assert(dialogueLauncher.includes('setMode("next_step_result")'), "B: launcher opens next-step-result mode");
assert(dialogueLauncher.includes("Результат следующего шага"), "B: result mode title");
assert(dialogue.includes("Текущий шаг"), "B: current step context label in dialogue");
assert(dialogue.includes("formatNextStepResultMessage"), "B: client frames result text only");

// D/E. decision change summary path unchanged
assert(dialogue.includes("storeDecisionChangeSummary"), "D/E: decision change summary still stored after submit");

// H. execution completion remains human-controlled
assert(executionPanel.includes("completeCaseExecution"), "H: explicit Выполнено path remains");
assert(!dialogue.includes("completeCaseExecution"), "H: result submit does not auto-complete execution");
assert(!/caseUpdate[\s\S]*executionStatus/.test(dialogueActions), "H: postCaseMessage case update does not write execution status");

// I. general circumstance entry unchanged
assert(dialogueLauncher.includes("Добавить новое обстоятельство"), "I: circumstance launcher copy unchanged");
assert(dialogueLauncher.includes('setMode("circumstance")'), "I: circumstance mode still available");

// J. no duplicate persistence
assert(!schema.includes("StepResult"), "J: no StepResult model");
assert(!schema.includes("model Task"), "J: no Task model");
assert(!page.includes("nextStepResult"), "J: no persisted nextStepResult field on page");

console.log("Next Step Result Flow test passed.");
