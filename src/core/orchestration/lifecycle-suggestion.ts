import OpenAI from "openai";
import type { CaseBlockerType, CaseLifecycleState } from "@prisma/client";
import type { AnalysisResult, ConversationTurn, DecisionStatus } from "@/core/orchestration/analysis-core";
import { SECTION_TITLES } from "@/core/orchestration/analysis-core";
import {
  lifecycleLabel,
  parseLifecycleSuggestion,
  type LifecycleSuggestion,
} from "@/lib/case-lifecycle";

export type LifecycleSuggestionInput = {
  lifecycleState: CaseLifecycleState;
  blockerType: CaseBlockerType;
  blockerNote: string | null;
  caseMemory: string;
  facts?: string;
  analysis: AnalysisResult;
  dialogue?: ConversationTurn[];
};

const SUGGESTION_JSON_SCHEMA = `{
  "state": "new | under_analysis | waiting_for_fact | waiting_for_third_party | waiting_for_principal | executing | monitoring | closed",
  "blockerNote": "короткая заметка — чего ждём или что должно быть исполнено; пустая строка если не нужна",
  "reason": "1–2 предложения на русском: почему именно это состояние сейчас"
}`;

function sectionContent(analysis: AnalysisResult, title: string): string {
  return analysis.sections.find((section) => section.title === title)?.content?.trim() || "";
}

function sectionActions(analysis: AnalysisResult): string[] {
  return analysis.sections.find((section) => section.title === SECTION_TITLES[4])?.actions ?? [];
}

export function buildLifecycleSuggestionSystemPrompt(): string {
  return [
    "Ты советуешь руководителю Family Office, в каком состоянии жизненного цикла сейчас находится кейс.",
    "Это только рекомендация. Ты не меняешь состояние кейса и не принимаешь решений.",
    "",
    "Допустимые state:",
    "- under_analysis — ещё нужно разбираться; кейс не стоит чисто в ожидании, исполнении или мониторинге",
    "- waiting_for_fact — следующий маршрут зависит от получения или подтверждения информации",
    "- waiting_for_third_party — кейс блокирует ответ или действие внешней стороны, и это ещё не исполнение уже согласованного курса",
    "- waiting_for_principal — факты достаточны, нужно решение принципала",
    "- executing — маршрут/решение уже ясно, сейчас ждут выполнения согласованных действий",
    "- monitoring — действие сделано, дальше наблюдение/проверка, а не новое решение",
    "- closed — не осталось решения, блокера, исполнения или мониторинга",
    "- new — только если работа по существу ещё не началась",
    "",
    "Главное различение: Determining Fact ≠ lifecycle blocker.",
    "Determining Fact — какой факт определит маршрут анализа.",
    "Lifecycle — где кейс находится операционно прямо сейчас.",
    "decisionStatus разбора ≠ закрытие кейса.",
    "Пример: если определяющий факт появится только после того, как подрядчик выполнит уже согласованный ремонт, текущее состояние скорее executing, а не waiting_for_fact.",
    "",
    "Учитывай decisionStatus разбора, но не копируй его в lifecycle:",
    "- resolved + согласованные действия ещё идут → executing",
    "- resolved + осталось только наблюдение → monitoring",
    "- resolved + не осталось материального шага → closed",
    "- unresolved + нужно решение принципала → waiting_for_principal",
    "- unresolved + нужен факт → waiting_for_fact",
    "",
    "Если в памяти кейса принципал уже принял решение по маршруту, а новое сообщение это не отменяет — не предлагай waiting_for_principal.",
    "Не предлагай closed, пока есть решение, блокер, исполнение или потребность в мониторинге.",
    "Не предлагай waiting_for_fact только потому, что в разборе есть Determining Fact.",
    "blockerNote пиши по-русски, коротко и конкретно: чего ждём или что должно быть сделано.",
    "Если state не предполагает ожидание/исполнение — верни пустой blockerNote.",
    "Если текущее состояние уже верное — верни его же, с короткой reason.",
    "",
    "Верни только валидный JSON без markdown:",
    SUGGESTION_JSON_SCHEMA,
  ].join("\n");
}

export function buildLifecycleSuggestionUserPrompt(input: LifecycleSuggestionInput): string {
  const fork = sectionContent(input.analysis, SECTION_TITLES[1]);
  const determiningFact = sectionContent(input.analysis, SECTION_TITLES[2]);
  const actions = sectionActions(input.analysis);
  const reply = input.analysis.reply?.trim() || "";
  const decisionStatus: DecisionStatus = input.analysis.decisionStatus ?? "unresolved";
  const dialogue = (input.dialogue ?? [])
    .slice(-8)
    .map((turn) => `${turn.role}: ${turn.content}`)
    .join("\n");

  const lines = [
    `Текущее состояние: ${input.lifecycleState} (${lifecycleLabel(input.lifecycleState)})`,
    `Текущий blockerType: ${input.blockerType}`,
    `Текущая blockerNote: ${input.blockerNote?.trim() || "—"}`,
    `decisionStatus разбора: ${decisionStatus}`,
    "",
    "Память кейса:",
    input.caseMemory.trim() || "—",
  ];

  const facts = input.facts?.trim();
  if (facts) {
    lines.push("", "Исходные факты:", facts);
  }

  lines.push(
    "",
    `Main Decision Fork: ${fork || "—"}`,
    `Determining Fact: ${determiningFact || "—"}`,
    "Actions:",
    actions.length > 0 ? actions.map((action) => `- ${action}`).join("\n") : "—",
  );

  if (reply) {
    lines.push("", "Последний reply разбора:", reply);
  }

  if (dialogue) {
    lines.push("", "Недавний диалог:", dialogue);
  }

  return lines.join("\n");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Advisory lifecycle suggestion. Never writes Case lifecycle fields.
 * Returns null when AI is unavailable or the payload is invalid.
 */
export async function generateLifecycleSuggestion(
  input: LifecycleSuggestionInput,
): Promise<LifecycleSuggestion | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return null;
  }

  try {
    const client = new OpenAI({ apiKey });
    const response = await client.chat.completions.create({
      model: process.env.OPENAI_ANALYSIS_MODEL?.trim() || "gpt-4o-mini",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: buildLifecycleSuggestionSystemPrompt() },
        { role: "user", content: buildLifecycleSuggestionUserPrompt(input) },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return null;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      return null;
    }

    if (!isRecord(parsed)) {
      return null;
    }

    const suggestion = parseLifecycleSuggestion(parsed);
    if (suggestion) {
      console.info("[lifecycle-suggestion] state=", suggestion.state);
    }
    return suggestion;
  } catch (error) {
    console.error("[lifecycle-suggestion] failed:", error);
    return null;
  }
}
