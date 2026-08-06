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

export type AnalysisResult = {
  sections: AnalysisSection[];
  priority?: AnalysisPriority;
  reply?: string;
};

export type AnalysisSource = "ai" | "fallback";

export type AnalysisRunResult = {
  result: AnalysisResult;
  source: AnalysisSource;
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
};

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
  return assignments;
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

export function containsForbiddenPhrase(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    FORBIDDEN_PHRASES.some((phrase) => lower.includes(phrase)) ||
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

  if (
    !(URGENCIES as readonly string[]).includes(urgency as string) ||
    !(STAKES as readonly string[]).includes(stake as string) ||
    !note
  ) {
    return undefined;
  }

  return {
    urgency: urgency as AnalysisPriority["urgency"],
    stake: stake as AnalysisPriority["stake"],
    note,
  };
}

/** Parses optional reply from raw AI JSON. */
export function parseAnalysisReply(raw: unknown): string | undefined {
  if (!isRecord(raw)) return undefined;
  const reply = typeof raw.reply === "string" ? raw.reply.trim() : "";
  return reply || undefined;
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

  const roleAssignments = parseRoleAssignments(byTitle.get(SECTION_TITLES[3])?.roleAssignments);
  if (roleAssignments.length === 0) throw new Error("Missing fact sources");

  const actions = parseActions(byTitle.get(SECTION_TITLES[4])?.actions);
  if (actions.length === 0) throw new Error("Missing actions to obtain the fact");

  const result: AnalysisResult = {
    sections: [
      { title: SECTION_TITLES[0], content: outcome },
      { title: SECTION_TITLES[1], content: fork },
      { title: SECTION_TITLES[2], content: determiningFact },
      { title: SECTION_TITLES[3], roleAssignments },
      { title: SECTION_TITLES[4], actions },
    ],
  };

  const priority = parseAnalysisPriority(raw);
  if (priority) {
    result.priority = priority;
  }

  const reply = parseAnalysisReply(raw);
  if (reply) {
    result.reply = reply;
  }

  if (containsForbiddenPhrase(collectAnalysisText(result))) {
    throw new Error("Analysis output contains forbidden generic phrasing");
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
