// Shared analysis types and utilities (no AI, no fallback templates).

export type AnalysisInput = {
  whatHappened: string;
  desiredOutcome: string;
};

export type RoleFactGroup = {
  role: string;
  questions: string[];
};

export type RoleAssignment = {
  role: string;
  tasksHeading?: string;
  tasks: string[];
  result: string;
};

export type DecisionScenario = {
  tone: "positive" | "negative" | "warning";
  conditions: string[];
  action: string;
};

export type AnalysisSection = {
  title: string;
  content?: string;
  facts?: string[];
  roleGroups?: RoleFactGroup[];
  roleAssignments?: RoleAssignment[];
  scenarios?: DecisionScenario[];
};

export type AnalysisResult = {
  sections: AnalysisSection[];
};

export const MAX_CRITICAL_FACTS = 5;
export const MAX_DECISION_SCENARIOS = 3;

export const SECTION_TITLES = [
  "Главная развилка",
  "Что нужно выяснить",
  "Кому поручить",
  "Если выяснится...",
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

export function flattenFacts(groups: RoleFactGroup[]): string[] {
  return groups.flatMap((group) => group.questions).slice(0, MAX_CRITICAL_FACTS);
}

export function countCriticalFacts(groups: RoleFactGroup[]): number {
  return groups.reduce((sum, group) => sum + group.questions.length, 0);
}

export function scenarioSymbol(tone: DecisionScenario["tone"]): string {
  switch (tone) {
    case "positive":
      return "✓";
    case "negative":
      return "✗";
    case "warning":
      return "⚠";
  }
}

export function limitRoleGroups(groups: RoleFactGroup[]): RoleFactGroup[] {
  const flattened: Array<{ role: string; question: string }> = [];
  for (const group of groups) {
    for (const question of group.questions) {
      flattened.push({ role: group.role, question: question.trim() });
    }
  }

  const limited = flattened.filter((item) => item.question.length > 0).slice(0, MAX_CRITICAL_FACTS);
  const byRole = new Map<string, string[]>();

  for (const item of limited) {
    const existing = byRole.get(item.role) ?? [];
    existing.push(item.question);
    byRole.set(item.role, existing);
  }

  return Array.from(byRole.entries()).map(([role, questions]) => ({ role, questions }));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseRoleGroups(raw: unknown): RoleFactGroup[] {
  if (!Array.isArray(raw)) return [];
  const groups: RoleFactGroup[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const role = typeof item.role === "string" ? item.role.trim() : "";
    const questions = Array.isArray(item.questions)
      ? item.questions.filter((q): q is string => typeof q === "string" && q.trim().length > 0)
      : [];
    if (role && questions.length > 0) {
      groups.push({ role, questions });
    }
  }
  return limitRoleGroups(groups);
}

function parseRoleAssignments(raw: unknown): RoleAssignment[] {
  if (!Array.isArray(raw)) return [];
  const assignments: RoleAssignment[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const role = typeof item.role === "string" ? item.role.trim() : "";
    const tasks = Array.isArray(item.tasks)
      ? item.tasks.filter((t): t is string => typeof t === "string" && t.trim().length > 0)
      : [];
    const result = typeof item.result === "string" ? item.result.trim() : "";
    const tasksHeading =
      typeof item.tasksHeading === "string" && item.tasksHeading.trim().length > 0
        ? item.tasksHeading.trim()
        : undefined;
    if (role && tasks.length > 0 && result) {
      assignments.push({ role, tasks, result, tasksHeading });
    }
  }
  return assignments;
}

function parseScenarios(raw: unknown): DecisionScenario[] {
  if (!Array.isArray(raw)) return [];
  const scenarios: DecisionScenario[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const tone = item.tone;
    if (tone !== "positive" && tone !== "negative" && tone !== "warning") continue;
    const conditions = Array.isArray(item.conditions)
      ? item.conditions.filter((c): c is string => typeof c === "string" && c.trim().length > 0)
      : [];
    const action = typeof item.action === "string" ? item.action.trim() : "";
    if (conditions.length > 0 && action) {
      scenarios.push({ tone, conditions, action });
    }
  }
  return scenarios.slice(0, MAX_DECISION_SCENARIOS);
}

export function collectAnalysisText(result: AnalysisResult): string {
  const parts: string[] = [];
  for (const section of result.sections) {
    if (section.content) parts.push(section.content);
    section.facts?.forEach((fact) => parts.push(fact));
    section.roleGroups?.forEach((group) => {
      group.questions.forEach((question) => parts.push(question));
    });
    section.roleAssignments?.forEach((assignment) => {
      parts.push(assignment.role);
      assignment.tasks.forEach((task) => parts.push(task));
      parts.push(assignment.result);
    });
    section.scenarios?.forEach((scenario) => {
      scenario.conditions.forEach((condition) => parts.push(condition));
      parts.push(scenario.action);
    });
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

  const forkSection = byTitle.get(SECTION_TITLES[0]);
  const factsSection = byTitle.get(SECTION_TITLES[1]);
  const ownersSection = byTitle.get(SECTION_TITLES[2]);
  const branchesSection = byTitle.get(SECTION_TITLES[3]);

  const fork = typeof forkSection?.content === "string" ? forkSection.content.trim() : "";
  if (!fork) throw new Error("Missing «Главная развилка» content");

  const roleGroups = parseRoleGroups(factsSection?.roleGroups);
  if (roleGroups.length === 0) throw new Error("Missing key questions");

  const roleAssignments = parseRoleAssignments(ownersSection?.roleAssignments);
  if (roleAssignments.length === 0) throw new Error("Missing assignments");

  const scenarios = parseScenarios(branchesSection?.scenarios);
  if (scenarios.length === 0) throw new Error("Missing scenarios");

  const result: AnalysisResult = {
    sections: [
      { title: SECTION_TITLES[0], content: fork },
      { title: SECTION_TITLES[1], roleGroups, facts: flattenFacts(roleGroups) },
      { title: SECTION_TITLES[2], roleAssignments },
      { title: SECTION_TITLES[3], scenarios },
    ],
  };

  if (containsForbiddenPhrase(collectAnalysisText(result))) {
    throw new Error("Analysis output contains forbidden generic phrasing");
  }

  return result;
}

export function countAnalysisCriticalFacts(result: AnalysisResult): number {
  const factsSection = result.sections.find((s) => s.title === SECTION_TITLES[1]);
  return factsSection?.facts?.length ?? countCriticalFacts(factsSection?.roleGroups ?? []);
}

export const ANALYSIS_INPUT_STORAGE_KEY = "fo-brain-analysis-input";
export const ANALYSIS_RESULT_STORAGE_KEY = "fo-brain-analysis-result";
