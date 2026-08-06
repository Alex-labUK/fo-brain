// Shared analysis types and utilities (no AI, no fallback templates).

export type AnalysisInput = {
  whatHappened: string;
  desiredOutcome: string;
};

export type RoleAssignment = {
  role: string;
  result: string;
};

export type DecisionScenario = {
  tone: "positive" | "negative" | "warning";
  action: string;
};

export type AnalysisSection = {
  title: string;
  content?: string;
  roleAssignments?: RoleAssignment[];
  actions?: string[];
  scenarios?: DecisionScenario[];
};

export type AnalysisResult = {
  sections: AnalysisSection[];
};

export const MAX_ACTIONS = 4;
export const MAX_DECISION_SCENARIOS = 3;

export const SECTION_TITLES = [
  "🎯 Outcome",
  "🌳 Main Decision Fork",
  "🔑 Determining Fact",
  "👤 Who can confirm this fact?",
  "📋 How do we obtain this fact?",
  "🔀 How the route changes afterwards",
] as const;

export const ROUTE_LABELS: Record<DecisionScenario["tone"], string> = {
  positive: "Факт подтверждён",
  negative: "Факт опровергнут",
  warning: "Определить невозможно",
};

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

export function scenarioSymbol(tone: DecisionScenario["tone"]): string {
  switch (tone) {
    case "positive":
      return "✅";
    case "negative":
      return "❌";
    case "warning":
      return "⚠";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseRoleAssignments(raw: unknown): RoleAssignment[] {
  if (!Array.isArray(raw)) return [];
  const assignments: RoleAssignment[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const role = typeof item.role === "string" ? item.role.trim() : "";
    const result = typeof item.result === "string" ? item.result.trim() : "";
    if (role && result) {
      assignments.push({ role, result });
    }
  }
  return assignments;
}

function parseActions(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .map((item) => item.trim())
    .slice(0, MAX_ACTIONS);
}

function parseScenarios(raw: unknown): DecisionScenario[] {
  if (!Array.isArray(raw)) return [];
  const scenarios: DecisionScenario[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const tone = item.tone;
    if (tone !== "positive" && tone !== "negative" && tone !== "warning") continue;
    const action = typeof item.action === "string" ? item.action.trim() : "";
    if (action) {
      scenarios.push({ tone, action });
    }
  }
  return scenarios.slice(0, MAX_DECISION_SCENARIOS);
}

export function collectAnalysisText(result: AnalysisResult): string {
  const parts: string[] = [];
  for (const section of result.sections) {
    if (section.content) parts.push(section.content);
    section.roleAssignments?.forEach((assignment) => {
      parts.push(assignment.role);
      parts.push(assignment.result);
    });
    section.actions?.forEach((action) => parts.push(action));
    section.scenarios?.forEach((scenario) => {
      parts.push(ROUTE_LABELS[scenario.tone]);
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

function requireContent(section: Record<string, unknown> | undefined, name: string): string {
  const content = typeof section?.content === "string" ? section.content.trim() : "";
  if (!content) throw new Error(`Missing content for ${name}`);
  return content;
}

function normalizeRoutes(scenarios: DecisionScenario[]): DecisionScenario[] {
  const byTone = new Map<DecisionScenario["tone"], DecisionScenario>();
  for (const scenario of scenarios) {
    if (!byTone.has(scenario.tone)) {
      byTone.set(scenario.tone, scenario);
    }
  }

  const ordered: DecisionScenario[] = [];
  for (const tone of ["positive", "negative", "warning"] as const) {
    const scenario = byTone.get(tone);
    if (scenario) ordered.push(scenario);
  }

  if (ordered.length !== MAX_DECISION_SCENARIOS) {
    throw new Error("Must contain exactly three decision routes");
  }

  return ordered;
}

/** Normalizes raw AI JSON into the canonical six-section AnalysisResult. */
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

  const outcome = requireContent(byTitle.get(SECTION_TITLES[0]), SECTION_TITLES[0]);
  const fork = requireContent(byTitle.get(SECTION_TITLES[1]), SECTION_TITLES[1]);
  const determiningFact = requireContent(byTitle.get(SECTION_TITLES[2]), SECTION_TITLES[2]);

  const roleAssignments = parseRoleAssignments(byTitle.get(SECTION_TITLES[3])?.roleAssignments);
  if (roleAssignments.length === 0) throw new Error("Missing fact sources");

  const actions = parseActions(byTitle.get(SECTION_TITLES[4])?.actions);
  if (actions.length === 0) throw new Error("Missing actions to obtain the fact");

  const scenarios = normalizeRoutes(parseScenarios(byTitle.get(SECTION_TITLES[5])?.scenarios));

  const result: AnalysisResult = {
    sections: [
      { title: SECTION_TITLES[0], content: outcome },
      { title: SECTION_TITLES[1], content: fork },
      { title: SECTION_TITLES[2], content: determiningFact },
      { title: SECTION_TITLES[3], roleAssignments },
      { title: SECTION_TITLES[4], actions },
      { title: SECTION_TITLES[5], scenarios },
    ],
  };

  if (containsForbiddenPhrase(collectAnalysisText(result))) {
    throw new Error("Analysis output contains forbidden generic phrasing");
  }

  return result;
}

export function countAnalysisActions(result: AnalysisResult): number {
  const actionsSection = result.sections.find((s) => s.title === SECTION_TITLES[4]);
  return actionsSection?.actions?.length ?? 0;
}

export const ANALYSIS_INPUT_STORAGE_KEY = "fo-brain-analysis-input";
export const ANALYSIS_RESULT_STORAGE_KEY = "fo-brain-analysis-result";

/** @deprecated Use countAnalysisActions */
export function countAnalysisCriticalFacts(result: AnalysisResult): number {
  return countAnalysisActions(result);
}
