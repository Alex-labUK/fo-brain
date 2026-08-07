import type { ActivationStatus, CaseStatus, OutcomeStage, PrincipleStatus } from "@prisma/client";

export const caseStatusLabels: Record<CaseStatus, string> = {
  hypothetical: "Гипотетический",
  real_in_progress: "Реальный, в процессе",
  real_closed: "Реальный, закрыт",
  cancelled: "Отменён",
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
  family_capacity_boundary: "Дееспособность / защита третьих лиц",
  personnel_reputational: "Персонал / репутация",
  structural_asset_registry: "Структурные реестры активов",
  family_mandate_conflict: "Конфликт мандата внутри семьи",
  security_threat: "Угроза безопасности",
  routine_expense_relationship: "Рутинный расход и личные отношения",
  project_budget_ceiling: "Бюджет проекта / потолок расходов",
  medical_travel_readiness: "Медицинская готовность к поездке",
  bank_payment_restriction: "Банковское ограничение платежа",
  succession_mandate_boundary: "Передача полномочий преемнику",
  philanthropy_naming_gift: "Благотворительность / именной дар",
  staff_integrity_breach: "Нарушение добросовестности персонала",
  principal_factual_misconception: "Заблуждение принципала",
  undeterminable_fact_under_deadline: "Неустановимый факт под дедлайном",
  principal_death_mandate_vacuum: "Смерть принципала / вакуум мандата",
  principal_fraud_capacity_ambiguity: "Мошенничество против принципала / вопрос дееспособности",
  compliance_filing_known_inaccuracy: "Заведомая неточность в комплаенс-подаче",
  corporate_opportunity_conflict_of_interest: "Корпоративная возможность / конфликт интересов",
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
    case "cancelled":
      return "bg-zinc-200 text-zinc-600";
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
