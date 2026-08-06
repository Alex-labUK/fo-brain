import OpenAI from "openai";
import { parseAnalysisPriority } from "@/core/orchestration/analysis-core";
import { loadDecisionEngineMarkdown } from "@/core/orchestration/analysis-ai";
import type { AnalysisPriority } from "@/lib/priority";

export type PriorityAssessmentInput = {
  facts: string;
  recordedResult?: string;
};

const PRIORITY_JSON_SCHEMA = `{
  "urgency": "urgent | soon | no_deadline",
  "stake": "high_irreversible | moderate | low_reversible",
  "note": "одно предложение на русском — почему такая оценка"
}`;

function buildPrioritySystemPrompt(decisionEngine: string): string {
  return [
    "Ты оцениваешь приоритет кейса Family Office по двум осям: urgency (срочность по срокам) и stake (ставка/обратимость для принципала).",
    "Используй контекст Decision Engine ниже только как ориентир для оценки риска и сроков.",
    "",
    "Определения urgency:",
    "- urgent — горит, нужно действовать в ближайшие дни",
    "- soon — не горит, но нужно решение в обозримом будущем",
    "- no_deadline — жёсткого срока нет",
    "",
    "Определения stake:",
    "- high_irreversible — высокая, потенциально необратимая ставка для принципала",
    "- moderate — заметная, но поправимая",
    "- low_reversible — низкая, легко обратимая",
    "",
    "--- Decision Engine (сокращённо) ---",
    decisionEngine,
    "--- конец ---",
    "",
    "Верни только валидный JSON без markdown-обёртки:",
    PRIORITY_JSON_SCHEMA,
    "",
    "note — ровно одно предложение на русском. urgency и stake оценивай независимо.",
  ].join("\n");
}

function buildPriorityUserPrompt(input: PriorityAssessmentInput): string {
  const lines = ["Факты кейса:", input.facts.trim()];
  const summary = input.recordedResult?.trim();
  if (summary) {
    lines.push("", "Краткий итог / развилка:", summary);
  }
  return lines.join("\n");
}

/** Lightweight OpenAI call — priority only, not full six-section analysis. */
export async function assessPriorityWithAI(
  input: PriorityAssessmentInput,
): Promise<AnalysisPriority> {
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
      { role: "system", content: buildPrioritySystemPrompt(decisionEngine) },
      { role: "user", content: buildPriorityUserPrompt(input) },
    ],
  });

  if (response.usage) {
    console.info("[analysis-priority] path=ai", {
      usage: {
        prompt_tokens: response.usage.prompt_tokens,
        completion_tokens: response.usage.completion_tokens,
        total_tokens: response.usage.total_tokens,
      },
    });
  } else {
    console.info("[analysis-priority] path=ai");
  }

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI returned empty priority response");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("OpenAI returned invalid priority JSON");
  }

  const priority = parseAnalysisPriority(parsed);
  if (!priority) {
    throw new Error("OpenAI returned invalid priority values");
  }

  return priority;
}
