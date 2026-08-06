import {
  computePriorityColor,
  parseStake,
  parseUrgency,
  priorityColorBadgeClass,
  priorityColorLabels,
  stakeLabels,
  urgencyLabels,
  type AnalysisPriority,
} from "@/lib/priority";

type PriorityBadgeProps = {
  priority?: AnalysisPriority | null;
  urgency?: string | null;
  stake?: string | null;
  note?: string | null;
  compact?: boolean;
};

export function PriorityBadge({ priority, urgency, stake, note, compact = false }: PriorityBadgeProps) {
  const resolvedUrgency = priority?.urgency ?? parseUrgency(urgency);
  const resolvedStake = priority?.stake ?? parseStake(stake);
  const resolvedNote = priority?.note ?? note?.trim() ?? "";
  const color = computePriorityColor(resolvedUrgency, resolvedStake);

  if (!resolvedUrgency || !resolvedStake) {
    return (
      <span
        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${priorityColorBadgeClass("unknown")}`}
      >
        {priorityColorLabels.unknown}
      </span>
    );
  }

  return (
    <div className="space-y-1">
      <span
        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${priorityColorBadgeClass(color)}`}
      >
        {priorityColorLabels[color]}
      </span>
      {!compact && (
        <p className="text-xs text-zinc-500">
          {urgencyLabels[resolvedUrgency]} · {stakeLabels[resolvedStake]}
        </p>
      )}
      {resolvedNote && <p className="text-sm text-zinc-700">{resolvedNote}</p>}
    </div>
  );
}
