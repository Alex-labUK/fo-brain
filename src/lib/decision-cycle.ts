import type { CaseLifecycleState } from "@prisma/client";
import type { AnalysisResult, DecisionStatus } from "@/core/orchestration/analysis-core";
import { RESOLVED_DETERMINING_FACT, SECTION_TITLES, parseDecisionStatus } from "@/core/orchestration/analysis-core";
import { isLifecycleState } from "@/lib/case-lifecycle";
import type { ExecutionStatus, StoredExecution } from "@/lib/case-execution";
import { isExecutionStatus } from "@/lib/case-execution";

export const MAX_DECISION_CYCLES = 20;

const REOPEN_STATES = ["waiting_for_fact", "waiting_for_principal", "under_analysis"] as const;
type ReopenLifecycleState = (typeof REOPEN_STATES)[number];

export type DecisionCycleRecord = {
  archivedAt: string;
  analysis: unknown;
  executionStep: string | null;
  executionOwner: string | null;
  executionStatus: ExecutionStatus | null;
  executionUpdatedAt: string | null;
  closedAt: string | null;
};

export type ReopenSuggestion = {
  reason: string;
  fork: string;
  recommendedState: ReopenLifecycleState;
  blockerNote?: string;
  analysisKey: string;
};

export type StoredReopenSuggestion = ReopenSuggestion & {
  dismissed: boolean;
};

export const clearedExecutionAfterReopen: StoredExecution = {
  executionStep: null,
  executionOwner: null,
  executionStatus: null,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sectionContent(analysis: AnalysisResult, title: string): string {
  return analysis.sections.find((section) => section.title === title)?.content?.trim() || "";
}

function sectionRoles(analysis: AnalysisResult): string[] {
  return (
    analysis.sections
      .find((section) => section.title === SECTION_TITLES[3])
      ?.roleAssignments?.map((assignment) => assignment.role) ?? []
  );
}

function isReopenState(value: unknown): value is ReopenLifecycleState {
  return value === "waiting_for_fact" || value === "waiting_for_principal" || value === "under_analysis";
}

export function analysisCycleKey(analysis: AnalysisResult): string {
  const status = analysis.decisionStatus ?? "unresolved";
  return [
    status,
    sectionContent(analysis, SECTION_TITLES[1]),
    sectionContent(analysis, SECTION_TITLES[2]),
  ].join("\n");
}

export function shouldArchiveResolvedCycle(
  previousStatus: DecisionStatus | undefined,
  nextStatus: DecisionStatus | undefined,
): boolean {
  return previousStatus === "resolved" && nextStatus === "unresolved";
}

export function recommendedReopenState(analysis: AnalysisResult): ReopenLifecycleState {
  const roles = sectionRoles(analysis);
  if (roles.some((role) => /принципал|principal/i.test(role))) {
    return "waiting_for_principal";
  }

  const fact = sectionContent(analysis, SECTION_TITLES[2]);
  if (fact && fact !== RESOLVED_DETERMINING_FACT) {
    return "waiting_for_fact";
  }

  return "under_analysis";
}

export function deriveReopenSuggestion(analysis: AnalysisResult): ReopenSuggestion | null {
  if ((analysis.decisionStatus ?? "unresolved") !== "unresolved") {
    return null;
  }

  const fork = sectionContent(analysis, SECTION_TITLES[1]);
  if (!fork) {
    return null;
  }

  const recommendedState = recommendedReopenState(analysis);
  const fact = sectionContent(analysis, SECTION_TITLES[2]);
  const suggestion: ReopenSuggestion = {
    reason: "Появилась новая неопределённость, способная изменить маршрут уже принятого решения.",
    fork,
    recommendedState,
    analysisKey: analysisCycleKey(analysis),
  };

  if (recommendedState === "waiting_for_fact" && fact) {
    suggestion.blockerNote = fact;
  } else if (recommendedState === "waiting_for_principal") {
    suggestion.blockerNote = "Нужно новое решение принципала.";
  }

  return suggestion;
}

export function parseStoredReopenSuggestion(raw: unknown): StoredReopenSuggestion | null {
  if (!isRecord(raw)) return null;
  const reason = typeof raw.reason === "string" ? raw.reason.trim() : "";
  const fork = typeof raw.fork === "string" ? raw.fork.trim() : "";
  const analysisKey = typeof raw.analysisKey === "string" ? raw.analysisKey.trim() : "";
  if (!reason || !fork || !analysisKey || !isReopenState(raw.recommendedState)) {
    return null;
  }

  const suggestion: StoredReopenSuggestion = {
    reason,
    fork,
    recommendedState: raw.recommendedState,
    analysisKey,
    dismissed: raw.dismissed === true,
  };

  const note = typeof raw.blockerNote === "string" ? raw.blockerNote.trim() : "";
  if (note) {
    suggestion.blockerNote = note;
  }

  return suggestion;
}

export function visibleReopenSuggestion(
  raw: unknown,
  input: { lifecycleState: CaseLifecycleState; analysis: AnalysisResult | null },
): StoredReopenSuggestion | null {
  if (input.lifecycleState !== "closed") return null;
  if (!input.analysis || (input.analysis.decisionStatus ?? "unresolved") !== "unresolved") {
    return null;
  }

  const stored = parseStoredReopenSuggestion(raw);
  if (!stored || stored.dismissed) return null;
  if (stored.analysisKey !== analysisCycleKey(input.analysis)) return null;
  return stored;
}

/**
 * Next stored reopen recommendation after an analysis write.
 * Does not write lifecycle. Dismissed recs stay dismissed for the same analysisKey.
 */
export function nextStoredReopenSuggestion(input: {
  lifecycleState: CaseLifecycleState;
  previousDecisionStatus: DecisionStatus | undefined;
  nextAnalysis: AnalysisResult;
  previousStored: unknown;
}): StoredReopenSuggestion | null {
  if (input.lifecycleState !== "closed") return null;

  const derived = deriveReopenSuggestion(input.nextAnalysis);
  if (!derived) return null;

  const previous = parseStoredReopenSuggestion(input.previousStored);
  if (previous && previous.analysisKey === derived.analysisKey && previous.dismissed) {
    return previous;
  }

  if (previous && !previous.dismissed && previous.analysisKey === derived.analysisKey) {
    return previous;
  }

  if (
    input.previousDecisionStatus === "resolved" ||
    (previous && previous.analysisKey !== derived.analysisKey)
  ) {
    return { ...derived, dismissed: false };
  }

  return null;
}

export function dismissStoredReopenSuggestion(raw: unknown): StoredReopenSuggestion | null {
  const stored = parseStoredReopenSuggestion(raw);
  if (!stored) return null;
  return { ...stored, dismissed: true };
}

export function parseDecisionCycleHistory(raw: unknown): DecisionCycleRecord[] {
  if (!Array.isArray(raw)) return [];
  const cycles: DecisionCycleRecord[] = [];
  for (const item of raw) {
    if (!isRecord(item) || typeof item.archivedAt !== "string" || !item.archivedAt.trim()) {
      continue;
    }
    const executionStatus = isExecutionStatus(item.executionStatus) ? item.executionStatus : null;
    cycles.push({
      archivedAt: item.archivedAt,
      analysis: item.analysis ?? null,
      executionStep: typeof item.executionStep === "string" ? item.executionStep : null,
      executionOwner: typeof item.executionOwner === "string" ? item.executionOwner : null,
      executionStatus,
      executionUpdatedAt: typeof item.executionUpdatedAt === "string" ? item.executionUpdatedAt : null,
      closedAt: typeof item.closedAt === "string" ? item.closedAt : null,
    });
  }
  return cycles;
}

export function buildDecisionCycleRecord(input: {
  analysis: unknown;
  execution: StoredExecution;
  executionUpdatedAt?: Date | string | null;
  closedAt?: Date | string | null;
  archivedAt?: Date;
}): DecisionCycleRecord {
  const archivedAt = (input.archivedAt ?? new Date()).toISOString();
  const toIso = (value?: Date | string | null): string | null => {
    if (!value) return null;
    if (value instanceof Date) return value.toISOString();
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
  };

  return {
    archivedAt,
    analysis: input.analysis,
    executionStep: input.execution.executionStep,
    executionOwner: input.execution.executionOwner,
    executionStatus: input.execution.executionStatus,
    executionUpdatedAt: toIso(input.executionUpdatedAt),
    closedAt: toIso(input.closedAt),
  };
}

export function appendDecisionCycle(raw: unknown, record: DecisionCycleRecord): DecisionCycleRecord[] {
  return [...parseDecisionCycleHistory(raw), record].slice(-MAX_DECISION_CYCLES);
}

export type PreviousDecisionCycleContext = {
  decisionStatus: DecisionStatus | null;
  outcome: string | null;
  fork: string | null;
  determiningFact: string | null;
  resolutionStatement: string | null;
  executionStep: string | null;
  executionOwner: string | null;
  executionStatus: ExecutionStatus | null;
  executionUpdatedAt: string | null;
  closedAt: string | null;
  archivedAt: string;
};

function analysisSectionContent(analysis: unknown, title: string): string | null {
  if (!isRecord(analysis) || !Array.isArray(analysis.sections)) return null;
  for (const section of analysis.sections) {
    if (!isRecord(section)) continue;
    if (section.title !== title) continue;
    const content = typeof section.content === "string" ? section.content.trim() : "";
    return content || null;
  }
  return null;
}

function isResolvedArchivedCycle(cycle: DecisionCycleRecord): boolean {
  const status = parseDecisionStatus(cycle.analysis);
  if (status === "resolved") return true;
  const fork = analysisSectionContent(cycle.analysis, SECTION_TITLES[1]);
  return Boolean(fork?.startsWith("Решение определено:"));
}

/**
 * Most recent archived cycle whose decision was resolved (completed historical cycle).
 * Does not pass the full 20-cycle history onward.
 */
export function buildPreviousDecisionCycleContext(raw: unknown): PreviousDecisionCycleContext | null {
  const cycles = parseDecisionCycleHistory(raw);
  for (let index = cycles.length - 1; index >= 0; index -= 1) {
    const cycle = cycles[index];
    if (!isResolvedArchivedCycle(cycle)) continue;

    const fork = analysisSectionContent(cycle.analysis, SECTION_TITLES[1]);
    const status = parseDecisionStatus(cycle.analysis);
    const resolutionStatement = fork?.startsWith("Решение определено:") ? fork : null;

    return {
      decisionStatus: status === "resolved" ? "resolved" : resolutionStatement ? "resolved" : status,
      outcome: analysisSectionContent(cycle.analysis, SECTION_TITLES[0]),
      fork,
      determiningFact: analysisSectionContent(cycle.analysis, SECTION_TITLES[2]),
      resolutionStatement,
      executionStep: cycle.executionStep,
      executionOwner: cycle.executionOwner,
      executionStatus: cycle.executionStatus,
      executionUpdatedAt: cycle.executionUpdatedAt,
      closedAt: cycle.closedAt,
      archivedAt: cycle.archivedAt,
    };
  }
  return null;
}

/** Compact confirmed-text snippet for the existing Past-Fact helper (secondary to the prompt block). */
export function previousCycleConfirmedText(context: PreviousDecisionCycleContext | null): string {
  if (!context) return "";
  const lines = [
    context.resolutionStatement,
    context.executionStatus === "completed" ? "execution completed" : null,
    context.executionStep,
    context.closedAt ? "cycle closed" : null,
  ].filter((line): line is string => Boolean(line));
  return lines.join("\n");
}

export function formatPreviousDecisionCyclePromptBlock(
  context: PreviousDecisionCycleContext | null,
): string {
  if (!context) return "";

  const lines = [
    "PREVIOUS COMPLETED DECISION CYCLE",
    `Status: ${context.decisionStatus ?? "resolved"}`,
  ];
  if (context.resolutionStatement) {
    lines.push(`Resolution / outcome: ${context.resolutionStatement}`);
  } else if (context.outcome) {
    lines.push(`Resolution / outcome: ${context.outcome}`);
  }
  if (context.fork && context.fork !== context.resolutionStatement) {
    lines.push(`Main Decision Fork: ${context.fork}`);
  }
  if (context.determiningFact) {
    lines.push(`Determining Fact: ${context.determiningFact}`);
  }
  if (context.executionStep) {
    lines.push(`Execution step: ${context.executionStep}`);
  }
  if (context.executionOwner) {
    lines.push(`Execution owner: ${context.executionOwner}`);
  }
  if (context.executionStatus) {
    lines.push(`Execution status: ${context.executionStatus}`);
  }
  if (context.executionUpdatedAt) {
    lines.push(`Execution updated at: ${context.executionUpdatedAt}`);
  }
  if (context.closedAt) {
    lines.push(`Closed at: ${context.closedAt}`);
  }
  lines.push(
    "",
    "This cycle is historical and completed.",
    "Do not treat any decision, execution step, or route from this cycle as still pending or available unless the current user message explicitly says the historical record was wrong or the event was reversed.",
    "Analyse only the NEW downstream uncertainty.",
    "If the previous cycle confirms that a decision was resolved and its execution was completed, do not formulate the current Outcome, Fork, Priority, or Reply around performing that completed action again.",
    "Priority must describe urgency of the CURRENT unresolved decision, not urgency of a completed historical action.",
    "Reply must not tell the user to complete, delay, sign, pay, or otherwise repeat an action already recorded as completed.",
  );
  return lines.join("\n");
}

export function reopenLifecycleUpdate(suggestion: StoredReopenSuggestion): {
  lifecycleState: CaseLifecycleState;
  blockerType: "fact" | "principal" | "none";
  blockerNote: string | null;
} {
  if (!isLifecycleState(suggestion.recommendedState)) {
    return { lifecycleState: "under_analysis", blockerType: "none", blockerNote: null };
  }

  return {
    lifecycleState: suggestion.recommendedState,
    blockerType:
      suggestion.recommendedState === "waiting_for_fact"
        ? "fact"
        : suggestion.recommendedState === "waiting_for_principal"
          ? "principal"
          : "none",
    blockerNote: suggestion.blockerNote ?? suggestion.fork,
  };
}
