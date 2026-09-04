import type { CaseLifecycleState } from "@prisma/client";
import {
  parseDecisionStatus,
  RESOLVED_DETERMINING_FACT,
  SECTION_TITLES,
  type AnalysisResult,
  type DecisionStatus,
} from "@/core/orchestration/analysis-core";
import { executionNeedsReview, isExecutionStatus } from "@/lib/case-execution";
import { isLifecycleState, visibleLifecycleSuggestion } from "@/lib/case-lifecycle";
import { visibleReopenSuggestion, type StoredReopenSuggestion } from "@/lib/decision-cycle";
import {
  computePriorityColor,
  parseStake,
  parseUrgency,
  type PriorityColor,
} from "@/lib/priority";

export const MAX_NOW_CASES = 3;

export const DASHBOARD_GROUPS = [
  "waiting",
  "executing",
  "monitoring",
  "other",
  "closed",
] as const;

export type DashboardGroup = (typeof DASHBOARD_GROUPS)[number];

export const SECONDARY_VIEWS = ["waiting", "executing", "monitoring", "other", "closed"] as const;
export type SecondaryView = (typeof SECONDARY_VIEWS)[number];

const PRIORITY_SORT_RANK: Record<PriorityColor, number> = {
  red: 0,
  amber: 1,
  green: 2,
  unknown: 3,
};

const FOCUS_MAX_CHARS = 120;

export type DashboardCaseInput = {
  id: string;
  title: string;
  lifecycleState: CaseLifecycleState | string;
  blockerNote?: string | null;
  lifecycleUpdatedAt?: Date | string | null;
  lifecycleSuggestion?: unknown;
  executionStep?: string | null;
  executionOwner?: string | null;
  executionStatus?: string | null;
  executionUpdatedAt?: Date | string | null;
  priorityUrgency?: string | null;
  priorityStake?: string | null;
  updatedAt?: Date | string | null;
  analysisResult?: unknown;
  reopenSuggestion?: unknown;
};

export type DashboardCard = {
  id: string;
  title: string;
  group: DashboardGroup;
  statusLine: string | null;
  contextLine: string | null;
  priorityColor: PriorityColor;
  reopenMarker: boolean;
  reopenContext: string | null;
};

export type DashboardPortfolio = {
  now: DashboardCard[];
  waiting: DashboardCard[];
  executing: DashboardCard[];
  monitoring: DashboardCard[];
  other: DashboardCard[];
  closed: DashboardCard[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asTime(value: Date | string | null | undefined): number {
  if (!value) return 0;
  const date = value instanceof Date ? value : new Date(value);
  const time = date.getTime();
  return Number.isNaN(time) ? 0 : time;
}

function compactLine(text: string | null | undefined, max = FOCUS_MAX_CHARS): string | null {
  const trimmed = text?.replace(/\s+/g, " ").trim() ?? "";
  if (!trimmed) return null;
  if (trimmed.length <= max) return trimmed;
  const slice = trimmed.slice(0, max - 1);
  const cut = slice.lastIndexOf(" ");
  const kept = (cut > 80 ? slice.slice(0, cut) : slice).trimEnd();
  return `${kept}…`;
}

function analysisSection(raw: unknown, title: string): string | null {
  if (!isRecord(raw) || !Array.isArray(raw.sections)) return null;
  for (const section of raw.sections) {
    if (!isRecord(section) || section.title !== title) continue;
    const content = typeof section.content === "string" ? section.content.trim() : "";
    return content || null;
  }
  return null;
}

function analysisRoles(raw: unknown): string[] {
  if (!isRecord(raw) || !Array.isArray(raw.sections)) return [];
  for (const section of raw.sections) {
    if (!isRecord(section) || section.title !== SECTION_TITLES[3]) continue;
    if (!Array.isArray(section.roleAssignments)) return [];
    return section.roleAssignments
      .map((assignment) => {
        if (!isRecord(assignment) || typeof assignment.role !== "string") return "";
        return assignment.role.trim();
      })
      .filter(Boolean);
  }
  return [];
}

function tryAnalysis(raw: unknown): AnalysisResult | null {
  if (!isRecord(raw) || !Array.isArray(raw.sections)) return null;
  const sections = raw.sections.flatMap((section) => {
    if (!isRecord(section) || typeof section.title !== "string") return [];
    const title = section.title;
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
    return [{ title, content, roleAssignments, actions }];
  });
  if (sections.length === 0) return null;
  return {
    sections,
    decisionStatus: parseDecisionStatus(raw),
  };
}

function lifecycleOf(input: DashboardCaseInput): CaseLifecycleState | null {
  return isLifecycleState(input.lifecycleState) ? input.lifecycleState : null;
}

function priorityColorOf(input: DashboardCaseInput): PriorityColor {
  return computePriorityColor(parseUrgency(input.priorityUrgency), parseStake(input.priorityStake));
}

function storedExecution(input: DashboardCaseInput) {
  return {
    executionStep: input.executionStep ?? null,
    executionOwner: input.executionOwner ?? null,
    executionStatus: isExecutionStatus(input.executionStatus) ? input.executionStatus : null,
  };
}

function decisionStatusOf(input: DashboardCaseInput): DecisionStatus | undefined {
  if (input.analysisResult == null) return undefined;
  return parseDecisionStatus(input.analysisResult);
}

function determiningFactOf(input: DashboardCaseInput): string | null {
  const fact = analysisSection(input.analysisResult, SECTION_TITLES[2]);
  if (!fact || fact === RESOLVED_DETERMINING_FACT) return null;
  return fact;
}

function hasVisibleLifecycleSuggestion(input: DashboardCaseInput): boolean {
  const lifecycle = lifecycleOf(input);
  if (!lifecycle || lifecycle === "closed") return false;
  return Boolean(
    visibleLifecycleSuggestion(input.lifecycleSuggestion, {
      lifecycleState: lifecycle,
      blockerNote: input.blockerNote ?? null,
    }),
  );
}

function hasExecutionReview(input: DashboardCaseInput): boolean {
  const lifecycle = lifecycleOf(input);
  if (!lifecycle || lifecycle === "closed") return false;
  return executionNeedsReview(decisionStatusOf(input), storedExecution(input));
}

function hasMeaningfulOpenDecision(input: DashboardCaseInput): boolean {
  if (decisionStatusOf(input) === "resolved") return false;
  return determiningFactOf(input) !== null;
}

function isWaitingLifecycle(lifecycle: CaseLifecycleState | null): boolean {
  return lifecycle === "waiting_for_fact" || lifecycle === "waiting_for_third_party";
}

function isExecutingBucket(input: DashboardCaseInput): boolean {
  const lifecycle = lifecycleOf(input);
  return lifecycle === "executing" || storedExecution(input).executionStatus === "pending";
}

/**
 * Genuine now-attention. Default under_analysis is not enough.
 * Waiting-for-fact/third-party and ordinary execution stay secondary.
 */
export function isPrimaryAttentionCandidate(input: DashboardCaseInput): boolean {
  const lifecycle = lifecycleOf(input);
  if (lifecycle === "closed") return false;
  if (isWaitingLifecycle(lifecycle)) return false;
  if (isExecutingBucket(input) && !hasExecutionReview(input) && !hasVisibleLifecycleSuggestion(input)) {
    return false;
  }
  if (lifecycle === "waiting_for_principal") return true;
  if (priorityColorOf(input) === "red") return true;
  if (hasVisibleLifecycleSuggestion(input)) return true;
  if (hasExecutionReview(input)) return true;
  if (
    (lifecycle === "new" || lifecycle === "under_analysis" || lifecycle === null) &&
    hasMeaningfulOpenDecision(input) &&
    priorityColorOf(input) !== "unknown" &&
    priorityColorOf(input) !== "green"
  ) {
    return true;
  }
  return false;
}

/** Lower is stronger. Null = not a now candidate. */
export function primaryAttentionRank(input: DashboardCaseInput): number | null {
  if (!isPrimaryAttentionCandidate(input)) return null;
  if (lifecycleOf(input) === "waiting_for_principal") return 0;
  if (priorityColorOf(input) === "red") return 1;
  if (hasVisibleLifecycleSuggestion(input)) return 2;
  if (hasExecutionReview(input)) return 3;
  return 4;
}

function meaningfulUpdatedAt(input: DashboardCaseInput): number {
  return Math.max(
    asTime(input.updatedAt),
    asTime(input.lifecycleUpdatedAt),
    asTime(input.executionUpdatedAt),
  );
}

/**
 * Operational/secondary group. Closed always wins.
 * Now-attention is a separate ranked selection, not this classifier.
 */
export function classifyCaseForDashboard(input: DashboardCaseInput): DashboardGroup {
  const lifecycle = lifecycleOf(input);
  if (lifecycle === "closed") return "closed";
  if (isWaitingLifecycle(lifecycle)) return "waiting";
  if (isExecutingBucket(input)) return "executing";
  if (lifecycle === "monitoring") return "monitoring";
  return "other";
}

export function selectNowCases(cases: DashboardCaseInput[]): DashboardCaseInput[] {
  return cases
    .filter((caseItem) => isPrimaryAttentionCandidate(caseItem))
    .sort((a, b) => {
      const rank = (primaryAttentionRank(a) ?? 99) - (primaryAttentionRank(b) ?? 99);
      if (rank !== 0) return rank;
      const priority = PRIORITY_SORT_RANK[priorityColorOf(a)] - PRIORITY_SORT_RANK[priorityColorOf(b)];
      if (priority !== 0) return priority;
      const principalA = lifecycleOf(a) === "waiting_for_principal" ? 0 : 1;
      const principalB = lifecycleOf(b) === "waiting_for_principal" ? 0 : 1;
      if (principalA !== principalB) return principalA - principalB;
      return meaningfulUpdatedAt(b) - meaningfulUpdatedAt(a);
    })
    .slice(0, MAX_NOW_CASES);
}

/** Waiting owner comes only from stored fact-source roles. Never inferred from prose. */
export function deriveWaitingOwner(input: DashboardCaseInput): string | null {
  const owner = analysisRoles(input.analysisResult)[0]?.trim() || "";
  return owner || null;
}

function waitingStatusLine(kind: "факт" | "третью сторону", owner: string | null): string {
  const base = kind === "факт" ? "Ожидаем факт" : "Ожидаем третью сторону";
  return owner ? `${base} · ${owner}` : base;
}

export function deriveNowStatus(input: DashboardCaseInput): string | null {
  if (lifecycleOf(input) === "waiting_for_principal") return "Нужна позиция Principal";
  const color = priorityColorOf(input);
  if (color === "red") return "Срочно";
  if (color === "amber") return "Скоро";
  if (hasVisibleLifecycleSuggestion(input) || hasExecutionReview(input)) return "Нужно решение";
  return null;
}

export function deriveDashboardStatus(input: DashboardCaseInput): string | null {
  const lifecycle = lifecycleOf(input);
  const owner = deriveWaitingOwner(input);
  const execution = storedExecution(input);

  if (lifecycle === "closed") return "Закрыт";
  if (lifecycle === "waiting_for_principal") return "Нужна позиция Principal";
  if (lifecycle === "waiting_for_fact") return waitingStatusLine("факт", owner);
  if (lifecycle === "waiting_for_third_party") return waitingStatusLine("третью сторону", owner);
  if (lifecycle === "executing" || execution.executionStatus === "pending") {
    const executionOwner = execution.executionOwner?.trim() || "";
    return executionOwner ? `Исполняется · ${executionOwner}` : "Исполняется";
  }
  if (lifecycle === "monitoring") return "Мониторинг";
  return deriveNowStatus(input);
}

/** Prefer Determining Fact as the question that must be answered now. */
export function deriveFocusLine(input: DashboardCaseInput): string | null {
  return compactLine(
    determiningFactOf(input) ||
      input.blockerNote?.trim() ||
      analysisSection(input.analysisResult, SECTION_TITLES[1]),
  );
}

export function deriveDashboardContext(
  input: DashboardCaseInput,
  group: DashboardGroup = classifyCaseForDashboard(input),
): string | null {
  if (group === "executing") return compactLine(input.executionStep);
  if (group === "closed") {
    const fork = analysisSection(input.analysisResult, SECTION_TITLES[1]);
    const resolution = fork?.startsWith("Решение определено:") ? fork : null;
    return compactLine(resolution || input.executionStep);
  }
  return deriveFocusLine(input);
}

export function visibleDashboardReopen(
  input: DashboardCaseInput,
): StoredReopenSuggestion | null {
  if (lifecycleOf(input) !== "closed") return null;
  return visibleReopenSuggestion(input.reopenSuggestion, {
    lifecycleState: "closed",
    analysis: tryAnalysis(input.analysisResult),
  });
}

function comparePriorityThenRecency(a: DashboardCaseInput, b: DashboardCaseInput): number {
  const priority = PRIORITY_SORT_RANK[priorityColorOf(a)] - PRIORITY_SORT_RANK[priorityColorOf(b)];
  if (priority !== 0) return priority;
  return meaningfulUpdatedAt(b) - meaningfulUpdatedAt(a);
}

export function sortDashboardCases(
  group: DashboardGroup,
  cases: DashboardCaseInput[],
): DashboardCaseInput[] {
  const copy = [...cases];

  copy.sort((a, b) => {
    if (group === "waiting" || group === "monitoring" || group === "other") {
      return comparePriorityThenRecency(a, b);
    }

    if (group === "executing") {
      const pendingA = storedExecution(a).executionStatus === "pending" ? 0 : 1;
      const pendingB = storedExecution(b).executionStatus === "pending" ? 0 : 1;
      if (pendingA !== pendingB) return pendingA - pendingB;
      const priority = PRIORITY_SORT_RANK[priorityColorOf(a)] - PRIORITY_SORT_RANK[priorityColorOf(b)];
      if (priority !== 0) return priority;
      const executionTime = asTime(b.executionUpdatedAt) - asTime(a.executionUpdatedAt);
      if (executionTime !== 0) return executionTime;
      return meaningfulUpdatedAt(b) - meaningfulUpdatedAt(a);
    }

    return (
      asTime(b.lifecycleUpdatedAt) - asTime(a.lifecycleUpdatedAt) ||
      meaningfulUpdatedAt(b) - meaningfulUpdatedAt(a)
    );
  });

  return copy;
}

export function toDashboardCard(
  input: DashboardCaseInput,
  variant: "now" | "secondary" = "secondary",
): DashboardCard {
  const group = classifyCaseForDashboard(input);
  const reopen = visibleDashboardReopen(input);

  return {
    id: input.id,
    title: input.title,
    group,
    statusLine: variant === "now" ? deriveNowStatus(input) : deriveDashboardStatus(input),
    contextLine: variant === "now" ? deriveFocusLine(input) : deriveDashboardContext(input, group),
    priorityColor: priorityColorOf(input),
    reopenMarker: variant === "secondary" && reopen !== null,
    reopenContext: variant === "secondary" ? compactLine(reopen?.fork ?? null) : null,
  };
}

export function buildDashboardPortfolio(cases: DashboardCaseInput[]): DashboardPortfolio {
  const nowInputs = selectNowCases(cases);
  const nowIds = new Set(nowInputs.map((caseItem) => caseItem.id));

  const buckets: Record<DashboardGroup, DashboardCaseInput[]> = {
    waiting: [],
    executing: [],
    monitoring: [],
    other: [],
    closed: [],
  };

  for (const caseItem of cases) {
    if (nowIds.has(caseItem.id)) continue;
    buckets[classifyCaseForDashboard(caseItem)].push(caseItem);
  }

  return {
    now: nowInputs.map((caseItem) => toDashboardCard(caseItem, "now")),
    waiting: sortDashboardCases("waiting", buckets.waiting).map((caseItem) => toDashboardCard(caseItem)),
    executing: sortDashboardCases("executing", buckets.executing).map((caseItem) => toDashboardCard(caseItem)),
    monitoring: sortDashboardCases("monitoring", buckets.monitoring).map((caseItem) =>
      toDashboardCard(caseItem),
    ),
    other: sortDashboardCases("other", buckets.other).map((caseItem) => toDashboardCard(caseItem)),
    closed: sortDashboardCases("closed", buckets.closed).map((caseItem) => toDashboardCard(caseItem)),
  };
}

export function dashboardCounts(portfolio: DashboardPortfolio): Record<DashboardGroup, number> {
  return {
    waiting: portfolio.waiting.length,
    executing: portfolio.executing.length,
    monitoring: portfolio.monitoring.length,
    other: portfolio.other.length,
    closed: portfolio.closed.length,
  };
}

export function isSecondaryView(value: string | undefined): value is SecondaryView {
  return SECONDARY_VIEWS.includes(value as SecondaryView);
}

/** Existing Решения page. Home summary cells link here; they do not expand on `/`. */
export const DECISIONS_PATH = "/cases";

export const SECONDARY_VIEW_LABELS: Record<SecondaryView, string> = {
  waiting: "Ожидают",
  executing: "Исполняются",
  monitoring: "Мониторинг",
  other: "Другие открытые",
  closed: "Архив",
};

export function decisionsHref(view?: SecondaryView): string {
  return view ? `${DECISIONS_PATH}?view=${view}` : DECISIONS_PATH;
}

/** Default Решения list is all open cases. A view shows one operational group, including archive. */
export function listDecisionsCases(
  portfolio: DashboardPortfolio,
  view?: SecondaryView,
): DashboardCard[] {
  if (view) return portfolio[view];
  return [
    ...portfolio.now,
    ...portfolio.waiting,
    ...portfolio.executing,
    ...portfolio.monitoring,
    ...portfolio.other,
  ];
}
