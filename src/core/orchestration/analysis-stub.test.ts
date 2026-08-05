import {
  containsForbiddenPhrase,
  countAnalysisCriticalFacts,
  generateAnalysisStub,
  isForbiddenMainQuestion,
} from "@/core/orchestration/analysis-stub";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

const LEAK_FACTS = `В доме принципала повторно появилась протечка через дымоход в том же месте, где полгода назад другой подрядчик делал ремонт кровли. House manager сообщил, что течь усилилась после дождя. Подрядчик прошлого ремонта предлагает бесплатно устранить дефект, но требует письменного согласия.`;
const LEAK_OUTCOME = `Устранить протечку окончательно и понять, кто оплачивает работы — семья или подрядчик по гарантии.`;

const leakAnalysis = generateAnalysisStub(
  { whatHappened: LEAK_FACTS, desiredOutcome: LEAK_OUTCOME },
  [],
);

const titles = leakAnalysis.sections.map((s) => s.title);
assert(titles.length === 4, "Must have 4 sections");
assert(titles[0] === "Главная развилка", "First section");
assert(titles[1] === "Что нужно выяснить", "Second section");
assert(titles[2] === "Кому поручить", "Third section");
assert(titles[3] === "Если выяснится...", "Fourth section");

const mainFork = leakAnalysis.sections[0].content ?? "";
assert(
  mainFork.includes("Можно ли уже сейчас признать случай гарантийным"),
  "Fork must describe a decision point",
);
assert(!isForbiddenMainQuestion(mainFork), "No forbidden templates");
assert(!containsForbiddenPhrase(mainFork), "No forbidden phrases in fork");

const factCount = countAnalysisCriticalFacts(leakAnalysis);
assert(factCount === 5, `Must have exactly 5 critical facts, got ${factCount}`);

const facts = leakAnalysis.sections[1].facts ?? [];
assert(facts.length === 5, "Five flat facts");
assert(facts.some((f) => /гарант/i.test(f)), "Warranty applicability question included");
assert(
  facts.some((f) => /технич|причин/i.test(f)),
  "Technical cause question included",
);

const assignments = leakAnalysis.sections[2].roleAssignments ?? [];
assert(
  assignments.some((a) => a.role === "Legal"),
  "Legal role must be assigned",
);
assert(
  assignments.some((a) => /house manager|technical/i.test(a.role)),
  "House Manager or Technical role must be assigned",
);
assert(
  assignments.some((a) => a.role === "House Manager" && a.tasks[0].includes("дымохода")),
  "Chimney repair history",
);
assert(
  assignments.some((a) => a.role === "Legal" && a.tasksHeading === "Проверить"),
  "Legal check heading",
);
assert(
  assignments.some((a) => a.role === "Legal" && a.result.includes("Юридическое заключение")),
  "Legal result",
);

const scenarios = leakAnalysis.sections[3].scenarios ?? [];
assert(scenarios.length <= 3, "Max 3 scenarios");
assert(
  scenarios.some(
    (s) =>
      s.tone === "warning" &&
      (/ответствен/i.test(s.action) || /договор/i.test(s.action)) &&
      /технич|причин|дефект/i.test(s.action),
  ),
  "Must prohibit accepting responsibility before contract and technical cause check",
);

const leakText = JSON.stringify(leakAnalysis).toLowerCase();
assert(leakText.includes("гарант"), "Warranty check in full analysis");
assert(leakText.includes("технич"), "Technical cause in full analysis");

const tripOnly = generateAnalysisStub(
  {
    whatHappened: "Принципал попросил забронировать отель в Милане на следующую неделю.",
    desiredOutcome: "Подтверждённое бронирование без переплаты.",
  },
  [],
);
assert(countAnalysisCriticalFacts(tripOnly) <= 5, "Max 5 facts for any case");
assert(!(tripOnly.sections[0].content ?? "").includes("ребён"), "No child without input");
assert(!containsForbiddenPhrase(JSON.stringify(tripOnly)), "No forbidden phrases in trip case");

console.log("Analysis stub test passed.");
