import {
  PAST_FACT_ROUTE_RULES,
  RESOLVED_DETERMINING_FACT,
  SECTION_TITLES,
  forkContradictsCompletedFacts,
  normalizeAnalysisResult,
  unresolvedForkContradictsCompletedFacts,
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
const COMPLETED_MEMORY = "- Сделка завершена.";
const INVALID_COMPLETION_FORK = "Завершить сделку или отложить её завершение.";
const VALID_DOWNSTREAM_FORK =
  "Повторное рассмотрение муниципалитета создаёт для нового собственника существенные обязательства / риск либо не требует дополнительных действий.";

assert(
  promptContract.includes("Past-Fact / Route Consistency") &&
    PAST_FACT_ROUTE_RULES.includes("завершить сделку или отложить завершение") &&
    promptContract.includes("вычеркни маршруты, которые уже невозможны") &&
    promptContract.includes("Fork–Fact–Actions применяй только после этого отсечения") &&
    promptContract.includes("Не применяй, если decisionStatus = resolved"),
  "Prompt contract forbids reconstructing completed events as live routes and skips the guard when resolved",
);

assert(
  forkContradictsCompletedFacts(INVALID_COMPLETION_FORK, COMPLETED_MEMORY),
  "A: completed-transaction vs complete-or-delay is inconsistent",
);
assert(
  forkContradictsCompletedFacts(
    "Завершить сделку после получения окончательного решения муниципалитета или отложить завершение сделки до устранения всех потенциальных рисков.",
    "Покупка завершена. Сделка завершена.",
  ),
  "A: live-case complete-or-delay fork is inconsistent with a completed purchase",
);

const invalidCompletion = normalizeAnalysisResult({
  decisionStatus: "unresolved",
  sections: rawSections({
    outcome: "Понять последствия сигнала муниципалитета для собственника.",
    fork: INVALID_COMPLETION_FORK,
    fact: "Муниципалитет ещё не подтвердил перечень обязательных действий.",
    sources: [{ role: "Legal", result: "Письменное разъяснение муниципалитета." }],
    actions: ["Получить письменное разъяснение муниципалитета."],
  }),
});
assert(invalidCompletion.decisionStatus === "unresolved", "A: inconsistent fork is not hard-rejected");
assert(
  unresolvedForkContradictsCompletedFacts(invalidCompletion, COMPLETED_MEMORY),
  "A: advisory helper flags complete-or-delay after the deal completed",
);

assert(
  !forkContradictsCompletedFacts(VALID_DOWNSTREAM_FORK, COMPLETED_MEMORY),
  "B: obligation vs no-obligation fork is consistent with a completed transaction",
);

const validDownstream = normalizeAnalysisResult({
  decisionStatus: "unresolved",
  sections: rawSections({
    outcome: "Понять, создаёт ли повторное рассмотрение обязательства для нового собственника.",
    fork: VALID_DOWNSTREAM_FORK,
    fact: "Требует ли муниципалитет от нового собственника дополнительной экспертизы, работ или иных обязательных действий.",
    sources: [{ role: "Legal", result: "Оценка обязательности требований муниципалитета." }],
    actions: ["получить письменное разъяснение муниципалитета", "получить юридическую оценку"],
  }),
});
assert(
  !unresolvedForkContradictsCompletedFacts(validDownstream, COMPLETED_MEMORY),
  "B: downstream municipal-obligation fork is not flagged",
);

assert(
  forkContradictsCompletedFacts("Pay now or wait.", "The payment was already made."),
  "C: pay-now-or-wait contradicts a completed payment",
);
assert(
  forkContradictsCompletedFacts("Оплатить сейчас или ждать.", "- Оплата произведена."),
  "C: Russian pay-now-or-wait contradicts оплата произведена",
);
assert(
  !forkContradictsCompletedFacts(
    "Оплата полностью закрыла обязательство либо остаточный риск сохраняется.",
    "- Оплата произведена.",
  ),
  "C: residual-liability fork remains valid after payment",
);

assert(
  forkContradictsCompletedFacts(
    "Sign now or renegotiate before signing.",
    "The contract has already been signed.",
  ),
  "D: sign-before-signing contradicts a signed contract",
);
assert(
  forkContradictsCompletedFacts("Подписать договор или передоговориться до подписания.", "- Договор подписан."),
  "D: Russian sign-or-renegotiate-before-signing is inconsistent",
);
assert(
  !forkContradictsCompletedFacts(
    "Подписанный договор оставляет сторону открытой к новому вопросу либо достаточно защищает её.",
    "- Договор подписан.",
  ),
  "D: exposure-vs-protection fork remains valid after signing",
);

const correctionMessage = "Предыдущее сообщение было ошибочным: сделка ещё не завершена.";
assert(
  !forkContradictsCompletedFacts(INVALID_COMPLETION_FORK, COMPLETED_MEMORY, correctionMessage),
  "E: explicit correction lets completion timing become a live route again",
);
assert(
  unresolvedForkContradictsCompletedFacts(invalidCompletion, COMPLETED_MEMORY) &&
    !unresolvedForkContradictsCompletedFacts(invalidCompletion, COMPLETED_MEMORY, correctionMessage),
  "E: helper skips the completed-deal guard when the current message supersedes memory",
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
assert(sectionContent(resolved, SECTION_TITLES[1]).startsWith("Решение определено:"), "F: resolution statement kept");
assert(
  !unresolvedForkContradictsCompletedFacts(resolved, COMPLETED_MEMORY),
  "F: Past-Fact guard is skipped when resolved",
);

const reopenContinuePrompt = buildContinueUserPrompt({
  facts: "Покупка объекта завершена. Сделка завершена.",
  history: [],
  newMessage:
    "Муниципалитет сообщил, что прежнее согласование может быть пересмотрено. Неясно, должен ли новый собственник что-то делать.",
  caseMemory: `${COMPLETED_MEMORY}\n- Кейс ранее закрыт после завершения покупки.`,
  currentFork: "Решение определено: покупка завершена.",
  currentDeterminingFact: RESOLVED_DETERMINING_FACT,
  currentDecisionStatus: "resolved",
});
assert(
  reopenContinuePrompt.includes("не реконструируй уже завершённое решение") &&
    reopenContinuePrompt.includes("новый цикл") &&
    PAST_FACT_ROUTE_RULES.includes("новый цикл решения"),
  "G: reopen/new-cycle prompt analyses the downstream issue, not the historical completed decision",
);
assert(
  unresolvedForkContradictsCompletedFacts(invalidCompletion, COMPLETED_MEMORY) &&
    !unresolvedForkContradictsCompletedFacts(validDownstream, COMPLETED_MEMORY),
  "G: closed completed decision + new municipal uncertainty must use the downstream fork, not complete-or-delay",
);

console.log("Analysis past-fact / route consistency test passed.");
