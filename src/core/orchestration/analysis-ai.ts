import { readFileSync, existsSync } from "fs";
import path from "path";
import OpenAI from "openai";
import type {
  AnalysisInput,
  AnalysisResult,
  ContinueAnalysisInput,
  ConversationTurn,
} from "@/core/orchestration/analysis-core";
import { normalizeAnalysisResult, MAX_ACTIONS, SECTION_TITLES } from "@/core/orchestration/analysis-core";

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
    }
  ],
  "priority": {
    "urgency": "urgent | soon | no_deadline",
    "stake": "high_irreversible | moderate | low_reversible",
    "note": "одно предложение — почему такая оценка приоритета"
  },
  "reply": "1–3 предложения — прямой ответ руководителю FO, который ведёт этот диалог с системой: что учтено из новых вводных и что это меняет для решения"
}`;

const THINKING_ORDER = `
Думай строго в этом порядке:
0. Applied Principle — сначала определи, какой конкретно принцип или паттерн из раздела 4 документа («Принципы и паттерны») напрямую относится к этому кейсу. Разверни Main Decision Fork из напряжения, которое описывает этот принцип, а не из поверхностной формулировки кейса.
1. Outcome — одно предложение, чего хотим достичь; если желаемый результат принципала не указан явно во входе, восстанови наиболее вероятную цель из контекста ситуации и типичной роли FO (защита интересов принципала по умолчанию) и начни Outcome с «Предполагаемая цель принципала: ...»
2. Main Decision Fork — одна развилка
3. Determining Fact — один недостающий факт, от которого зависит ветка
4. Source of the Fact — кто может подтвердить (роль → что вернуть)
5. Actions required to obtain the Fact — до четырёх конкретных действий, не вопросов; каждое действие напрямую подтверждает или опровергает Determining Fact
5a. Internal Route-Change Check (мысленно, не в ответе) — перед финализацией Determining Fact проверь: если факт подтвердится — какой маршрут становится невозможным? если опровергнется? если не удастся установить в разумный срок? Если нет чёткого расхождения хотя бы по двум из трёх исходов — пересмотри Determining Fact и действия
6. Priority — оцени urgency (срочность по срокам) и stake (ставка/обратимость для принципала) независимо друг от друга; note — одно предложение, почему именно такая оценка
7. Reply — 1–3 предложения, прямой ответ руководителю FO (пользователю системы): что учтено из новых вводных, что это меняет в развилке и на что обратить внимание при выборе маршрута
`.trim();

const OUTPUT_RULES = `
Обязательные ограничения:
- ровно пять секций; title каждой секции — символ-в-символ как в JSON-схеме выше (включая эмодзи);
- Outcome — одно предложение; если цель принципала не названа явно, восстанови её из контекста и начни с «Предполагаемая цель принципала: ...»; без рекомендаций и пояснений помимо формулировки цели;
- Main Decision Fork — ровно одна развилка, не список;
- Main Decision Fork не должен быть пересказом Determining Fact. Это должны быть два содержательно разных пути действия или трактовки ситуации, а не одна и та же мысль, сформулированная дважды. Если получившийся Fork и Determining Fact означают одно и то же — переформулируй Fork;
- Determining Fact — ровно одно утверждение о недостающем факте; без знака «?»; не список; не несколько фактов;
- Determining Fact никогда не должен утверждать причинно-следственную связь (X является/не является причиной Y), если это не подтверждено во входных данных. Если причинность неизвестна, формулируй Determining Fact как открытый вопрос о том, что предстоит установить (например: «является ли перепланировка причиной протечки»), но не как ответ на него — ни в одну, ни в другую сторону;
- Who can confirm — массив roleAssignments: только role и result; без tasks; минимум одна роль;
- How do we obtain — массив actions: **не больше 4** конкретных действий в повелительном наклонении; каждое действие напрямую помогает подтвердить или опровергнуть Determining Fact; не вопросы; никакого общего due diligence и пунктов «на всякий случай»;
- Internal Route-Change Check — **только внутреннее рассуждение, не поле JSON и не текст в reply**: перед финализацией Determining Fact мысленно проверь три исхода (подтверждён / опровергнут / не удалось установить в срок). Если Determining Fact не даёт чёткого расхождения хотя бы по двум из трёх — пересмотри Determining Fact, Fact Owner и Actions перед ответом. Не возвращай блок «Route Change» / «маршруты» — он осознанно убран из интерфейса;
- reply — 1–3 предложения, содержательное продолжение разбора для руководителя FO как пользователя системы: что изменилось, на что обратить внимание при выборе маршрута; не повторяй дословно Outcome; не пиши как письмо или сообщение принципалу («мы проверим и сообщим вам»); не описывай внутреннюю проверку маршрутов;
- запрещённые слова и фразы: «недостаточно информации», «предварительный вывод», «рекомендуется», «следует», «важно», «необходимо учитывать», «Family Office должен»;
- не выдумывать факты, которых нет во входе;
- весь текст на русском языке;
- показывай логику решения, не аналитический отчёт;
- priority — объект с urgency (urgent | soon | no_deadline), stake (high_irreversible | moderate | low_reversible) и note (одно непустое предложение на русском); urgency и stake оценивай независимо.
`.trim();

const PRINCIPLE_FEW_SHOT = `
Пример правильного применения: если собственная уязвимость клиента физически или юридически переплетена с предметом спора (как протечка и незаконная перепланировка в одном помещении), Main Decision Fork должен звучать как «эскалировать по существу сейчас — или сначала уладить/легализовать собственную уязвимость клиента, чтобы не дать контрагенту повод присмотреться к ней при эскалации», а не как факт-проверка, не связанная с этим риском.
`.trim();

const PROMPT_SECTION_START = "## 0.";
const PROMPT_SECTION_END = "\n## 3.";

const HISTORY_TRUNCATE_THRESHOLD = 12;
const HISTORY_TAIL_COUNT = 10;

type PromptPrinciple = {
  id: string;
  title: string;
  promptSummary?: string;
  statement: string;
  status: string;
};

type PromptPattern = {
  id: string;
  title?: string;
  promptSummary?: string;
  statement: string;
  status: string;
};

type PromptSeedData = {
  principles: PromptPrinciple[];
  patterns: PromptPattern[];
};

function trimDecisionEngineForPrompt(fullMarkdown: string): string {
  const startIndex = fullMarkdown.indexOf(PROMPT_SECTION_START);
  const fromStart = startIndex === -1 ? fullMarkdown : fullMarkdown.slice(startIndex);
  const cutIndex = fromStart.indexOf(PROMPT_SECTION_END);
  if (cutIndex === -1) {
    return fromStart.trimEnd();
  }
  return fromStart.slice(0, cutIndex).trimEnd();
}

let cachedDecisionEngine: string | null = null;

/** Loads decision-engine.md framework only (sections 0–2). */
export function loadDecisionEngineMarkdown(): string {
  if (cachedDecisionEngine) return cachedDecisionEngine;

  const rootPath = path.join(process.cwd(), "decision-engine.md");
  if (existsSync(rootPath)) {
    const full = readFileSync(rootPath, "utf-8");
    cachedDecisionEngine = trimDecisionEngineForPrompt(full);
    return cachedDecisionEngine;
  }

  throw new Error("decision-engine.md not found in project root");
}

let cachedPromptSeedData: PromptSeedData | null = null;

function loadPromptSeedData(): PromptSeedData {
  if (cachedPromptSeedData) return cachedPromptSeedData;

  const rootPath = path.join(process.cwd(), "seed-data.json");
  if (!existsSync(rootPath)) {
    throw new Error("seed-data.json not found in project root");
  }

  const raw = JSON.parse(readFileSync(rootPath, "utf-8")) as Partial<PromptSeedData>;
  if (!Array.isArray(raw.principles) || !Array.isArray(raw.patterns)) {
    throw new Error("seed-data.json must contain principles and patterns arrays");
  }

  cachedPromptSeedData = {
    principles: raw.principles as PromptPrinciple[],
    patterns: raw.patterns as PromptPattern[],
  };
  return cachedPromptSeedData;
}

function promptSummaryText(item: { promptSummary?: string; statement: string }): string {
  const summary = item.promptSummary?.trim();
  if (summary) return summary;
  return item.statement.trim();
}

function patternDisplayTitle(pattern: PromptPattern): string {
  const title = pattern.title?.trim();
  if (title) return title;
  return pattern.id;
}

function buildCompactPrinciplesAndPatternsBlock(): string {
  const { principles, patterns } = loadPromptSeedData();
  const lines: string[] = [
    "## Принципы (подтверждены на 3+ доменах)",
  ];

  for (const principle of principles) {
    lines.push(`- **${principle.title.trim()}**: ${promptSummaryText(principle)}`);
  }

  lines.push(
    "",
    "## Паттерны (кандидаты и предварительные находки — применяй с меньшей уверенностью, чем принципы)",
  );

  for (const pattern of patterns) {
    lines.push(
      `- **${patternDisplayTitle(pattern)}** [${pattern.status}]: ${promptSummaryText(pattern)}`,
    );
  }

  return lines.join("\n");
}

let cachedAnalysisPromptContext: string | null = null;

/** Framework (sections 0–2) plus compact principles/patterns for the analysis system prompt. */
function loadAnalysisPromptContext(): string {
  if (cachedAnalysisPromptContext) return cachedAnalysisPromptContext;

  cachedAnalysisPromptContext = [
    loadDecisionEngineMarkdown(),
    "",
    buildCompactPrinciplesAndPatternsBlock(),
  ].join("\n");
  return cachedAnalysisPromptContext;
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
  const lines = ["Что произошло:", input.whatHappened.trim()];
  const desired = input.desiredOutcome?.trim();

  if (desired) {
    lines.push("", "Желаемый результат принципала:", desired);
  } else {
    lines.push(
      "",
      "Желаемый результат принципала: не указан явно — восстанови наиболее вероятную цель из контекста.",
    );
  }

  return lines.join("\n");
}

function formatHistoryLine(turn: ConversationTurn): string {
  const label = turn.role === "user" ? "[Руководитель FO]" : "[Family Office Brain]";
  return `${label}: ${turn.content.trim()}`;
}

function selectHistoryForPrompt(history: ConversationTurn[]): {
  history: ConversationTurn[];
  truncated: boolean;
} {
  if (history.length <= HISTORY_TRUNCATE_THRESHOLD) {
    return { history, truncated: false };
  }
  return { history: history.slice(-HISTORY_TAIL_COUNT), truncated: true };
}

function buildContinueUserPrompt(input: ContinueAnalysisInput): string {
  const { history, truncated } = selectHistoryForPrompt(input.history);
  if (truncated) {
    console.warn(
      `[analysis] conversation history truncated: ${input.history.length} messages → last ${history.length}`,
    );
  }

  const lines = [
    "Исходные факты кейса:",
    input.facts.trim(),
    "",
    "История переписки:",
  ];

  if (history.length === 0) {
    lines.push("(пока нет предыдущих сообщений)");
  } else {
    lines.push(...history.map(formatHistoryLine));
  }

  lines.push(
    "",
    "Новое сообщение руководителя FO:",
    input.newMessage.trim(),
    "",
    "Обнови весь разбор (все пять секций и priority) с учётом всей истории и нового сообщения.",
    "Если новое сообщение меняет или обесценивает более ранний Main Decision Fork или Determining Fact — замени их новой формулировкой, а не повторяй прежнюю по инерции.",
    "Обязательно верни reply — короткий ответ именно на новое сообщение руководителя FO (1–3 предложения).",
  );

  return lines.join("\n");
}

type OpenAIAnalysisResponse = {
  result: AnalysisResult;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function countRawActions(raw: unknown): number {
  if (!isRecord(raw) || !Array.isArray(raw.sections)) return 0;

  for (const section of raw.sections) {
    if (!isRecord(section)) continue;
    const title = typeof section.title === "string" ? section.title.trim() : "";
    if (title !== SECTION_TITLES[4]) continue;
    if (!Array.isArray(section.actions)) return 0;
    return section.actions.filter(
      (item): item is string => typeof item === "string" && item.trim().length > 0,
    ).length;
  }

  return 0;
}

function warnIfActionsTruncated(raw: unknown): void {
  const actionCount = countRawActions(raw);
  if (actionCount > MAX_ACTIONS) {
    console.warn(
      `[analysis] actions truncated: ${actionCount} → ${MAX_ACTIONS} in "${SECTION_TITLES[4]}"`,
    );
  }
}

async function callOpenAIAnalysis(
  systemPrompt: string,
  userPrompt: string,
): Promise<OpenAIAnalysisResponse> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const client = new OpenAI({ apiKey });

  const response = await client.chat.completions.create({
    model: process.env.OPENAI_ANALYSIS_MODEL?.trim() || "gpt-4o-mini",
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  const usage = response.usage
    ? {
        prompt_tokens: response.usage.prompt_tokens,
        completion_tokens: response.usage.completion_tokens,
        total_tokens: response.usage.total_tokens,
      }
    : undefined;

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

  warnIfActionsTruncated(parsed);
  return { result: normalizeAnalysisResult(parsed), usage };
}

function buildAnalysisSystemPrompt(): string {
  const systemPrompt = buildSystemPrompt(loadAnalysisPromptContext());
  console.info(`[analysis] system prompt length: ${systemPrompt.length} chars`);
  return systemPrompt;
}

/** Calls OpenAI and returns normalized AnalysisResult with token usage. */
export async function generateAnalysisWithAI(input: AnalysisInput): Promise<OpenAIAnalysisResponse> {
  return callOpenAIAnalysis(buildAnalysisSystemPrompt(), buildUserPrompt(input));
}

/** Continues analysis with conversation history and a new principal message. */
export async function continueAnalysisWithAI(
  input: ContinueAnalysisInput,
): Promise<OpenAIAnalysisResponse> {
  return callOpenAIAnalysis(buildAnalysisSystemPrompt(), buildContinueUserPrompt(input));
}
