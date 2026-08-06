import Link from "next/link";
import { notFound } from "next/navigation";
import { AnalysisSections } from "@/components/AnalysisSections";
import { PriorityBadge } from "@/components/PriorityBadge";
import { CaseStatusBadge } from "@/components/StatusBadge";
import { CaseDetailControls } from "@/app/cases/[id]/CaseDetailControls";
import { CaseDialogue } from "@/app/cases/[id]/CaseDialogue";
import { normalizeAnalysisResult } from "@/core/orchestration/analysis-core";
import { ensureSeeded } from "@/lib/ensure-seeded";
import { formatDomain } from "@/lib/labels";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function CaseDetailPage({ params }: PageProps) {
  await ensureSeeded();
  const { id } = await params;

  const caseItem = await prisma.case.findUnique({
    where: { id },
    include: {
      outcome: { select: { id: true, statement: true } },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!caseItem) {
    notFound();
  }

  let storedAnalysis = null;
  if (caseItem.analysisResult) {
    try {
      storedAnalysis = normalizeAnalysisResult(caseItem.analysisResult);
    } catch {
      storedAnalysis = null;
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
      <Link href="/cases" className="text-sm text-zinc-500 hover:text-zinc-700">
        ← К библиотеке кейсов
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            {caseItem.title}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {caseItem.id} · {formatDomain(caseItem.domain)}
            {caseItem.outcome && (
              <>
                {" "}
                ·{" "}
                <Link href={`/outcomes/${caseItem.outcome.id}`} className="underline">
                  outcome
                </Link>
              </>
            )}
          </p>
        </div>
        <CaseStatusBadge status={caseItem.status} />
      </div>

      <CaseDetailControls
        caseItem={{
          id: caseItem.id,
          title: caseItem.title,
          domain: caseItem.domain,
          status: caseItem.status,
        }}
      />

      <section className="mt-8 space-y-6">
        {(caseItem.priorityUrgency || caseItem.priorityStake || caseItem.priorityNote) && (
          <div className="rounded-xl border border-zinc-200 bg-white px-5 py-4 shadow-sm">
            <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">Приоритет</h2>
            <div className="mt-2">
              <PriorityBadge
                urgency={caseItem.priorityUrgency}
                stake={caseItem.priorityStake}
                note={caseItem.priorityNote}
              />
            </div>
          </div>
        )}

        {caseItem.decisionTree && (
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
              Дерево решений / рассуждение
            </h2>
            <p className="mt-2 whitespace-pre-wrap font-mono text-sm leading-relaxed text-zinc-700">
              {caseItem.decisionTree}
            </p>
          </div>
        )}

        {caseItem.recordedResult && !storedAnalysis && (
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">Итог</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">
              {caseItem.recordedResult}
            </p>
          </div>
        )}

        {storedAnalysis && (
          <div>
            <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
              Разбор ИИ
            </h2>
            <div className="mt-4">
              <AnalysisSections sections={storedAnalysis.sections} />
            </div>
          </div>
        )}
      </section>

      <CaseDialogue
        caseId={caseItem.id}
        messages={caseItem.messages.map((message) => ({
          id: message.id,
          role: message.role,
          content: message.content,
          createdAt: message.createdAt.toISOString(),
        }))}
      />
    </main>
  );
}
