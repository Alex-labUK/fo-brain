export type Urgency = "urgent" | "soon" | "no_deadline";
export type Stake = "high_irreversible" | "moderate" | "low_reversible";
export type PriorityColor = "red" | "amber" | "green" | "unknown";

export type AnalysisPriority = {
  urgency: Urgency;
  stake: Stake;
  note: string;
};

export const urgencyLabels: Record<Urgency, string> = {
  urgent: "Срочно — действовать в ближайшие дни",
  soon: "Скоро понадобится решение",
  no_deadline: "Жёсткого срока нет",
};

export const stakeLabels: Record<Stake, string> = {
  high_irreversible: "Высокая, потенциально необратимая ставка",
  moderate: "Заметная, но поправимая ставка",
  low_reversible: "Низкая, легко обратимая ставка",
};

export const priorityColorLabels: Record<PriorityColor, string> = {
  red: "Требует внимания сейчас",
  amber: "Скоро понадобится решение",
  green: "Спокойно",
  unknown: "Нет оценки",
};

export function parseUrgency(value: string | null | undefined): Urgency | null {
  if (value === "urgent" || value === "soon" || value === "no_deadline") return value;
  return null;
}

export function parseStake(value: string | null | undefined): Stake | null {
  if (value === "high_irreversible" || value === "moderate" || value === "low_reversible") {
    return value;
  }
  return null;
}

export function computePriorityColor(
  urgency: Urgency | null | undefined,
  stake: Stake | null | undefined,
): PriorityColor {
  if (!urgency || !stake) return "unknown";
  if (urgency === "urgent" || stake === "high_irreversible") return "red";
  if (urgency === "soon" || stake === "moderate") return "amber";
  return "green";
}

export function priorityColorBadgeClass(color: PriorityColor): string {
  switch (color) {
    case "red":
      return "bg-red-100 text-red-800 border-red-200";
    case "amber":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "green":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "unknown":
      return "bg-zinc-100 text-zinc-600 border-zinc-200";
  }
}

export function priorityColorMarkerClass(color: PriorityColor): string {
  switch (color) {
    case "red":
      return "bg-red-500";
    case "amber":
      return "bg-amber-500";
    case "green":
      return "bg-emerald-500";
    case "unknown":
      return "bg-zinc-300";
  }
}
