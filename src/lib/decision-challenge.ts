import type { DecisionChallenge } from "@/core/orchestration/analysis-core";

export const DECISION_CHALLENGE_KICKER = "Проверка решения";

export const DECISION_CHALLENGE_ROW_LABELS = {
  invalidationCondition: "Решение нужно пересмотреть, если",
  openAssumption: "Остаётся допущение",
  reviewTrigger: "Вернуться к решению, если",
} as const;

export type DecisionChallengeRow = {
  key: keyof typeof DECISION_CHALLENGE_ROW_LABELS;
  label: string;
  text: string;
};

export function hasDecisionChallenge(challenge?: DecisionChallenge | null): boolean {
  return Boolean(
    challenge?.invalidationCondition?.trim() ||
      challenge?.openAssumption?.trim() ||
      challenge?.reviewTrigger?.trim(),
  );
}

export function visibleDecisionChallengeRows(
  challenge?: DecisionChallenge | null,
): DecisionChallengeRow[] {
  if (!challenge) return [];
  const rows: DecisionChallengeRow[] = [];
  if (challenge.invalidationCondition?.trim()) {
    rows.push({
      key: "invalidationCondition",
      label: DECISION_CHALLENGE_ROW_LABELS.invalidationCondition,
      text: challenge.invalidationCondition.trim(),
    });
  }
  if (challenge.openAssumption?.trim()) {
    rows.push({
      key: "openAssumption",
      label: DECISION_CHALLENGE_ROW_LABELS.openAssumption,
      text: challenge.openAssumption.trim(),
    });
  }
  if (challenge.reviewTrigger?.trim()) {
    rows.push({
      key: "reviewTrigger",
      label: DECISION_CHALLENGE_ROW_LABELS.reviewTrigger,
      text: challenge.reviewTrigger.trim(),
    });
  }
  return rows;
}

export function shouldShowDecisionChallenge(input: {
  lifecycleState: string;
  challenge?: DecisionChallenge | null;
}): boolean {
  if (input.lifecycleState === "closed") return false;
  return visibleDecisionChallengeRows(input.challenge).length > 0;
}
