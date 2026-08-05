"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { runCaseAnalysis } from "@/app/analyze/actions";
import {
  ANALYSIS_INPUT_STORAGE_KEY,
  ANALYSIS_RESULT_STORAGE_KEY,
  generateAnalysisStub,
  getScenarioSymbol,
  type AnalysisInput,
  type AnalysisResult,
} from "@/core/orchestration/analysis-stub";
import type { SubsystemCatalogItem } from "@/core/orchestration/types";

type AnalysisResultProps = {
  subsystems: SubsystemCatalogItem[];
};

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

export function AnalysisResult({ subsystems }: AnalysisResultProps) {
  const storedInputRaw = useStoredInputRaw();
  const input = useMemo(() => {
    if (!storedInputRaw) return null;
    try {
      return JSON.parse(storedInputRaw) as AnalysisInput;
    } catch {
      return null;
    }
  }, [storedInputRaw]);

  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!input) return;

    let cancelled = false;

    async function loadAnalysis() {
      const cached = sessionStorage.getItem(ANALYSIS_RESULT_STORAGE_KEY);
      if (cached) {
        try {
          if (!cancelled) {
            setAnalysis(JSON.parse(cached) as AnalysisResult);
            setLoading(false);
          }
          return;
        } catch {
          sessionStorage.removeItem(ANALYSIS_RESULT_STORAGE_KEY);
        }
      }

      if (!cancelled) setLoading(true);

      try {
        const result = await runCaseAnalysis(input);
        if (cancelled) return;
        sessionStorage.setItem(ANALYSIS_RESULT_STORAGE_KEY, JSON.stringify(result));
        setAnalysis(result);
      } catch {
        if (cancelled) return;
        const fallback = generateAnalysisStub(input, subsystems);
        sessionStorage.setItem(ANALYSIS_RESULT_STORAGE_KEY, JSON.stringify(fallback));
        setAnalysis(fallback);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadAnalysis();

    return () => {
      cancelled = true;
    };
  }, [input, subsystems]);

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

  if (loading || !analysis) {
    return <p className="text-sm text-zinc-500">Загрузка анализа…</p>;
  }

  return (
    <div className="space-y-6">
      {analysis.sections.map((section) => (
        <section
          key={section.title}
          className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm"
        >
          <h2 className="text-base font-semibold text-zinc-900">{section.title}</h2>

          {section.content && (
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">
              {section.content}
            </p>
          )}

          {section.facts && section.facts.length > 0 && (
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-zinc-700">
              {section.facts.map((fact, index) => (
                <li key={`${index}-${fact}`}>{fact}</li>
              ))}
            </ul>
          )}

          {section.roleAssignments && section.roleAssignments.length > 0 && (
            <div className="mt-4 space-y-6">
              {section.roleAssignments.map((assignment) => (
                <div key={assignment.role} className="border-t border-zinc-100 pt-4 first:border-t-0 first:pt-0">
                  <h3 className="text-sm font-semibold text-zinc-900">{assignment.role}</h3>
                  {assignment.tasksHeading && (
                    <p className="mt-2 text-sm font-medium text-zinc-800">{assignment.tasksHeading}:</p>
                  )}
                  <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-zinc-700">
                    {assignment.tasks.map((task, index) => (
                      <li key={`${assignment.role}-${index}`}>{task}</li>
                    ))}
                  </ul>
                  <p className="mt-3 text-sm text-zinc-600">
                    <span className="font-medium text-zinc-800">Результат:</span> {assignment.result}
                  </p>
                </div>
              ))}
            </div>
          )}

          {section.scenarios && section.scenarios.length > 0 && (
            <div className="mt-4 space-y-5">
              {section.scenarios.map((scenario, index) => (
                <div
                  key={`${index}-${scenario.conditions.join("-")}`}
                  className="rounded-lg bg-zinc-50 px-4 py-4"
                >
                  <p className="text-sm font-medium text-zinc-800">Если</p>
                  <ul className="mt-2 space-y-1 text-sm leading-relaxed text-zinc-700">
                    {scenario.conditions.map((condition) => (
                      <li key={condition}>
                        {getScenarioSymbol(scenario.tone)} {condition}
                      </li>
                    ))}
                  </ul>
                  <p className="my-2 text-center text-sm text-zinc-500">↓</p>
                  <p className="text-sm leading-relaxed text-zinc-800">{scenario.action}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      ))}

      <div className="flex flex-wrap gap-3 pt-2">
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
