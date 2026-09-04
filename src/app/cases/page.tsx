import { DecisionsRegister } from "@/components/DecisionsRegister";
import {
  buildDashboardPortfolio,
  dashboardCounts,
  dashboardOpenCount,
  isSecondaryView,
  listRegisterRows,
  registerSubtitle,
  type DashboardCaseInput,
} from "@/lib/case-dashboard";
import { ensureSeeded } from "@/lib/ensure-seeded";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ view?: string }>;
};

export default async function CasesLibraryPage({ searchParams }: PageProps) {
  await ensureSeeded();

  const { view } = await searchParams;
  const cockpitView = isSecondaryView(view) ? view : undefined;

  const cases = await prisma.case.findMany({
    where: { status: { notIn: ["hypothetical", "cancelled"] } },
    select: {
      id: true,
      title: true,
      lifecycleState: true,
      blockerNote: true,
      lifecycleUpdatedAt: true,
      lifecycleSuggestion: true,
      executionStep: true,
      executionOwner: true,
      executionStatus: true,
      executionUpdatedAt: true,
      priorityUrgency: true,
      priorityStake: true,
      updatedAt: true,
      analysisResult: true,
      reopenSuggestion: true,
    },
  });

  const inputs = cases.map(
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
  );
  const portfolio = buildDashboardPortfolio(inputs);
  const rows = listRegisterRows(inputs, cockpitView, portfolio);
  const counts = dashboardCounts(portfolio);

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-8">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Решения</h1>
      <p className="mt-1 text-sm text-zinc-500">{registerSubtitle(cockpitView)}</p>
      <div className="mt-8">
        <DecisionsRegister
          rows={rows}
          view={cockpitView}
          counts={{ open: dashboardOpenCount(portfolio), ...counts }}
        />
      </div>
    </main>
  );
}
