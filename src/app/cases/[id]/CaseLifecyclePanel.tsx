"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import type { CaseBlockerType, CaseLifecycleState } from "@prisma/client";
import { updateCaseLifecycle } from "@/app/cases/[id]/actions";
import {
  allowsBlockerNote,
  blockerLabel,
  blockerNotePlaceholders,
  formatLifecycleSince,
  isBlockerApplicable,
  lifecycleLabel,
  lifecycleStates,
} from "@/lib/case-lifecycle";

type CaseLifecyclePanelProps = {
  caseId: string;
  lifecycleState: CaseLifecycleState;
  blockerType: CaseBlockerType;
  blockerNote: string | null;
  lifecycleUpdatedAt: string;
  renderedAt: string;
};

export function CaseLifecyclePanel({
  caseId,
  lifecycleState,
  blockerType,
  blockerNote,
  lifecycleUpdatedAt,
  renderedAt,
}: CaseLifecyclePanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selectedState, setSelectedState] = useState(lifecycleState);
  const [note, setNote] = useState(blockerNote ?? "");

  useEffect(() => {
    setSelectedState(lifecycleState);
    setNote(blockerNote ?? "");
  }, [lifecycleState, blockerNote]);

  const showNoteField = allowsBlockerNote(selectedState);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmedNote = note.trim();
    setError(null);
    startTransition(async () => {
      try {
        await updateCaseLifecycle(caseId, {
          lifecycleState: selectedState,
          blockerType:
            selectedState === "executing" && trimmedNote ? "execution" : "none",
          blockerNote: showNoteField ? trimmedNote : null,
        });
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Не удалось обновить жизненный цикл");
      }
    });
  }

  return (
    <section className="rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
      <h2 className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        Жизненный цикл
      </h2>
      <p className="mt-1.5 text-sm font-medium text-zinc-900">{lifecycleLabel(lifecycleState)}</p>
      {isBlockerApplicable(blockerType) && (
        <p className="mt-0.5 text-xs text-zinc-500">{blockerLabel(blockerType)}</p>
      )}
      {blockerNote && <p className="mt-1 text-sm text-zinc-700">{blockerNote}</p>}
      <p className="mt-1 text-xs text-zinc-400">
        {formatLifecycleSince(lifecycleUpdatedAt, renderedAt)}
      </p>

      <form onSubmit={handleSubmit} className="mt-3 space-y-2">
        <label className="block">
          <span className="sr-only">Состояние</span>
          <select
            value={selectedState}
            disabled={isPending}
            onChange={(event) => setSelectedState(event.target.value as CaseLifecycleState)}
            className="w-full rounded-lg border border-zinc-200 px-3 py-1.5 text-sm"
          >
            {lifecycleStates.map((state) => (
              <option key={state} value={state}>
                {lifecycleLabel(state)}
              </option>
            ))}
          </select>
        </label>
        {showNoteField && (
          <label className="block">
            <span className="sr-only">Чего ждём?</span>
            <textarea
              value={note}
              disabled={isPending}
              onChange={(event) => setNote(event.target.value)}
              rows={2}
              placeholder={blockerNotePlaceholders[selectedState] ?? "Чего ждём?"}
              className="w-full rounded-lg border border-zinc-200 px-3 py-1.5 text-sm leading-snug"
            />
          </label>
        )}
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
        >
          {isPending ? "Сохранение…" : "Сохранить"}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </section>
  );
}
