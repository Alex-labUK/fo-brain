import type { CaseStatus } from "@prisma/client";
import { CaseFilters } from "@/components/CaseFilters";
import { CaseList } from "@/components/CaseList";
import {
  buildDashboardPortfolio,
  isSecondaryView,
  listDecisionsCases,
  SECONDARY_VIEW_LABELS,
  type DashboardCaseInput,
} from "@/lib/case-dashboard";
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
  searchParams: Promise<{ domain?: string; status?: string; view?: string }>;
};

export default async function CasesLibraryPage({ searchParams }: PageProps) {
  await ensureSeeded();

  const { domain, status, view } = await searchParams;
  const statusFilter =
    status && VALID_STATUSES.includes(status as CaseStatus)
      ? (status as CaseStatus)
      : undefined;
  const cockpitView = isSecondaryView(view) ? view : undefined;

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
        lifecycleState: true,
        blockerNote: true,
        lifecycleUpdatedAt: true,
        lifecycleSuggestion: true,
        executionStep: true,
        executionOwner: true,
        executionStatus: true,
        executionUpdatedAt: true,
        updatedAt: true,
        analysisResult: true,
        reopenSuggestion: true,
      },
      orderBy: { id: "asc" },
    }),
    prisma.case.findMany({
      select: { domain: true },
      distinct: ["domain"],
      orderBy: { domain: "asc" },
    }),
  ]);

  const portfolio = buildDashboardPortfolio(
    cases.map(
      (caseItem): DashboardCaseInput => ({
        id: caseItem.id,
        title: caseItem.title,
        lifecycleState: caseItem.lifecycleState,
        blockerNote: caseItem.blockerNote,
        lifecycleUpdatedAt: caseItem.lifecycleUpdatedAt,
        lifecycleSuggestion: caseItem.lifecycleSuggestion,
        executionStep: caseItem.executionStep,
        executionOwner: caseItem.executionOwner,
        executionStatus: caseItem.executionStatus,
        executionUpdatedAt: caseItem.executionUpdatedAt,
        priorityUrgency: caseItem.priorityUrgency,
        priorityStake: caseItem.priorityStake,
        updatedAt: caseItem.updatedAt,
        analysisResult: caseItem.analysisResult,
        reopenSuggestion: caseItem.reopenSuggestion,
      }),
    ),
  );
  const ordered = listDecisionsCases(portfolio, cockpitView);
  const byId = new Map(cases.map((caseItem) => [caseItem.id, caseItem]));
  const listed = ordered.flatMap((card) => {
    const row = byId.get(card.id);
    return row ? [row] : [];
  });
  const domains = allDomains.map((item) => item.domain);
  const viewLabel = cockpitView ? SECONDARY_VIEW_LABELS[cockpitView] : null;

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-100 px-4 py-4">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Решения</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {viewLabel ? viewLabel : `${listed.length} открытых`}
          </p>
        </div>
        <CaseFilters domains={domains} currentDomain={domain} currentStatus={statusFilter} />
        <CaseList cases={listed} />
      </div>
    </main>
  );
}
