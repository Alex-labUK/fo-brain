import Link from "next/link";
import { notFound } from "next/navigation";
import { CaseDetailControls } from "@/app/cases/[id]/CaseDetailControls";
import { CaseDialogueLauncher } from "@/app/cases/[id]/CaseDialogueLauncher";
import { DecisionChangeSummaryBanner } from "@/app/cases/[id]/DecisionChangeSummaryBanner";
import { CaseExecutionPanel } from "@/app/cases/[id]/CaseExecutionPanel";
import { CaseExecutionSuggestionCard } from "@/app/cases/[id]/CaseExecutionSuggestionCard";
import { CaseLifecyclePanel } from "@/app/cases/[id]/CaseLifecyclePanel";
import { CaseLifecycleSuggestionCard } from "@/app/cases/[id]/CaseLifecycleSuggestionCard";
import { CaseReopenSuggestionCard } from "@/app/cases/[id]/CaseReopenSuggestionCard";
import { WorkspaceDetails } from "@/app/cases/[id]/WorkspaceDetails";
import {
  workspaceDecisionSurfaceClass,
  workspaceFactInsetClass,
  workspaceNextStepMarkerClass,
  workspaceNextStepOwnerLine,
  workspaceNextStepSurfaceClass,
  workspacePriorityBadgeClass,
  workspaceStatusBadgeClass,
  workspaceType,
} from "@/app/cases/[id]/workspace-ui";
import { normalizeAnalysisResult } from "@/core/orchestration/analysis-core";
import { visibleLifecycleSuggestion } from "@/lib/case-lifecycle";
import {
  deriveExecutionSuggestion,
  executionNeedsReview,
  hasStoredExecution,
  isExecutionStatus,
} from "@/lib/case-execution";
import { parseDecisionCycleHistory, visibleReopenSuggestion } from "@/lib/decision-cycle";
import { ensureSeeded } from "@/lib/ensure-seeded";
import { computePriorityColor, parseStake, parseUrgency, priorityColorMarkerClass } from "@/lib/priority";
import { prisma } from "@/lib/prisma";
import {
  formatWorkspaceDate,
  isRepetitiveWorkspaceExplanation,
  previousCyclePreview,
  previousCyclesLabel,
  shouldShowFactGatheringNextStep,
  workspaceActionFirstNextStep,
  workspaceDecision,
  workspaceDeterminingFact,
  workspaceExecutionPlacement,
  workspaceOperationalStatus,
  workspaceOutcome,
  workspacePriorityLabel,
} from "@/lib/case-workspace";

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
  const priorityLabel = workspacePriorityLabel(priorityColor);
  const operationalStatus = workspaceOperationalStatus({
    lifecycleState: caseItem.lifecycleState,
    executionStatus: caseItem.executionStatus,
  });
  const lifecycleSuggestion = visibleLifecycleSuggestion(caseItem.lifecycleSuggestion, {
    lifecycleState: caseItem.lifecycleState,
    blockerNote: caseItem.blockerNote,
  });
  const storedExecution = {
    executionStep: caseItem.executionStep,
    executionOwner: caseItem.executionOwner,
    executionStatus: isExecutionStatus(caseItem.executionStatus) ? caseItem.executionStatus : null,
  };
  const decisionStatus = storedAnalysis?.decisionStatus;
  const needsReview = executionNeedsReview(decisionStatus, storedExecution);
  const executionSuggestion = deriveExecutionSuggestion({
    decisionStatus,
    lifecycleState: caseItem.lifecycleState,
    analysis: storedAnalysis,
    execution: storedExecution,
  });
  const showClosePrompt =
    storedExecution.executionStatus === "completed" &&
    caseItem.lifecycleState !== "closed" &&
    decisionStatus === "resolved";
  const reopenSuggestion = visibleReopenSuggestion(caseItem.reopenSuggestion, {
    lifecycleState: caseItem.lifecycleState,
    analysis: storedAnalysis,
  });
  const previousCycles = parseDecisionCycleHistory(caseItem.decisionCycleHistory);
  const renderedAt = new Date().toISOString();
  const outcomeText = workspaceOutcome(storedAnalysis) || caseItem.outcome?.statement?.trim() || null;
  const decisionText = workspaceDecision(storedAnalysis) || (!storedAnalysis ? caseItem.recordedResult : null);
  const determiningFact = workspaceDeterminingFact(storedAnalysis);
  const nextStep = workspaceActionFirstNextStep(storedAnalysis);
  const showFactGathering = shouldShowFactGatheringNextStep(storedAnalysis);
  const executionPlacement = workspaceExecutionPlacement({
    hasExecution: hasStoredExecution(storedExecution),
    decisionStatus,
    executionStatus: storedExecution.executionStatus,
    lifecycleState: caseItem.lifecycleState,
  });
  const showResolvedNextStep =
    decisionStatus === "resolved" &&
    (executionPlacement === "primary" || Boolean(executionSuggestion));
  const priorityNote = caseItem.priorityNote?.trim() || null;
  const showDecisionBlock = Boolean(outcomeText || decisionText || determiningFact || priorityNote);
  const decisionSurfaceResolved =
    decisionStatus === "resolved" || caseItem.lifecycleState === "closed";
  const showLifecycleReason =
    Boolean(lifecycleSuggestion?.reason) &&
    !isRepetitiveWorkspaceExplanation(lifecycleSuggestion?.reason ?? "", [
      determiningFact,
      nextStep.primary,
      nextStep.support,
    ]);

  const executionPanel =
    storedExecution.executionStatus && storedExecution.executionStep ? (
      <CaseExecutionPanel
        caseId={caseItem.id}
        executionStep={storedExecution.executionStep}
        executionOwner={storedExecution.executionOwner}
        executionStatus={storedExecution.executionStatus}
        executionUpdatedAt={caseItem.executionUpdatedAt?.toISOString() ?? null}
        renderedAt={renderedAt}
        needsReview={needsReview}
        showClosePrompt={showClosePrompt}
        tone={executionPlacement === "primary" ? "default" : "quiet"}
        hideTitle={executionPlacement === "primary"}
      />
    ) : null;

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-8 font-sans">
      <Link href="/cases" className={`${workspaceType.muted} hover:text-zinc-700`}>
        ← Решения
      </Link>

      <h1 className={`mt-4 ${workspaceType.title}`}>{caseItem.title}</h1>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${workspaceStatusBadgeClass(
            {
              lifecycleState: caseItem.lifecycleState,
              executionStatus: caseItem.executionStatus,
            },
          )}`}
        >
          {operationalStatus}
        </span>
        {priorityLabel && (
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${workspacePriorityBadgeClass(priorityColor)}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${priorityColorMarkerClass(priorityColor)}`} aria-hidden />
            {priorityLabel}
          </span>
        )}
      </div>

      {reopenSuggestion && (
        <div className="mt-6">
          <CaseReopenSuggestionCard caseId={caseItem.id} suggestion={reopenSuggestion} />
        </div>
      )}

      <DecisionChangeSummaryBanner
        caseId={caseItem.id}
        dialogueRevision={messages.at(-1)?.id ?? null}
      />

      {showDecisionBlock && (
        <section className={`mt-6 ${workspaceDecisionSurfaceClass(decisionSurfaceResolved)}`}>
          <p className={workspaceType.kicker}>Решение</p>
          {outcomeText && (
            <p className={`mt-2 ${workspaceType.muted}`}>
              Цель:{" "}
              {caseItem.outcome ? (
                <Link href={`/outcomes/${caseItem.outcome.id}`} className="text-zinc-600 hover:text-zinc-900 hover:underline">
                  {outcomeText}
                </Link>
              ) : (
                <span className="text-zinc-600">{outcomeText}</span>
              )}
            </p>
          )}
          {decisionText && <p className={`mt-2 ${workspaceType.primary}`}>{decisionText}</p>}
          {determiningFact && (
            <div className={`mt-4 ${workspaceFactInsetClass}`}>
              <p className={`${workspaceType.kicker} text-amber-800/80`}>Что определит решение</p>
              <p className={`mt-1 ${workspaceType.fact}`}>{determiningFact}</p>
            </div>
          )}
          {priorityNote && <p className={`mt-3 ${workspaceType.muted}`}>{priorityNote}</p>}
        </section>
      )}

      {showFactGathering && (
        <section className={`mt-5 ${workspaceNextStepSurfaceClass}`}>
          <p className={workspaceType.kicker}>Следующий шаг</p>
          {nextStep.primary && (
            <div className="mt-3 flex items-start gap-3">
              <span className={workspaceNextStepMarkerClass} aria-hidden>
                1
              </span>
              <p className={workspaceType.primary}>{nextStep.primary}</p>
            </div>
          )}
          {nextStep.support && <p className={`mt-2 pl-9 ${workspaceType.muted}`}>{nextStep.support}</p>}
          {nextStep.owner && (
            <p className={`mt-3 pl-9 ${workspaceType.muted}`}>{workspaceNextStepOwnerLine(nextStep.owner)}</p>
          )}
        </section>
      )}

      {showResolvedNextStep && executionPlacement === "primary" && (
        <section className={`mt-6 ${workspaceNextStepSurfaceClass}`}>
          <p className={workspaceType.kicker}>Следующий шаг</p>
          <div className="mt-3">{executionPanel}</div>
        </section>
      )}

      {showResolvedNextStep && executionSuggestion && (
        <div className="mt-6">
          <CaseExecutionSuggestionCard caseId={caseItem.id} suggestion={executionSuggestion} />
        </div>
      )}

      {lifecycleSuggestion && (
        <div className="mt-6">
          <CaseLifecycleSuggestionCard
            caseId={caseItem.id}
            suggestion={lifecycleSuggestion}
            showReason={showLifecycleReason}
          />
        </div>
      )}

      {executionPlacement === "primary" && !showResolvedNextStep && (
        <section className={`mt-6 ${workspaceNextStepSurfaceClass}`}>
          <p className={workspaceType.kicker}>Следующий шаг</p>
          <div className="mt-3">{executionPanel}</div>
        </section>
      )}
      {executionPlacement === "quiet" && <div className="mt-6">{executionPanel}</div>}

      <CaseDialogueLauncher
        caseId={caseItem.id}
        messages={messages}
        secondary={Boolean(reopenSuggestion || lifecycleSuggestion || executionSuggestion)}
      />

      <section className="mt-14 border-t border-zinc-200 pt-8">
        <h2 className={workspaceType.section}>Дополнительно</h2>
        <div className="mt-4">
          <WorkspaceDetails title="Статус кейса">
            <CaseLifecyclePanel
              caseId={caseItem.id}
              lifecycleState={caseItem.lifecycleState}
              blockerType={caseItem.blockerType}
              blockerNote={caseItem.blockerNote}
              lifecycleUpdatedAt={caseItem.lifecycleUpdatedAt.toISOString()}
              renderedAt={renderedAt}
              bare
            />
          </WorkspaceDetails>
          <WorkspaceDetails title="Действия">
            <CaseDetailControls
              embedded
              caseItem={{
                id: caseItem.id,
                title: caseItem.title,
                domain: caseItem.domain,
                status: caseItem.status,
              }}
            />
          </WorkspaceDetails>
          {previousCycles.length > 0 && (
            <WorkspaceDetails title="История решений" hint={previousCyclesLabel(previousCycles.length)}>
              <ol className="space-y-4">
                {previousCycles.map((cycle, index) => {
                  const preview = previousCyclePreview(cycle);
                  const closed = formatWorkspaceDate(preview.closedAt);
                  return (
                    <li key={`${cycle.archivedAt}-${index}`} className={workspaceType.body}>
                      {preview.resolution && <p>{preview.resolution}</p>}
                      {preview.execution && (
                        <p className={`mt-1 ${workspaceType.muted}`}>{preview.execution}</p>
                      )}
                      {closed && <p className={`mt-1 ${workspaceType.muted}`}>Закрыт {closed}</p>}
                    </li>
                  );
                })}
              </ol>
            </WorkspaceDetails>
          )}
          {executionPlacement === "history" && executionPanel && (
            <WorkspaceDetails title="Исполнение">
              {executionPanel}
            </WorkspaceDetails>
          )}
          {caseItem.decisionTree && (
            <WorkspaceDetails title="Рассуждение">
              <p className={`whitespace-pre-wrap ${workspaceType.body}`}>
                {caseItem.decisionTree}
              </p>
            </WorkspaceDetails>
          )}
          {caseItem.recordedResult && storedAnalysis && (
            <WorkspaceDetails title="Итог">
              <p className={`whitespace-pre-wrap ${workspaceType.body}`}>
                {caseItem.recordedResult}
              </p>
            </WorkspaceDetails>
          )}
        </div>
      </section>
    </main>
  );
}
