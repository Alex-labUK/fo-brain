import {
  RESOLVED_DETERMINING_FACT,
  SECTION_TITLES,
  decisionStatusLabel,
  isResolvedAnalysis,
  normalizeAnalysisResult,
  parseDecisionStatus,
  type AnalysisResult,
} from "@/core/orchestration/analysis-core";
import { buildContinueUserPrompt } from "@/core/orchestration/analysis-ai";
import {
  buildLifecycleSuggestionSystemPrompt,
  buildLifecycleSuggestionUserPrompt,
} from "@/core/orchestration/lifecycle-suggestion";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function sectionContent(result: AnalysisResult, title: string): string {
  return result.sections.find((section) => section.title === title)?.content?.trim() || "";
}

function sectionAssignments(result: AnalysisResult) {
  return result.sections.find((section) => section.title === SECTION_TITLES[3])?.roleAssignments ?? [];
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

function expectThrows(fn: () => void, match: string, message: string): void {
  try {
    fn();
  } catch (error) {
    const text = error instanceof Error ? error.message : String(error);
    assert(text.includes(match), `${message}: expected "${match}", got "${text}"`);
    return;
  }
  throw new Error(`${message}: expected to throw`);
}

const unresolvedLegal = normalizeAnalysisResult({
  decisionStatus: "unresolved",
  sections: rawSections({
    outcome: "Понять, можно ли завершать сделку без правового риска.",
    fork: "Завершать сделку сейчас — или ждать подтверждения правового статуса объекта.",
    fact: "Правовой статус объекта не установлен.",
    sources: [{ role: "Legal", result: "Письменное заключение о правовом статусе объекта." }],
    actions: ["Запросить у юриста заключение о правовом статусе объекта."],
  }),
});

assert(unresolvedLegal.decisionStatus === "unresolved", "A: decisionStatus = unresolved");
assert(!isResolvedAnalysis(unresolvedLegal), "A: isResolvedAnalysis is false");
assert(
  sectionContent(unresolvedLegal, SECTION_TITLES[1]).includes("правового статуса"),
  "A: real fork remains",
);
assert(
  sectionContent(unresolvedLegal, SECTION_TITLES[2]) === "Правовой статус объекта не установлен.",
  "A: real determining fact remains",
);
assert(sectionAssignments(unresolvedLegal).length === 1, "A: fact owner required");
assert(sectionActions(unresolvedLegal).length === 1, "A: fact-gathering action required");
assert(decisionStatusLabel(unresolvedLegal.decisionStatus) === "Решение ещё не определено", "A: label");

const resolvedExecuting = normalizeAnalysisResult({
  decisionStatus: "resolved",
  sections: rawSections({
    outcome: "Завершить сделку в согласованный срок.",
    fork: "Решение определено: завершить сделку в согласованный срок.",
    fact: RESOLVED_DETERMINING_FACT,
    sources: [{ role: "Legal", result: "Повторно подтвердить отсутствие правового риска." }],
    actions: ["Завершить сделку в согласованный срок."],
  }),
});

assert(resolvedExecuting.decisionStatus === "resolved", "B: decisionStatus = resolved");
assert(isResolvedAnalysis(resolvedExecuting), "B: isResolvedAnalysis is true");
assert(
  sectionContent(resolvedExecuting, SECTION_TITLES[1]).startsWith("Решение определено:"),
  "B: fork is a resolution statement, not a binary fork",
);
assert(
  sectionContent(resolvedExecuting, SECTION_TITLES[2]) === RESOLVED_DETERMINING_FACT,
  "B: no invented determining fact",
);
assert(sectionAssignments(resolvedExecuting).length === 0, "B: fact owners omitted when resolved");
assert(
  sectionActions(resolvedExecuting).join(" ").includes("Завершить сделку"),
  "B: execution step remains",
);
assert(decisionStatusLabel(resolvedExecuting.decisionStatus) === "Решение определено", "B: label");

const resolvedComplete = normalizeAnalysisResult({
  decisionStatus: "resolved",
  sections: rawSections({
    outcome: "Сделка завершена в согласованный срок.",
    fork: "Решение определено: сделка завершена.",
    fact: RESOLVED_DETERMINING_FACT,
    actions: [],
  }),
});

assert(resolvedComplete.decisionStatus === "resolved", "C: decisionStatus = resolved");
assert(sectionAssignments(resolvedComplete).length === 0, "C: no fact owners");
assert(sectionActions(resolvedComplete).length === 0, "C: no leftover fact-gathering actions");

const missingStatus = normalizeAnalysisResult({
  sections: rawSections({
    outcome: "Понять правовой статус.",
    fork: "Закрывать сделку — или ждать юридическое заключение.",
    fact: "Правовой статус объекта не установлен.",
    sources: [{ role: "Legal", result: "Заключение о статусе." }],
    actions: ["Запросить заключение юриста."],
  }),
});
assert(missingStatus.decisionStatus === "unresolved", "Missing decisionStatus defaults to unresolved");
assert(parseDecisionStatus({ decisionStatus: "closed" }) === "unresolved", "Invalid status defaults to unresolved");
assert(parseDecisionStatus("resolved") === "unresolved", "Non-object defaults to unresolved");

expectThrows(
  () =>
    normalizeAnalysisResult({
      decisionStatus: "unresolved",
      sections: rawSections({
        outcome: "Понять правовой статус.",
        fork: "Закрывать сделку — или ждать юридическое заключение.",
        fact: "Правовой статус объекта не установлен.",
        actions: ["Запросить заключение юриста."],
      }),
    }),
  "Missing fact sources",
  "Unresolved analysis still requires sources",
);

expectThrows(
  () =>
    normalizeAnalysisResult({
      decisionStatus: "unresolved",
      sections: rawSections({
        outcome: "Понять правовой статус.",
        fork: "Закрывать сделку — или ждать юридическое заключение.",
        fact: "Правовой статус объекта не установлен.",
        sources: [{ role: "Legal", result: "Заключение о статусе." }],
      }),
    }),
  "Missing actions to obtain the fact",
  "Unresolved analysis still requires actions",
);

const principalMemory = [
  "- Принципал подтвердил намерение завершить сделку",
  "- Юрист подтвердил отсутствие существенного правового риска",
  "- Эксперт выдал положительное техническое заключение",
  "- Дополнительные работы не требуются",
].join("\n");

const lifecycleSystem = buildLifecycleSuggestionSystemPrompt();
assert(lifecycleSystem.includes("decisionStatus разбора ≠ закрытие кейса"), "D: resolved ≠ closed");
assert(
  lifecycleSystem.includes("resolved + согласованные действия ещё идут → executing"),
  "D: resolved executing guidance",
);
assert(
  lifecycleSystem.includes("resolved + не осталось материального шага → closed"),
  "D: resolved complete can be closed",
);
assert(
  lifecycleSystem.includes("не предлагай waiting_for_principal"),
  "D: prompt forbids waiting_for_principal when Principal already decided",
);

const executingSuggestionPrompt = buildLifecycleSuggestionUserPrompt({
  lifecycleState: "executing",
  blockerType: "execution",
  blockerNote: "Завершение сделки",
  caseMemory: principalMemory,
  analysis: resolvedExecuting,
});
assert(executingSuggestionPrompt.includes("decisionStatus разбора: resolved"), "B/D: suggestion sees resolved");
assert(executingSuggestionPrompt.includes("Принципал подтвердил намерение"), "D: suggestion sees Principal approval");
assert(!executingSuggestionPrompt.includes("waiting_for_principal"), "B: unresolved principal-wait is not implied");

const closedSuggestionPrompt = buildLifecycleSuggestionUserPrompt({
  lifecycleState: "executing",
  blockerType: "execution",
  blockerNote: "Завершение сделки",
  caseMemory: `${principalMemory}\n- Сделка завершена в согласованный срок`,
  analysis: resolvedComplete,
});
assert(closedSuggestionPrompt.includes("decisionStatus разбора: resolved"), "C: suggestion sees resolved");
assert(closedSuggestionPrompt.includes("Actions:\n—") || closedSuggestionPrompt.includes("Actions:\n-"), "C: empty actions visible to suggestion");

const continuePrompt = buildContinueUserPrompt({
  facts: "Объект проверен. Принципал подтвердил намерение завершить сделку.",
  history: [],
  newMessage: "Готовим подписание. Новых обстоятельств нет.",
  caseMemory: principalMemory,
  currentFork: "Решение определено: завершить сделку в согласованный срок.",
  currentDeterminingFact: RESOLVED_DETERMINING_FACT,
  currentDecisionStatus: "resolved",
});
assert(continuePrompt.includes("Текущий decisionStatus разбора"), "D: continue prompt carries decisionStatus");
assert(continuePrompt.includes("resolved"), "D: continue prompt sees resolved");
assert(
  continuePrompt.includes("не ставь unresolved ради ожидания решения принципала"),
  "D: continue prompt must not wait for a Principal decision already in memory",
);
assert(
  !continuePrompt.includes("Determining Fact должен смениться") &&
    !continuePrompt.includes("Determining Fact must change"),
  "D: continue prompt must not force a next determining fact",
);
assert(
  continuePrompt.includes("не изобретай следующий факт"),
  "D: continue prompt forbids inventing the next fact",
);

console.log("Analysis resolution test passed.");
