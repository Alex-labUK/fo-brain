"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  clearCaseExecution,
  closeCaseAfterExecution,
  completeCaseExecution,
  updateCaseExecution,
} from "@/app/cases/[id]/actions";
import { formatLifecycleSince } from "@/lib/case-lifecycle";
import { executionStatusLabels, type ExecutionStatus } from "@/lib/case-execution";
import { workspaceType } from "@/app/cases/[id]/workspace-ui";

type CaseExecutionPanelProps = {
  caseId: string;
  executionStep: string;
  executionOwner: string | null;
  executionStatus: ExecutionStatus;
  executionUpdatedAt: string | null;
  renderedAt: string;
  needsReview: boolean;
  showClosePrompt: boolean;
  tone?: "default" | "quiet";
  hideTitle?: boolean;
};

export function CaseExecutionPanel({
  caseId,
  executionStep,
  executionOwner,
  executionStatus,
  executionUpdatedAt,
  renderedAt,
  needsReview,
  showClosePrompt,
  tone = "default",
  hideTitle = false,
}: CaseExecutionPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [step, setStep] = useState(executionStep);
  const [owner, setOwner] = useState(executionOwner ?? "");
  const [closeDismissed, setCloseDismissed] = useState(false);

  useEffect(() => {
    setStep(executionStep);
    setOwner(executionOwner ?? "");
    setEditing(false);
    setCloseDismissed(false);
  }, [executionStep, executionOwner, executionStatus]);

  function run(action: () => Promise<void>) {
    setError(null);
    startTransition(async () => {
      try {
        await action();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Не удалось обновить исполнение");
      }
    });
  }

  const statusLabel = executionStatusLabels[executionStatus];
  const quiet = tone === "quiet";

  return (
    <section className={quiet ? "border-t border-zinc-100 pt-4" : undefined}>
      {!hideTitle && (
        <h2 className={`${workspaceType.section} ${quiet ? "text-zinc-500" : ""}`}>
          Исполнение
        </h2>
      )}
      {needsReview && (
        <p className={`mt-1.5 ${workspaceType.muted} text-amber-800`}>
          Решение изменилось. Текущий шаг требует пересмотра.
        </p>
      )}

      {editing ? (
        <div className="mt-1 space-y-2">
          <textarea
            value={step}
            disabled={isPending}
            onChange={(event) => setStep(event.target.value)}
            rows={2}
            className="w-full rounded-lg border border-zinc-200 px-3 py-1.5 text-sm leading-snug"
          />
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">
              Ответственный
            </span>
            <input
              value={owner}
              disabled={isPending}
              onChange={(event) => setOwner(event.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-1.5 text-sm"
            />
          </label>
        </div>
      ) : (
        <>
          <p className={`mt-2 ${quiet ? workspaceType.muted : workspaceType.primary}`}>
            {executionStep}
          </p>
          {executionOwner ? <p className={`mt-1 ${workspaceType.muted}`}>{executionOwner}</p> : null}
          {quiet ? (
            <p className={`mt-1 ${workspaceType.muted}`}>
              {needsReview ? "Требует пересмотра" : statusLabel}
            </p>
          ) : null}
        </>
      )}

      {executionUpdatedAt && (
        <p className={`mt-1 ${workspaceType.muted}`}>
          {formatLifecycleSince(executionUpdatedAt, renderedAt)}
        </p>
      )}

      {showClosePrompt && !closeDismissed && !editing && (
        <div className="mt-3 rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2">
          <p className="text-sm text-zinc-800">Текущий шаг выполнен. Закрыть кейс?</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={isPending}
              onClick={() => run(() => closeCaseAfterExecution(caseId))}
              className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-60"
            >
              Закрыть кейс
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => setCloseDismissed(true)}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
            >
              Оставить открытым
            </button>
          </div>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {editing ? (
          <>
            <button
              type="button"
              disabled={isPending}
              onClick={() => run(() => updateCaseExecution(caseId, { step, owner }))}
              className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-60"
            >
              {isPending ? "Сохранение…" : "Сохранить"}
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                setEditing(false);
                setStep(executionStep);
                setOwner(executionOwner ?? "");
              }}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
            >
              Отмена
            </button>
          </>
        ) : (
          <>
            {executionStatus === "pending" && !needsReview && (
              <button
                type="button"
                disabled={isPending}
                onClick={() => run(() => completeCaseExecution(caseId))}
                className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-60"
              >
                {isPending ? "Сохранение…" : "Выполнено"}
              </button>
            )}
            <button
              type="button"
              disabled={isPending}
              onClick={() => setEditing(true)}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
            >
              Изменить
            </button>
            {needsReview && (
              <button
                type="button"
                disabled={isPending}
                onClick={() => run(() => clearCaseExecution(caseId))}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
              >
                Сбросить
              </button>
            )}
          </>
        )}
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </section>
  );
}
