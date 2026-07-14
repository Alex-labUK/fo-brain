import type { CaseStatus } from "@prisma/client";
import { caseStatusLabels, domainLabels } from "@/lib/labels";

type CaseFiltersProps = {
  domains: string[];
  currentDomain?: string;
  currentStatus?: CaseStatus;
};

export function CaseFilters({ domains, currentDomain, currentStatus }: CaseFiltersProps) {
  return (
    <form method="get" className="flex flex-wrap items-end gap-3 border-b border-zinc-100 px-4 py-3">
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-zinc-500">Домен</span>
        <select
          name="domain"
          defaultValue={currentDomain ?? ""}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-900"
        >
          <option value="">Все</option>
          {domains.map((domain) => (
            <option key={domain} value={domain}>
              {domainLabels[domain] ?? domain}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-zinc-500">Статус</span>
        <select
          name="status"
          defaultValue={currentStatus ?? ""}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-900"
        >
          <option value="">Все</option>
          {(Object.keys(caseStatusLabels) as CaseStatus[]).map((status) => (
            <option key={status} value={status}>
              {caseStatusLabels[status]}
            </option>
          ))}
        </select>
      </label>

      <button
        type="submit"
        className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
      >
        Применить
      </button>

      {(currentDomain || currentStatus) && (
        <a
          href="/"
          className="rounded-lg px-3 py-1.5 text-sm text-zinc-500 hover:text-zinc-700"
        >
          Сбросить
        </a>
      )}
    </form>
  );
}
