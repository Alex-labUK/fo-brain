import type { AnalysisResult } from "@/core/orchestration/analysis-core";
import {
  RESOLVED_DETERMINING_FACT,
  SECTION_TITLES,
} from "@/core/orchestration/analysis-core";
import { isLifecycleState } from "@/lib/case-lifecycle";
import { derivePriorityLabel } from "@/lib/case-dashboard";
import type { DecisionCycleRecord } from "@/lib/decision-cycle";
import { type PriorityColor } from "@/lib/priority";

export function workspaceOperationalStatus(input: {
  lifecycleState: string;
  executionStatus?: string | null;
}): string {
  const lifecycle = isLifecycleState(input.lifecycleState) ? input.lifecycleState : null;
  if (lifecycle === "closed") return "Закрыт";
  if (input.executionStatus === "pending") return "Исполняется";
  if (lifecycle === "waiting_for_principal") return "Нужна позиция Principal";
  if (lifecycle === "waiting_for_fact") return "Ожидаем факт";
  if (lifecycle === "waiting_for_third_party") return "Ожидаем третью сторону";
  if (lifecycle === "executing") return "Исполняется";
  if (lifecycle === "monitoring") return "Мониторинг";
  if (lifecycle === "new") return "Новый";
  return "На анализе";
}

export function workspacePriorityLabel(color: PriorityColor): "Срочно" | "Скоро" | null {
  return derivePriorityLabel(color);
}

export function analysisSectionContent(
  analysis: AnalysisResult | null | undefined,
  title: string,
): string | null {
  const content = analysis?.sections.find((section) => section.title === title)?.content?.trim();
  return content || null;
}

export function workspaceOutcome(analysis: AnalysisResult | null | undefined): string | null {
  return analysisSectionContent(analysis, SECTION_TITLES[0]);
}

export function workspaceDecision(analysis: AnalysisResult | null | undefined): string | null {
  return analysisSectionContent(analysis, SECTION_TITLES[1]);
}

export function shouldShowDeterminingFact(analysis: AnalysisResult | null | undefined): boolean {
  if (!analysis || analysis.decisionStatus === "resolved") return false;
  const fact = analysisSectionContent(analysis, SECTION_TITLES[2]);
  return Boolean(fact && fact !== RESOLVED_DETERMINING_FACT);
}

export function workspaceDeterminingFact(analysis: AnalysisResult | null | undefined): string | null {
  if (!shouldShowDeterminingFact(analysis)) return null;
  return analysisSectionContent(analysis, SECTION_TITLES[2]);
}

export function workspaceNextStep(analysis: AnalysisResult | null | undefined): {
  owner: string | null;
  evidence: string | null;
  actions: string[];
} {
  const roles = analysis?.sections.find((section) => section.title === SECTION_TITLES[3])?.roleAssignments ?? [];
  const first = roles.find((assignment) => assignment.role.trim());
  const actions = (analysis?.sections.find((section) => section.title === SECTION_TITLES[4])?.actions ?? [])
    .map((action) => action.trim())
    .filter(Boolean)
    .slice(0, 3);
  const evidence = first?.result.trim() || null;
  const fact = workspaceDeterminingFact(analysis);

  return {
    owner: first?.role.trim() || null,
    evidence: fact && evidence === fact ? null : evidence,
    actions,
  };
}

export type PresentedNextStep = {
  primary: string | null;
  support: string | null;
  owner: string | null;
};

export function shouldShowFactGatheringNextStep(analysis: AnalysisResult | null | undefined): boolean {
  if (!analysis || analysis.decisionStatus === "resolved") return false;
  return Boolean(workspaceActionFirstNextStep(analysis).primary);
}

export function workspaceActionFirstNextStep(analysis: AnalysisResult | null | undefined): PresentedNextStep {
  const next = workspaceNextStep(analysis);
  return presentUnresolvedNextStep({
    fact: workspaceDeterminingFact(analysis),
    owner: next.owner,
    evidence: next.evidence,
    actions: next.actions,
  });
}

const GATHERING_VERBS = [
  "запросить",
  "получить",
  "проверить",
  "оценить",
  "уточнить",
  "выяснить",
  "подтвердить",
  "собрать",
  "узнать",
  "заказать",
];

const REQUEST_VERBS = ["запросить", "узнать", "выяснить", "уточнить"];

const PREPOSITIONS = new Set([
  "в",
  "во",
  "без",
  "для",
  "при",
  "с",
  "со",
  "на",
  "о",
  "об",
  "от",
  "по",
  "к",
  "ко",
  "у",
  "над",
  "под",
  "перед",
  "через",
]);

const ASPECT_WRAPPERS = [
  "оценку",
  "оценка",
  "заключение",
  "подтверждение",
  "информацию",
  "сведения",
  "ответ",
  "отчёт",
  "отчет",
];

const ASPECT_FILLERS = new Set([
  "какие",
  "какой",
  "какая",
  "какое",
  "каких",
  "необходимы",
  "необходим",
  "необходима",
  "необходимо",
  "нужны",
  "нужен",
  "нужна",
  "нужно",
]);

/** Presentation-only. Does not rewrite stored actions or AnalysisResult. */
export function presentUnresolvedNextStep(input: {
  fact: string | null;
  owner: string | null;
  evidence: string | null;
  actions: string[];
}): PresentedNextStep {
  const actions = input.actions.map((action) => action.trim()).filter(Boolean);
  const owner = input.owner?.trim() || null;
  const fact = input.fact?.trim() || null;
  const evidence = input.evidence?.trim() || null;

  if (actions.length === 0) {
    return { primary: null, support: null, owner };
  }

  const remaining = actions.slice(1);
  if (remaining.length === 0) {
    return {
      primary: displayPrimary(actions[0], fact, false),
      support: distinctSupport(evidence, actions[0]),
      owner,
    };
  }

  if (canCombineFactGatheringActions(actions, fact, owner)) {
    const primary = displayPrimary(actions[0], fact, true);
    const support = combinedSupportLine(actions, fact, owner);
    return {
      primary,
      support: support && !isSimilarWorkspaceText(support, primary) ? support : distinctSupport(evidence, primary),
      owner,
    };
  }

  return {
    primary: displayPrimary(actions[0], fact, false),
    support: remaining.map((action) => trimClause(action)).join(". "),
    owner,
  };
}

function canCombineFactGatheringActions(
  actions: string[],
  fact: string | null,
  owner: string | null,
): boolean {
  if (actions.length < 2) return false;
  return actions.every((action) => isRelatedFactGatheringAction(action, actions[0], fact, owner));
}

function isRelatedFactGatheringAction(
  action: string,
  first: string,
  fact: string | null,
  owner: string | null,
): boolean {
  if (!isGatheringAction(action)) return false;

  const tokens = contentTokens(action);
  if (tokens.length === 0) return false;
  const corpus = contentTokens(`${first} ${fact ?? ""}`).map(stemToken);
  const hits = tokens.map(stemToken).filter((item) => corpus.some((entry) => stemsOverlap(item, entry))).length;
  if (owner && mentionsOwner(action, owner) && hits >= 1) return true;
  if (hits >= 1) return true;
  return hits / tokens.length >= 0.3;
}

function isGatheringAction(action: string): boolean {
  const first = normalizeWorkspaceText(action).split(" ")[0] ?? "";
  return GATHERING_VERBS.includes(first);
}

function mentionsOwner(action: string, owner: string): boolean {
  return normalizeWorkspaceText(action).includes(normalizeWorkspaceText(owner));
}

function displayPrimary(action: string, fact: string | null, combining: boolean): string {
  let text = dropTrailingFactPhrases(trimClause(action), fact);
  if (combining) {
    text = unifyObtainVerb(text);
  }
  return text;
}

function trimClause(value: string): string {
  return value
    .split(/(?<=\.)\s+/)[0]
    .trim()
    .replace(/[.]+$/g, "");
}

function unifyObtainVerb(action: string): string {
  const match = action.match(/^(\S+)(\s+[\s\S]*)$/);
  if (!match) return action;
  const verb = normalizeWorkspaceText(match[1]);
  if (!REQUEST_VERBS.includes(verb)) return action;
  return `Получить${match[2]}`;
}

function dropTrailingFactPhrases(text: string, fact: string | null): string {
  if (!fact) return text;
  const factStems = new Set(contentTokens(fact).map(stemToken));
  const words = text.split(/\s+/);
  while (words.length > 4) {
    let prepIndex = -1;
    for (let index = words.length - 1; index >= 3; index -= 1) {
      if (PREPOSITIONS.has(normalizeWorkspaceText(words[index]))) {
        prepIndex = index;
        break;
      }
    }
    if (prepIndex < 3) break;
    const tail = words.slice(prepIndex);
    const tailContent = tail.filter((word) => !PREPOSITIONS.has(normalizeWorkspaceText(word)));
    const allInFact =
      tailContent.length > 0 &&
      tailContent.every((word) => factStems.has(stemToken(normalizeWorkspaceText(word))));
    if (!allInFact) break;
    words.length = prepIndex;
  }
  return words.join(" ");
}

function combinedSupportLine(actions: string[], fact: string | null, owner: string | null): string | null {
  const remainingAspects = actions
    .slice(1)
    .map((action) => extractActionAspect(action, fact, owner))
    .filter((aspect): aspect is string => Boolean(aspect));
  const firstAspect = extractActionAspect(actions[0], fact, owner);
  const aspects: string[] = [];
  if (firstAspect && contentTokens(firstAspect).length <= 3) {
    aspects.push(firstAspect);
  }
  for (const aspect of remainingAspects) {
    if (aspects.some((existing) => isSimilarWorkspaceText(existing, aspect))) continue;
    aspects.push(aspect);
  }
  if (aspects.length === 0) return null;
  return `Нужно подтвердить ${aspects.join(", ")}.`;
}

function extractActionAspect(action: string, fact: string | null, owner: string | null): string | null {
  let text = normalizeWorkspaceText(trimClause(action));
  const firstWord = text.split(" ")[0] ?? "";
  if (GATHERING_VERBS.includes(firstWord)) {
    text = text.slice(firstWord.length).trim();
  }
  if (owner) {
    text = stripOwnerFromText(text, owner);
  }
  const words = text.split(" ").filter(Boolean);
  const stripped = words.filter((word, index) => {
    if (index === 0 && ASPECT_WRAPPERS.includes(word)) return false;
    return !ASPECT_FILLERS.has(word);
  });
  let aspect = dropTrailingFactPhrases(stripped.join(" "), fact).trim();
  if (!aspect) return null;
  if (fact && contentTokens(aspect).every((token) => contentTokens(fact).some((item) => stemsOverlap(stemToken(token), stemToken(item))))) {
    aspect = stripped.filter((word) => !ASPECT_WRAPPERS.includes(word)).slice(0, 2).join(" ");
  }
  return aspect || null;
}

function stripOwnerFromText(text: string, owner: string): string {
  const ownerStem = stemToken(owner);
  if (!ownerStem) return text;
  const ownerWord = `${escapeRegExp(ownerStem)}[а-я]*`;
  return text
    .replace(new RegExp(`(?:^|\\s)(?:у|от|с)\\s+${ownerWord}(?=\\s|$)`, "g"), " ")
    .replace(new RegExp(`(?:^|\\s)${ownerWord}(?=\\s|$)`, "g"), " ")
    .replace(/\s+/g, " ")
    .trim();
}

function distinctSupport(candidate: string | null, primary: string): string | null {
  if (!candidate) return null;
  if (isSimilarWorkspaceText(candidate, primary)) return null;
  return trimClause(candidate);
}

function stemToken(value: string): string {
  const token = normalizeWorkspaceText(value);
  return token.length > 5 ? token.slice(0, 6) : token;
}

function stemsOverlap(left: string, right: string): boolean {
  if (!left || !right) return false;
  return left === right || left.startsWith(right) || right.startsWith(left);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const WORKSPACE_STOPWORDS = new Set([
  "для",
  "или",
  "как",
  "что",
  "это",
  "эта",
  "этот",
  "чтобы",
  "если",
  "при",
  "без",
  "над",
  "под",
  "после",
  "перед",
  "также",
  "быть",
  "будет",
  "может",
  "необходимо",
  "нужно",
  "получение",
  "подтверждение",
  "принятия",
  "решения",
]);

function normalizeWorkspaceText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[\s.,!?;:()[\]{}«»"'"`~@#$%^&*_+=|\\/<>—–-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function contentTokens(value: string): string[] {
  return normalizeWorkspaceText(value)
    .split(" ")
    .filter((token) => token.length > 3 && !WORKSPACE_STOPWORDS.has(token));
}

export function isSimilarWorkspaceText(left: string, right: string): boolean {
  const a = normalizeWorkspaceText(left);
  const b = normalizeWorkspaceText(right);
  if (!a || !b) return false;
  if (a === b || a.includes(b) || b.includes(a)) return true;
  return isRepetitiveWorkspaceExplanation(left, [right]);
}

export function isRepetitiveWorkspaceExplanation(reason: string, alreadyVisible: Array<string | null | undefined>): boolean {
  const candidate = reason.trim();
  if (!candidate) return true;

  const visible = alreadyVisible.map((item) => item?.trim()).filter((item): item is string => Boolean(item));
  if (visible.length === 0) return false;

  const normalizedReason = normalizeWorkspaceText(candidate);
  const corpus = normalizeWorkspaceText(visible.join(" "));
  if (corpus.includes(normalizedReason) || (normalizedReason.length > 24 && normalizedReason.includes(corpus))) {
    return true;
  }

  const tokens = contentTokens(candidate);
  if (tokens.length === 0) return true;
  const hits = tokens.filter((token) => corpus.includes(token)).length;
  return hits / tokens.length >= 0.6;
}

export function isHistoricalCompletedExecution(input: {
  decisionStatus?: string;
  executionStatus?: string | null;
  lifecycleState?: string;
}): boolean {
  if (input.executionStatus !== "completed") return false;
  if (input.lifecycleState === "closed") return true;
  return input.decisionStatus === "unresolved";
}

export type WorkspaceExecutionPlacement = "primary" | "quiet" | "history" | "none";

export function workspaceExecutionPlacement(input: {
  hasExecution: boolean;
  decisionStatus?: string;
  executionStatus?: string | null;
  lifecycleState?: string;
}): WorkspaceExecutionPlacement {
  if (!input.hasExecution) return "none";
  if (input.executionStatus === "pending") return "primary";
  if (isHistoricalCompletedExecution(input)) return "history";
  if (input.executionStatus === "completed") return "quiet";
  return "none";
}

export function previousCyclesLabel(count: number): string {
  if (count <= 0) return "";
  if (count === 1) return "1 цикл";
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return `${count} цикла`;
  }
  return `${count} циклов`;
}

export function previousCyclePreview(cycle: DecisionCycleRecord): {
  resolution: string | null;
  execution: string | null;
  closedAt: string | null;
} {
  let resolution: string | null = null;
  if (cycle.analysis && typeof cycle.analysis === "object" && cycle.analysis !== null && "sections" in cycle.analysis) {
    const sections = (cycle.analysis as { sections?: unknown }).sections;
    if (Array.isArray(sections)) {
      const fork = sections.find(
        (section) =>
          section &&
          typeof section === "object" &&
          "title" in section &&
          section.title === SECTION_TITLES[1] &&
          typeof (section as { content?: unknown }).content === "string",
      ) as { content?: string } | undefined;
      resolution = fork?.content?.trim() || null;
    }
  }

  return {
    resolution,
    execution: cycle.executionStep?.trim() || null,
    closedAt: cycle.closedAt,
  };
}

export function formatWorkspaceDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" });
}
