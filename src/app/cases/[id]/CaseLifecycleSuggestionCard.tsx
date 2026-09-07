"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  applyLifecycleSuggestion,
  dismissLifecycleSuggestion,
} from "@/app/cases/[id]/actions";
import { workspaceGuidanceSurfaceClass, workspaceType } from "@/app/cases/[id]/workspace-ui";
import { lifecycleLabel, type LifecycleSuggestion } from "@/lib/case-lifecycle";

type CaseLifecycleSuggestionCardProps = {
  caseId: string;
  suggestion: LifecycleSuggestion;
  showReason?: boolean;
};

export function CaseLifecycleSuggestionCard({
  caseId,
  suggestion,
  showReason = true,
}: CaseLifecycleSuggestionCardProps) {
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

  const detail =
    suggestion.blockerNote ||
    (showReason && suggestion.reason && suggestion.reason !== suggestion.blockerNote
      ? suggestion.reason
      : null);

  return (
    <section className={workspaceGuidanceSurfaceClass}>
      <p className={workspaceType.kicker}>FO Brain</p>
      <p className={`mt-2 ${workspaceType.section}`}>
        Рекомендует → {lifecycleLabel(suggestion.state)}
      </p>
      {detail && <p className={`mt-1.5 ${workspaceType.muted}`}>{detail}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={() => run(() => applyLifecycleSuggestion(caseId))}
          className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-60"
        >
          {isPending ? "Сохранение…" : "Применить"}
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => run(() => dismissLifecycleSuggestion(caseId))}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
        >
          Оставить как есть
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </section>
  );
}
