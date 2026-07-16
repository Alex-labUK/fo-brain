import type { ActivationStatus, CaseStatus, OutcomeStage, PrincipleStatus } from "@prisma/client";

export const caseStatusLabels: Record<CaseStatus, string> = {
  hypothetical: "Гипотетический",
  real_in_progress: "Реальный, в процессе",
  real_closed: "Реальный, закрыт",
};

export const principleStatusLabels: Record<PrincipleStatus, string> = {
  candidate: "Кандидат",
  pattern: "Паттерн",
  principle: "Принцип",
  explicit_stated: "Явно заявлен",
};

export const domainLabels: Record<string, string> = {
  dispute_responsibility: "Спор / ответственность",
  value_laden_intent: "Ценностное намерение",
  admin_compliance: "Админ / комплаенс",
  structural_deal: "Структурная сделка",
  hiring_thirdparty_risk: "Найм / риск третьих лиц",
};

export const knownDomains = Object.keys(domainLabels);

export const outcomeStageLabels: Record<OutcomeStage, string> = {
  draft: "Черновик",
  active: "Активный",
  cancelled: "Отменён",
};

export const activationStatusLabels: Record<ActivationStatus, string> = {
  proposed: "Предложена",
  confirmed: "Подтверждена",
  excluded: "Исключена",
};

export const ownerRoleLabels: Record<string, string> = {
  travel_manager: "Travel manager",
  house_manager: "House manager",
  legal_counsel: "Legal counsel",
  hr_manager: "HR manager",
  banking_ops: "Banking ops",
  security_lead: "Security lead",
  insurance_coordinator: "Insurance coordinator",
  education_coordinator: "Education coordinator",
  property_manager: "Property manager",
  executive_assistant: "Executive assistant",
};

export function formatOwnerRole(roleKey: string | null | undefined): string {
  if (!roleKey) return "—";
  return ownerRoleLabels[roleKey] ?? roleKey;
}

export function formatDomain(domain: string): string {
  return domainLabels[domain] ?? domain;
}

export function caseStatusBadgeClass(status: CaseStatus): string {
  switch (status) {
    case "hypothetical":
      return "bg-violet-100 text-violet-800";
    case "real_in_progress":
      return "bg-amber-100 text-amber-800";
    case "real_closed":
      return "bg-emerald-100 text-emerald-800";
  }
}

export function principleStatusBadgeClass(status: PrincipleStatus): string {
  switch (status) {
    case "candidate":
      return "bg-zinc-100 text-zinc-700";
    case "pattern":
      return "bg-sky-100 text-sky-800";
    case "principle":
      return "bg-indigo-100 text-indigo-800";
    case "explicit_stated":
      return "bg-rose-100 text-rose-800";
  }
}

export function outcomeStageBadgeClass(status: OutcomeStage): string {
  switch (status) {
    case "draft":
      return "bg-zinc-100 text-zinc-700";
    case "active":
      return "bg-emerald-100 text-emerald-800";
    case "cancelled":
      return "bg-red-100 text-red-800";
  }
}

export function activationStatusBadgeClass(status: ActivationStatus): string {
  switch (status) {
    case "proposed":
      return "bg-amber-100 text-amber-800";
    case "confirmed":
      return "bg-emerald-100 text-emerald-800";
    case "excluded":
      return "bg-zinc-200 text-zinc-600";
  }
}
