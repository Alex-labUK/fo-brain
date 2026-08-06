import { readFileSync, existsSync } from "fs";
import path from "path";
import OpenAI from "openai";
import type { AnalysisInput, AnalysisResult } from "@/core/orchestration/analysis-core";
import { normalizeAnalysisResult, SECTION_TITLES } from "@/core/orchestration/analysis-core";

const ANALYSIS_JSON_SCHEMA = `{
  "sections": [
    { "title": "${SECTION_TITLES[0]}", "content": "одно предложение — чего хотим достичь" },
    { "title": "${SECTION_TITLES[1]}", "content": "одна развилка — какое решение определяет весь маршрут" },
    { "title": "${SECTION_TITLES[2]}", "content": "один недостающий подтверждённый факт — не список, не вопрос" },
    {
      "title": "${SECTION_TITLES[3]}",
      "roleAssignments": [{ "role": "...", "result": "что эта роль должна вернуть" }]
    },
    {
      "title": "${SECTION_TITLES[4]}",
      "actions": ["конкретное действие 1", "конкретное действие 2"]
    },
    {
      "title": "${SECTION_TITLES[5]}",
      "scenarios": [
        { "tone": "positive", "action": "последствие если факт подтверждён" },
        { "tone": "negative", "action": "последствие если факт опровергнут" },
        { "tone": "warning", "action": "последствие если определить невозможно" }
      ]
    }
  ]
}`;

const THINKING_ORDER = `
Думай строго в этом порядке:
0. Applied Principle — сначала определи, какой конкретно принцип или паттерн из раздела 4 документа («Принципы и паттерны») напрямую относится к этому кейсу. Разверни Main Decision Fork из напряжения, которое описывает этот принцип, а не из поверхностной формулировки кейса.
1. Outcome — одно предложение, чего хотим достичь
2. Main Decision Fork — одна развилка
3. Determining Fact — один недостающий факт, от которого зависит ветка
4. Source of the Fact — кто может подтвердить (роль → что вернуть)
5. Actions required to obtain the Fact — до четырёх конкретных действий, не вопросов
6. Decision Routes — ровно три маршрута: positive / negative / warning
`.trim();

const OUTPUT_RULES = `
Обязательные ограничения:
- ровно шесть секций; title каждой секции — символ-в-символ как в JSON-схеме выше (включая эмодзи);
- Outcome — одно предложение, без рекомендаций и пояснений;
- Main Decision Fork — ровно одна развилка, не список;
- Main Decision Fork не должен быть пересказом Determining Fact. Это должны быть два содержательно разных пути действия или трактовки ситуации, а не одна и та же мысль, сформулированная дважды. Если получившийся Fork и Determining Fact означают одно и то же — переформулируй Fork;
- Determining Fact — ровно одно утверждение о недостающем факте; без знака «?»; не список; не несколько фактов;
- Determining Fact никогда не должен утверждать причинно-следственную связь (X является/не является причиной Y), если это не подтверждено во входных данных. Если причинность неизвестна, формулируй Determining Fact как открытый вопрос о том, что предстоит установить (например: «является ли перепланировка причиной протечки»), но не как ответ на него — ни в одну, ни в другую сторону;
- Who can confirm — массив roleAssignments: только role и result; без tasks; минимум одна роль;
- How do we obtain — массив actions: от 1 до 4 конкретных действий в повелительном наклонении; не вопросы;
- Decision Routes — массив scenarios: ровно три элемента с tone "positive", "negative", "warning" (по одному каждого); action — одно короткое последствие;
- запрещённые слова и фразы: «недостаточно информации», «предварительный вывод», «рекомендуется», «следует», «важно», «необходимо учитывать», «Family Office должен»;
- не выдумывать факты, которых нет во входе;
- весь текст на русском языке;
- показывай логику решения, не аналитический отчёт.
`.trim();

const PRINCIPLE_FEW_SHOT = `
Пример правильного применения: если собственная уязвимость клиента физически или юридически переплетена с предметом спора (как протечка и незаконная перепланировка в одном помещении), Main Decision Fork должен звучать как «эскалировать по существу сейчас — или сначала уладить/легализовать собственную уязвимость клиента, чтобы не дать контрагенту повод присмотреться к ней при эскалации», а не как факт-проверка, не связанная с этим риском.
`.trim();

let cachedDecisionEngine: string | null = null;

/** Loads decision-engine.md from the project root. */
export function loadDecisionEngineMarkdown(): string {
  if (cachedDecisionEngine) return cachedDecisionEngine;

  const rootPath = path.join(process.cwd(), "decision-engine.md");
  if (existsSync(rootPath)) {
    cachedDecisionEngine = readFileSync(rootPath, "utf-8");
    return cachedDecisionEngine;
  }

  throw new Error("decision-engine.md not found in project root");
}

function buildSystemPrompt(decisionEngine: string): string {
  return [
    "Ты — модуль принятия решений Family Office Brain. Применяй Decision Engine из документа ниже.",
    "Не пересказывай документ — используй его как модель мышления для конкретного кейса.",
    "",
    "--- Decision Engine ---",
    decisionEngine,
    "--- конец Decision Engine ---",
    "",
    THINKING_ORDER,
    "",
    PRINCIPLE_FEW_SHOT,
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
