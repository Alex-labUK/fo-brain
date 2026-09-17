import { shouldShowRelevantPastDecisions } from "@/lib/relevant-past-decisions";
import type { RelevantPastDecision } from "@/lib/relevant-past-decisions";
import type { RelevantPrinciple } from "@/lib/relevant-principles";

export const REASONING_CONTEXT_ROLE_LINE =
  "Контекст помогает проверить логику решения, но не заменяет факты текущего кейса.";

export function shouldShowReasoningContext(input: {
  lifecycleState: string;
  reopenSuggestionVisible: boolean;
}): boolean {
  return shouldShowRelevantPastDecisions(input);
}

export function hasReasoningContextContent(input: {
  principles: RelevantPrinciple[];
  pastDecisions: RelevantPastDecision[];
}): boolean {
  return input.principles.length > 0 || input.pastDecisions.length > 0;
}
