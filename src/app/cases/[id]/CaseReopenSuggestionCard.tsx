"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { applyReopenSuggestion, dismissReopenSuggestion } from "@/app/cases/[id]/actions";
import { lifecycleLabel } from "@/lib/case-lifecycle";
import type { StoredReopenSuggestion } from "@/lib/decision-cycle";

type CaseReopenSuggestionCardProps = {
  caseId: string;
  suggestion: StoredReopenSuggestion;
};

export function CaseReopenSuggestionCard({ caseId, suggestion }: CaseReopenSuggestionCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(action: () => Promise<void>) {
    setError(null);
    startTransition(async () => {
      try {
        await action();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Не удалось обработать рекомендацию");
      }
    });
  }

  return (
    <section className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
      <h2 className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        FO Brain рекомендует возобновить кейс
      </h2>
      <p className="mt-1.5 text-sm text-zinc-800">{suggestion.reason}</p>
      <p className="mt-2 text-xs font-medium uppercase tracking-wide text-zinc-400">
        Новая неопределённость
      </p>
      <p className="mt-0.5 text-sm font-medium text-zinc-900">{suggestion.fork}</p>
      <p className="mt-2 text-xs text-zinc-500">
        После подтверждения: {lifecycleLabel(suggestion.recommendedState)}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={() => run(() => applyReopenSuggestion(caseId))}
          className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-60"
        >
          {isPending ? "Сохранение…" : "Применить"}
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => run(() => dismissReopenSuggestion(caseId))}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
        >
          Оставить закрытым
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </section>
  );
}
