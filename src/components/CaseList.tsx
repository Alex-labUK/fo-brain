import Link from "next/link";
import type { CaseStatus } from "@prisma/client";
import { CaseStatusBadge } from "@/components/StatusBadge";
import { formatDomain } from "@/lib/labels";

type CaseListItem = {
  id: string;
  title: string;
  domain: string;
  status: CaseStatus;
  branch: { name: string } | null;
  _count: {
    confirmsPrinciples: number;
    confirmsPatterns: number;
  };
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
      {cases.map((caseItem) => (
        <li key={caseItem.id}>
          <Link
            href={`/cases/${caseItem.id}`}
            className="flex flex-col gap-2 px-4 py-4 transition-colors hover:bg-zinc-50 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-zinc-900">{caseItem.title}</span>
                <span className="text-xs text-zinc-400">{caseItem.id}</span>
              </div>
              <p className="mt-1 text-sm text-zinc-500">
                {formatDomain(caseItem.domain)}
                {caseItem.branch ? ` · ${caseItem.branch.name}` : " · без ветки"}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-3">
              <span className="text-xs text-zinc-400">
                {caseItem._count.confirmsPrinciples} пр. · {caseItem._count.confirmsPatterns} пат.
              </span>
              <CaseStatusBadge status={caseItem.status} />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
