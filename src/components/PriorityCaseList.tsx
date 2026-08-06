import Link from "next/link";
import type { Case } from "@prisma/client";
import {
  computePriorityColor,
  parseStake,
  parseUrgency,
  priorityColorLabels,
  priorityColorMarkerClass,
  type PriorityColor,
} from "@/lib/priority";

type PriorityCaseListProps = {
  cases: Case[];
};

const GROUP_ORDER: PriorityColor[] = ["red", "amber", "green", "unknown"];

function groupCases(cases: Case[]): Record<PriorityColor, Case[]> {
  const groups: Record<PriorityColor, Case[]> = {
    red: [],
    amber: [],
    green: [],
    unknown: [],
  };

  for (const caseItem of cases) {
    const color = computePriorityColor(
      parseUrgency(caseItem.priorityUrgency),
      parseStake(caseItem.priorityStake),
    );
    groups[color].push(caseItem);
  }

  return groups;
}

function PriorityCaseCard({ caseItem, color }: { caseItem: Case; color: PriorityColor }) {
  return (
    <Link
      href={`/cases/${caseItem.id}`}
      className="flex gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm transition-colors hover:border-zinc-300 hover:bg-zinc-50"
    >
      <span
        className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${priorityColorMarkerClass(color)}`}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium text-zinc-900">{caseItem.title}</p>
          <span className="text-xs text-zinc-400">{caseItem.id}</span>
        </div>
        {caseItem.priorityNote ? (
          <p className="mt-1 text-sm leading-snug text-zinc-600">{caseItem.priorityNote}</p>
        ) : (
          <p className="mt-1 text-sm text-zinc-400">{priorityColorLabels.unknown}</p>
        )}
      </div>
    </Link>
  );
}

export function PriorityCaseList({ cases }: PriorityCaseListProps) {
  if (cases.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-zinc-200 bg-white px-5 py-8 text-center text-sm text-zinc-500">
        Сейчас нет ситуаций, требующих внимания
      </p>
    );
  }

  const groups = groupCases(cases);

  return (
    <div className="space-y-8">
      {GROUP_ORDER.map((color) => {
        const items = groups[color];
        if (items.length === 0) return null;

        return (
          <section key={color}>
            <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
              {priorityColorLabels[color]} ({items.length})
            </h2>
            <div className="mt-3 space-y-2">
              {items.map((caseItem) => (
                <PriorityCaseCard key={caseItem.id} caseItem={caseItem} color={color} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
