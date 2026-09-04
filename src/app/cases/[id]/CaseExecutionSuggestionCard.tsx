"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { applyCaseExecution } from "@/app/cases/[id]/actions";
import type { ExecutionSuggestion } from "@/lib/case-execution";

type CaseExecutionSuggestionCardProps = {
  caseId: string;
  suggestion: ExecutionSuggestion;
};

export function CaseExecutionSuggestionCard({
  caseId,
  suggestion,
}: CaseExecutionSuggestionCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [step, setStep] = useState(suggestion.step);
  const [owner, setOwner] = useState(suggestion.owner ?? "");

  function run(action: () => Promise<void>) {
    setError(null);
    startTransition(async () => {
      try {
        await action();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Не удалось сохранить шаг исполнения");
      }
    });
  }

  function save(nextStep: string, nextOwner: string) {
    run(() => applyCaseExecution(caseId, { step: nextStep, owner: nextOwner }));
  }

  return (
    <section className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
      <h2 className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        FO Brain рекомендует
      </h2>
      <p className="mt-1.5 text-xs font-medium uppercase tracking-wide text-zinc-400">
        Следующий шаг
      </p>
      {editing ? (
        <div className="mt-1 space-y-2">
          <textarea
            value={step}
            disabled={isPending}
            onChange={(event) => setStep(event.target.value)}
            rows={2}
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm leading-snug"
          />
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">
              Ответственный
            </span>
            <input
              value={owner}
              disabled={isPending}
              onChange={(event) => setOwner(event.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm"
            />
          </label>
        </div>
      ) : (
        <>
          <p className="mt-0.5 text-sm font-medium text-zinc-900">{suggestion.step}</p>
          <p className="mt-2 text-xs font-medium uppercase tracking-wide text-zinc-400">
            Ответственный
          </p>
          <p className="mt-0.5 text-sm text-zinc-800">{suggestion.owner || "—"}</p>
        </>
      )}
      <p className="mt-1 text-xs text-zinc-500">{suggestion.reason}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {editing ? (
          <>
            <button
              type="button"
              disabled={isPending}
              onClick={() => save(step, owner)}
              className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-60"
            >
              {isPending ? "Сохранение…" : "Сохранить"}
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                setEditing(false);
                setStep(suggestion.step);
                setOwner(suggestion.owner ?? "");
              }}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
            >
              Отмена
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              disabled={isPending}
              onClick={() => save(suggestion.step, suggestion.owner ?? "")}
              className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-60"
            >
              {isPending ? "Сохранение…" : "Применить"}
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => setEditing(true)}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
            >
              Изменить
            </button>
          </>
        )}
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </section>
  );
}
