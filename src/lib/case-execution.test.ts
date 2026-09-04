import { readFileSync } from "fs";
import path from "path";
import {
  RESOLVED_DETERMINING_FACT,
  SECTION_TITLES,
  normalizeAnalysisResult,
} from "@/core/orchestration/analysis-core";
import { normalizeLifecycleUpdate } from "@/lib/case-lifecycle";
import {
  closedLifecycleFromExecution,
  deriveExecutionSuggestion,
  executionNeedsReview,
  hasPendingExecution,
  hasStoredExecution,
  normalizeExecutionWrite,
} from "@/lib/case-execution";

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

const resolvedAnalysis = normalizeAnalysisResult({
  decisionStatus: "resolved",
  sections: rawSections({
    outcome: "Завершить сделку в согласованный срок.",
    fork: "Решение определено: завершить сделку в согласованный срок.",
    fact: RESOLVED_DETERMINING_FACT,
    actions: ["Завершить сделку в согласованный срок."],
  }),
});

const unresolvedAnalysis = normalizeAnalysisResult({
  decisionStatus: "unresolved",
  sections: rawSections({
    outcome: "Понять правовой статус объекта.",
    fork: "Завершать сделку сейчас — или ждать юридическое заключение.",
    fact: "Правовой статус объекта не установлен.",
    sources: [{ role: "Legal", result: "Заключение о правовом статусе." }],
    actions: ["Запросить у юриста заключение о правовом статусе."],
  }),
});

const suggestionA = deriveExecutionSuggestion({
  decisionStatus: "resolved",
  lifecycleState: "executing",
  analysis: resolvedAnalysis,
  execution: emptyExecution,
});
assert(suggestionA !== null, "A: suggestion available when resolved and no step");
assert(
  suggestionA?.step === "Завершить сделку в согласованный срок.",
  "A: step comes from resolved analysis action",
);

const applied = normalizeExecutionWrite({
  step: suggestionA?.step ?? "",
  owner: "Юрист / transaction team",
});
assert(applied.executionStep === "Завершить сделку в согласованный срок.", "B: step saved");
assert(applied.executionOwner === "Юрист / transaction team", "B: owner saved");
assert(applied.executionStatus === "pending", "B: apply starts as pending");

const storedPending = {
  executionStep: applied.executionStep,
  executionOwner: applied.executionOwner,
  executionStatus: applied.executionStatus,
};
assert(hasPendingExecution(storedPending), "B: pending execution is stored");
assert(
  deriveExecutionSuggestion({
    decisionStatus: "resolved",
    lifecycleState: "executing",
    analysis: resolvedAnalysis,
    execution: storedPending,
  }) === null,
  "B: no new suggestion while a step is stored",
);

const completed = {
  ...storedPending,
  executionStatus: "completed" as const,
};
assert(completed.executionStatus === "completed", "C: status completed");
assert(hasStoredExecution(completed), "C: completed step remains stored");
assert(
  !("lifecycleState" in completed),
  "C: completion patch does not include lifecycle closure",
);

const closed = normalizeLifecycleUpdate(closedLifecycleFromExecution());
assert(closed.lifecycleState === "closed", "D: existing lifecycle becomes closed");
assert(closed.blockerType === "none", "D: blocker cleared");
assert(closed.blockerNote === null, "D: blockerNote cleared");

const analysisBeforeClose = JSON.stringify(resolvedAnalysis);
assert(hasStoredExecution(completed), "C: completed execution remains stored after close");
assert(completed.executionStatus === "completed", "C: completed execution stays displayable");
assert(JSON.stringify(resolvedAnalysis) === analysisBeforeClose, "D: AI analysis remains untouched");
assert(resolvedAnalysis.decisionStatus === "resolved", "D: decisionStatus unchanged");
assert(
  deriveExecutionSuggestion({
    decisionStatus: "resolved",
    lifecycleState: "closed",
    analysis: resolvedAnalysis,
    execution: completed,
  }) === null,
  "Closed case does not get a new execution suggestion",
);

const storedAfterReopen = storedPending;
assert(
  executionNeedsReview("unresolved", storedAfterReopen),
  "E: pending step requires review when decision reopens",
);
assert(storedAfterReopen.executionStep === applied.executionStep, "E: pending step remains stored");
assert(hasPendingExecution(storedAfterReopen), "E: step is not auto-deleted");
assert(
  deriveExecutionSuggestion({
    decisionStatus: "unresolved",
    lifecycleState: "executing",
    analysis: unresolvedAnalysis,
    execution: storedAfterReopen,
  }) === null,
  "E: no fresh suggestion while the stored step awaits review",
);

assert(
  deriveExecutionSuggestion({
    decisionStatus: "unresolved",
    lifecycleState: "under_analysis",
    analysis: unresolvedAnalysis,
    execution: emptyExecution,
  }) === null,
  "F: unresolved case has no execution suggestion",
);

assert(
  deriveExecutionSuggestion({
    decisionStatus: "resolved",
    lifecycleState: "closed",
    analysis: resolvedAnalysis,
    execution: emptyExecution,
  }) === null,
  "Closed case has no execution suggestion",
);

const root = process.cwd();
const aiPaths = [
  "src/core/orchestration/analysis-ai.ts",
  "src/core/orchestration/analysis-generate.ts",
  "src/core/orchestration/analysis-fallback.ts",
  "src/core/orchestration/lifecycle-suggestion.ts",
  "src/app/analyze/actions.ts",
];
for (const relative of aiPaths) {
  const source = readFileSync(path.join(root, relative), "utf8");
  assert(
    !/\bexecutionStep\b/.test(source) &&
      !/\bexecutionOwner\b/.test(source) &&
      !/\bexecutionStatus\b/.test(source) &&
      !/\bexecutionUpdatedAt\b/.test(source),
    `B: ${relative} must not write execution fields`,
  );
}

const dialogueSource = readFileSync(path.join(root, "src/app/cases/[id]/dialogue-actions.ts"), "utf8");
const caseUpdateBlock = dialogueSource.slice(dialogueSource.indexOf("const caseUpdate"));
assert(
  !/\bexecutionStep\b/.test(caseUpdateBlock) &&
    !/\bexecutionOwner\b/.test(caseUpdateBlock) &&
    !/\bexecutionStatus\b/.test(caseUpdateBlock) &&
    !/\bexecutionUpdatedAt\b/.test(caseUpdateBlock),
  "B: dialogue analysis must not write Case execution fields",
);

console.log("Case execution test passed.");
