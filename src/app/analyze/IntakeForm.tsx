"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { startNewSituation } from "@/app/analyze/actions";
import { isMeaningfulSituation } from "@/lib/situation-title";

const PLACEHOLDER =
  "Например: Принципал рассматривает покупку дома. Технический отчёт выявил проблему с пристройкой, продавец обещает её устранить, но пока неизвестно, снимет ли это юридический риск.";

export function IntakeForm() {
  const router = useRouter();
  const [whatHappened, setWhatHappened] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;

    if (!isMeaningfulSituation(whatHappened)) {
      setError("Опишите, что произошло");
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const { id } = await startNewSituation(whatHappened);
      router.push(`/cases/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось разобрать ситуацию");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8">
      <textarea
        value={whatHappened}
        onChange={(event) => {
          setWhatHappened(event.target.value);
          if (error) setError(null);
        }}
        disabled={submitting}
        rows={12}
        placeholder={PLACEHOLDER}
        className="w-full resize-y rounded-xl border border-zinc-200 bg-white px-4 py-3 text-base leading-relaxed text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-zinc-400 disabled:opacity-60"
      />

      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="mt-6 rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-60"
      >
        {submitting ? "Разбираю ситуацию…" : "Разобрать ситуацию"}
      </button>
    </form>
  );
}
