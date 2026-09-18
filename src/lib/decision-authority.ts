import type { DecisionAuthority } from "@/core/orchestration/analysis-core";

export const DECISION_AUTHORITY_KICKER = "Кто принимает решение";

export const DECISION_AUTHORITY_OWNER_LABELS = {
  family_office: "Family Office",
  principal: "Нужна позиция Principal",
  function_owner: "Владелец функции",
  unclear: "Неясно",
} as const;

export function decisionAuthorityHeadline(authority: DecisionAuthority): string {
  if (authority.owner === "function_owner" && authority.functionOwner?.trim()) {
    return authority.functionOwner.trim();
  }
  return DECISION_AUTHORITY_OWNER_LABELS[authority.owner];
}

export function shouldShowDecisionAuthority(input: {
  lifecycleState: string;
  authority?: DecisionAuthority | null;
}): boolean {
  if (input.lifecycleState === "closed") return false;
  if (!input.authority) return false;
  if (input.authority.owner === "unclear") return false;
  if (input.authority.owner === "principal" && !input.authority.principalQuestion?.trim()) return false;
  if (input.authority.owner === "function_owner" && !input.authority.functionOwner?.trim()) return false;
  return true;
}
