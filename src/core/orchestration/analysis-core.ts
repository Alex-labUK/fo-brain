// Shared analysis types and utilities (no AI, no fallback templates).

import type { AnalysisPriority } from "@/lib/priority";

export type AnalysisInput = {
  whatHappened: string;
  desiredOutcome?: string;
  /** Optional archived cycles; only the most recent completed cycle is sent to the model. */
  decisionCycleHistory?: unknown;
};

export type RoleAssignment = {
  role: string;
  result: string;
};

export type AnalysisSection = {
  title: string;
  content?: string;
  roleAssignments?: RoleAssignment[];
  actions?: string[];
};

export const DECISION_STATUSES = ["unresolved", "resolved"] as const;

export type DecisionStatus = (typeof DECISION_STATUSES)[number];

export type AnalysisResult = {
  sections: AnalysisSection[];
  priority?: AnalysisPriority;
  reply?: string;
  /** Whether a genuine decision fork still needs a determining fact. */
  decisionStatus?: DecisionStatus;
};

export const RESOLVED_DETERMINING_FACT =
  "Определяющий факт больше не требуется — ключевая неопределённость устранена.";

export type AnalysisSource = "ai" | "fallback";

export type AnalysisRunResult = {
  result: AnalysisResult;
  source: AnalysisSource;
  /** Updated case memory from continue-analysis AI; persisted only on Case.caseMemory. */
  updatedCaseMemory?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

export type ConversationTurn = {
  role: "user" | "assistant";
  content: string;
};

export type ContinueAnalysisInput = {
  facts: string;
  history: ConversationTurn[];
  newMessage: string;
  caseMemory: string;
  currentFork?: string;
  currentDeterminingFact?: string;
  currentDecisionStatus?: DecisionStatus;
  /** Optional archived cycles; only the most recent completed cycle is sent to the model. */
  decisionCycleHistory?: unknown;
};

export const MAX_CASE_MEMORY_BULLETS = 15;

export const MAX_ACTIONS = 4;

/** Legacy sixth section title — ignored when normalizing stored analyses. */
export const LEGACY_ROUTES_SECTION_TITLE = "🔀 How the route changes afterwards";

export const SECTION_TITLES = [
  "🎯 Outcome",
  "🌳 Main Decision Fork",
  "🔑 Determining Fact",
  "👤 Who can confirm this fact?",
  "📋 How do we obtain this fact?",
] as const;

const FORBIDDEN_FORK_PATTERNS = [
  /как family office должен организовать/i,
  /как обеспечить желаемый результат/i,
  /как family office/i,
  /организовать реакцию/i,
];

export const FORBIDDEN_PHRASES = [
  "недостаточно информации",
  "предварительный вывод",
  "рекомендуется",
  "следует",
  "важно",
  "необходимо учитывать",
  "family office должен",
];

/**
 * Internal prompt contract: Fork = decision routes, Fact = route selector, Actions = how to learn the fact.
 * Unresolved only. Not a hard production rejection rule.
 */
export const FORK_FACT_ACTIONS_RULES = `
Fork–Fact–Actions (только для unresolved; внутренний тест, не в JSON и не в reply):
- Main Decision Fork — выбор между двумя существенно разными маршрутами решения, последствиями или исходами. Не методы, не расследования, не «кого спросить / что запросить / ждать или уточнить».
- Проверка развилки: если определяющий факт = X, какой маршрут уместен? если факт не X — какой другой маршрут уместен?
- Determining Fact — один факт, который выбирает между этими двумя маршрутами. Если факт подтверждён, хотя бы один маршрут становится неуместным/невозможным; если опровергнут — уместен другой маршрут. Иначе перепиши пару Fork/Fact.
- Actions — только как получить или подтвердить Determining Fact (запросить документ, связаться с органом, экспертиза, юр. оценка). Не поднимай их в Main Decision Fork, если это не подлинные стратегические маршруты.
- Перед JSON: A) обе стороны Fork — маршруты/исходы? B) один фактический ответ выбирает маршрут? C) actions только добывают этот факт? D) не просочилось ли действие в Fork? Если D = да — перепиши Fork.
Невалидные развилки (это Actions, не Fork): «Провести экспертизу или ждать ответа»; «Запросить документы или обратиться к юристу»; «Проверить факт или действовать на текущей информации»; «Получить оценку или продолжить переговоры».
Валидный образец: Fork — «повторное рассмотрение создаёт существенные обязательства / риск либо дополнительных действий не требуется»; Fact — какой обязательный шаг (экспертиза, работы, иное) требуется от стороны; Actions — письменное разъяснение, юр. оценка, перечень требований.
`.trim();

/**
 * Internal prompt contract: confirmed completed events cannot reappear as live fork routes.
 * Unresolved only. Advisory in code; not a hard production rejection rule.
 */
export const PAST_FACT_ROUTE_RULES = `
Past-Fact / Route Consistency (только для unresolved; внутренний тест, не в JSON и не в reply):
- Подтверждённые факты из caseMemory и текущих фактов кейса ограничивают пространство маршрутов. Не предлагай маршрут, который противоречит подтверждённому факту, пока текущее сообщение пользователя явно не исправляет или не заменяет этот факт.
- Перед Main Decision Fork: оба предлагаемых маршрута ещё возможны? Маршрут невалиден, если он откладывает уже случившееся, решает «делать ли» уже сделанное, предотвращает уже подтверждённое необратимое событие, считает завершённое событие ещё ожидающим или заново открывает старое решение лишь потому, что появилась новая downstream-неопределённость.
- Завершённое решение + новая проблема ниже по цепочке = новый цикл решения по новой неопределённости. Не реконструируй уже завершённое решение.
- Перед JSON, по каждой стороне Fork: 1) маршрут ещё физически/юридически/операционно доступен? 2) не противоречит ли подтверждённому факту? 3) не считает ли уже свершившееся событие ещё pending? 4) не является ли это старым решением вместо текущей новой неопределённости? Если да — перепиши Fork.
Невалидно: факт «сделка завершена» → Fork «завершить сделку или отложить завершение». Валидно: «повторное рассмотрение создаёт обязательства / риск для собственника либо дополнительных действий не требуется».
Невалидно: «оплата произведена» → «оплатить сейчас или ждать». Валидно: «оплата полностью закрыла обязательство либо остаточный риск сохраняется».
Невалидно: «договор подписан» → «подписать или передоговориться до подписания». Валидно: «подписанный договор оставляет сторону открытой к новому вопросу либо достаточно защищает».
Не применяй этот тест, если decisionStatus = resolved. Если текущее сообщение явно отменяет подтверждённый факт — этот факт больше не ограничивает маршруты.
`.trim();

const ACTION_METHOD_PREFIX =
  /^(?:провести(?:\s+\S+){0,3}\s+(?:проверк|экспертиз)[а-яё]*|запросить|получить|связаться|обратиться|дождаться|уточнить|проверить|ожидать|ждать|принять|собрать|направить|заказать|request|obtain|contact|inspect|investigate|wait(?:\s+for)?|ask|review|conduct|take)(?=$|[\s.,;:!?«»"'()—–-])/iu;

function splitForkSides(fork: string): string[] {
  return fork
    .split(/\s+(?:или|либо|vs\.?|or)\s+|\/(?=\s*\S)/i)
    .map((side) => side.replace(/^["«)\s]+|["»(\s]+$/g, "").trim())
    .filter(Boolean);
}

/** Advisory: both sides of an unresolved fork look like fact-finding methods, not decision routes. */
export function forkLooksLikeActionMethods(fork: string): boolean {
  const sides = splitForkSides(fork);
  if (sides.length < 2) return false;
  return sides.filter((side) => ACTION_METHOD_PREFIX.test(side)).length >= 2;
}

export function unresolvedForkLooksLikeActionMethods(
  result: Pick<AnalysisResult, "decisionStatus" | "sections">,
): boolean {
  if (result.decisionStatus === "resolved") return false;
  const fork =
    result.sections.find((section) => section.title === SECTION_TITLES[1])?.content?.trim() || "";
  return forkLooksLikeActionMethods(fork);
}

/** One extra model call at most when an unresolved fork is action-shaped. Never loop. */
export const MAX_FORK_REPAIR_CALLS = 1;

export function shouldRepairActionShapedFork(
  result: Pick<AnalysisResult, "decisionStatus" | "sections">,
): boolean {
  return unresolvedForkLooksLikeActionMethods(result);
}

export type ForkRepairFactContext = {
  confirmedFacts?: string;
  caseMemory?: string;
  currentMessage?: string;
};

export type ForkRepairChoice = {
  result: AnalysisResult;
  usedRepair: boolean;
  reason:
    | "original_resolved"
    | "original_not_action_shaped"
    | "missing_or_unusable_repair"
    | "repaired_resolved"
    | "repaired_action_shaped"
    | "repaired_past_fact"
    | "accepted";
};

function confirmedTextForRepair(context?: ForkRepairFactContext): string {
  return [context?.confirmedFacts, context?.caseMemory].filter(Boolean).join("\n");
}

/**
 * A repair may improve Fork shape but must not invalidate an already-satisfied invariant.
 * Accept only if the repaired unresolved fork is not action-shaped and does not contradict
 * confirmed completed facts (unless the current message explicitly supersedes them).
 */
export function chooseRepairedAnalysisResult(
  original: AnalysisResult,
  repaired: AnalysisResult | null,
  context?: ForkRepairFactContext,
): ForkRepairChoice {
  if (original.decisionStatus === "resolved") {
    return { result: original, usedRepair: false, reason: "original_resolved" };
  }
  if (!shouldRepairActionShapedFork(original)) {
    return { result: original, usedRepair: false, reason: "original_not_action_shaped" };
  }
  if (!repaired) {
    return { result: original, usedRepair: false, reason: "missing_or_unusable_repair" };
  }
  if (repaired.decisionStatus === "resolved") {
    return { result: original, usedRepair: false, reason: "repaired_resolved" };
  }
  if (unresolvedForkLooksLikeActionMethods(repaired)) {
    return { result: original, usedRepair: false, reason: "repaired_action_shaped" };
  }
  if (
    unresolvedForkContradictsCompletedFacts(
      repaired,
      confirmedTextForRepair(context),
      context?.currentMessage,
    )
  ) {
    return { result: original, usedRepair: false, reason: "repaired_past_fact" };
  }
  return { result: repaired, usedRepair: true, reason: "accepted" };
}

type CompletedEventGuard = {
  confirmed: RegExp[];
  pendingRoute: RegExp[];
  supersededBy: RegExp[];
};

const COMPLETED_EVENT_GUARDS: CompletedEventGuard[] = [
  {
    confirmed: [
      /сделк[аиеу]\s+(?:уже\s+)?завершена/i,
      /покупк[аи]\s+(?:уже\s+)?завершена/i,
      /transaction completed/i,
      /purchase completed/i,
    ],
    pendingRoute: [
      /завершить\s+сделк/i,
      /отложить\s+(?:её\s+|ее\s+)?завершени/i,
      /complete(?:\s+the)?\s+(?:transaction|purchase|deal)/i,
      /delay(?:\s+the)?\s+completion/i,
    ],
    supersededBy: [
      /сделк\w*.{0,40}(?:ещё|еще)\s+не\s+заверш/i,
      /сделк\w*.{0,20}не\s+завершена/i,
      /покупк\w*.{0,40}(?:ещё|еще)\s+не\s+заверш/i,
      /transaction.{0,40}not(?:\s+yet)?\s+complet/i,
      /purchase.{0,40}not(?:\s+yet)?\s+complet/i,
    ],
  },
  {
    confirmed: [
      /оплата\s+(?:уже\s+)?произведена/i,
      /payment made/i,
      /payment(?:\s+was)?(?:\s+already)?\s+made/i,
    ],
    pendingRoute: [/оплатить/i, /платить\s+сейчас/i, /pay\s+now/i, /(?:^|[^\p{L}])pay(?:\s+now)?\s+or\s+wait/iu],
    supersededBy: [
      /оплат\w*.{0,40}(?:ещё|еще)\s+не\s+(?:произведен|сделан)/i,
      /payment.{0,40}not(?:\s+yet)?\s+(?:made|paid)/i,
    ],
  },
  {
    confirmed: [
      /договор\w*\s+(?:уже\s+)?подписан/i,
      /contract signed/i,
      /contract has(?:\s+already)?\s+been\s+signed/i,
    ],
    pendingRoute: [
      /подписать(?!н)/i,
      /до\s+подписания/i,
      /sign\s+now/i,
      /sign\s+or\s+/i,
      /before\s+signing/i,
    ],
    supersededBy: [
      /договор\w*.{0,40}(?:ещё|еще)\s+не\s+подписан/i,
      /contract.{0,40}not(?:\s+yet)?\s+sign/i,
    ],
  },
];

/** Advisory: unresolved fork still treats a confirmed completed event as a live future choice. */
export function forkContradictsCompletedFacts(
  fork: string,
  confirmedText: string,
  currentMessage?: string,
): boolean {
  const message = currentMessage ?? "";
  return COMPLETED_EVENT_GUARDS.some(
    (guard) =>
      guard.confirmed.some((pattern) => pattern.test(confirmedText)) &&
      !guard.supersededBy.some((pattern) => pattern.test(message)) &&
      guard.pendingRoute.some((pattern) => pattern.test(fork)),
  );
}

export function unresolvedForkContradictsCompletedFacts(
  result: Pick<AnalysisResult, "decisionStatus" | "sections">,
  confirmedText: string,
  currentMessage?: string,
): boolean {
  if (result.decisionStatus === "resolved") return false;
  const fork =
    result.sections.find((section) => section.title === SECTION_TITLES[1])?.content?.trim() || "";
  return forkContradictsCompletedFacts(fork, confirmedText, currentMessage);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseRoleAssignments(raw: unknown): RoleAssignment[] {
  if (!Array.isArray(raw)) return [];
  const assignments: RoleAssignment[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const role = typeof item.role === "string" ? item.role.trim() : "";
    const result = typeof item.result === "string" ? item.result.trim() : "";
    if (role && result) {
      assignments.push({ role, result });
    }
  }
  return assignments.slice(0, 2);
}

function parseActions(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .map((item) => item.trim())
    .slice(0, MAX_ACTIONS);
}

export function collectAnalysisText(result: AnalysisResult): string {
  const parts: string[] = [];
  if (result.reply) parts.push(result.reply);
  for (const section of result.sections) {
    if (section.content) parts.push(section.content);
    section.roleAssignments?.forEach((assignment) => {
      parts.push(assignment.role);
      parts.push(assignment.result);
    });
    section.actions?.forEach((action) => parts.push(action));
  }
  return parts.join("\n").toLowerCase();
}

function containsWholeWord(haystackLower: string, phraseLower: string): boolean {
  const escaped = phraseLower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`(?<![a-zа-яё0-9])${escaped}(?![a-zа-яё0-9])`, "iu");
  return pattern.test(haystackLower);
}

export function containsForbiddenPhrase(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    FORBIDDEN_PHRASES.some((phrase) => containsWholeWord(lower, phrase)) ||
    FORBIDDEN_FORK_PATTERNS.some((pattern) => pattern.test(text))
  );
}

export function isForbiddenMainQuestion(text: string): boolean {
  return FORBIDDEN_FORK_PATTERNS.some((pattern) => pattern.test(text));
}

function requireContent(section: Record<string, unknown> | undefined, name: string): string {
  const content = typeof section?.content === "string" ? section.content.trim() : "";
  if (!content) throw new Error(`Missing content for ${name}`);
  return content;
}

const URGENCIES = ["urgent", "soon", "no_deadline"] as const;
const STAKES = ["high_irreversible", "moderate", "low_reversible"] as const;

/** Parses and validates a priority object from raw AI JSON. */
export function parseAnalysisPriority(raw: unknown): AnalysisPriority | undefined {
  if (!isRecord(raw)) return undefined;

  const urgency = raw.urgency;
  const stake = raw.stake;
  const note = typeof raw.note === "string" ? raw.note.trim() : "";
  const valid =
    (URGENCIES as readonly string[]).includes(urgency as string) &&
    (STAKES as readonly string[]).includes(stake as string) &&
    !!note;
  if (!valid) {
    console.warn("[analysis] priority rejected by parseAnalysisPriority:", {
      urgency,
      stake,
      note,
    });
    return undefined;
  }

  return {
    urgency: urgency as AnalysisPriority["urgency"],
    stake: stake as AnalysisPriority["stake"],
    note,
  };
}

export type FactCheck = {
  contradictsEarlier: boolean;
  note: string;
};

/** Parses the optional factCheck object from raw AI JSON (continue-mode only). */
export function parseFactCheck(raw: unknown): FactCheck | undefined {
  if (!isRecord(raw)) return undefined;
  const factCheckRaw = raw.factCheck;
  if (!isRecord(factCheckRaw)) return undefined;
  const contradictsEarlier = factCheckRaw.contradictsEarlier === true;
  const note = typeof factCheckRaw.note === "string" ? factCheckRaw.note.trim() : "";
  return { contradictsEarlier, note };
}

/** Parses decisionStatus from raw AI JSON. Missing/invalid values default to unresolved. */
export function parseDecisionStatus(raw: unknown): DecisionStatus {
  if (!isRecord(raw)) return "unresolved";
  return raw.decisionStatus === "resolved" ? "resolved" : "unresolved";
}

export function isResolvedAnalysis(result: Pick<AnalysisResult, "decisionStatus">): boolean {
  return result.decisionStatus === "resolved";
}

export function decisionStatusLabel(status: DecisionStatus | undefined): string {
  return status === "resolved" ? "Решение определено" : "Решение ещё не определено";
}

/** Parses optional reply from raw AI JSON. */
export function parseAnalysisReply(raw: unknown): string | undefined {
  if (!isRecord(raw)) return undefined;
  const reply = typeof raw.reply === "string" ? raw.reply.trim() : "";
  return reply || undefined;
}

/** Normalizes compact case memory to a bullet list capped at MAX_CASE_MEMORY_BULLETS. */
export function normalizeCaseMemory(text: string): string {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      if (/^[-•*]\s/.test(line)) return line.replace(/^[-•*]\s*/, "- ");
      return `- ${line}`;
    });

  return lines.slice(0, MAX_CASE_MEMORY_BULLETS).join("\n");
}

/** Parses caseMemory from raw AI JSON. */
export function parseCaseMemory(raw: unknown): string {
  if (!isRecord(raw)) return "";
  const memory = typeof raw.caseMemory === "string" ? raw.caseMemory.trim() : "";
  return memory ? normalizeCaseMemory(memory) : "";
}

/** Normalizes raw AI JSON into the canonical five-section AnalysisResult. */
export function normalizeAnalysisResult(raw: unknown): AnalysisResult {
  if (!isRecord(raw) || !Array.isArray(raw.sections)) {
    throw new Error("Analysis JSON must contain sections array");
  }

  const byTitle = new Map<string, Record<string, unknown>>();
  for (const section of raw.sections) {
    if (!isRecord(section)) continue;
    const title = typeof section.title === "string" ? section.title.trim() : "";
    if (title) byTitle.set(title, section);
  }

  const outcome = requireContent(byTitle.get(SECTION_TITLES[0]), SECTION_TITLES[0]);
  const fork = requireContent(byTitle.get(SECTION_TITLES[1]), SECTION_TITLES[1]);
  const determiningFact = requireContent(byTitle.get(SECTION_TITLES[2]), SECTION_TITLES[2]);
  const decisionStatus = parseDecisionStatus(raw);

  const parsedAssignments = parseRoleAssignments(byTitle.get(SECTION_TITLES[3])?.roleAssignments);
  const actions = parseActions(byTitle.get(SECTION_TITLES[4])?.actions);
  const roleAssignments = decisionStatus === "resolved" ? [] : parsedAssignments;

  if (decisionStatus === "unresolved") {
    if (roleAssignments.length === 0) throw new Error("Missing fact sources");
    if (actions.length === 0) throw new Error("Missing actions to obtain the fact");
  }

  const priority = parseAnalysisPriority(isRecord(raw) ? raw.priority : undefined);
  const reply = parseAnalysisReply(raw);

  const result: AnalysisResult = {
    decisionStatus,
    sections: [
      { title: SECTION_TITLES[0], content: outcome },
      { title: SECTION_TITLES[1], content: fork },
      { title: SECTION_TITLES[2], content: determiningFact },
      { title: SECTION_TITLES[3], roleAssignments },
      { title: SECTION_TITLES[4], actions },
    ],
  };

  if (priority) {
    result.priority = priority;
  }

  if (reply) {
    result.reply = reply;
  }

  if (containsForbiddenPhrase(collectAnalysisText(result))) {
    console.warn(
      "[analysis] output contains a discouraged generic phrase (kept anyway):",
      collectAnalysisText(result),
    );
  }

  if (unresolvedForkLooksLikeActionMethods(result)) {
    console.warn(
      "[analysis] unresolved Main Decision Fork looks like fact-finding methods rather than decision routes (kept anyway):",
      fork,
    );
  }

  return result;
}

export function countAnalysisActions(result: AnalysisResult): number {
  const actionsSection = result.sections.find((s) => s.title === SECTION_TITLES[4]);
  return actionsSection?.actions?.length ?? 0;
}

export const ANALYSIS_INPUT_STORAGE_KEY = "fo-brain-analysis-input";
export const ANALYSIS_RESULT_STORAGE_KEY = "fo-brain-analysis-result";

/** @deprecated Use countAnalysisActions */
export function countAnalysisCriticalFacts(result: AnalysisResult): number {
  return countAnalysisActions(result);
}
