// Shared analysis types and utilities (no AI, no fallback templates).

import type { AnalysisPriority } from "@/lib/priority";

export type AnalysisInput = {
  whatHappened: string;
  desiredOutcome?: string;
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
