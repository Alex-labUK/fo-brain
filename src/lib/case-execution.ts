import type { AnalysisResult, DecisionStatus } from "@/core/orchestration/analysis-core";
import { SECTION_TITLES } from "@/core/orchestration/analysis-core";
import type { CaseLifecycleState } from "@prisma/client";

export const EXECUTION_STATUSES = ["pending", "completed"] as const;

export type ExecutionStatus = (typeof EXECUTION_STATUSES)[number];

export type ExecutionSuggestion = {
  step: string;
  owner?: string;
  reason: string;
};

export type StoredExecution = {
  executionStep: string | null;
  executionOwner: string | null;
  executionStatus: ExecutionStatus | null;
};

export type ExecutionWriteInput = {
  step: string;
  owner?: string | null;
};

export type NormalizedExecutionWrite = {
  executionStep: string;
  executionOwner: string | null;
  executionStatus: ExecutionStatus;
};

const RESOLUTION_FORK_PREFIX = /^решение определено:\s*/i;

export const executionStatusLabels: Record<ExecutionStatus, string> = {
  pending: "В работе",
  completed: "Выполнено",
};

export function isExecutionStatus(value: unknown): value is ExecutionStatus {
  return value === "pending" || value === "completed";
}

function sectionContent(analysis: AnalysisResult, title: string): string {
  return analysis.sections.find((section) => section.title === title)?.content?.trim() || "";
}

function sectionActions(analysis: AnalysisResult): string[] {
  return analysis.sections.find((section) => section.title === SECTION_TITLES[4])?.actions ?? [];
}

function sectionRoles(analysis: AnalysisResult): string[] {
  return (
    analysis.sections
      .find((section) => section.title === SECTION_TITLES[3])
      ?.roleAssignments?.map((assignment) => assignment.role.trim())
      .filter(Boolean) ?? []
  );
}

function resolutionStepFromFork(fork: string): string {
  const stripped = fork.replace(RESOLUTION_FORK_PREFIX, "").trim();
  return stripped || fork;
}

/** Current stored step, if any. Completed history still counts as a stored step. */
export function hasStoredExecution(execution: StoredExecution): boolean {
  return Boolean(execution.executionStep?.trim()) && isExecutionStatus(execution.executionStatus);
}

export function hasPendingExecution(execution: StoredExecution): boolean {
  return Boolean(execution.executionStep?.trim()) && execution.executionStatus === "pending";
}

/**
 * Pending execution is no longer unquestionably valid once the decision reopens.
 * Do not auto-delete or replace the stored step.
 */
export function executionNeedsReview(
  decisionStatus: DecisionStatus | undefined,
  execution: StoredExecution,
): boolean {
  return decisionStatus === "unresolved" && hasPendingExecution(execution);
}

export function normalizeExecutionWrite(input: ExecutionWriteInput): NormalizedExecutionWrite {
  const executionStep = input.step.trim();
  if (!executionStep) {
    throw new Error("Шаг исполнения обязателен");
  }

  const owner = input.owner?.trim() || null;

  return {
    executionStep,
    executionOwner: owner,
    executionStatus: "pending",
  };
}

export function closedLifecycleFromExecution(): {
  lifecycleState: "closed";
  blockerType: "none";
  blockerNote: null;
} {
  return {
    lifecycleState: "closed",
    blockerType: "none",
    blockerNote: null,
  };
}

/**
 * Deterministic advisory suggestion from a resolved analysis.
 * No extra AI call. Not a source of truth until a human applies it.
 */
export function deriveExecutionSuggestion(input: {
  decisionStatus?: DecisionStatus;
  lifecycleState: CaseLifecycleState;
  analysis: AnalysisResult | null;
  execution: StoredExecution;
}): ExecutionSuggestion | null {
  if (input.lifecycleState === "closed") return null;
  if (input.decisionStatus !== "resolved") return null;
  if (hasStoredExecution(input.execution)) return null;
  if (!input.analysis) return null;

  const actions = sectionActions(input.analysis);
  const fork = sectionContent(input.analysis, SECTION_TITLES[1]);
  const step = actions[0]?.trim() || (fork ? resolutionStepFromFork(fork) : "");
  if (!step) return null;

  const owner = sectionRoles(input.analysis)[0];
  const suggestion: ExecutionSuggestion = {
    step,
    reason: "Решение определено. Следующий шаг взят из текущего разбора.",
  };
  if (owner) {
    suggestion.owner = owner;
  }

  return suggestion;
}
