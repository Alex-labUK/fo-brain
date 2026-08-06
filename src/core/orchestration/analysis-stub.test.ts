import {
  containsForbiddenPhrase,
  countAnalysisActions,
  generateAnalysisStub,
  isForbiddenMainQuestion,
  SECTION_TITLES,
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
assert(titles.length === 5, "Must have 5 sections");
assert(titles[0] === SECTION_TITLES[0], "Outcome section");
assert(titles[1] === SECTION_TITLES[1], "Fork section");
assert(titles[2] === SECTION_TITLES[2], "Determining fact section");
assert(titles[3] === SECTION_TITLES[3], "Sources section");
assert(titles[4] === SECTION_TITLES[4], "Actions section");

const outcome = leakAnalysis.sections[0].content ?? "";
assert(outcome.length > 0 && !outcome.includes("\n"), "Outcome is one sentence");

const mainFork = leakAnalysis.sections[1].content ?? "";
assert(mainFork.includes("гарантий"), "Fork must describe warranty decision");
assert(!isForbiddenMainQuestion(mainFork), "No forbidden templates");
assert(!containsForbiddenPhrase(mainFork), "No forbidden phrases in fork");

const determiningFact = leakAnalysis.sections[2].content ?? "";
assert(determiningFact.length > 0, "One determining fact required");
assert(!determiningFact.includes("?"), "Determining fact is not a question");

const sources = leakAnalysis.sections[3].roleAssignments ?? [];
assert(sources.some((s) => s.role === "Legal"), "Legal role must be present");
assert(
  sources.some((s) => /house manager|technical|engineer/i.test(s.role)),
  "House Manager or technical role must be present",
);
assert(sources.every((s) => s.result.length > 0), "Sources return values only");

const actions = leakAnalysis.sections[4].actions ?? [];
assert(actions.length >= 1 && actions.length <= 4, "Max four actions");
assert(actions.every((a) => !a.includes("?")), "Actions are not questions");
assert(countAnalysisActions(leakAnalysis) <= 4, "Max 4 actions");

const leakText = JSON.stringify(leakAnalysis).toLowerCase();
assert(leakText.includes("гарант"), "Warranty in analysis");
assert(leakText.includes("технич"), "Technical cause in analysis");

const tripOnly = generateAnalysisStub(
  {
    whatHappened: "Принципал попросил забронировать отель в Милане на следующую неделю.",
    desiredOutcome: "Подтверждённое бронирование без переплаты.",
  },
  [],
);
assert(tripOnly.sections.length === 5, "Generic case has 5 sections");
assert(countAnalysisActions(tripOnly) <= 4, "Max 4 actions for any case");
assert(!(tripOnly.sections[1].content ?? "").includes("ребён"), "No child without input");
assert(!containsForbiddenPhrase(JSON.stringify(tripOnly)), "No forbidden phrases in trip case");

const leakWithoutOutcome = generateAnalysisStub({ whatHappened: LEAK_FACTS }, []);
assert(leakWithoutOutcome.sections.length === 5, "Works without desiredOutcome");
assert((leakWithoutOutcome.sections[0].content ?? "").length > 0, "Outcome without desiredOutcome");

assert(leakAnalysis.priority?.urgency === "soon", "Fallback priority urgency");
assert(leakAnalysis.priority?.stake === "moderate", "Fallback priority stake");
assert(Boolean(leakAnalysis.priority?.note), "Fallback priority note");
assert(Boolean(leakAnalysis.reply), "Fallback reply");

console.log("Analysis stub test passed.");
