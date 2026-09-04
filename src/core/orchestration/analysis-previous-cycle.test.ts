import {
  MAX_FORK_REPAIR_CALLS,
  RESOLVED_DETERMINING_FACT,
  SECTION_TITLES,
  chooseRepairedAnalysisResult,
  normalizeAnalysisResult,
  type AnalysisResult,
} from "@/core/orchestration/analysis-core";
import {
  analysisPromptThinkingAndRules,
  buildContinueUserPrompt,
  buildForkRepairUserPrompt,
  buildUserPrompt,
} from "@/core/orchestration/analysis-ai";
import {
  appendDecisionCycle,
  buildDecisionCycleRecord,
  buildPreviousDecisionCycleContext,
  deriveReopenSuggestion,
  formatPreviousDecisionCyclePromptBlock,
  nextStoredReopenSuggestion,
  previousCycleConfirmedText,
  visibleReopenSuggestion,
} from "@/lib/decision-cycle";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function sectionContent(result: AnalysisResult, title: string): string {
  return result.sections.find((section) => section.title === title)?.content?.trim() || "";
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

const resolvedPurchase = normalizeAnalysisResult({
  decisionStatus: "resolved",
  sections: rawSections({
    outcome: "Завершить покупку объекта в согласованный срок.",
    fork: "Решение определено: покупка завершена.",
    fact: RESOLVED_DETERMINING_FACT,
    actions: ["Завершить сделку в согласованный срок."],
  }),
});

const history = appendDecisionCycle(
  [],
  buildDecisionCycleRecord({
    analysis: resolvedPurchase,
    execution: {
      executionStep: "Завершить сделку в согласованный срок.",
      executionOwner: "Legal",
      executionStatus: "completed",
    },
    executionUpdatedAt: "2026-08-20T12:00:00.000Z",
    closedAt: "2026-08-21T12:00:00.000Z",
  }),
);

const previous = buildPreviousDecisionCycleContext(history);
assert(previous !== null, "A: extracts the most recent completed cycle");
assert(previous?.decisionStatus === "resolved", "A: previous status is resolved");
assert(previous?.executionStatus === "completed", "A: previous execution is completed");
assert(previous?.closedAt !== null, "A: previous closedAt is kept");
assert(Boolean(previous?.resolutionStatement?.includes("покупка завершена")), "A: resolution statement kept");

const block = formatPreviousDecisionCyclePromptBlock(previous);
assert(block.includes("PREVIOUS COMPLETED DECISION CYCLE"), "A: dedicated historical section");
assert(block.includes("This cycle is historical and completed."), "A: cycle is marked historical");
assert(block.includes("Analyse only the NEW downstream uncertainty."), "A: new uncertainty only");
assert(!block.includes("PREVIOUS COMPLETED DECISION CYCLE\nPREVIOUS"), "A: only one cycle block, not full archive");

const continuePrompt = buildContinueUserPrompt({
  facts: "Покупка объекта состоялась.",
  history: [],
  newMessage: "Муниципалитет может наложить дополнительные обязательства после завершения покупки.",
  caseMemory: "- Покупка завершена.",
  currentFork: "Решение определено: покупка завершена.",
  currentDeterminingFact: RESOLVED_DETERMINING_FACT,
  currentDecisionStatus: "resolved",
  decisionCycleHistory: history,
});

assert(continuePrompt.includes("PREVIOUS COMPLETED DECISION CYCLE"), "A: continue prompt injects previous cycle");
assert(continuePrompt.includes("Execution status: completed"), "A: execution completed is in the prompt");
assert(
  continuePrompt.includes("что изменилось после завершённого решения?"),
  "A/H: new cycle starts from what changed after the completed decision",
);
assert(
  analysisPromptThinkingAndRules().includes("PREVIOUS COMPLETED DECISION CYCLE") &&
    analysisPromptThinkingAndRules().includes("не про срочность уже завершённого исторического действия"),
  "B: Priority rule is current uncertainty, not completed historical action",
);
assert(
  analysisPromptThinkingAndRules().includes("не предлагай завершить / отложить / подписать / оплатить"),
  "C: Reply must not repeat a completed historical action",
);

const generatePrompt = buildUserPrompt({
  whatHappened: "Муниципалитет может пересмотреть согласование после покупки.",
  decisionCycleHistory: history,
});
assert(generatePrompt.includes("PREVIOUS COMPLETED DECISION CYCLE"), "A: generate prompt also injects the cycle");

const actionShaped = normalizeAnalysisResult({
  decisionStatus: "unresolved",
  sections: rawSections({
    outcome: "Снизить пост-закрытиевые правовые риски.",
    fork: "Дождаться окончательного решения муниципалитета либо принять меры по минимизации рисков.",
    fact: "Потребуются ли дополнительные действия от нового собственника.",
    sources: [{ role: "Legal", result: "Письменное подтверждение муниципалитета." }],
    actions: ["запросить решение муниципалитета"],
  }),
});

const repairPrompt = buildForkRepairUserPrompt(actionShaped, {
  confirmedFacts: "Покупка объекта состоялась.",
  caseMemory: "- Покупка завершена.",
  currentMessage: "Муниципалитет может наложить обязательства.",
  schemaIsContinue: true,
  previousCycleBlock: block,
  previousCycleConfirmedText: previousCycleConfirmedText(previous),
});
assert(repairPrompt.includes("PREVIOUS COMPLETED DECISION CYCLE"), "D: repair receives previous-cycle context");
assert(
  repairPrompt.includes("Do not reconstruct the historical decision"),
  "D: repair must not return complete-vs-delay of the old cycle",
);

const completeVsDelay = normalizeAnalysisResult({
  decisionStatus: "unresolved",
  sections: rawSections({
    outcome: "Завершить покупку без правового риска.",
    fork: "Завершить сделку или отложить её завершение.",
    fact: "Готов ли муниципалитет к завершению сделки.",
    sources: [{ role: "Legal", result: "Статус сделки." }],
    actions: ["уточнить статус сделки"],
  }),
});
const rejectedHistoricalRepair = chooseRepairedAnalysisResult(actionShaped, completeVsDelay, {
  confirmedFacts: previousCycleConfirmedText(previous),
  caseMemory: "- Покупка завершена.",
  currentMessage: "Муниципалитет может наложить обязательства.",
});
assert(!rejectedHistoricalRepair.usedRepair, "D: complete-vs-delay repair is not accepted against completed cycle");

const correctionPrompt = buildContinueUserPrompt({
  facts: "Покупка объекта состоялась.",
  history: [],
  newMessage: "Предыдущее сообщение было ошибочным: сделка ещё не завершена.",
  caseMemory: "- Покупка завершена.",
  currentFork: "Решение определено: покупка завершена.",
  currentDeterminingFact: RESOLVED_DETERMINING_FACT,
  currentDecisionStatus: "resolved",
  decisionCycleHistory: history,
});
assert(
  correctionPrompt.includes("явно не исправляет или не заменяет этот факт") ||
    correctionPrompt.includes("historical record was wrong"),
  "E: explicit correction remains allowed",
);
const correctionChoice = chooseRepairedAnalysisResult(actionShaped, completeVsDelay, {
  caseMemory: "- Сделка завершена.",
  currentMessage: "Предыдущее сообщение было ошибочным: сделка ещё не завершена.",
});
assert(correctionChoice.usedRepair, "E: explicit correction may reopen completion-related routes");

const noHistoryContinue = buildContinueUserPrompt({
  facts: "Новый кейс без архива.",
  history: [],
  newMessage: "Нужно понять развилку.",
  caseMemory: "",
});
assert(
  !noHistoryContinue.includes("This cycle is historical and completed.") &&
    !noHistoryContinue.includes("Execution status: completed"),
  "F: no history omits the historical cycle block",
);
assert(buildPreviousDecisionCycleContext(undefined) === null, "F: missing history yields no context");
assert(formatPreviousDecisionCyclePromptBlock(null) === "", "F: empty block when there is no cycle");

const resolvedPrompt = buildContinueUserPrompt({
  facts: "Покупка завершена.",
  history: [],
  newMessage: "Готовим подписание. Новых обстоятельств нет.",
  caseMemory: "- Покупка завершена.",
  currentFork: "Решение определено: покупка завершена.",
  currentDeterminingFact: RESOLVED_DETERMINING_FACT,
  currentDecisionStatus: "resolved",
  decisionCycleHistory: history,
});
assert(resolvedPrompt.includes("не применяй Fork–Fact–Actions и Past-Fact тесты"), "G: resolved behavior unchanged");
assert(MAX_FORK_REPAIR_CALLS === 1, "G: still at most one repair call");

const downstream = normalizeAnalysisResult({
  decisionStatus: "unresolved",
  sections: rawSections({
    outcome: "Снизить пост-закрытиевые правовые и финансовые риски из-за пересмотра муниципалитета.",
    fork: "Пересмотр муниципалитета создаёт дополнительные обязательства / риск для собственника либо дополнительных обязательств нет.",
    fact: "Требует ли муниципалитет от нового собственника обязательных действий.",
    sources: [{ role: "Legal", result: "Оценка обязательности требований." }],
    actions: ["получить письменное разъяснение муниципалитета"],
  }),
});
assert(!/завершить сделк|отложить/.test(sectionContent(downstream, SECTION_TITLES[0])), "A: outcome is post-completion");
assert(
  sectionContent(downstream, SECTION_TITLES[1]).includes("обязательств"),
  "A: fork is owner obligations vs none",
);

const reopen = nextStoredReopenSuggestion({
  lifecycleState: "closed",
  previousDecisionStatus: "resolved",
  nextAnalysis: downstream,
  previousStored: null,
});
assert(reopen !== null && !reopen.dismissed, "H: reopen suggestion can appear");
assert(reopen!.fork.includes("обязательств"), "H: suggestion reads the new-cycle fork");
assert(
  visibleReopenSuggestion(reopen, { lifecycleState: "closed", analysis: downstream }) !== null,
  "H: card is visible while the case remains closed",
);
assert(
  visibleReopenSuggestion(reopen, { lifecycleState: "executing", analysis: downstream }) === null,
  "H: lifecycle stays human-controlled; suggestion is not applied as a state write",
);
assert(deriveReopenSuggestion(resolvedPurchase) === null, "H: resolved analysis still cannot derive reopen");

console.log("Analysis previous-cycle context test passed.");
