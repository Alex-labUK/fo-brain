import {
  SECTION_TITLES,
  parseDecisionStatus,
  type AnalysisResult,
} from "@/core/orchestration/analysis-core";
import { analysisSectionContent, workspaceDeterminingFact } from "@/lib/case-workspace";
import { analysisCycleKey } from "@/lib/decision-cycle";
import {
  parseResolutionContext,
  usableDeterminingFact,
} from "@/lib/decision-record";

export const DECISION_SUPPORT_STATUSES = [
  "missing_evidence",
  "supported",
  "support_not_recorded",
] as const;

export type DecisionSupportStatus = (typeof DECISION_SUPPORT_STATUSES)[number];

export type DecisionSupportState = {
  status: DecisionSupportStatus;
  determiningFact?: string;
  missingEvidence?: string;
  supportingEvidence?: string;
  note?: string;
};

export const DECISION_SUPPORT_KICKER = "Устойчивость решения";

const HEADLINES: Record<DecisionSupportStatus, string> = {
  missing_evidence: "Не хватает подтверждения",
  supported: "Ключевой факт подтверждён",
  support_not_recorded: "Основание решения зафиксировано не полностью",
};

const SUPPORT_NOT_RECORDED_DETAIL =
  "FO Brain считает решение определённым, но подтверждающее основание не сохранено в структурированном виде.";

export function currentResolutionContext(
  analysis: AnalysisResult | null | undefined,
  resolutionContext: unknown,
): ReturnType<typeof parseResolutionContext> {
  if (!analysis || parseDecisionStatus(analysis) !== "resolved") return null;
  const parsed = parseResolutionContext(resolutionContext);
  if (!parsed) return null;
  if (parsed.analysisKey !== analysisCycleKey(analysis)) return null;
  return parsed;
}

export function deriveDecisionSupportState(input: {
  analysis: AnalysisResult | null | undefined;
  resolutionContext?: unknown;
}): DecisionSupportState | null {
  const analysis = input.analysis;
  if (!analysis) return null;

  if (parseDecisionStatus(analysis) !== "resolved") {
    const determiningFact =
      usableDeterminingFact(workspaceDeterminingFact(analysis)) ??
      usableDeterminingFact(analysisSectionContent(analysis, SECTION_TITLES[2]));
    if (!determiningFact) return null;
    return {
      status: "missing_evidence",
      determiningFact,
      missingEvidence: determiningFact,
    };
  }

  const context = currentResolutionContext(analysis, input.resolutionContext);
  const supportingEvidence = context?.resolvingEvidence?.trim() || "";
  if (context && supportingEvidence) {
    return {
      status: "supported",
      determiningFact: context.determiningFact,
      supportingEvidence,
    };
  }

  return {
    status: "support_not_recorded",
    determiningFact: context?.determiningFact,
    note: SUPPORT_NOT_RECORDED_DETAIL,
  };
}

export function decisionSupportHeadline(state: DecisionSupportState): string {
  return HEADLINES[state.status];
}

export function decisionSupportDetail(
  state: DecisionSupportState,
  options?: { determiningFactVisible?: boolean },
): string | null {
  if (state.status === "missing_evidence") {
    if (options?.determiningFactVisible) {
      return "Не хватает подтверждения этого факта.";
    }
    return state.missingEvidence ? `Нужно установить: ${state.missingEvidence}` : null;
  }
  if (state.status === "supported") {
    return state.supportingEvidence ?? null;
  }
  return SUPPORT_NOT_RECORDED_DETAIL;
}

export function shouldShowDecisionSupport(input: {
  lifecycleState: string;
  reopenSuggestionVisible: boolean;
  state: DecisionSupportState | null;
}): boolean {
  if (!input.state) return false;
  if (input.lifecycleState === "closed" && !input.reopenSuggestionVisible) return false;
  return true;
}
