import type { CaseStatus, PrincipleStatus } from "@prisma/client";

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
