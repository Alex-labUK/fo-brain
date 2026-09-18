import type { CaseBlockerType, CaseLifecycleState } from "@prisma/client";
import {
  parseDecisionAuthority,
  parseDecisionStatus,
  SECTION_TITLES,
  type AnalysisResult,
  type DecisionStatus,
} from "@/core/orchestration/analysis-core";
import { visibleDashboardReopen, type DashboardCaseInput } from "@/lib/case-dashboard";
import { hasPendingExecution, isExecutionStatus, type StoredExecution } from "@/lib/case-execution";
import { isBlockerType, isLifecycleState } from "@/lib/case-lifecycle";
import { analysisCycleKey } from "@/lib/decision-cycle";
import {
  parsePrincipalDecision,
  type PrincipalDecisionRecord,
} from "@/lib/principal-decision";
import { computePriorityColor, parseStake, parseUrgency } from "@/lib/priority";
import {
  workspaceActionFirstNextStep,
  workspaceDeterminingFact,
} from "@/lib/case-workspace";

export const ATTENTION_KINDS = [
  "reopen",
  "principal_decision",
  "ready_to_close",
  "execution",
  "state_review",
  "third_party",
  "missing_fact",
  "analysis_needed",
  "monitoring",
] as const;

export type DecisionAttentionKind = (typeof ATTENTION_KINDS)[number];

export type DecisionAttentionPriority = "urgent" | "soon" | "normal";

export type DecisionAttentionItem = {
  caseId: string;
  title: string;
  kind: DecisionAttentionKind;
  headline: string;
  detail?: string;
  priority: DecisionAttentionPriority;
  lifecycleState: CaseLifecycleState | string;
  decisionStatus?: DecisionStatus;
  actionLabel: string;
  href: string;
  sortRank: number;
};

export type AttentionCaseInput = DashboardCaseInput & {
  blockerType?: string | null;
  principalDecision?: unknown;
};

export const ATTENTION_HEADLINES: Record<DecisionAttentionKind, string> = {
  reopen: "Появилась новая неопределённость",
  principal_decision: "Нужно решение Principal",
  ready_to_close: "Кейс можно закрыть",
  execution: "Нужно выполнить следующий шаг",
  state_review: "Нужно обновить состояние кейса",
  third_party: "Ждём третью сторону",
  missing_fact: "Нужно получить определяющий факт",
  analysis_needed: "Нужно продолжить разбор",
  monitoring: "Наблюдение",
};

export const STATE_REVIEW_DETAILS = {
  waitingForFact:
    "Решение уже определено, но кейс всё ещё отмечен как ожидающий факт.",
  stalePrincipal:
    "Текущий разбор больше не требует решения Principal.",
  completedStillExecuting:
    "Шаг исполнения выполнен, но кейс всё ещё в исполнении.",
} as const;

export const PRINCIPAL_CAPTURE_RETRY_HEADLINE =
  "Решение Principal сохранено — нужно обновить разбор";

export const ATTENTION_ACTION_LABEL = "Открыть кейс";
export const ATTENTION_EMPTY_COPY = "Сейчас нет кейсов, требующих вашего действия.";
export const ATTENTION_TITLE = "Требует внимания";
export const ATTENTION_SUBTITLE = "Только кейсы, где сейчас нужен факт, решение или действие.";

const KIND_RANK: Record<DecisionAttentionKind, number> = {
  reopen: 0,
  principal_decision: 1,
  ready_to_close: 2,
  execution: 3,
  state_review: 4,
  third_party: 5,
  missing_fact: 6,
  analysis_needed: 7,
  monitoring: 8,
};

const PRIORITY_RANK: Record<DecisionAttentionPriority, number> = {
  urgent: 0,
  soon: 1,
  normal: 2,
};

const DETAIL_MAX = 160;
const WAITING_STATES = new Set<CaseLifecycleState>([
  "waiting_for_fact",
  "waiting_for_third_party",
  "waiting_for_principal",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function compactDetail(text: string | null | undefined): string | undefined {
  const trimmed = text?.replace(/\s+/g, " ").trim() ?? "";
  if (!trimmed) return undefined;
  if (trimmed.length <= DETAIL_MAX) return trimmed;
  const slice = trimmed.slice(0, DETAIL_MAX - 1);
  const cut = slice.lastIndexOf(" ");
  const kept = (cut > 80 ? slice.slice(0, cut) : slice).trimEnd();
  return `${kept}…`;
}

function asTime(value: Date | string | null | undefined): number {
  if (!value) return 0;
  const date = value instanceof Date ? value : new Date(value);
  const time = date.getTime();
  return Number.isNaN(time) ? 0 : time;
}

function lifecycleOf(input: AttentionCaseInput): CaseLifecycleState | null {
  return isLifecycleState(input.lifecycleState) ? input.lifecycleState : null;
}

function blockerTypeOf(input: AttentionCaseInput): CaseBlockerType | null {
  return isBlockerType(input.blockerType) ? input.blockerType : null;
}

function storedExecution(input: AttentionCaseInput): StoredExecution {
  return {
    executionStep: input.executionStep ?? null,
    executionOwner: input.executionOwner ?? null,
    executionStatus: isExecutionStatus(input.executionStatus) ? input.executionStatus : null,
  };
}

function tryCurrentAnalysis(raw: unknown): AnalysisResult | null {
  if (!isRecord(raw) || !Array.isArray(raw.sections)) return null;
  const sections = raw.sections.flatMap((section) => {
    if (!isRecord(section) || typeof section.title !== "string") return [];
    const content = typeof section.content === "string" ? section.content : undefined;
    const roleAssignments = Array.isArray(section.roleAssignments)
      ? section.roleAssignments.flatMap((assignment) => {
          if (!isRecord(assignment) || typeof assignment.role !== "string") return [];
          const result = typeof assignment.result === "string" ? assignment.result : "";
          return [{ role: assignment.role, result }];
        })
      : undefined;
    const actions = Array.isArray(section.actions)
      ? section.actions.filter((item): item is string => typeof item === "string")
      : undefined;
    return [{ title: section.title, content, roleAssignments, actions }];
  });
  if (sections.length === 0) return null;
  const result: AnalysisResult = {
    sections,
    decisionStatus: parseDecisionStatus(raw),
  };
  const authority = parseDecisionAuthority(raw);
  if (authority) result.decisionAuthority = authority;
  return result;
}

function determiningFactOf(analysis: AnalysisResult | null): string | null {
  return workspaceDeterminingFact(analysis);
}

function nextStepOf(analysis: AnalysisResult | null): string | null {
  return workspaceActionFirstNextStep(analysis).primary;
}

function attentionPriority(input: AttentionCaseInput): DecisionAttentionPriority {
  const color = computePriorityColor(parseUrgency(input.priorityUrgency), parseStake(input.priorityStake));
  if (color === "red") return "urgent";
  if (color === "amber") return "soon";
  return "normal";
}

function currentPrincipalCapture(
  stored: PrincipalDecisionRecord | null,
  analysis: AnalysisResult | null,
): PrincipalDecisionRecord | null {
  if (!stored || !analysis) return null;
  return stored.analysisKey === analysisCycleKey(analysis) ? stored : null;
}

function item(
  input: AttentionCaseInput,
  kind: DecisionAttentionKind,
  extra: {
    headline?: string;
    detail?: string | null;
    decisionStatus?: DecisionStatus;
  },
): DecisionAttentionItem {
  const detail = compactDetail(extra.detail);
  const built: DecisionAttentionItem = {
    caseId: input.id,
    title: input.title,
    kind,
    headline: extra.headline ?? ATTENTION_HEADLINES[kind],
    priority: attentionPriority(input),
    lifecycleState: input.lifecycleState,
    actionLabel: ATTENTION_ACTION_LABEL,
    href: `/cases/${input.id}`,
    sortRank: KIND_RANK[kind],
  };
  if (detail) built.detail = detail;
  if (extra.decisionStatus) built.decisionStatus = extra.decisionStatus;
  return built;
}

function isThirdPartyWait(lifecycle: CaseLifecycleState | null, blockerType: CaseBlockerType | null): boolean {
  return lifecycle === "waiting_for_third_party" || blockerType === "third_party";
}

function isReadyToClose(input: {
  lifecycle: CaseLifecycleState | null;
  decisionStatus?: DecisionStatus;
  execution: StoredExecution;
}): boolean {
  if (!input.lifecycle || input.lifecycle === "closed") return false;
  if (WAITING_STATES.has(input.lifecycle)) return false;
  if (input.decisionStatus !== "resolved") return false;
  return input.execution.executionStatus === "completed" && Boolean(input.execution.executionStep?.trim());
}

function stateReviewDetail(input: {
  lifecycle: CaseLifecycleState;
  decisionStatus?: DecisionStatus;
  asksPrincipal: boolean;
  execution: StoredExecution;
}): string | null {
  if (input.decisionStatus === "resolved" && input.lifecycle === "waiting_for_fact") {
    return STATE_REVIEW_DETAILS.waitingForFact;
  }
  if (
    input.decisionStatus === "resolved" &&
    input.lifecycle === "waiting_for_principal" &&
    !input.asksPrincipal
  ) {
    return STATE_REVIEW_DETAILS.stalePrincipal;
  }
  if (
    input.lifecycle === "executing" &&
    input.execution.executionStatus === "completed" &&
    !hasPendingExecution(input.execution)
  ) {
    return STATE_REVIEW_DETAILS.completedStillExecuting;
  }
  return null;
}

/**
 * One derived attention item per case. Closed cases appear only with a visible reopen suggestion.
 * Does not mutate the case. Does not persist.
 */
export function deriveDecisionAttentionItem(input: AttentionCaseInput): DecisionAttentionItem | null {
  const lifecycle = lifecycleOf(input);
  const analysis = tryCurrentAnalysis(input.analysisResult);
  const decisionStatus = analysis?.decisionStatus ?? (input.analysisResult == null ? undefined : parseDecisionStatus(input.analysisResult));
  const execution = storedExecution(input);
  const reopen = visibleDashboardReopen(input);

  if (lifecycle === "closed") {
    if (!reopen) return null;
    return item(input, "reopen", {
      detail: reopen.fork || reopen.reason,
      decisionStatus,
    });
  }

  if (!lifecycle) return null;

  const authority = analysis?.decisionAuthority;
  const storedPrincipal = parsePrincipalDecision(input.principalDecision);
  const currentCapture = currentPrincipalCapture(storedPrincipal, analysis);
  const principalQuestion = authority?.principalQuestion?.trim() || "";
  const asksPrincipal = authority?.owner === "principal" && Boolean(principalQuestion);

  if (asksPrincipal) {
    return item(input, "principal_decision", {
      headline: currentCapture ? PRINCIPAL_CAPTURE_RETRY_HEADLINE : ATTENTION_HEADLINES.principal_decision,
      detail: principalQuestion,
      decisionStatus,
    });
  }

  if (isReadyToClose({ lifecycle, decisionStatus, execution })) {
    return item(input, "ready_to_close", {
      detail: execution.executionStep,
      decisionStatus,
    });
  }

  if (decisionStatus === "resolved" && hasPendingExecution(execution)) {
    return item(input, "execution", {
      detail: execution.executionStep,
      decisionStatus,
    });
  }

  const reviewDetail = stateReviewDetail({
    lifecycle,
    decisionStatus,
    asksPrincipal,
    execution,
  });
  if (reviewDetail) {
    return item(input, "state_review", {
      detail: reviewDetail,
      decisionStatus,
    });
  }

  const blockerType = blockerTypeOf(input);
  if (isThirdPartyWait(lifecycle, blockerType)) {
    return item(input, "third_party", {
      detail: input.blockerNote || nextStepOf(analysis),
      decisionStatus,
    });
  }

  const fact = determiningFactOf(analysis);
  if (decisionStatus !== "resolved" && (fact || lifecycle === "waiting_for_fact")) {
    return item(input, "missing_fact", {
      detail: fact || input.blockerNote,
      decisionStatus,
    });
  }

  if ((lifecycle === "new" || lifecycle === "under_analysis") && decisionStatus !== "resolved") {
    if (lifecycle === "under_analysis" && !analysis) return null;
    return item(input, "analysis_needed", {
      detail: nextStepOf(analysis),
      decisionStatus,
    });
  }

  return null;
}

export function sortDecisionAttentionItems(items: DecisionAttentionItem[]): DecisionAttentionItem[] {
  return [...items].sort((a, b) => {
    const kind = a.sortRank - b.sortRank;
    if (kind !== 0) return kind;
    const priority = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    if (priority !== 0) return priority;
    return a.title.localeCompare(b.title, "ru") || a.caseId.localeCompare(b.caseId);
  });
}

export function deriveDecisionAttentionQueue(
  cases: AttentionCaseInput[],
  recencyById: Map<string, number> = new Map(
    cases.map((caseItem) => [
      caseItem.id,
      Math.max(asTime(caseItem.updatedAt), asTime(caseItem.lifecycleUpdatedAt), asTime(caseItem.executionUpdatedAt)),
    ]),
  ),
): DecisionAttentionItem[] {
  const derived = cases.flatMap((caseItem) => {
    const itemOrNull = deriveDecisionAttentionItem(caseItem);
    return itemOrNull ? [itemOrNull] : [];
  });
  return [...derived].sort((a, b) => {
    const kind = a.sortRank - b.sortRank;
    if (kind !== 0) return kind;
    const priority = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    if (priority !== 0) return priority;
    const recency = (recencyById.get(b.caseId) ?? 0) - (recencyById.get(a.caseId) ?? 0);
    if (recency !== 0) return recency;
    return a.title.localeCompare(b.title, "ru") || a.caseId.localeCompare(b.caseId);
  });
}

export function attentionPriorityLabel(priority: DecisionAttentionPriority): "Срочно" | "Скоро" | "Обычный" {
  if (priority === "urgent") return "Срочно";
  if (priority === "soon") return "Скоро";
  return "Обычный";
}
