"use client";

import { useEffect, useState, useTransition } from "react";
import { closeCase } from "@/app/cases/[id]/actions";
import { workspaceType } from "@/app/cases/[id]/workspace-ui";
import {
  formatClosureExecutionLine,
  type ClosurePreview,
} from "@/lib/decision-record";

type CaseClosureDialogProps = {
  caseId: string;
  preview: ClosurePreview;
  open: boolean;
  onClose: () => void;
  onClosed?: () => void;
};

export function CaseClosureDialog({
  caseId,
  preview,
  open,
  onClose,
  onClosed,
}: CaseClosureDialogProps) {
  const [factualOutcome, setFactualOutcome] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const executionLine = formatClosureExecutionLine(preview);
  const unresolved = preview.decisionStatus !== "resolved";
  const determiningLine = [preview.determiningFact, preview.resolvingEvidence]
    .filter((value, index, list) => Boolean(value) && list.indexOf(value) === index)
    .join("\n");

  useEffect(() => {
    if (!open) {
      setFactualOutcome("");
      setError(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isPending) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, isPending, onClose]);

  if (!open) return null;

  function handleClose() {
    setError(null);
    startTransition(async () => {
      try {
        await closeCase(caseId, { factualOutcome });
        onClosed?.();
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Не удалось закрыть кейс");
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget && !isPending) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-lg overflow-hidden rounded-t-2xl bg-white px-5 py-5 shadow-xl sm:rounded-2xl">
        <h2 className={workspaceType.section}>Закрыть кейс</h2>
        <p className={`mt-1.5 ${workspaceType.muted}`}>
          FO Brain зафиксирует итог решения в истории кейса.
        </p>

        {unresolved && (
          <p className="mt-3 text-sm leading-relaxed text-amber-800">
            Решение ещё не определено. При закрытии FO Brain зафиксирует, что ключевая
            неопределённость осталась.
          </p>
        )}

        <div className="mt-4 space-y-3">
          {preview.decision && (
            <div>
              <p className={workspaceType.kicker}>Решение</p>
              <p className={`mt-1 ${workspaceType.body}`}>{preview.decision}</p>
            </div>
          )}
          {determiningLine && (
            <div>
              <p className={workspaceType.kicker}>Что определило решение</p>
              <p className={`mt-1 whitespace-pre-wrap ${workspaceType.body}`}>{determiningLine}</p>
            </div>
          )}
          {executionLine && (
            <div>
              <p className={workspaceType.kicker}>Выполнение</p>
              <p className={`mt-1 ${workspaceType.body}`}>{executionLine}</p>
            </div>
          )}
        </div>

        <label className="mt-4 block">
          <span className={workspaceType.kicker}>Фактический итог</span>
          <textarea
            value={factualOutcome}
            disabled={isPending}
            onChange={(event) => setFactualOutcome(event.target.value)}
            rows={3}
            className="mt-1.5 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm leading-snug"
          />
          <span className={`mt-1.5 block ${workspaceType.muted}`}>
            Коротко зафиксируйте, чем ситуация закончилась. Например: сделка завершена, риск
            снят, объект приобретён по согласованной цене.
          </span>
        </label>

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={isPending}
            onClick={handleClose}
            className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-60"
          >
            {isPending ? "Сохранение…" : "Закрыть кейс"}
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={onClose}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
          >
            Отмена
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}
