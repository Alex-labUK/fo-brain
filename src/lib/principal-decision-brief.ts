import {
  parseDecisionStatus,
  type AnalysisResult,
  type DecisionAuthority,
  type DecisionChallenge,
} from "@/core/orchestration/analysis-core";
import { isSimilarWorkspaceText, workspaceDecision, workspaceDeterminingFact } from "@/lib/case-workspace";
import { deriveDecisionSupportState, type DecisionSupportState } from "@/lib/decision-support";
import { usableDeterminingFact } from "@/lib/decision-record";

export type PrincipalDecisionBriefRoute = {
  label?: string;
  text: string;
};

export type PrincipalDecisionBrief = {
  question: string;
  reason?: string;
  knownFacts?: string[];
  remainingUncertainty?: string;
  routes?: PrincipalDecisionBriefRoute[];
  currentRoute?: string;
  reconsiderIf?: string;
  evidenceNote?: string;
};

export const PRINCIPAL_BRIEF_KICKER = "Решение для Principal";

export const PRINCIPAL_BRIEF_LABELS = {
  question: "Нужно решить",
  reason: "Почему нужен Principal",
  knownFacts: "Что уже известно",
  remainingUncertainty: "Ещё не известно",
  routes: "Варианты",
  currentRoute: "Текущая позиция FO Brain",
  evidenceNote: "Основание",
  reconsiderIf: "Пересмотреть решение, если",
} as const;

const SUPPORT_NOT_RECORDED_NOTE = "Подтверждающее основание зафиксировано не полностью.";

const GENERIC_PRINCIPAL_REASON =
  /^(требуется решение principal\.?|нужна позиция principal\.?|нужно решение principal\.?|требуется позиция principal\.?)$/i;

function compactLine(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const text = value.trim();
  return text || undefined;
}

function isGenericPrincipalReason(reason: string): boolean {
  return GENERIC_PRINCIPAL_REASON.test(reason.trim());
}

function isDuplicateOf(candidate: string, visible: Array<string | undefined>): boolean {
  return visible.some((item) => item && isSimilarWorkspaceText(candidate, item));
}

function authorityReason(authority: DecisionAuthority, question: string): string | undefined {
  const reason = compactLine(authority.reason);
  if (!reason) return undefined;
  if (isGenericPrincipalReason(reason)) return undefined;
  if (isSimilarWorkspaceText(reason, question)) return undefined;
  return reason;
}

function remainingUncertaintyFromAnalysis(analysis: AnalysisResult): string | undefined {
  if (parseDecisionStatus(analysis) !== "unresolved") return undefined;
  return usableDeterminingFact(workspaceDeterminingFact(analysis)) ?? undefined;
}

function forkRoutes(analysis: AnalysisResult): PrincipalDecisionBriefRoute[] | undefined {
  const fork = compactLine(workspaceDecision(analysis));
  if (!fork) return undefined;
  return [{ text: fork }];
}

function evidenceNoteFromSupport(
  support: DecisionSupportState | null,
  remainingUncertainty?: string,
): string | undefined {
  if (!support) return undefined;
  if (support.status === "missing_evidence") return undefined;
  if (support.status === "support_not_recorded") return SUPPORT_NOT_RECORDED_NOTE;
  const evidence = compactLine(support.supportingEvidence);
  if (!evidence) return undefined;
  if (remainingUncertainty && isSimilarWorkspaceText(evidence, remainingUncertainty)) return undefined;
  return evidence;
}

function reconsiderationLine(challenge: DecisionChallenge | undefined, used: Array<string | undefined>): string | undefined {
  const primary = compactLine(challenge?.invalidationCondition);
  const fallback = compactLine(challenge?.reviewTrigger);
  const chosen =
    primary && !isDuplicateOf(primary, used)
      ? primary
      : fallback && !isDuplicateOf(fallback, used)
        ? fallback
        : undefined;
  return chosen;
}

export function derivePrincipalDecisionBrief(input: {
  analysis: AnalysisResult | null | undefined;
  resolutionContext?: unknown;
}): PrincipalDecisionBrief | null {
  const analysis = input.analysis;
  if (!analysis) return null;

  const authority = analysis.decisionAuthority;
  if (!authority || authority.owner !== "principal") return null;

  const question = compactLine(authority.principalQuestion);
  if (!question) return null;

  const status = parseDecisionStatus(analysis);
  const remainingUncertainty = remainingUncertaintyFromAnalysis(analysis);
  const support = deriveDecisionSupportState({
    analysis,
    resolutionContext: input.resolutionContext,
  });
  const evidenceNote = evidenceNoteFromSupport(support, remainingUncertainty);
  const fork = forkRoutes(analysis);
  const currentRoute = status === "resolved" ? compactLine(workspaceDecision(analysis)) : undefined;
  const routes = status === "unresolved" ? fork : undefined;
  const reason = authorityReason(authority, question);
  const reconsiderIf = reconsiderationLine(analysis.decisionChallenge, [
    question,
    remainingUncertainty,
    currentRoute,
    evidenceNote,
    ...(routes?.map((route) => route.text) ?? []),
  ]);

  return {
    question,
    ...(reason ? { reason } : {}),
    ...(remainingUncertainty ? { remainingUncertainty } : {}),
    ...(routes?.length ? { routes } : {}),
    ...(currentRoute ? { currentRoute } : {}),
    ...(reconsiderIf ? { reconsiderIf } : {}),
    ...(evidenceNote ? { evidenceNote } : {}),
  };
}

export function formatPrincipalDecisionBriefText(brief: PrincipalDecisionBrief): string {
  const blocks: string[] = [PRINCIPAL_BRIEF_KICKER, ""];

  const push = (label: string, value: string) => {
    blocks.push(`${label}:`, value, "");
  };

  push(PRINCIPAL_BRIEF_LABELS.question, brief.question);
  if (brief.reason) push(PRINCIPAL_BRIEF_LABELS.reason, brief.reason);
  if (brief.knownFacts?.length) {
    blocks.push(`${PRINCIPAL_BRIEF_LABELS.knownFacts}:`);
    for (const fact of brief.knownFacts) blocks.push(fact);
    blocks.push("");
  }
  if (brief.remainingUncertainty) {
    push(PRINCIPAL_BRIEF_LABELS.remainingUncertainty, brief.remainingUncertainty);
  }
  if (brief.routes?.length) {
    blocks.push(`${PRINCIPAL_BRIEF_LABELS.routes}:`);
    for (const route of brief.routes) {
      blocks.push(route.label ? `${route.label}. ${route.text}` : route.text);
    }
    blocks.push("");
  }
  if (brief.currentRoute) push(PRINCIPAL_BRIEF_LABELS.currentRoute, brief.currentRoute);
  if (brief.evidenceNote) push(PRINCIPAL_BRIEF_LABELS.evidenceNote, brief.evidenceNote);
  if (brief.reconsiderIf) push(PRINCIPAL_BRIEF_LABELS.reconsiderIf, brief.reconsiderIf);

  return blocks.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function shouldShowPrincipalDecisionBrief(input: {
  lifecycleState: string;
  brief?: PrincipalDecisionBrief | null;
}): boolean {
  if (input.lifecycleState === "closed") return false;
  return Boolean(input.brief?.question.trim());
}
