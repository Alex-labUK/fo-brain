import "server-only";

import { readFileSync, existsSync } from "fs";
import path from "path";
import OpenAI from "openai";
import type { AnalysisInput, AnalysisResult } from "@/core/orchestration/analysis-core";
import { normalizeAnalysisResult } from "@/core/orchestration/analysis-core";

const ANALYSIS_JSON_SCHEMA = `{
  "sections": [
    {
      "title": "Главная развилка",
      "content": "..."
    },
    {
      "title": "Что нужно выяснить",
      "roleGroups": [
        {
          "role": "...",
          "questions": ["..."]
        }
      ]
    },
    {
      "title": "Кому поручить",
      "roleAssignments": [
        {
          "role": "...",
          "tasks": ["..."],
          "tasksHeading": "Проверить",
          "result": "..."
        }
      ]
    },
    {
      "title": "Если выяснится...",
      "scenarios": [
        {
          "tone": "positive | negative | warning",
          "conditions": ["..."],
          "action": "..."
        }
      ]
    }
  ]
}`;

const OUTPUT_RULES = `
Обязательные ограничения:
- одна конкретная развилка в блоке «Главная развилка»;
- максимум пять решающих вопросов суммарно во всех roleGroups;
- каждый вопрос должен менять маршрут решения;
- каждое подразделение подключается только ради конкретного ответа;
- максимум три сценария;
- никаких универсальных фраз («недостаточно информации», «рекомендуется», «следует», «важно», «Family Office должен» и т.п.);
- не использовать текст других кейсов;
- не выдумывать факты;
- если данных мало — задавать конкретный вопрос, а не общую фразу;
- весь результат на русском языке.
`.trim();

let cachedDecisionEngine: string | null = null;

/** Loads decision-engine.md from the project root (or docs/architecture fallback). */
export function loadDecisionEngineMarkdown(): string {
  if (cachedDecisionEngine) return cachedDecisionEngine;

  const candidates = [
    path.join(process.cwd(), "decision-engine.md"),
    path.join(process.cwd(), "docs", "architecture", "decision-engine.md"),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      cachedDecisionEngine = readFileSync(candidate, "utf-8");
      return cachedDecisionEngine;
    }
  }

  throw new Error("decision-engine.md not found in project root or docs/architecture/");
}

function buildSystemPrompt(decisionEngine: string): string {
  return [
    "Ты — аналитический модуль Family Office Brain. Применяй Decision Engine из документа ниже.",
    "Не пересказывай документ — используй его как модель мышления для конкретного кейса.",
    "",
    "--- Decision Engine ---",
    decisionEngine,
    "--- конец Decision Engine ---",
    "",
    "Верни только валидный JSON без markdown-обёртки.",
    "Формат ответа:",
    ANALYSIS_JSON_SCHEMA,
    "",
    OUTPUT_RULES,
  ].join("\n");
}

function buildUserPrompt(input: AnalysisInput): string {
  return [
    "Что произошло:",
    input.whatHappened.trim(),
    "",
    "Желаемый результат принципала:",
    input.desiredOutcome.trim(),
  ].join("\n");
}

/** Calls OpenAI and returns normalized AnalysisResult. */
export async function generateAnalysisWithAI(input: AnalysisInput): Promise<AnalysisResult> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const decisionEngine = loadDecisionEngineMarkdown();
  const client = new OpenAI({ apiKey });

  const response = await client.chat.completions.create({
    model: process.env.OPENAI_ANALYSIS_MODEL?.trim() || "gpt-4o-mini",
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: buildSystemPrompt(decisionEngine) },
      { role: "user", content: buildUserPrompt(input) },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI returned empty analysis response");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("OpenAI returned invalid JSON");
  }

  return normalizeAnalysisResult(parsed);
}
