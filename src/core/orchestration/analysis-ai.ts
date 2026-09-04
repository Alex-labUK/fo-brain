import { readFileSync, existsSync } from "fs";
import path from "path";
import OpenAI from "openai";
import type {
  AnalysisInput,
  AnalysisResult,
  ContinueAnalysisInput,
  ConversationTurn,
} from "@/core/orchestration/analysis-core";
import { normalizeAnalysisResult, parseCaseMemory, parseFactCheck, MAX_ACTIONS, SECTION_TITLES, FORK_FACT_ACTIONS_RULES, PAST_FACT_ROUTE_RULES, unresolvedForkContradictsCompletedFacts, shouldRepairActionShapedFork, chooseRepairedAnalysisResult } from "@/core/orchestration/analysis-core";
import {
  buildPreviousDecisionCycleContext,
  formatPreviousDecisionCyclePromptBlock,
  previousCycleConfirmedText,
} from "@/lib/decision-cycle";

const ANALYSIS_JSON_SCHEMA = `{
  "decisionStatus": "unresolved | resolved",
  "sections": [
    { "title": "${SECTION_TITLES[0]}", "content": "одно предложение — чего хотим достичь" },
    { "title": "${SECTION_TITLES[1]}", "content": "unresolved: две различные ещё доступные маршрутные последствия/исхода (не методы сбора фактов и не pending-версия уже свершившегося события); resolved: формулировка «Решение определено: ...», не бинарная развилка" },
    { "title": "${SECTION_TITLES[2]}", "content": "unresolved: один недостающий подтверждённый факт; resolved: «Определяющий факт больше не требуется — ключевая неопределённость устранена.»" },
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

const CONTINUE_ANALYSIS_JSON_SCHEMA = `${ANALYSIS_JSON_SCHEMA.slice(0, -2)},
  "caseMemory": "- подтверждённый факт или открытое неизвестное\\n- ещё один пункт (5–15 коротких пунктов всего)",
  "factCheck": {
    "contradictsEarlier": true,
    "note": "если contradictsEarlier=true — одно предложение: что именно противоречит ранее сказанному и какая версия учтена и почему; если false — пустая строка"
  }
}`;

const CASE_MEMORY_RULES = `
- caseMemory — компактная внутренняя память кейса: 5–15 коротких пунктов маркированным списком (строки через \\n, каждая с «- »);
- включай только: подтверждённые факты из диалога; открытые существенные неизвестности; ограничения, влияющие на решение;
- не включай: полный текст переписки; общие рекомендации; старые reply; лишние формулировки;
- сохраняй ранее подтверждённые факты из текущей памяти кейса, если новое сообщение их явно не исправляет или не отменяет;
- обнови caseMemory с учётом нового сообщения и недавней переписки;
- если новое сообщение противоречит ранее зафиксированному факту (в памяти кейса или истории переписки) — не выбирай молча одну из версий: явно укажи это противоречие в reply одним предложением и либо прямо спроси, какая версия верна, либо обоснуй, почему учитываешь именно новую версию;
- не запрашивай повторно факт, уже подтверждённый в caseMemory, пока пользователь явно не сообщил, что обстоятельства изменились;
- если в caseMemory принципал уже принял решение по маршруту — не делай вид, что решения принципала ещё нет, и не ставь unresolved ради «ожидания решения принципала».
- если текущий decisionStatus = resolved: переводи в unresolved ТОЛЬКО если новое сообщение создаёт подлинную новую неопределённость, способную изменить маршрут. Не открывай решение заново из-за мелкого уточнения, факта исполнения, течения времени или выдуманного дополнительного риска. Подтверждённые факты в caseMemory остаются подтверждёнными, пока их явно не исправили или не заменили.
- подтверждённые пункты caseMemory — не фон, а ограничение рассуждения: не предлагай маршрут решения, который противоречит подтверждённому факту в caseMemory, пока текущее сообщение пользователя явно не исправляет или не заменяет этот факт;
- если завершённое решение породило новую проблему ниже по цепочке — разбирай эту новую неопределённость как новый цикл решения. Не реконструируй уже завершённое решение.
- PREVIOUS COMPLETED DECISION CYCLE (если дан во входе) — жёсткий исторический контекст, не фон: не формулируй Outcome, Fork, Priority или Reply вокруг уже исполненного действия того цикла, пока текущее сообщение явно не говорит, что запись ошибочна или событие отменено.
`.trim();

const THINKING_ORDER = `
Думай строго в этом порядке:
0. Нормализация текущего кейса (мысленно, не в ответе) — зафиксируй: подтверждённые факты; неизвестное; допущения; необратимые / уже свершившиеся события; если во входе есть PREVIOUS COMPLETED DECISION CYCLE — это жёсткий исторический контекст (решение и исполнение того цикла недоступны как текущий маршрут), не фон; не делай выводов о причинности без оснований
0a. Past-Fact / Route Consistency (мысленно, до развилки, только unresolved) — вычеркни маршруты, которые уже невозможны из-за подтверждённых фактов (caseMemory, факты кейса и PREVIOUS COMPLETED DECISION CYCLE). Не предлагай отложить или «ещё решить» событие, которое уже произошло. Если завершённое решение создало новую downstream-проблему — это новый цикл, не возврат к старому решению. Fork–Fact–Actions применяй только после этого отсечения.
1. Outcome — одно предложение, желаемое состояние текущей неопределённости; не цель заново выполнить уже завершённый исторический цикл; если цель принципала не указана явно во входе, восстанови наиболее вероятную цель из контекста ситуации и типичной роли FO (защита интересов принципала по умолчанию) и начни Outcome с «Предполагаемая цель принципала: ...»
1a. Resolution check (мысленно, до развилки) — ответь: осталась ли подлинная неразрешённая развилка? есть ли факт, подтверждение которого изменит маршрут? принципал уже принял решение (смотри факты и caseMemory)? запрашиваемые факты уже подтверждены? кейс сейчас просто исполняет уже выбранный маршрут? Если подлинного неразрешённого решения нет — decisionStatus = resolved. НЕ выдумывай новую неопределённость, чтобы сохранить структуру разбора. «Нет новых обстоятельств» — не Determining Fact. Решённое решение ≠ закрытый кейс: исполнение сделки может продолжаться при decisionStatus = resolved. Если сейчас resolved — переведи в unresolved только при подлинной новой неопределённости из нового сообщения, а не из мелкого обновления или выдуманного риска.
2. Main Decision Fork — если unresolved: одна развилка между двумя существенно разными и ещё доступными маршрутами решения / последствиями / исходами (не методами сбора фактов; не pending-версия уже свершившегося события); если resolved: краткая формулировка «Решение определено: ...», не бинарная развилка
3. Determining Fact — если unresolved: один недостающий факт, который выбирает между этими двумя маршрутами; если confirmed — хотя бы один маршрут отпадает; если resolved: «Определяющий факт больше не требуется — ключевая неопределённость устранена.»
4. Principle / Pattern Calibration — только теперь проверь, какой подтверждённый принцип или паттерн из базы знаний ниже уместен; используй его, чтобы уточнить или откалибровать Fork/Fact; не подгоняй кейс под шаблон; если прямого совпадения нет — продолжай без принципа/паттерна
5. Source of the Fact — если unresolved: кто может подтвердить (роль → что вернуть); если resolved: пустой roleAssignments
6. Actions — если unresolved: до четырёх действий, каждое только добывает или подтверждает Determining Fact (не альтернативные «что делать вместо решения»); если resolved: только реальные шаги исполнения (например «Завершить сделку в согласованный срок»), не сбор уже известных фактов; если исполнять больше нечего — пустой actions
6a. Internal Route-Change Check (мысленно, не в ответе) — только для unresolved: если факт подтвердится — какой маршрут становится невозможным? если опровергнется? если не удастся установить в разумный срок? Determining Fact должен реально выбирать между сторонами Fork. Если нет чёткого расхождения хотя бы по двум из трёх исходов — пересмотри Fork, Determining Fact и действия
6b. Fork–Fact–Actions Separation (мысленно, не в ответе) — только для unresolved и только после отсечения невозможных исторических маршрутов: A) обе стороны Fork — маршруты/исходы, а не «провести экспертизу / ждать / запросить»? B) один факт выбирает маршрут? C) actions только добывают этот факт? D) действия не стоят внутри Fork? Если D = да или A = нет — перепиши Fork. Не применяй этот тест, если decisionStatus = resolved.
6c. Past-Fact Consistency Test (мысленно, не в ответе) — только для unresolved: по каждой стороне Fork — маршрут ещё доступен? не противоречит ли подтверждённому факту? не считает ли свершившееся событие ещё pending? не является ли это старым решением вместо новой неопределённости? Если да — перепиши Fork. Не применяй, если decisionStatus = resolved. Если текущее сообщение явно исправляет подтверждённый факт — этот факт больше не блокирует маршрут.
7. Priority — оцени urgency (срочность по срокам) и stake (ставка/обратимость для принципала) независимо друг от друга; note — одно предложение про ТЕКУЩУЮ неразрешённую неопределённость, не про срочность уже завершённого исторического действия
8. Reply — 1–3 предложения, прямой ответ руководителю FO (пользователю системы): что учтено из новых вводных, что это меняет в развилке или почему решение уже определено; не предлагай завершить / отложить / подписать / оплатить действие, которое PREVIOUS COMPLETED DECISION CYCLE уже зафиксировал как исполненное
`.trim();

const OUTPUT_RULES = `
Обязательные ограничения:
- decisionStatus — обязательно: unresolved или resolved;
- resolved, если не осталось подлинной развилки и определяющего факта, даже если сделка/исполнение ещё не завершены;
- не выдумывай новую неопределённость, не используй отсутствие будущих сюрпризов как Determining Fact, не проси повторно подтвердить факты из caseMemory, не создавай фальшивое «решение принципала», если память уже говорит, что принципал решил;
- ровно пять секций; title каждой секции — символ-в-символ как в JSON-схеме выше (включая эмодзи);
- Outcome — одно предложение; если цель принципала не названа явно, восстанови её из контекста и начни с «Предполагаемая цель принципала: ...»; без рекомендаций и пояснений помимо формулировки цели; если предыдущий цикл уже исполнен — Outcome про новую downstream-неопределённость, не «завершить уже завершённую сделку/покупку»;
- если unresolved: Main Decision Fork — ровно одна развилка между двумя существенно разными и ещё доступными маршрутами/последствиями/исходами, не список методов и не выбор «завершить / отложить / подписать / оплатить» событие, которое caseMemory или факты кейса уже подтверждают как свершившееся; выводи её из фактов кейса и Outcome, а не из предварительного подбора принципа или паттерна; это не «что сделать, чтобы узнать», а «какой маршрут решения применяется, когда определяющий факт станет известен»;
- если unresolved: Main Decision Fork не должен быть пересказом Determining Fact. Это должны быть два содержательно разных пути решения или трактовки ситуации, а не одна и та же мысль, сформулированная дважды, и не пара действий по сбору информации. Если Fork — «провести экспертизу или ждать / запросить или обратиться» — перепиши Fork в маршруты и оставь методы в Actions;
- если resolved: Main Decision Fork — формулировка «Решение определено: ...», без бинарной развилки; не применяй Fork–Fact–Actions и Past-Fact тесты как к unresolved;
- если unresolved: Determining Fact — ровно одно утверждение о недостающем факте; без знака «?»; не список; не несколько фактов;
- если resolved: Determining Fact — «Определяющий факт больше не требуется — ключевая неопределённость устранена.»;
- Determining Fact никогда не должен утверждать причинно-следственную связь (X является/не является причиной Y), если это не подтверждено во входных данных. Если причинность неизвестна, формулируй Determining Fact как открытый вопрос о том, что предстоит установить (например: «является ли перепланировка причиной протечки»), но не как ответ на него — ни в одну, ни в другую сторону;
- если unresolved: Who can confirm — массив roleAssignments: только role и result; без tasks; минимум одна роль;
- если resolved: Who can confirm — пустой массив roleAssignments;
- если unresolved: How do we obtain — массив actions: **не больше 4** конкретных действий в повелительном наклонении; каждое действие — метод получить или подтвердить Determining Fact (связаться с органом, запросить документ, экспертиза, юр. оценка); не альтернативные маршруты решения и не содержимое Fork; не вопросы; никакого общего due diligence и пунктов «на всякий случай»;
- если resolved: How do we obtain — только шаги исполнения уже выбранного маршрута, не сбор фактов; можно пустой массив, если исполнять больше нечего;
- Internal Route-Change Check — **только внутреннее рассуждение, не поле JSON и не текст в reply**, и только для unresolved: перед финализацией проверь три исхода (подтверждён / опровергнут / не удалось установить в срок) и что факт выбирает между сторонами Fork. Если нет чёткого расхождения хотя бы по двум из трёх — пересмотри Fork, Determining Fact, Fact Owner и Actions перед ответом. Не возвращай блок «Route Change» / «маршруты» — он осознанно убран из интерфейса;
- Fork–Fact–Actions Separation — только внутреннее рассуждение для unresolved: см. правила Fork–Fact–Actions выше; не выводи A/B/C/D в reply; применяй только после отсечения невозможных исторических маршрутов;
- Past-Fact / Route Consistency — только внутреннее рассуждение для unresolved: см. правила Past-Fact выше; не выводи этот тест в reply; не применяй к формулировке «Решение определено: ...»;
- reply — 1–3 предложения, содержательное продолжение разбора для руководителя FO как пользователя системы: что изменилось, на что обратить внимание при выборе маршрута; не повторяй дословно Outcome; не повторяй по смыслу свою же предыдущую reply из истории переписки — если нечего добавить содержательно, явно скажи, что именно из нового сообщения учтено и почему это не меняет текущий Fork/Fact или почему решение уже определено, а не давай generic-формулировку; не пиши как письмо или сообщение принципалу («мы проверим и сообщим вам»); не описывай внутреннюю проверку маршрутов; не предлагай повторить действие уже завершённого исторического цикла;
- запрещённые слова и фразы: «недостаточно информации», «предварительный вывод», «рекомендуется», «следует», «важно», «необходимо учитывать», «Family Office должен»;
- не выдумывать факты, которых нет во входе;
- весь текст на русском языке;
- показывай логику решения, не аналитический отчёт;
- priority — объект с urgency (urgent | soon | no_deadline), stake (high_irreversible | moderate | low_reversible) и note (одно непустое предложение на русском про ТЕКУЩУЮ неразрешённую неопределённость, не про срочность уже завершённого исторического действия); urgency и stake оценивай независимо.
`.trim();

const PRINCIPLE_FEW_SHOT = `
Пример калибровки (шаг 4): после того как из фактов кейса выведена развилка (например, протечка и незаконная перепланировка в одном помещении), принцип о переплетённой уязвимости может подсказать формулировку Fork — «эскалировать по существу сейчас — или сначала уладить/легализовать собственную уязвимость клиента, чтобы не дать контрагенту повод присмотреться к ней при эскалации», а не заменять развилку несвязанной факт-проверкой. Принцип не задаёт развилку — он уточняет уже выведенную из кейса.
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

/** Thinking order + Fork–Fact–Actions contract + output rules (for tests; not a user-facing string). */
export function analysisPromptThinkingAndRules(): string {
  return [THINKING_ORDER, FORK_FACT_ACTIONS_RULES, PAST_FACT_ROUTE_RULES, OUTPUT_RULES].join("\n\n");
}

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
    "## Принципы и паттерны (только для калибровки на шаге 4 — не отправная точка рассуждения)",
    "",
    "### Принципы (подтверждены на 3+ доменах)",
  ];

  for (const principle of principles) {
    lines.push(`- **${principle.title.trim()}**: ${promptSummaryText(principle)}`);
  }

  lines.push(
    "",
    "## Паттерны (кандидаты и предварительные находки — калибровка с меньшей уверенностью, чем принципы; не подгоняй кейс)",
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
    "Сначала рассуждай от текущего кейса; принципы и паттерны из базы знаний — только для калибровки (шаг 4), не как стартовая рамка.",
    "Не пересказывай документ — используй его как модель мышления для конкретного кейса.",
    "",
    "--- Decision Engine ---",
    decisionEngine,
    "--- конец Decision Engine ---",
    "",
    THINKING_ORDER,
    "",
    FORK_FACT_ACTIONS_RULES,
    "",
    PAST_FACT_ROUTE_RULES,
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

function buildContinueSystemPrompt(decisionEngine: string): string {
  return [
    "Ты — модуль принятия решений Family Office Brain. Применяй Decision Engine из документа ниже.",
    "Сначала рассуждай от текущего кейса; принципы и паттерны из базы знаний — только для калибровки (шаг 4), не как стартовая рамка.",
    "Не пересказывай документ — используй его как модель мышления для конкретного кейса.",
    "",
    "--- Decision Engine ---",
    decisionEngine,
    "--- конец Decision Engine ---",
    "",
    THINKING_ORDER,
    "",
    FORK_FACT_ACTIONS_RULES,
    "",
    PAST_FACT_ROUTE_RULES,
    "",
    PRINCIPLE_FEW_SHOT,
    "",
    "Верни только валидный JSON без markdown-обёртки.",
    "Формат ответа:",
    CONTINUE_ANALYSIS_JSON_SCHEMA,
    "",
    OUTPUT_RULES,
    "",
    CASE_MEMORY_RULES,
  ].join("\n");
}

function previousCyclePromptBlock(raw: unknown): string {
  return formatPreviousDecisionCyclePromptBlock(buildPreviousDecisionCycleContext(raw));
}

export function buildUserPrompt(input: AnalysisInput): string {
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

  const previousBlock = previousCyclePromptBlock(input.decisionCycleHistory);
  if (previousBlock) {
    lines.push("", previousBlock);
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

export function buildContinueUserPrompt(input: ContinueAnalysisInput): string {
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
    "Текущий Main Decision Fork в разборе (до этого сообщения):",
    input.currentFork?.trim() || "(не определён)",
    "",
    "Текущий Determining Fact в разборе (до этого сообщения):",
    input.currentDeterminingFact?.trim() || "(не определён)",
    "",
    "Текущий decisionStatus разбора (до этого сообщения):",
    input.currentDecisionStatus ?? "unresolved",
    "",
    "Накопленная память кейса (подтверждённые факты, открытые неизвестности, ограничения):",
    input.caseMemory.trim() || "(пока пусто — создай начальную память из исходных фактов и переписки)",
  ];

  const previousBlock = previousCyclePromptBlock(input.decisionCycleHistory);
  if (previousBlock) {
    lines.push("", previousBlock);
  }

  lines.push("", "История переписки:");

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
    "Обнови весь разбор (decisionStatus, все пять секций, priority, factCheck и caseMemory) с учётом памяти кейса, истории и нового сообщения.",
    "Сначала выполни Resolution check (шаг 1a): если подлинного неразрешённого решения не осталось — decisionStatus = resolved, не выдумывай новую развилку и новый Determining Fact.",
    "Если новое сообщение меняет или обесценивает более ранний Main Decision Fork или Determining Fact — замени их новой формулировкой, а не повторяй прежнюю по инерции.",
    "Если новое сообщение прямо отвечает на текущий Determining Fact (подтверждает или опровергает его) И осталась подлинная следующая развилка — Determining Fact смени на следующий недостающий факт. Если следующей развилки нет — decisionStatus = resolved, не изобретай следующий факт.",
    "Не возвращайся к формулировке Main Decision Fork или Determining Fact, которая уже была заменена в более раннем сообщении из истории — если текущая версия выше уже сдвинулась вперёд по сравнению с началом переписки, не откатывай её назад к более ранней версии без явной новой причины.",
    "Не проси повторно подтвердить факт, который уже есть в caseMemory, пока новое сообщение явно не говорит, что обстоятельства изменились.",
    "Если текущий decisionStatus разбора выше = unresolved — Main Decision Fork должен быть маршрутами решения, а не парой методов («экспертиза или ждать», «запросить или обратиться»). Методы — только в Actions. Не заменяй уже корректную маршрутную развилку на метод-против-метода.",
    "Не предлагай маршрут решения, который противоречит подтверждённому факту в caseMemory, пока текущее сообщение явно не исправляет или не заменяет этот факт. Если завершённое решение создало новую downstream-проблему — разбирай новую неопределённость как новый цикл; не реконструируй уже завершённое решение (например «завершить сделку или отложить», если сделка уже завершена).",
    "Если во входе есть PREVIOUS COMPLETED DECISION CYCLE — это уже сделанное. Для нового unresolved-разбора после закрытого цикла начинай с «что изменилось после завершённого решения?», а не «нужно ли снова принять старое решение?». Lifecycle остаётся за человеком; не считай кейс автоматически возобновлённым.",
    "Если ставишь resolved — формулировка «Решение определено: ...», без бинарной развилки; не применяй Fork–Fact–Actions и Past-Fact тесты как к unresolved.",
    "Если caseMemory говорит, что принципал уже утвердил маршрут, а новое сообщение это не отменяет — не ставь unresolved ради ожидания решения принципала.",
    "factCheck.contradictsEarlier — сравни новое сообщение с «Исходными фактами кейса» и историей переписки выше: противоречит ли оно прямо чему-то, что уже было утверждено ранее. Если да — верни true и заполни note одним предложением: что именно противоречит и какую версию ты учитываешь дальше и почему. Если прямого противоречия нет — верни false и пустую note.",
    "Обязательно верни reply — короткий ответ именно на новое сообщение руководителя FO (1–3 предложения).",
    "Обязательно верни обновлённый caseMemory — сохрани ранее подтверждённые факты из текущей памяти, если новое сообщение их не отменяет.",
    "Перед тем как финализировать reply, Main Decision Fork и Determining Fact — сверь их с каждым пунктом накопленной памяти кейса (caseMemory) выше. Если твой ответ подразумевает вину, ответственность или ожидание действия от стороны (подрядчика, роли, лица), про которую в памяти кейса уже зафиксирован противоположный факт (например, что эта сторона не виновата, её работы выполнены качественно, претензий к ней нет) — это ошибка: не упоминай эту сторону как источник ответственности, перепроверь, к кому по факту относится вопрос или развилка, и ответь в соответствии с caseMemory, а не вопреки ему.",
    "Если в памяти кейса зафиксировано, что сторона (подрядчик, роль, лицо) не виновата и её работы признаны качественными — не предлагай в reply, Main Decision Fork или actions никаких финансовых договорённостей с этой стороной (скидка, компенсация, переговоры о снижении стоимости), даже как дополнительный или необязательный вариант «на всякий случай». Все действия, связанные с деньгами (скидка, компенсация, претензия), направляй только на сторону, которая по установленным фактам действительно связана с дефектом.",
  );

  return lines.join("\n");
}

type OpenAIAnalysisResponse = {
  result: AnalysisResult;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  caseMemory: string;
};

type OpenAIContinueAnalysisResponse = OpenAIAnalysisResponse;

export type ForkRepairContext = {
  confirmedFacts: string;
  caseMemory: string;
  currentMessage: string;
  schemaIsContinue: boolean;
  previousCycleBlock?: string;
  previousCycleConfirmedText?: string;
};

type AnalysisModelCall = (
  systemPrompt: string,
  userPrompt: string,
) => Promise<OpenAIAnalysisResponse>;

function sectionContent(result: AnalysisResult, title: string): string {
  return result.sections.find((section) => section.title === title)?.content?.trim() || "";
}

function formatRoleAssignments(result: AnalysisResult): string {
  const assignments =
    result.sections.find((section) => section.title === SECTION_TITLES[3])?.roleAssignments ?? [];
  if (assignments.length === 0) return "(нет)";
  return assignments.map((item) => `- ${item.role}: ${item.result}`).join("\n");
}

function formatActions(result: AnalysisResult): string {
  const actions = result.sections.find((section) => section.title === SECTION_TITLES[4])?.actions ?? [];
  if (actions.length === 0) return "(нет)";
  return actions.map((action) => `- ${action}`).join("\n");
}

function addUsage(
  first?: OpenAIAnalysisResponse["usage"],
  second?: OpenAIAnalysisResponse["usage"],
): OpenAIAnalysisResponse["usage"] {
  if (!first && !second) return undefined;
  return {
    prompt_tokens: (first?.prompt_tokens ?? 0) + (second?.prompt_tokens ?? 0),
    completion_tokens: (first?.completion_tokens ?? 0) + (second?.completion_tokens ?? 0),
    total_tokens: (first?.total_tokens ?? 0) + (second?.total_tokens ?? 0),
  };
}

export function buildForkRepairSystemPrompt(schemaIsContinue: boolean): string {
  return [
    "Ты исправляешь уже полученный JSON-разбор Family Office Brain. Это не новый полный разбор с нуля.",
    "Верни только валидный JSON без markdown-обёртки. Не добавляй поля lifecycle, execution, reopen или decisionCycleHistory.",
    "decisionStatus оставь unresolved, если в исходном разборе была подлинная развилка.",
    "",
    FORK_FACT_ACTIONS_RULES,
    "",
    PAST_FACT_ROUTE_RULES,
    "",
    "Формат ответа:",
    schemaIsContinue ? CONTINUE_ANALYSIS_JSON_SCHEMA : ANALYSIS_JSON_SCHEMA,
    "",
    OUTPUT_RULES,
    schemaIsContinue ? `\n${CASE_MEMORY_RULES}` : "",
  ].join("\n");
}

export function buildForkRepairUserPrompt(result: AnalysisResult, context: ForkRepairContext): string {
  return [
    "The Determining Fact is the route selector.",
    "Rewrite Main Decision Fork as the two materially different states/routes selected by that fact.",
    "Do NOT rewrite the fork as:",
    "- wait vs act",
    "- investigate vs proceed",
    "- request vs contact",
    "- expert review vs authority response",
    "- precautionary action vs waiting",
    "Ask:",
    "If the Determining Fact is YES, what route/state applies?",
    "If it is NO, what materially different route/state applies?",
    "Preserve confirmed historical facts.",
    "Do not reconstruct a completed decision.",
    "Change only what is necessary to restore Fork–Fact–Actions consistency.",
    "You may adjust Main Decision Fork; Determining Fact only if needed for alignment; Actions only if needed for alignment.",
    "Preserve Outcome unless it is clearly inconsistent with the corrected fork.",
    "",
    "decisionStatus:",
    result.decisionStatus ?? "unresolved",
    "",
    "Confirmed facts:",
    context.confirmedFacts.trim() || "(нет)",
    "",
    "caseMemory:",
    context.caseMemory.trim() || "(пусто)",
    "",
    "Current user message:",
    context.currentMessage.trim() || "(нет)",
    "",
    ...(context.previousCycleBlock
      ? [context.previousCycleBlock, "", "Do not reconstruct the historical decision from PREVIOUS COMPLETED DECISION CYCLE.", ""]
      : []),
    `Outcome:`,
    sectionContent(result, SECTION_TITLES[0]) || "(нет)",
    "",
    "Main Decision Fork (invalid — action/method-shaped; rewrite):",
    sectionContent(result, SECTION_TITLES[1]) || "(нет)",
    "",
    "Determining Fact:",
    sectionContent(result, SECTION_TITLES[2]) || "(нет)",
    "",
    "Fact owners:",
    formatRoleAssignments(result),
    "",
    "Actions:",
    formatActions(result),
    "",
    "Верни полный JSON той же схемы (все пять секций, priority, reply).",
  ].join("\n");
}

/**
 * At most one extra model call when the first unresolved result has an action-shaped fork.
 * Invalid/still-bad repair keeps the first usable result. Never loops. Never runs for resolved.
 */
export async function maybeRepairActionShapedFork(
  first: OpenAIAnalysisResponse,
  context: ForkRepairContext,
  repairCall: AnalysisModelCall,
): Promise<OpenAIAnalysisResponse> {
  if (!shouldRepairActionShapedFork(first.result)) {
    return first;
  }

  console.info("[analysis] unresolved action-shaped fork; attempting one repair call");

  try {
    const repaired = await repairCall(
      buildForkRepairSystemPrompt(context.schemaIsContinue),
      buildForkRepairUserPrompt(first.result, context),
    );
    const chosen = chooseRepairedAnalysisResult(first.result, repaired.result, {
      confirmedFacts: [context.confirmedFacts, context.previousCycleConfirmedText]
        .filter(Boolean)
        .join("\n"),
      caseMemory: context.caseMemory,
      currentMessage: context.currentMessage,
    });
    const usage = addUsage(first.usage, repaired.usage);

    if (!chosen.usedRepair) {
      console.warn(
        `[analysis] fork repair rejected (${chosen.reason}); keeping first result`,
      );
      return { ...first, usage };
    }

    console.info("[analysis] action-shaped fork repaired");
    return {
      result: chosen.result,
      usage,
      caseMemory: repaired.caseMemory || first.caseMemory,
    };
  } catch (error) {
    console.warn("[analysis] fork repair failed; keeping first result", error);
    return first;
  }
}

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
  const result = normalizeAnalysisResult(parsed);
  const factCheck = parseFactCheck(parsed);
  if (factCheck?.contradictsEarlier && factCheck.note) {
    console.info("[analysis] factCheck flagged a contradiction:", factCheck.note);
    result.reply = result.reply ? `${factCheck.note} ${result.reply}` : factCheck.note;
  }
  return {
    result,
    usage,
    caseMemory: parseCaseMemory(parsed),
  };
}

function buildAnalysisSystemPrompt(): string {
  const systemPrompt = buildSystemPrompt(loadAnalysisPromptContext());
  console.info(`[analysis] system prompt length: ${systemPrompt.length} chars`);
  return systemPrompt;
}

function buildContinueAnalysisSystemPrompt(): string {
  const systemPrompt = buildContinueSystemPrompt(loadAnalysisPromptContext());
  console.info(`[analysis] system prompt length: ${systemPrompt.length} chars`);
  return systemPrompt;
}

function previousCycleRepairFields(raw: unknown): {
  previousCycleBlock?: string;
  previousCycleConfirmedText?: string;
} {
  const context = buildPreviousDecisionCycleContext(raw);
  const previousCycleBlock = formatPreviousDecisionCyclePromptBlock(context);
  const confirmed = previousCycleConfirmedText(context);
  return {
    previousCycleBlock: previousCycleBlock || undefined,
    previousCycleConfirmedText: confirmed || undefined,
  };
}

/** Calls OpenAI and returns normalized AnalysisResult with token usage. */
export async function generateAnalysisWithAI(input: AnalysisInput): Promise<OpenAIAnalysisResponse> {
  const cycleFields = previousCycleRepairFields(input.decisionCycleHistory);
  const first = await callOpenAIAnalysis(buildAnalysisSystemPrompt(), buildUserPrompt(input));
  const repaired = await maybeRepairActionShapedFork(
    first,
    {
      confirmedFacts: input.whatHappened,
      caseMemory: "",
      currentMessage: "",
      schemaIsContinue: false,
      ...cycleFields,
    },
    callOpenAIAnalysis,
  );
  warnIfForkContradictsCompletedFacts(
    repaired.result,
    [input.whatHappened, cycleFields.previousCycleConfirmedText].filter(Boolean).join("\n"),
  );
  return repaired;
}

/** Continues analysis with conversation history and a new principal message. */
export async function continueAnalysisWithAI(
  input: ContinueAnalysisInput,
): Promise<OpenAIContinueAnalysisResponse> {
  const cycleFields = previousCycleRepairFields(input.decisionCycleHistory);
  const first = await callOpenAIAnalysis(
    buildContinueAnalysisSystemPrompt(),
    buildContinueUserPrompt(input),
  );
  const confirmedFacts = [input.facts, input.caseMemory, cycleFields.previousCycleConfirmedText]
    .filter(Boolean)
    .join("\n");
  const repaired = await maybeRepairActionShapedFork(
    first,
    {
      confirmedFacts: input.facts,
      caseMemory: input.caseMemory,
      currentMessage: input.newMessage,
      schemaIsContinue: true,
      ...cycleFields,
    },
    callOpenAIAnalysis,
  );
  warnIfForkContradictsCompletedFacts(repaired.result, confirmedFacts, input.newMessage);
  return repaired;
}

function warnIfForkContradictsCompletedFacts(
  result: AnalysisResult,
  confirmedText: string,
  currentMessage?: string,
): void {
  if (!unresolvedForkContradictsCompletedFacts(result, confirmedText, currentMessage)) return;
  const fork =
    result.sections.find((section) => section.title === SECTION_TITLES[1])?.content?.trim() || "";
  console.warn(
    "[analysis] unresolved Main Decision Fork contradicts a confirmed completed fact (kept anyway):",
    fork,
  );
}
