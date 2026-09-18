import {
  RESOLVED_DETERMINING_FACT,
  SECTION_TITLES,
  normalizeCaseMemory,
  parseDecisionStatus,
  type AnalysisResult,
  type DecisionStatus,
} from "@/core/orchestration/analysis-core";
import {
  executionStatusLabels,
  isExecutionStatus,
  type ExecutionStatus,
  type StoredExecution,
} from "@/lib/case-execution";
import {
  analysisCycleKey,
  appendDecisionCycle,
  buildDecisionCycleRecord,
  parseDecisionCycleHistory,
  type DecisionCycleRecord,
} from "@/lib/decision-cycle";
import { nextStepResultEvidence } from "@/lib/next-step-result-flow";
import {
  parseHistoricalPrincipalDecision,
  toHistoricalPrincipalDecision,
  type HistoricalPrincipalDecision,
  type PrincipalDecisionRecord,
} from "@/lib/principal-decision";

export const DECISION_RECORD_VERSION = 1;
export const MAX_FACTUAL_OUTCOME_LENGTH = 800;
export const CLOSURE_MEMORY_PREFIX = "Итог закрытия:";

export type ResolutionContext = {
  determiningFact: string;
  resolvingEvidence?: string;
  resolvedAt: string;
  analysisKey: string;
};

export type DecisionRecord = {
  version: 1;
  closedAt: string;
  cycleNumber: number;
  analysisKey: string;
  decisionStatusAtClose: DecisionStatus;
  outcome: string;
  decision: string;
  determiningFact?: string;
  resolvingEvidence?: string;
  executionStep?: string;
  executionOwner?: string;
  executionStatus?: ExecutionStatus;
  factualOutcome?: string;
  principalDecision?: {
    decision: string;
    question: string;
    decidedAt: string;
  };
};

export type ClosurePreview = {
  decision: string | null;
  determiningFact: string | null;
  resolvingEvidence: string | null;
  executionStep: string | null;
  executionOwner: string | null;
  executionStatus: ExecutionStatus | null;
  decisionStatus: DecisionStatus | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function compactText(value: unknown, maxLength = MAX_FACTUAL_OUTCOME_LENGTH): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!trimmed) return null;
  return trimmed.length > maxLength ? trimmed.slice(0, maxLength).trim() : trimmed;
}

function analysisSection(analysis: AnalysisResult | null | undefined, title: string): string | null {
  if (!analysis) return null;
  const content = analysis.sections.find((section) => section.title === title)?.content;
  return compactText(content);
}

export function isUsableDeterminingFact(value: unknown): value is string {
  const fact = compactText(value);
  if (!fact) return false;
  return fact !== RESOLVED_DETERMINING_FACT;
}

export function usableDeterminingFact(value: unknown): string | null {
  return isUsableDeterminingFact(value) ? compactText(value) : null;
}

export function sanitizeFactualOutcome(value: unknown): string | null {
  return compactText(value);
}

export function parseResolutionContext(raw: unknown): ResolutionContext | null {
  if (!isRecord(raw)) return null;
  const determiningFact = usableDeterminingFact(raw.determiningFact);
  const analysisKey = typeof raw.analysisKey === "string" ? raw.analysisKey.trim() : "";
  const resolvedAt = typeof raw.resolvedAt === "string" ? raw.resolvedAt.trim() : "";
  if (!determiningFact || !analysisKey || !resolvedAt) return null;

  const context: ResolutionContext = {
    determiningFact,
    resolvedAt,
    analysisKey,
  };
  const resolvingEvidence = compactText(raw.resolvingEvidence);
  if (resolvingEvidence) {
    context.resolvingEvidence = resolvingEvidence;
  }
  return context;
}

export function parseDecisionRecord(raw: unknown): DecisionRecord | null {
  if (!isRecord(raw)) return null;
  if (raw.version !== DECISION_RECORD_VERSION) return null;
  const closedAt = typeof raw.closedAt === "string" ? raw.closedAt.trim() : "";
  const cycleNumber = typeof raw.cycleNumber === "number" && Number.isFinite(raw.cycleNumber) ? raw.cycleNumber : NaN;
  const analysisKey = typeof raw.analysisKey === "string" ? raw.analysisKey : "";
  const decisionStatusAtClose = parseDecisionStatus({ decisionStatus: raw.decisionStatusAtClose });
  const outcome = typeof raw.outcome === "string" ? raw.outcome.trim() : "";
  const decision = typeof raw.decision === "string" ? raw.decision.trim() : "";
  if (!closedAt || !Number.isInteger(cycleNumber) || cycleNumber < 1 || !decisionStatusAtClose) {
    return null;
  }

  const record: DecisionRecord = {
    version: 1,
    closedAt,
    cycleNumber,
    analysisKey,
    decisionStatusAtClose,
    outcome,
    decision,
  };

  const determiningFact = usableDeterminingFact(raw.determiningFact);
  if (determiningFact) record.determiningFact = determiningFact;
  const resolvingEvidence = compactText(raw.resolvingEvidence);
  if (resolvingEvidence) record.resolvingEvidence = resolvingEvidence;
  const executionStep = compactText(raw.executionStep);
  if (executionStep) record.executionStep = executionStep;
  const executionOwner = compactText(raw.executionOwner);
  if (executionOwner) record.executionOwner = executionOwner;
  if (isExecutionStatus(raw.executionStatus)) record.executionStatus = raw.executionStatus;
  const factualOutcome = sanitizeFactualOutcome(raw.factualOutcome);
  if (factualOutcome) record.factualOutcome = factualOutcome;
  const principalDecision = parseHistoricalPrincipalDecision(raw.principalDecision);
  if (principalDecision) record.principalDecision = principalDecision;

  return record;
}

export function activeCycleNumber(history: unknown): number {
  return parseDecisionCycleHistory(history).length + 1;
}

/**
 * Capture the determining fact that existed immediately before unresolved → resolved.
 * No AI. Do not guess. Clear when a new decision cycle begins.
 */
export function nextResolutionContext(input: {
  previousStatus?: DecisionStatus;
  nextStatus?: DecisionStatus;
  previousDeterminingFact?: string | null;
  resolvingEvidence?: string | null;
  nextAnalysisKey: string;
  previousContext?: unknown;
  now?: Date;
}): ResolutionContext | null {
  if (input.previousStatus === "resolved" && input.nextStatus === "unresolved") {
    return null;
  }

  if (input.previousStatus === "unresolved" && input.nextStatus === "resolved") {
    const determiningFact = usableDeterminingFact(input.previousDeterminingFact);
    if (!determiningFact) return null;
    const context: ResolutionContext = {
      determiningFact,
      resolvedAt: (input.now ?? new Date()).toISOString(),
      analysisKey: input.nextAnalysisKey,
    };
    const resolvingEvidence = nextStepResultEvidence(input.resolvingEvidence);
    if (resolvingEvidence) {
      context.resolvingEvidence = resolvingEvidence;
    }
    return context;
  }

  return parseResolutionContext(input.previousContext);
}

export function determiningFactForRecord(input: {
  analysis: AnalysisResult | null;
  resolutionContext?: unknown;
}): string | undefined {
  const status = parseDecisionStatus(input.analysis);
  const fromAnalysis = usableDeterminingFact(analysisSection(input.analysis, SECTION_TITLES[2]));
  if (status === "resolved") {
    return parseResolutionContext(input.resolutionContext)?.determiningFact ?? fromAnalysis ?? undefined;
  }
  return fromAnalysis ?? undefined;
}

export function resolvingEvidenceForRecord(input: {
  analysis: AnalysisResult | null;
  resolutionContext?: unknown;
}): string | undefined {
  if (parseDecisionStatus(input.analysis) !== "resolved") return undefined;
  return parseResolutionContext(input.resolutionContext)?.resolvingEvidence;
}

export function buildDecisionRecord(input: {
  closedAt?: Date | string;
  cycleNumber: number;
  analysis: AnalysisResult | null;
  outcomeStatement?: string | null;
  resolutionContext?: unknown;
  execution: StoredExecution;
  factualOutcome?: string | null;
  principalDecision?: PrincipalDecisionRecord | HistoricalPrincipalDecision | null;
}): DecisionRecord {
  const closedAt =
    input.closedAt instanceof Date
      ? input.closedAt.toISOString()
      : compactText(input.closedAt) || new Date().toISOString();
  const status = parseDecisionStatus(input.analysis) ?? "unresolved";
  const outcome =
    compactText(input.outcomeStatement) || analysisSection(input.analysis, SECTION_TITLES[0]) || "";
  const decision = analysisSection(input.analysis, SECTION_TITLES[1]) || "";
  const record: DecisionRecord = {
    version: 1,
    closedAt,
    cycleNumber: input.cycleNumber,
    analysisKey: input.analysis ? analysisCycleKey(input.analysis) : "",
    decisionStatusAtClose: status,
    outcome,
    decision,
  };

  const determiningFact = determiningFactForRecord({
    analysis: input.analysis,
    resolutionContext: input.resolutionContext,
  });
  if (determiningFact) record.determiningFact = determiningFact;

  const resolvingEvidence = resolvingEvidenceForRecord({
    analysis: input.analysis,
    resolutionContext: input.resolutionContext,
  });
  if (resolvingEvidence) record.resolvingEvidence = resolvingEvidence;

  const executionStep = compactText(input.execution.executionStep);
  if (executionStep) {
    record.executionStep = executionStep;
    const owner = compactText(input.execution.executionOwner);
    if (owner) record.executionOwner = owner;
    if (input.execution.executionStatus) {
      record.executionStatus = input.execution.executionStatus;
    }
  }

  const factualOutcome = sanitizeFactualOutcome(input.factualOutcome);
  if (factualOutcome) record.factualOutcome = factualOutcome;
  const principalDecision = toHistoricalPrincipalDecision(input.principalDecision);
  if (principalDecision) record.principalDecision = principalDecision;

  return record;
}

export function buildClosurePreview(input: {
  analysis: AnalysisResult | null;
  resolutionContext?: unknown;
  execution: StoredExecution;
}): ClosurePreview {
  return {
    decision: analysisSection(input.analysis, SECTION_TITLES[1]),
    determiningFact:
      determiningFactForRecord({
        analysis: input.analysis,
        resolutionContext: input.resolutionContext,
      }) ?? null,
    resolvingEvidence:
      resolvingEvidenceForRecord({
        analysis: input.analysis,
        resolutionContext: input.resolutionContext,
      }) ?? null,
    executionStep: compactText(input.execution.executionStep),
    executionOwner: compactText(input.execution.executionOwner),
    executionStatus: input.execution.executionStatus,
    decisionStatus: parseDecisionStatus(input.analysis),
  };
}

export function formatClosureExecutionLine(preview: Pick<
  ClosurePreview,
  "executionStep" | "executionOwner" | "executionStatus"
>): string | null {
  if (!preview.executionStep) return null;
  const parts = [preview.executionStep];
  if (preview.executionOwner) parts.push(preview.executionOwner);
  if (preview.executionStatus) parts.push(executionStatusLabels[preview.executionStatus]);
  return parts.join(" · ");
}

/**
 * Prepend the human closure fact so the 15-line cap keeps it.
 * Does not change MAX_CASE_MEMORY_BULLETS.
 */
export function appendClosureFactToCaseMemory(memory: string, factualOutcome: string | null | undefined): string {
  const outcome = sanitizeFactualOutcome(factualOutcome);
  if (!outcome) return normalizeCaseMemory(memory);
  const line = `${CLOSURE_MEMORY_PREFIX} ${outcome}`;
  const existing = memory
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (existing.some((entry) => entry.replace(/^[-•*]\s*/, "") === line)) {
    return normalizeCaseMemory(memory);
  }
  return normalizeCaseMemory(`${line}\n${memory}`);
}

export function shouldShowActiveDecisionRecord(input: {
  lifecycleState: string;
  decisionRecord: unknown;
  analysis: AnalysisResult | null;
}): boolean {
  if (input.lifecycleState !== "closed") return false;
  const record = parseDecisionRecord(input.decisionRecord);
  if (!record) return false;
  if (!input.analysis) return true;
  return analysisCycleKey(input.analysis) === record.analysisKey;
}

export function decisionRecordHeading(record: Pick<DecisionRecord, "decisionStatusAtClose">): string {
  return record.decisionStatusAtClose === "resolved" ? "Итог решения" : "Итог кейса";
}

export function decisionRecordCycleLabel(cycleNumber: number): string {
  return `Цикл ${cycleNumber}`;
}

export function formatDecisionRecordClosedAt(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
}

function sameDecisionRecord(left: DecisionRecord, right: DecisionRecord): boolean {
  return (
    left.closedAt === right.closedAt &&
    left.cycleNumber === right.cycleNumber &&
    left.analysisKey === right.analysisKey
  );
}

export function historyHasDecisionRecord(history: unknown, record: DecisionRecord): boolean {
  return parseDecisionCycleHistory(history).some((cycle) => {
    const stored = parseDecisionRecord(cycle.decisionRecord);
    return stored ? sameDecisionRecord(stored, record) : false;
  });
}

/** Attach an active Decision Record to history when a closed cycle is archived or reopened. */
export function archiveActiveDecisionRecord(input: {
  history: unknown;
  decisionRecord: unknown;
  analysis: unknown;
  execution: StoredExecution;
  executionUpdatedAt?: Date | string | null;
  closedAt?: Date | string | null;
  archivedAt?: Date;
  principalDecision?: unknown | null;
}): { history: DecisionCycleRecord[] | null; clearActive: boolean } {
  const record = parseDecisionRecord(input.decisionRecord);
  if (!record) {
    return { history: null, clearActive: false };
  }
  if (historyHasDecisionRecord(input.history, record)) {
    return { history: null, clearActive: true };
  }

  const nextHistory = appendDecisionCycle(
    input.history,
    buildDecisionCycleRecord({
      analysis: input.analysis,
      execution: input.execution,
      executionUpdatedAt: input.executionUpdatedAt,
      closedAt: input.closedAt ?? record.closedAt,
      archivedAt: input.archivedAt,
      decisionRecord: record,
      principalDecision: input.principalDecision ?? record.principalDecision ?? null,
    }),
  );
  return { history: nextHistory, clearActive: true };
}

export type LifecycleCloseWrite = {
  decisionRecord: DecisionRecord;
  caseMemory: string;
};

/** First close finalizes. Repeated close of the same cycle must not rebuild the record. */
export function shouldFinalizeDecisionRecord(input: {
  currentLifecycle: string;
  nextLifecycle: string;
  existingRecord: unknown;
}): boolean {
  if (input.nextLifecycle !== "closed") return false;
  if (input.currentLifecycle === "closed") return false;
  if (parseDecisionRecord(input.existingRecord)) return false;
  return true;
}

export function lifecycleCloseWrite(input: {
  closedAt: Date;
  history: unknown;
  analysis: AnalysisResult | null;
  outcomeStatement?: string | null;
  resolutionContext?: unknown;
  execution: StoredExecution;
  caseMemory: string;
  factualOutcome?: string | null;
  principalDecision?: PrincipalDecisionRecord | HistoricalPrincipalDecision | null;
}): LifecycleCloseWrite {
  const factualOutcome = sanitizeFactualOutcome(input.factualOutcome);
  return {
    decisionRecord: buildDecisionRecord({
      closedAt: input.closedAt,
      cycleNumber: activeCycleNumber(input.history),
      analysis: input.analysis,
      outcomeStatement: input.outcomeStatement,
      resolutionContext: input.resolutionContext,
      execution: input.execution,
      factualOutcome,
      principalDecision: input.principalDecision,
    }),
    caseMemory: appendClosureFactToCaseMemory(input.caseMemory, factualOutcome),
  };
}
