import { DecisionCockpit } from "@/components/DecisionCockpit";
import { buildDashboardPortfolio, type DashboardCaseInput } from "@/lib/case-dashboard";
import { ensureSeeded } from "@/lib/ensure-seeded";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function Home() {
  await ensureSeeded();

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

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Требуют решения</h1>
      <p className="mt-1 text-sm text-zinc-500">Вопросы, которые требуют вашего внимания</p>
      <div className="mt-8">
        <DecisionCockpit portfolio={portfolio} />
      </div>
    </main>
  );
}
