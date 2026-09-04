import Link from "next/link";
import { notFound } from "next/navigation";
import { AnalysisSections } from "@/components/AnalysisSections";
import { PriorityBadge } from "@/components/PriorityBadge";
import { CaseStatusBadge } from "@/components/StatusBadge";
import { CaseDetailControls } from "@/app/cases/[id]/CaseDetailControls";
import { CaseDialogueLauncher } from "@/app/cases/[id]/CaseDialogueLauncher";
import { CaseLifecyclePanel } from "@/app/cases/[id]/CaseLifecyclePanel";
import { CaseLifecycleSuggestionCard } from "@/app/cases/[id]/CaseLifecycleSuggestionCard";
import { CollapsibleCaseBlock } from "@/app/cases/[id]/CollapsibleCaseBlock";
import { decisionStatusLabel, normalizeAnalysisResult } from "@/core/orchestration/analysis-core";
import { visibleLifecycleSuggestion } from "@/lib/case-lifecycle";
import { ensureSeeded } from "@/lib/ensure-seeded";
import { formatDomain } from "@/lib/labels";
import {
  computePriorityColor,
  parseStake,
  parseUrgency,
  priorityColorBadgeClass,
  priorityColorLabels,
  priorityColorMarkerClass,
} from "@/lib/priority";
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

  const messages = caseItem.messages.map((message) => ({
    id: message.id,
    role: message.role,
    content: message.content,
    createdAt: message.createdAt.toISOString(),
  }));

  const priorityColor = computePriorityColor(
    parseUrgency(caseItem.priorityUrgency),
    parseStake(caseItem.priorityStake),
  );
  const lifecycleSuggestion = visibleLifecycleSuggestion(caseItem.lifecycleSuggestion, {
    lifecycleState: caseItem.lifecycleState,
    blockerNote: caseItem.blockerNote,
  });

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-6">
      <Link href="/cases" className="text-sm text-zinc-500 hover:text-zinc-700">
        ← К библиотеке кейсов
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">{caseItem.title}</h1>
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
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${priorityColorBadgeClass(priorityColor)}`}
          >
            <span className={`h-2 w-2 rounded-full ${priorityColorMarkerClass(priorityColor)}`} />
            {priorityColorLabels[priorityColor]}
          </span>
          <CaseStatusBadge status={caseItem.status} />
        </div>
      </div>

      <details className="group mt-6 rounded-xl border border-zinc-200 bg-white shadow-sm">
        <summary className="cursor-pointer list-none px-4 py-2.5 text-sm font-semibold text-zinc-900 marker:content-none [&::-webkit-details-marker]:hidden">
          <span className="flex items-center justify-between gap-2">
            Действия
            <span className="text-xs font-normal text-zinc-400 group-open:hidden">показать</span>
            <span className="hidden text-xs font-normal text-zinc-400 group-open:inline">скрыть</span>
          </span>
        </summary>
        <div className="border-t border-zinc-100 px-4 pb-3 pt-2 [&>div]:mt-0 [&_section]:border-0 [&_section]:bg-transparent [&_section]:p-0 [&_section]:shadow-none [&_section_h2]:hidden">
          <CaseDetailControls
            caseItem={{
              id: caseItem.id,
              title: caseItem.title,
              domain: caseItem.domain,
              status: caseItem.status,
            }}
          />
        </div>
      </details>

      <section className="mt-6 space-y-4">
        <CaseLifecyclePanel
          caseId={caseItem.id}
          lifecycleState={caseItem.lifecycleState}
          blockerType={caseItem.blockerType}
          blockerNote={caseItem.blockerNote}
          lifecycleUpdatedAt={caseItem.lifecycleUpdatedAt.toISOString()}
          renderedAt={new Date().toISOString()}
        />
        {lifecycleSuggestion && (
          <CaseLifecycleSuggestionCard caseId={caseItem.id} suggestion={lifecycleSuggestion} />
        )}

        {(caseItem.priorityUrgency || caseItem.priorityStake || caseItem.priorityNote) && (
          <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
            <h2 className="text-xs font-medium uppercase tracking-wide text-zinc-500">Приоритет</h2>
            <div className="mt-1.5">
              <PriorityBadge
                urgency={caseItem.priorityUrgency}
                stake={caseItem.priorityStake}
                note={caseItem.priorityNote}
              />
            </div>
          </div>
        )}

        {caseItem.decisionTree && (
          <CollapsibleCaseBlock title="Дерево решений / рассуждение">
            <p className="whitespace-pre-wrap font-mono text-sm leading-snug text-zinc-700">
              {caseItem.decisionTree}
            </p>
          </CollapsibleCaseBlock>
        )}

        {caseItem.recordedResult && !storedAnalysis && (
          <CollapsibleCaseBlock title="Итог">
            <p className="whitespace-pre-wrap text-sm leading-snug text-zinc-700">
              {caseItem.recordedResult}
            </p>
          </CollapsibleCaseBlock>
        )}

        {storedAnalysis && (
          <div>
            <h2 className="text-xs font-medium uppercase tracking-wide text-zinc-500">Разбор ИИ</h2>
            <p className="mt-1 text-xs text-zinc-400">
              {decisionStatusLabel(storedAnalysis.decisionStatus)}
            </p>
            <div className="mt-3">
              <AnalysisSections sections={storedAnalysis.sections} />
            </div>
          </div>
        )}
      </section>

      <CaseDialogueLauncher caseId={caseItem.id} messages={messages} />
    </main>
  );
}
