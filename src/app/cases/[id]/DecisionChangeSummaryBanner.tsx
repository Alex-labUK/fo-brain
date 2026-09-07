"use client";

import { useEffect, useState } from "react";
import { workspaceType } from "@/app/cases/[id]/workspace-ui";
import {
  dismissDecisionChangeSummary,
  readStoredDecisionChangeSummary,
  type DecisionChangeSummary,
  type DecisionChangeSummaryPayload,
} from "@/lib/decision-change-summary";

type DecisionChangeSummaryBannerProps = {
  caseId: string;
  /** Changes after dialogue submit so the banner re-reads sessionStorage post-refresh. */
  dialogueRevision: string | null;
};

function compactUnchanged(summary: DecisionChangeSummary): string | null {
  const major = ["Решение", "Определяющий факт", "Следующий шаг", "Приоритет", "Цель"];
  const items = summary.unchangedItems.filter((item) => major.includes(item));
  if (items.length === 0 || summary.noMaterialChange) return null;
  return items.slice(0, 3).join(" · ");
}

function ChangeRow({
  label,
  before,
  after,
}: {
  label: string;
  before?: string | null;
  after?: string | null;
}) {
  if (!after && !before) return null;
  return (
    <div className="mt-3">
      <p className={workspaceType.kicker}>{label}</p>
      {before && after && before !== after ? (
        <>
          <p className={`mt-1 ${workspaceType.muted}`}>Было: {before}</p>
          <p className={`mt-1 ${workspaceType.body}`}>Стало: {after}</p>
        </>
      ) : (
        <p className={`mt-1 ${workspaceType.body}`}>{after ?? before}</p>
      )}
    </div>
  );
}

function SummaryContent({ summary }: { summary: DecisionChangeSummary }) {
  const unchanged = compactUnchanged(summary);

  if (summary.noMaterialChange) {
    return (
      <>
        <p className={workspaceType.body}>Ключевая логика решения не изменилась.</p>
        {summary.stableNextStep && (
          <p className={`mt-2 ${workspaceType.muted}`}>
            Следующий шаг остаётся прежним: {summary.stableNextStep}
          </p>
        )}
      </>
    );
  }

  return (
    <>
      {summary.statusTransition === "to_resolved" && (
        <p className={`${workspaceType.body} font-medium text-emerald-900`}>Решение определено</p>
      )}
      {summary.statusTransition === "to_unresolved" && (
        <p className={`${workspaceType.body} font-medium text-amber-900`}>Появилась новая неопределённость</p>
      )}

      {summary.decisionChanged &&
        summary.statusTransition !== "to_resolved" &&
        (summary.statusTransition === "to_unresolved" || summary.previousDecision !== summary.currentDecision) && (
          <ChangeRow
            label={summary.statusTransition === "to_unresolved" ? "Новое решение" : "Решение"}
            before={summary.statusTransition === "to_unresolved" ? null : summary.previousDecision}
            after={summary.currentDecision}
          />
        )}

      {(summary.determiningFactChanged || summary.statusTransition === "to_resolved") && (
        <ChangeRow
          label="Определяющий факт"
          before={
            summary.statusTransition === "to_resolved" || summary.statusTransition === "to_unresolved"
              ? null
              : summary.previousFact
          }
          after={summary.currentFact}
        />
      )}

      {summary.nextStepChanged && (
        <ChangeRow
          label="Следующий шаг"
          before={summary.previousNextStep}
          after={summary.currentNextStep}
        />
      )}

      {summary.statusTransition === "to_resolved" && summary.currentNextStep && !summary.nextStepChanged && (
        <ChangeRow label="Следующий шаг" after={summary.currentNextStep} />
      )}

      {summary.priorityChanged && (
        <div className="mt-3">
          <p className={workspaceType.kicker}>Приоритет</p>
          <p className={`mt-1 ${workspaceType.body}`}>
            {summary.previousPriority} → {summary.currentPriority}
          </p>
        </div>
      )}

      {unchanged && (
        <p className={`mt-3 ${workspaceType.muted}`}>Без изменений: {unchanged}</p>
      )}
    </>
  );
}

export function DecisionChangeSummaryBanner({ caseId, dialogueRevision }: DecisionChangeSummaryBannerProps) {
  const [payload, setPayload] = useState<DecisionChangeSummaryPayload | null>(null);

  useEffect(() => {
    function refresh() {
      setPayload(readStoredDecisionChangeSummary(caseId));
    }

    refresh();

    function handleUpdated(event: Event) {
      const detail = (event as CustomEvent<{ caseId?: string; payload?: DecisionChangeSummaryPayload }>).detail;
      if (detail?.caseId !== caseId) return;
      if (detail.payload) {
        setPayload(detail.payload);
        return;
      }
      refresh();
    }

    window.addEventListener("fo-change-summary-updated", handleUpdated);
    return () => window.removeEventListener("fo-change-summary-updated", handleUpdated);
  }, [caseId, dialogueRevision]);

  if (!payload) return null;

  function handleDismiss() {
    dismissDecisionChangeSummary(caseId, payload!.transitionKey);
    setPayload(null);
  }

  return (
    <section className="mt-6 rounded-2xl border border-zinc-200 bg-zinc-50/80 px-4 py-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className={workspaceType.kicker}>Что изменилось</p>
        <button
          type="button"
          onClick={handleDismiss}
          className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
        >
          Понятно
        </button>
      </div>
      <div className="mt-2">
        <SummaryContent summary={payload.summary} />
      </div>
    </section>
  );
}
