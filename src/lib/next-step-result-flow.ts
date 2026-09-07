import type { WorkspaceExecutionPlacement } from "@/lib/case-workspace";

export const NEXT_STEP_RESULT_PREFIX = "Результат текущего шага: ";

export type NextStepResultVisibilityInput = {
  visibleStepText: string | null;
  lifecycleState: string;
  reopenSuggestionVisible: boolean;
  showFactGathering: boolean;
  executionPlacement: WorkspaceExecutionPlacement;
  executionStatus: string | null;
};

export function visibleNextStepReportText(input: {
  showFactGathering: boolean;
  nextStepPrimary: string | null;
  executionPlacement: WorkspaceExecutionPlacement;
  executionStep: string | null;
  executionStatus: string | null;
}): string | null {
  if (input.showFactGathering && input.nextStepPrimary?.trim()) {
    return input.nextStepPrimary.trim();
  }
  if (
    input.executionPlacement === "primary" &&
    input.executionStatus === "pending" &&
    input.executionStep?.trim()
  ) {
    return input.executionStep.trim();
  }
  return null;
}

export function shouldShowNextStepResultAction(input: NextStepResultVisibilityInput): boolean {
  if (!input.visibleStepText?.trim()) return false;
  if (input.reopenSuggestionVisible) return false;
  if (input.lifecycleState === "closed") {
    return input.executionStatus === "pending";
  }
  if (input.executionPlacement === "history") return false;
  if (input.showFactGathering) return true;
  if (input.executionPlacement === "primary" && input.executionStatus === "pending") return true;
  return false;
}

export function formatNextStepResultMessage(userText: string): string {
  const trimmed = userText.trim();
  return `${NEXT_STEP_RESULT_PREFIX}${trimmed}`;
}
