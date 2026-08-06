"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore, useTransition } from "react";
import type { CaseStatus } from "@prisma/client";
import { saveAnalysisAsCase, runCaseAnalysis } from "@/app/analyze/actions";
import { PriorityBadge } from "@/components/PriorityBadge";
import { AnalysisSections } from "@/components/AnalysisSections";
import {
  ANALYSIS_INPUT_STORAGE_KEY,
  ANALYSIS_RESULT_STORAGE_KEY,
  type AnalysisInput,
  type AnalysisRunResult,
} from "@/core/orchestration/analysis-stub";
import { caseStatusLabels, formatDomain, knownDomains } from "@/lib/labels";
import type { SubsystemCatalogItem } from "@/core/orchestration/types";

type AnalysisResultProps = {
  subsystems: SubsystemCatalogItem[];
};

const CASE_STATUS_OPTIONS = Object.entries(caseStatusLabels) as Array<[CaseStatus, string]>;

const FALLBACK_BANNER_TEXT =
  "⚠ Реальный анализ ИИ сейчас недоступен (превышен лимит запросов или ошибка сервиса). Показан резервный шаблон — он НЕ основан на вашей базе знаний и решениях. Результат ниже нужно перепроверить или попробовать ещё раз.";

function getStoredInputRaw(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(ANALYSIS_INPUT_STORAGE_KEY);
}

function subscribe(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  return () => window.removeEventListener("storage", onStoreChange);
}

function useStoredInputRaw(): string | null {
  return useSyncExternalStore(subscribe, getStoredInputRaw, () => null);
}

function clearAnalysisSessionStorage(): void {
  sessionStorage.removeItem(ANALYSIS_INPUT_STORAGE_KEY);
  sessionStorage.removeItem(ANALYSIS_RESULT_STORAGE_KEY);
}

function parseStoredRun(raw: string): AnalysisRunResult | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "result" in parsed &&
      "source" in parsed &&
      typeof (parsed as AnalysisRunResult).source === "string"
    ) {
      const run = parsed as AnalysisRunResult;
      if (Array.isArray(run.result?.sections)) {
        return run;
      }
    }
  } catch {
    // ignore invalid cache
  }
  return null;
}

export function AnalysisResult({ subsystems }: AnalysisResultProps) {
  void subsystems;
  const router = useRouter();
  const storedInputRaw = useStoredInputRaw();
  const input = useMemo(() => {
    if (!storedInputRaw) return null;
    try {
      return JSON.parse(storedInputRaw) as AnalysisInput;
    } catch {
      return null;
    }
  }, [storedInputRaw]);

  const [analysisRun, setAnalysisRun] = useState<AnalysisRunResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [retryError, setRetryError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [domain, setDomain] = useState(knownDomains[0] ?? "dispute_responsibility");
  const [status, setStatus] = useState<CaseStatus>("real_in_progress");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, startSaveTransition] = useTransition();
  const [isRetrying, startRetryTransition] = useTransition();

  const loadAnalysis = useCallback(
    (caseInput: AnalysisInput, options?: { skipCache?: boolean }) => {
      if (!options?.skipCache) {
        const cached = sessionStorage.getItem(ANALYSIS_RESULT_STORAGE_KEY);
        if (cached) {
          const run = parseStoredRun(cached);
          if (run) {
            setAnalysisRun(run);
            setLoading(false);
            return;
          }
          sessionStorage.removeItem(ANALYSIS_RESULT_STORAGE_KEY);
        }
      } else {
        sessionStorage.removeItem(ANALYSIS_RESULT_STORAGE_KEY);
      }

      setLoading(true);
      setRetryError(null);

      void runCaseAnalysis(caseInput)
        .then((run) => {
          sessionStorage.setItem(ANALYSIS_RESULT_STORAGE_KEY, JSON.stringify(run));
          setAnalysisRun(run);
        })
        .catch((err) => {
          setRetryError(err instanceof Error ? err.message : "Не удалось выполнить анализ");
        })
        .finally(() => {
          setLoading(false);
        });
    },
    [],
  );

  useEffect(() => {
    if (!input) return;
    loadAnalysis(input);
  }, [input, loadAnalysis]);

  function handleRetry() {
    if (!input) return;

    startRetryTransition(() => {
      loadAnalysis(input, { skipCache: true });
    });
  }

  function handleSaveCase(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!input || !analysisRun || analysisRun.source !== "ai") return;

    setSaveError(null);

    startSaveTransition(async () => {
      try {
        const { id } = await saveAnalysisAsCase({
          title,
          domain,
          status,
          input,
          analysisResult: analysisRun.result,
        });
        clearAnalysisSessionStorage();
        router.push(`/cases/${id}`);
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : "Не удалось сохранить кейс");
      }
    });
  }

  if (!input) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-zinc-600">
          Нет данных для анализа. Начните с описания ситуации.
        </p>
        <Link
          href="/analyze"
          className="inline-block rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
        >
          Расскажите, что произошло
        </Link>
      </div>
    );
  }

  if (loading || !analysisRun) {
    return <p className="text-sm text-zinc-500">Загрузка анализа…</p>;
  }

  const analysis = analysisRun.result;
  const isFallback = analysisRun.source === "fallback";

  return (
    <div className="space-y-4">
      {isFallback && (
        <section className="rounded-xl border border-amber-300 bg-amber-50 px-5 py-4 shadow-sm">
          <p className="text-sm leading-relaxed text-amber-950">{FALLBACK_BANNER_TEXT}</p>
          <button
            type="button"
            onClick={handleRetry}
            disabled={isRetrying || loading}
            className="mt-3 rounded-lg border border-amber-400 bg-white px-4 py-2 text-sm font-medium text-amber-950 hover:bg-amber-100 disabled:opacity-60"
          >
            {isRetrying || loading ? "Повтор…" : "Попробовать снова"}
          </button>
          {retryError && <p className="mt-2 text-sm text-red-700">{retryError}</p>}
        </section>
      )}

      {analysis.priority && (
        <section className="rounded-xl border border-zinc-200 bg-white px-5 py-4 shadow-sm">
          <h2 className="text-sm font-semibold text-zinc-900">Приоритет</h2>
          <div className="mt-2">
            <PriorityBadge priority={analysis.priority} />
          </div>
        </section>
      )}

      <AnalysisSections sections={analysis.sections} />

      {!isFallback && (
        <section className="rounded-xl border border-zinc-200 bg-white px-5 py-4 shadow-sm">
          <h2 className="text-sm font-semibold text-zinc-900">Сохранить как кейс</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Добавить этот разбор в базу кейсов для дальнейшей работы.
          </p>

          <form onSubmit={handleSaveCase} className="mt-4 space-y-4">
            <div>
              <label htmlFor="case-title" className="block text-sm font-medium text-zinc-700">
                Название кейса
              </label>
              <input
                id="case-title"
                type="text"
                required
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900"
                placeholder="Краткое название ситуации"
              />
            </div>

            <div>
              <label htmlFor="case-domain" className="block text-sm font-medium text-zinc-700">
                Домен
              </label>
              <select
                id="case-domain"
                value={domain}
                onChange={(event) => setDomain(event.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900"
              >
                {knownDomains.map((domainKey) => (
                  <option key={domainKey} value={domainKey}>
                    {formatDomain(domainKey)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="case-status" className="block text-sm font-medium text-zinc-700">
                Статус
              </label>
              <select
                id="case-status"
                value={status}
                onChange={(event) => setStatus(event.target.value as CaseStatus)}
                className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900"
              >
                {CASE_STATUS_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {saveError && <p className="text-sm text-red-600">{saveError}</p>}

            <button
              type="submit"
              disabled={isSaving}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-60"
            >
              {isSaving ? "Сохранение…" : "Сохранить кейс"}
            </button>
          </form>
        </section>
      )}

      <div className="flex flex-wrap gap-3 pt-1">
        <Link
          href="/analyze"
          className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Новый анализ
        </Link>
      </div>
    </div>
  );
}
