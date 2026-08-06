import Link from "next/link";
import type { CaseStatus } from "@prisma/client";
import { CaseStatusBadge } from "@/components/StatusBadge";
import { formatDomain } from "@/lib/labels";
import {
  computePriorityColor,
  parseStake,
  parseUrgency,
  priorityColorMarkerClass,
} from "@/lib/priority";

export type CaseListItem = {
  id: string;
  title: string;
  domain: string;
  status: CaseStatus;
  priorityUrgency: string | null;
  priorityStake: string | null;
};

export function CaseList({ cases }: { cases: CaseListItem[] }) {
  if (cases.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-zinc-500">
        Кейсов по выбранным фильтрам не найдено.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-zinc-100">
      {cases.map((caseItem) => {
        const priorityColor = computePriorityColor(
          parseUrgency(caseItem.priorityUrgency),
          parseStake(caseItem.priorityStake),
        );

        return (
          <li key={caseItem.id}>
            <Link
              href={`/cases/${caseItem.id}`}
              className="flex gap-3 px-4 py-4 transition-colors hover:bg-zinc-50"
            >
              <span
                className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${priorityColorMarkerClass(priorityColor)}`}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-zinc-900">{caseItem.title}</span>
                    <span className="text-xs text-zinc-400">{caseItem.id}</span>
                  </div>
                  <CaseStatusBadge status={caseItem.status} />
                </div>
                <p className="mt-1 text-sm text-zinc-500">{formatDomain(caseItem.domain)}</p>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
