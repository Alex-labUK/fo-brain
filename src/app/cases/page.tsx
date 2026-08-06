import type { CaseStatus } from "@prisma/client";
import { CaseFilters } from "@/components/CaseFilters";
import { CaseList } from "@/components/CaseList";
import { ensureSeeded } from "@/lib/ensure-seeded";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const VALID_STATUSES: CaseStatus[] = [
  "hypothetical",
  "real_in_progress",
  "real_closed",
  "cancelled",
];

type PageProps = {
  searchParams: Promise<{ domain?: string; status?: string }>;
};

export default async function CasesLibraryPage({ searchParams }: PageProps) {
  await ensureSeeded();

  const { domain, status } = await searchParams;
  const statusFilter =
    status && VALID_STATUSES.includes(status as CaseStatus)
      ? (status as CaseStatus)
      : undefined;

  const caseWhere = {
    ...(domain ? { domain } : {}),
    ...(statusFilter
      ? { status: statusFilter }
      : { status: { not: "hypothetical" as const } }),
  };

  const [cases, allDomains] = await Promise.all([
    prisma.case.findMany({
      where: caseWhere,
      select: {
        id: true,
        title: true,
        domain: true,
        status: true,
        priorityUrgency: true,
        priorityStake: true,
      },
      orderBy: { id: "asc" },
    }),
    prisma.case.findMany({
      select: { domain: true },
      distinct: ["domain"],
      orderBy: { domain: "asc" },
    }),
  ]);

  const domains = allDomains.map((item) => item.domain);

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-100 px-4 py-4">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Кейсы</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {cases.length} {statusFilter ? "по фильтру" : "реальных кейсов"} · фильтр по домену и
            статусу
          </p>
        </div>
        <CaseFilters domains={domains} currentDomain={domain} currentStatus={statusFilter} />
        <CaseList cases={cases} />
      </div>
    </main>
  );
}
