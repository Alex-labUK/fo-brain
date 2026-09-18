"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  capturePrincipalDecision,
  retryPrincipalDecisionAnalysis,
} from "@/app/cases/[id]/principal-decision-actions";
import { workspaceType } from "@/app/cases/[id]/workspace-ui";
import { storeDecisionChangeSummary } from "@/lib/decision-change-summary";
import {
  PRINCIPAL_ANALYSIS_RETRY_ACTION,
  PRINCIPAL_ANALYSIS_RETRY_NOTICE,
} from "@/lib/principal-decision";

type CapturePrincipalDecisionButtonProps = {
  caseId: string;
  question: string;
  currentRoute?: string;
};

export function CapturePrincipalDecisionButton({
  caseId,
  question,
  currentRoute,
}: CapturePrincipalDecisionButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [savedPendingAnalysis, setSavedPendingAnalysis] = useState(false);
  const [isPending, startTransition] = useTransition();
  const submitLockRef = useRef(false);

  useEffect(() => {
    if (!open) {
      setText("");
      setError(null);
      setSavedPendingAnalysis(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isPending) {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, isPending]);

  function applyResult(result: {
    persisted: boolean;
    analysisUpdated: boolean;
    changeSummary: Parameters<typeof storeDecisionChangeSummary>[1] | null;
  }) {
    if (result.changeSummary) {
      storeDecisionChangeSummary(caseId, result.changeSummary);
    }
    if (result.persisted && !result.analysisUpdated) {
      setSavedPendingAnalysis(true);
      setError(null);
      router.refresh();
      return;
    }
    setOpen(false);
    router.refresh();
  }

  function handleSubmit(event?: React.FormEvent) {
    event?.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || isPending || submitLockRef.current) return;

    setError(null);
    submitLockRef.current = true;
    startTransition(async () => {
      try {
        const result = await capturePrincipalDecision(caseId, trimmed);
        applyResult(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Не удалось зафиксировать решение Principal");
      } finally {
        submitLockRef.current = false;
      }
    });
  }

  function handleRetry() {
    if (isPending || submitLockRef.current) return;
    submitLockRef.current = true;
    startTransition(async () => {
      try {
        const result = await retryPrincipalDecisionAnalysis(caseId);
        applyResult(result);
      } catch (err) {
        setSavedPendingAnalysis(true);
        setError(err instanceof Error ? err.message : PRINCIPAL_ANALYSIS_RETRY_NOTICE);
      } finally {
        submitLockRef.current = false;
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`mt-2 text-left text-sm text-zinc-600 underline-offset-2 hover:text-zinc-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300/60 focus-visible:ring-offset-2 ${workspaceType.muted}`}
      >
        Зафиксировать решение Principal
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget && !isPending) {
              setOpen(false);
            }
          }}
        >
          <div className="w-full max-w-lg overflow-hidden rounded-t-2xl bg-white px-5 py-5 shadow-xl sm:rounded-2xl">
            <h2 className={workspaceType.section}>Зафиксировать решение Principal</h2>
            {savedPendingAnalysis ? (
              <div className="mt-3 space-y-3">
                <p className={workspaceType.body}>{PRINCIPAL_ANALYSIS_RETRY_NOTICE}</p>
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => setOpen(false)}
                    className="rounded-lg px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100 disabled:opacity-60"
                  >
                    Закрыть
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={handleRetry}
                    className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-60"
                  >
                    {isPending ? "Обновление…" : PRINCIPAL_ANALYSIS_RETRY_ACTION}
                  </button>
                </div>
                {error ? <p className="text-sm text-red-600">{error}</p> : null}
              </div>
            ) : (
              <>
                <p className={`mt-1.5 ${workspaceType.muted}`}>
                  Коротко зафиксируйте принятое решение так, как оно было дано.
                </p>

                <div className="mt-4">
                  <p className={workspaceType.kicker}>Вопрос</p>
                  <p className={`mt-1 ${workspaceType.body}`}>{question}</p>
                </div>
                {currentRoute ? (
                  <div className="mt-3">
                    <p className={workspaceType.kicker}>Текущая позиция FO Brain</p>
                    <p className={`mt-1 ${workspaceType.body}`}>{currentRoute}</p>
                  </div>
                ) : null}

                <form onSubmit={handleSubmit} className="mt-4 space-y-3">
                  <label className="block">
                    <span className={workspaceType.kicker}>Решение Principal</span>
                    <textarea
                      value={text}
                      disabled={isPending}
                      onChange={(event) => setText(event.target.value)}
                      rows={3}
                      placeholder="Продолжать сделку только при полном снятии юридического риска."
                      className="mt-1.5 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm leading-snug focus:border-zinc-400 focus:outline-none disabled:opacity-60"
                    />
                  </label>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => setOpen(false)}
                      className="rounded-lg px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100 disabled:opacity-60"
                    >
                      Отмена
                    </button>
                    <button
                      type="submit"
                      disabled={isPending || !text.trim()}
                      className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-60"
                    >
                      {isPending ? "Сохранение…" : "Сохранить решение"}
                    </button>
                  </div>
                  {error ? <p className="text-sm text-red-600">{error}</p> : null}
                </form>
              </>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
