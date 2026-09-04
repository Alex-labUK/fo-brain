import {
  FORK_FACT_ACTIONS_RULES,
  RESOLVED_DETERMINING_FACT,
  SECTION_TITLES,
  forkLooksLikeActionMethods,
  normalizeAnalysisResult,
  unresolvedForkLooksLikeActionMethods,
  type AnalysisResult,
} from "@/core/orchestration/analysis-core";
import {
  analysisPromptThinkingAndRules,
  buildContinueUserPrompt,
} from "@/core/orchestration/analysis-ai";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function sectionContent(result: AnalysisResult, title: string): string {
  return result.sections.find((section) => section.title === title)?.content?.trim() || "";
}

function sectionActions(result: AnalysisResult) {
  return result.sections.find((section) => section.title === SECTION_TITLES[4])?.actions ?? [];
}

function rawSections(input: {
  outcome: string;
  fork: string;
  fact: string;
  sources?: { role: string; result: string }[];
  actions?: string[];
}) {
  return [
    { title: SECTION_TITLES[0], content: input.outcome },
    { title: SECTION_TITLES[1], content: input.fork },
    { title: SECTION_TITLES[2], content: input.fact },
    { title: SECTION_TITLES[3], roleAssignments: input.sources ?? [] },
    { title: SECTION_TITLES[4], actions: input.actions ?? [] },
  ];
}

const promptContract = analysisPromptThinkingAndRules();

assert(
  promptContract.includes("Fork–Fact–Actions") &&
    FORK_FACT_ACTIONS_RULES.includes("Провести экспертизу или ждать ответа") &&
    promptContract.includes("не методами сбора фактов") &&
    promptContract.includes("Не применяй этот тест, если decisionStatus = resolved"),
  "Prompt contract forbids method-vs-method forks and skips the test when resolved",
);
assert(
  promptContract.includes("перепиши Fork") && promptContract.includes("не просочилось ли действие в Fork"),
  "Prompt contract requires rewriting a leaked action-shaped fork before JSON",
);

const BAD_EXPERTISE_VS_WAIT =
  "Провести дополнительную экспертизу и оценку рисков или ожидать дальнейших указаний от муниципалитета.";
assert(
  forkLooksLikeActionMethods(BAD_EXPERTISE_VS_WAIT),
  "A: Russian expertise-vs-wait fork is action-shaped",
);
assert(
  forkLooksLikeActionMethods("Провести экспертизу или ждать ответа."),
  "A: short Russian expertise-vs-wait fork is action-shaped",
);
assert(
  forkLooksLikeActionMethods("conduct expert review vs wait for authority"),
  "A: English expert-review-vs-wait fork is action-shaped",
);
assert(
  forkLooksLikeActionMethods("Запросить документы или обратиться к юристу."),
  "A: request-vs-lawyer fork is action-shaped",
);

const badNormalized = normalizeAnalysisResult({
  decisionStatus: "unresolved",
  sections: rawSections({
    outcome: "Понять, создаёт ли повторное рассмотрение обязательства для собственника.",
    fork: BAD_EXPERTISE_VS_WAIT,
    fact: "Муниципалитет ещё не направил письменный перечень требований.",
    sources: [{ role: "Legal", result: "Письменное разъяснение муниципалитета." }],
    actions: ["Получить письменное разъяснение муниципалитета."],
  }),
});
assert(badNormalized.decisionStatus === "unresolved", "A: action-shaped fork is not hard-rejected");
assert(
  unresolvedForkLooksLikeActionMethods(badNormalized),
  "A: advisory helper flags the unresolved method-fork (prompt must rewrite it)",
);
assert(
  FORK_FACT_ACTIONS_RULES.includes("это Actions, не Fork") &&
    promptContract.includes("провести экспертизу или ждать"),
  "A: engine/prompt contract rejects expertise-vs-wait as preferred Fork reasoning",
);

const VALID_LIABILITY_FORK =
  "Новые требования муниципалитета создают для собственника существенные обязательства / риск либо дополнительных обязательств нет.";
const VALID_DETERMINING_FACT =
  "Требует ли муниципалитет от нового собственника дополнительной экспертизы, работ или иных обязательных действий.";

assert(
  !forkLooksLikeActionMethods(VALID_LIABILITY_FORK),
  "B: liability/risk vs no-obligation fork is a valid decision-route fork",
);

const validMunicipal = normalizeAnalysisResult({
  decisionStatus: "unresolved",
  sections: rawSections({
    outcome: "Понять, какие обязательства несёт новый собственник после сигнала муниципалитета.",
    fork: VALID_LIABILITY_FORK,
    fact: VALID_DETERMINING_FACT,
    sources: [
      { role: "Legal", result: "Юридическая оценка обязательности требований муниципалитета." },
    ],
    actions: [
      "получить письменное разъяснение муниципалитета",
      "получить юридическую оценку",
      "запросить перечень обязательных действий",
    ],
  }),
});

assert(validMunicipal.decisionStatus === "unresolved", "B: valid route fork normalizes");
assert(
  !unresolvedForkLooksLikeActionMethods(validMunicipal),
  "B: advisory helper does not flag a liability/risk fork",
);
assert(
  sectionContent(validMunicipal, SECTION_TITLES[1]).includes("обязательств"),
  "B: fork describes material obligations vs none",
);

assert(
  VALID_DETERMINING_FACT.toLowerCase().includes("требует") &&
    VALID_LIABILITY_FORK.includes("обязательств") &&
    promptContract.includes("факт выбирает маршрут"),
  "C: determining fact is the route selector between obligation and no-obligation",
);
assert(
  sectionContent(validMunicipal, SECTION_TITLES[2]) === VALID_DETERMINING_FACT,
  "C: fact asks whether the municipality requires extra expertise, works, or other obligatory steps",
);

const actions = sectionActions(validMunicipal);
assert(
  actions.some((action) => /получить письменное разъяснение/i.test(action)) &&
    actions.some((action) => /юридическ/i.test(action)) &&
    actions.some((action) => /запросить перечень/i.test(action)),
  "D: contact authority / legal opinion / request list stay in Actions",
);
assert(
  !forkLooksLikeActionMethods(sectionContent(validMunicipal, SECTION_TITLES[1])),
  "D: those methods did not leak into Main Decision Fork",
);

const resolved = normalizeAnalysisResult({
  decisionStatus: "resolved",
  sections: rawSections({
    outcome: "Завершить сделку в согласованный срок.",
    fork: "Решение определено: завершить сделку в согласованный срок.",
    fact: RESOLVED_DETERMINING_FACT,
    sources: [{ role: "Legal", result: "Повторно подтвердить отсутствие риска." }],
    actions: ["Завершить сделку в согласованный срок."],
  }),
});
assert(resolved.decisionStatus === "resolved", "E: resolved analysis stays resolved");
assert(
  sectionContent(resolved, SECTION_TITLES[1]).startsWith("Решение определено:"),
  "E: resolution statement is kept; not forced into a binary fork",
);
assert(
  sectionContent(resolved, SECTION_TITLES[2]) === RESOLVED_DETERMINING_FACT,
  "E: terminal determining-fact value is kept",
);
assert(
  !unresolvedForkLooksLikeActionMethods(resolved),
  "E: Fork–Fact action-shape check is skipped when resolved",
);
assert(
  !forkLooksLikeActionMethods(sectionContent(resolved, SECTION_TITLES[1])),
  "E: a resolution statement is not treated as a two-sided method fork",
);

const continuePrompt = buildContinueUserPrompt({
  facts: "Муниципалитет сообщил, что прежнее согласование может быть пересмотрено.",
  newMessage: "Пока неясно, должен ли собственник что-то делать.",
  history: [],
  currentFork: VALID_LIABILITY_FORK,
  currentDeterminingFact: VALID_DETERMINING_FACT,
  currentDecisionStatus: "unresolved",
  caseMemory: "- Муниципалитет допустил повторное рассмотрение прежнего согласования.",
});
assert(
  continuePrompt.includes("не парой методов") &&
    continuePrompt.includes("Не заменяй уже корректную маршрутную развилку") &&
    continuePrompt.includes("не применяй Fork–Fact–Actions и Past-Fact тесты"),
  "Continue prompt preserves route-forks and skips Fork–Fact validation when resolved",
);

console.log("Analysis fork–fact–actions test passed.");
