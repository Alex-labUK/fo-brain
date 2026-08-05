"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ANALYSIS_INPUT_STORAGE_KEY, ANALYSIS_RESULT_STORAGE_KEY, type AnalysisInput } from "@/core/orchestration/analysis-stub";

export function IntakeForm() {
  const router = useRouter();
  const [whatHappened, setWhatHappened] = useState("");
  const [desiredOutcome, setDesiredOutcome] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!whatHappened.trim()) {
      setError("Опишите, что произошло");
      return;
    }
    if (!desiredOutcome.trim()) {
      setError("Укажите, какого результата хочет принципал");
      return;
    }

    const input: AnalysisInput = {
      whatHappened: whatHappened.trim(),
      desiredOutcome: desiredOutcome.trim(),
    };

    sessionStorage.setItem(ANALYSIS_INPUT_STORAGE_KEY, JSON.stringify(input));
    sessionStorage.removeItem(ANALYSIS_RESULT_STORAGE_KEY);
    router.push("/analyze/result");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <label className="block space-y-2">
        <span className="text-sm font-medium text-zinc-700">Что произошло?</span>
        <textarea
          value={whatHappened}
          onChange={(e) => {
            setWhatHappened(e.target.value);
            setError(null);
          }}
          rows={10}
          placeholder="Опишите ситуацию своими словами..."
          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm leading-relaxed"
        />
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-zinc-700">Какого результата хочет принципал?</span>
        <textarea
          value={desiredOutcome}
          onChange={(e) => {
            setDesiredOutcome(e.target.value);
            setError(null);
          }}
          rows={5}
          placeholder="Что принципал хочет получить в итоге..."
          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm leading-relaxed"
        />
      </label>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <button
        type="submit"
        className="rounded-lg bg-zinc-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-zinc-700"
      >
        Анализировать
      </button>
    </form>
  );
}
