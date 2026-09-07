import type { AnalysisResult, DecisionStatus } from "@/core/orchestration/analysis-core";
import {
  RESOLVED_DETERMINING_FACT,
  SECTION_TITLES,
  normalizeAnalysisResult,
  parseDecisionStatus,
} from "@/core/orchestration/analysis-core";
import { derivePriorityLabel } from "@/lib/case-dashboard";
import { deriveExecutionSuggestion, hasStoredExecution, type StoredExecution } from "@/lib/case-execution";
import { analysisCycleKey } from "@/lib/decision-cycle";
import {
  isSimilarWorkspaceText,
  workspaceActionFirstNextStep,
  workspaceDecision,
  workspaceDeterminingFact,
  workspaceOutcome,
} from "@/lib/case-workspace";
import {
  computePriorityColor,
  parseStake,
  parseUrgency,
  type AnalysisPriority,
  type PriorityColor,
} from "@/lib/priority";

export type DecisionChangeStatusTransition = "to_resolved" | "to_unresolved" | null;

/** Serializable presentation model — derived from before/after analysis, not persisted. */
export type DecisionChangeSummary = {
  transitionKey: string;
  noMaterialChange: boolean;
  statusTransition: DecisionChangeStatusTransition;
  decisionChanged: boolean;
  determiningFactChanged: boolean;
  outcomeChanged: boolean;
  nextStepChanged: boolean;
  priorityChanged: boolean;
  previousDecision: string | null;
  currentDecision: string | null;
  previousFact: string | null;
  currentFact: string | null;
  previousNextStep: string | null;
  currentNextStep: string | null;
  previousPriority: string | null;
  currentPriority: string | null;
  unchangedItems: string[];
  stableNextStep: string | null;
};

export type DecisionChangeSummaryPayload = {
  transitionKey: string;
  summary: DecisionChangeSummary;
};

export type BuildDecisionChangeSummaryInput = {
  transitionKey: string;
  beforeAnalysis: unknown;
  afterAnalysis: AnalysisResult;
  beforePriority: {
    urgency: string | null;
    stake: string | null;
  };
  afterPriority?: AnalysisPriority;
  execution: StoredExecution;
  lifecycleState: string;
};

const UNCHANGED_LABELS = {
  outcome: "Цель",
  decision: "Решение",
  fact: "Определяющий факт",
  nextStep: "Следующий шаг",
  priority: "Приоритет",
} as const;

export function priorityDisplayLabel(color: PriorityColor): string {
  return derivePriorityLabel(color) ?? "Обычный";
}

/** Stable key for the same before→after analysis transition (duplicate submits share one summary). */
export function deriveDecisionChangeTransitionKey(
  beforeAnalysis: unknown,
  afterAnalysis: AnalysisResult,
): string | null {
  let before: AnalysisResult | null = null;
  try {
    before = beforeAnalysis ? normalizeAnalysisResult(beforeAnalysis) : null;
  } catch {
    return null;
  }
  if (!before) return null;
  return `${analysisCycleKey(before)}::${analysisCycleKey(afterAnalysis)}`;
}

function priorityColorFromStored(input: {
  urgency: string | null;
  stake: string | null;
}): PriorityColor {
  return computePriorityColor(parseUrgency(input.urgency), parseStake(input.stake));
}

function priorityColorFromAnalysis(
  analysis: AnalysisResult,
  fallback: { urgency: string | null; stake: string | null },
  explicit?: AnalysisPriority,
): PriorityColor {
  if (explicit) {
    return computePriorityColor(explicit.urgency, explicit.stake);
  }
  if (analysis.priority) {
    return computePriorityColor(analysis.priority.urgency, analysis.priority.stake);
  }
  return priorityColorFromStored(fallback);
}

function textChanged(before: string | null, after: string | null): boolean {
  const left = before?.trim() || null;
  const right = after?.trim() || null;
  if (!left && !right) return false;
  if (!left || !right) return true;
  return !isSimilarWorkspaceText(left, right);
}

function statusTransition(
  before: DecisionStatus | undefined,
  after: DecisionStatus | undefined,
): DecisionChangeStatusTransition {
  if (before !== "resolved" && after === "resolved") return "to_resolved";
  if (before === "resolved" && after === "unresolved") return "to_unresolved";
  return null;
}

function rawDeterminingFact(analysis: AnalysisResult | null): string | null {
  if (!analysis) return null;
  const fact = analysis.sections.find((section) => section.title === SECTION_TITLES[2])?.content?.trim();
  if (!fact || fact === RESOLVED_DETERMINING_FACT) return null;
  return fact;
}

function visibleNextStep(input: {
  analysis: AnalysisResult | null;
  execution: StoredExecution;
  lifecycleState: string;
  decisionStatus?: DecisionStatus;
}): string | null {
  if (!input.analysis) return null;

  if (input.decisionStatus === "resolved") {
    if (hasStoredExecution(input.execution) && input.execution.executionStatus === "pending") {
      return input.execution.executionStep?.trim() || null;
    }
    const suggestion = deriveExecutionSuggestion({
      decisionStatus: input.decisionStatus,
      lifecycleState: input.lifecycleState as never,
      analysis: input.analysis,
      execution: input.execution,
    });
    if (suggestion?.step?.trim()) return suggestion.step.trim();
  }

  return workspaceActionFirstNextStep(input.analysis).primary;
}

function factResolutionNote(afterAnalysis: AnalysisResult): string | null {
  const decision = workspaceDecision(afterAnalysis);
  if (decision) {
    const trimmed = decision.trim();
    if (trimmed.length > 0) {
      const withoutPrefix = trimmed.replace(/^решение определено[:.]?\s*/i, "").trim();
      if (withoutPrefix) {
        return `Подтверждён — ${withoutPrefix.charAt(0).toLowerCase()}${withoutPrefix.slice(1)}.`;
      }
    }
  }
  return "Подтверждён — дополнительный факт больше не требуется.";
}

export function buildDecisionChangeSummary(input: BuildDecisionChangeSummaryInput): DecisionChangeSummary | null {
  let beforeAnalysis: AnalysisResult | null = null;
  try {
    beforeAnalysis = input.beforeAnalysis ? normalizeAnalysisResult(input.beforeAnalysis) : null;
  } catch {
    beforeAnalysis = null;
  }

  if (!beforeAnalysis) {
    return null;
  }

  const afterAnalysis = input.afterAnalysis;
  const beforeStatus = parseDecisionStatus(beforeAnalysis);
  const afterStatus = parseDecisionStatus(afterAnalysis);
  const transition = statusTransition(beforeStatus, afterStatus);

  const previousDecision = workspaceDecision(beforeAnalysis);
  const currentDecision = workspaceDecision(afterAnalysis);
  const previousOutcome = workspaceOutcome(beforeAnalysis);
  const currentOutcome = workspaceOutcome(afterAnalysis);
  const previousFact = workspaceDeterminingFact(beforeAnalysis) ?? rawDeterminingFact(beforeAnalysis);
  const currentFact = workspaceDeterminingFact(afterAnalysis) ?? rawDeterminingFact(afterAnalysis);

  const previousNextStep = visibleNextStep({
    analysis: beforeAnalysis,
    execution: input.execution,
    lifecycleState: input.lifecycleState,
    decisionStatus: beforeStatus,
  });
  const currentNextStep = visibleNextStep({
    analysis: afterAnalysis,
    execution: input.execution,
    lifecycleState: input.lifecycleState,
    decisionStatus: afterStatus,
  });

  const beforePriorityColor = priorityColorFromStored(input.beforePriority);
  const afterPriorityColor = priorityColorFromAnalysis(afterAnalysis, input.beforePriority, input.afterPriority);
  const previousPriority = priorityDisplayLabel(beforePriorityColor);
  const currentPriority = priorityDisplayLabel(afterPriorityColor);

  const outcomeChanged = textChanged(previousOutcome, currentOutcome);
  const decisionChanged =
    transition === "to_resolved" || transition === "to_unresolved" || textChanged(previousDecision, currentDecision);
  const determiningFactChanged =
    transition === "to_unresolved" ||
    (transition !== "to_resolved" && textChanged(previousFact, currentFact));
  const nextStepChanged = textChanged(previousNextStep, currentNextStep);
  const priorityChanged = previousPriority !== currentPriority;

  const noMaterialChange =
    !outcomeChanged &&
    !decisionChanged &&
    !determiningFactChanged &&
    !nextStepChanged &&
    !priorityChanged &&
    transition === null;

  const unchangedItems: string[] = [];
  if (!outcomeChanged) unchangedItems.push(UNCHANGED_LABELS.outcome);
  if (!decisionChanged) unchangedItems.push(UNCHANGED_LABELS.decision);
  if (!determiningFactChanged && transition !== "to_resolved") unchangedItems.push(UNCHANGED_LABELS.fact);
  if (!nextStepChanged) unchangedItems.push(UNCHANGED_LABELS.nextStep);
  if (!priorityChanged) unchangedItems.push(UNCHANGED_LABELS.priority);

  const summary: DecisionChangeSummary = {
    transitionKey: input.transitionKey,
    noMaterialChange,
    statusTransition: transition,
    decisionChanged,
    determiningFactChanged,
    outcomeChanged,
    nextStepChanged,
    priorityChanged,
    previousDecision,
    currentDecision,
    previousFact,
    currentFact: transition === "to_resolved" ? factResolutionNote(afterAnalysis) : currentFact,
    previousNextStep,
    currentNextStep,
    previousPriority,
    currentPriority,
    unchangedItems,
    stableNextStep: noMaterialChange ? currentNextStep ?? previousNextStep : null,
  };

  return summary;
}

export const DECISION_CHANGE_STORAGE_PREFIX = "fo-change-summary";
export const DECISION_CHANGE_DISMISSED_PREFIX = "fo-change-dismissed";

export function decisionChangeStorageKey(caseId: string): string {
  return `${DECISION_CHANGE_STORAGE_PREFIX}:${caseId}`;
}

export function decisionChangeDismissedKey(caseId: string, transitionKey: string): string {
  return `${DECISION_CHANGE_DISMISSED_PREFIX}:${caseId}:${transitionKey}`;
}

export function readStoredDecisionChangeSummary(caseId: string): DecisionChangeSummaryPayload | null {
  if (typeof sessionStorage === "undefined") return null;
  const raw = sessionStorage.getItem(decisionChangeStorageKey(caseId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as DecisionChangeSummaryPayload;
    if (!parsed?.transitionKey || !parsed?.summary) return null;
    if (sessionStorage.getItem(decisionChangeDismissedKey(caseId, parsed.transitionKey))) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function storeDecisionChangeSummary(caseId: string, payload: DecisionChangeSummaryPayload): void {
  if (typeof sessionStorage === "undefined") return;
  const existing = sessionStorage.getItem(decisionChangeStorageKey(caseId));
  if (existing) {
    try {
      const parsed = JSON.parse(existing) as DecisionChangeSummaryPayload;
      if (parsed.transitionKey === payload.transitionKey) {
        window.dispatchEvent(
          new CustomEvent("fo-change-summary-updated", { detail: { caseId, payload } }),
        );
        return;
      }
    } catch {
      // replace corrupt entry
    }
  }
  sessionStorage.setItem(decisionChangeStorageKey(caseId), JSON.stringify(payload));
  window.dispatchEvent(new CustomEvent("fo-change-summary-updated", { detail: { caseId, payload } }));
}

export function dismissDecisionChangeSummary(caseId: string, transitionKey: string): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(decisionChangeDismissedKey(caseId, transitionKey), "1");
}
