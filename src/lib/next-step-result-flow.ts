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
  if (input.lifecycleState === "closed") return false;
  if (input.executionPlacement === "history") return false;
  if (input.showFactGathering) return true;
  if (input.executionPlacement === "primary" && input.executionStatus === "pending") return true;
  return false;
}

export function formatNextStepResultMessage(userText: string): string {
  const trimmed = userText.trim();
  return `${NEXT_STEP_RESULT_PREFIX}${trimmed}`;
}

/** True only for messages framed by Next Step Result Flow. Not a semantic classifier. */
export function isNextStepResultMessage(text: string): boolean {
  return text.startsWith(NEXT_STEP_RESULT_PREFIX);
}

/** Evidence text from an explicit Next Step Result message. Empty/unframed input yields null. */
export function nextStepResultEvidence(text: string | null | undefined): string | null {
  if (!text || !isNextStepResultMessage(text)) return null;
  const remainder = text.slice(NEXT_STEP_RESULT_PREFIX.length).trim();
  return remainder || null;
}
