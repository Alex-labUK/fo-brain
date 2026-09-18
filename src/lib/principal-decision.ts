import {
  normalizeCaseMemory,
  type AnalysisResult,
  type DecisionAuthority,
} from "@/core/orchestration/analysis-core";
import { analysisCycleKey } from "@/lib/decision-cycle";
import { shouldShowPrincipalDecisionBrief, type PrincipalDecisionBrief } from "@/lib/principal-decision-brief";

export const PRINCIPAL_DECISION_MEMORY_PREFIX = "Решение Principal:";
export const PRINCIPAL_DECISION_MESSAGE_PREFIX = "Решение Principal: ";
export const PRINCIPAL_DECISION_KICKER = "Решение Principal зафиксировано";
export const PRINCIPAL_ANALYSIS_RETRY_NOTICE =
  "Решение Principal сохранено. Не удалось обновить разбор.";
export const PRINCIPAL_ANALYSIS_RETRY_ACTION = "Обновить разбор";
export const MAX_PRINCIPAL_DECISION_LENGTH = 800;

export type PrincipalDecisionRecord = {
  decision: string;
  question: string;
  decidedAt: string;
  analysisKey: string;
  cycleNumber?: number;
};

export type HistoricalPrincipalDecision = {
  decision: string;
  question: string;
  decidedAt: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function compactLine(value: unknown, maxLength = MAX_PRINCIPAL_DECISION_LENGTH): string | undefined {
  if (typeof value !== "string") return undefined;
  const text = value.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!text) return undefined;
  return text.length > maxLength ? text.slice(0, maxLength).trim() : text;
}

export function parsePrincipalDecision(raw: unknown): PrincipalDecisionRecord | null {
  if (!isRecord(raw)) return null;
  const decision = compactLine(raw.decision);
  const question = compactLine(raw.question);
  const decidedAt = typeof raw.decidedAt === "string" ? raw.decidedAt.trim() : "";
  const analysisKey = typeof raw.analysisKey === "string" ? raw.analysisKey.trim() : "";
  if (!decision || !question || !decidedAt || !analysisKey) return null;

  const record: PrincipalDecisionRecord = {
    decision,
    question,
    decidedAt,
    analysisKey,
  };
  if (typeof raw.cycleNumber === "number" && Number.isInteger(raw.cycleNumber) && raw.cycleNumber >= 1) {
    record.cycleNumber = raw.cycleNumber;
  }
  return record;
}

export function parseHistoricalPrincipalDecision(raw: unknown): HistoricalPrincipalDecision | null {
  if (!isRecord(raw)) return null;
  const decision = compactLine(raw.decision);
  const question = compactLine(raw.question);
  const decidedAt = typeof raw.decidedAt === "string" ? raw.decidedAt.trim() : "";
  if (!decision || !question || !decidedAt) return null;
  return { decision, question, decidedAt };
}

export function toHistoricalPrincipalDecision(
  record: PrincipalDecisionRecord | HistoricalPrincipalDecision | null | undefined,
): HistoricalPrincipalDecision | undefined {
  if (!record) return undefined;
  return {
    decision: record.decision,
    question: record.question,
    decidedAt: record.decidedAt,
  };
}

export function buildPrincipalDecision(input: {
  decision: string;
  question: string;
  analysis: AnalysisResult;
  cycleNumber?: number;
  decidedAt?: Date;
}): PrincipalDecisionRecord | null {
  const decision = compactLine(input.decision);
  const question = compactLine(input.question);
  if (!decision || !question) return null;
  const record: PrincipalDecisionRecord = {
    decision,
    question,
    decidedAt: (input.decidedAt ?? new Date()).toISOString(),
    analysisKey: analysisCycleKey(input.analysis),
  };
  if (typeof input.cycleNumber === "number" && Number.isInteger(input.cycleNumber) && input.cycleNumber >= 1) {
    record.cycleNumber = input.cycleNumber;
  }
  return record;
}

export function formatPrincipalDecisionMessage(decision: string): string {
  return `${PRINCIPAL_DECISION_MESSAGE_PREFIX}${decision.trim()}`;
}

export function principalDecisionMemoryLine(decision: string): string {
  return `${PRINCIPAL_DECISION_MEMORY_PREFIX} ${decision.trim()}`;
}

function memoryItems(memory: string): string[] {
  return memory
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean);
}

export function rememberPrincipalDecision(memory: string, decision: string): string {
  const line = principalDecisionMemoryLine(decision);
  const existing = memoryItems(memory);
  if (existing.some((item) => item === line || item === decision.trim())) {
    return normalizeCaseMemory(memory);
  }
  return normalizeCaseMemory(`${line}\n${memory}`);
}

export function isDuplicatePrincipalCapture(input: {
  stored: PrincipalDecisionRecord | null;
  next: PrincipalDecisionRecord;
}): boolean {
  if (!input.stored) return false;
  return (
    input.stored.analysisKey === input.next.analysisKey &&
    input.stored.decision === input.next.decision &&
    input.stored.question === input.next.question
  );
}

export type PrincipalCapturePlan = "persist_then_analyze" | "retry_analysis" | "noop";

export function planPrincipalCapture(input: {
  stored: PrincipalDecisionRecord | null;
  next: PrincipalDecisionRecord;
}): PrincipalCapturePlan {
  if (!input.stored) return "persist_then_analyze";
  if (isDuplicatePrincipalCapture(input)) return "retry_analysis";
  if (input.stored.analysisKey === input.next.analysisKey) return "noop";
  return "persist_then_analyze";
}

export function isPrincipalDecisionHistoryMessage(content: string, decision: string): boolean {
  return content.trim() === formatPrincipalDecisionMessage(decision);
}

export function shouldRetryPrincipalAnalysis(input: {
  lifecycleState: string;
  stored?: PrincipalDecisionRecord | null;
  analysis?: AnalysisResult | null;
}): boolean {
  if (input.lifecycleState === "closed") return false;
  if (!input.stored || !input.analysis) return false;
  return input.stored.analysisKey === analysisCycleKey(input.analysis);
}

export function shouldShowPrincipalDecisionCapture(input: {
  lifecycleState: string;
  authority?: DecisionAuthority | null;
  brief?: PrincipalDecisionBrief | null;
  stored?: PrincipalDecisionRecord | null;
  analysis?: AnalysisResult | null;
}): boolean {
  if (input.lifecycleState === "closed") return false;
  if (!shouldShowPrincipalDecisionBrief({ lifecycleState: input.lifecycleState, brief: input.brief })) {
    return false;
  }
  if (!input.authority || input.authority.owner !== "principal") return false;
  if (!input.authority.principalQuestion?.trim()) return false;
  if (input.stored && input.analysis && input.stored.analysisKey === analysisCycleKey(input.analysis)) {
    return false;
  }
  return true;
}

export function shouldShowCapturedPrincipalDecision(input: {
  lifecycleState: string;
  briefVisible: boolean;
  stored?: PrincipalDecisionRecord | null;
  analysis?: AnalysisResult | null;
}): boolean {
  if (input.lifecycleState === "closed") return false;
  if (!input.stored?.decision.trim()) return false;
  if (!input.briefVisible) return true;
  return Boolean(input.analysis && input.stored.analysisKey === analysisCycleKey(input.analysis));
}

export function principalDecisionPromptBlock(record: PrincipalDecisionRecord | null | undefined): string {
  if (!record) return "";
  return [
    "CURRENT PRINCIPAL DECISION (structured capture for this cycle, not a user-sentence prefix):",
    `Principal was asked: ${record.question}`,
    `Recorded Principal decision: ${record.decision}`,
    "This is a human-recorded Principal judgment for THAT question. It is governing context, not digital signature and not Principal-in-app approval.",
    "Do not treat Principal opinion as confirmation of an external fact (municipality, lawyer, bank, contractor).",
    "If this answers the CURRENT Principal judgment, do not set decisionAuthority.owner=principal with the same principalQuestion again.",
    "If the remaining judgment is materially different, Principal may be needed again.",
    "A conditional decision (proceed only if X) is not “proceed now”. If X is still unknown, keep unresolved and obtain X.",
    "Do not force decisionStatus=resolved solely because Principal answered.",
  ].join("\n");
}
