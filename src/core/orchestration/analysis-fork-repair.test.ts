import {
  MAX_FORK_REPAIR_CALLS,
  RESOLVED_DETERMINING_FACT,
  SECTION_TITLES,
  chooseRepairedAnalysisResult,
  normalizeAnalysisResult,
  shouldRepairActionShapedFork,
  type AnalysisResult,
} from "@/core/orchestration/analysis-core";
import {
  buildForkRepairUserPrompt,
  maybeRepairActionShapedFork,
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

const WAIT_VS_MEASURES =
  "Дождаться окончательного решения муниципалитета и оценить необходимость дополнительных действий либо принять меры по минимизации потенциальных рисков до получения решения.";
const WAIT_VS_MEASURES_EN = "wait for municipality vs take precautionary measures";
const REPAIRED_OBLIGATION_FORK =
  "Повторное рассмотрение муниципалитета создаёт для нового собственника существенные обязательства / риск либо не требует дополнительных действий.";
const DETERMINING_FACT =
  "Потребуются ли дополнительные действия от нового собственника после окончательного решения муниципалитета.";
const REPAIRED_COMPLETE_OR_DELAY =
  "Завершить сделку, если муниципалитет не требует дополнительных действий, либо отложить завершение сделки.";
const COMPLETED_CONTEXT = {
  confirmedFacts: "Сделка завершена. Покупка завершена.",
  caseMemory: "- Сделка завершена.",
  currentMessage: "Муниципалитет может пересмотреть согласование.",
};
const CORRECTION_CONTEXT = {
  confirmedFacts: "Сделка завершена.",
  caseMemory: "- Сделка завершена.",
  currentMessage: "Предыдущее сообщение было ошибочным: сделка ещё не завершена.",
};

const actionShaped = normalizeAnalysisResult({
  decisionStatus: "unresolved",
  sections: rawSections({
    outcome: "Понять обязательства нового собственника после сигнала муниципалитета.",
    fork: WAIT_VS_MEASURES,
    fact: DETERMINING_FACT,
    sources: [{ role: "Legal", result: "Письменное подтверждение решения муниципалитета." }],
    actions: [
      "запросить статус / решение муниципалитета",
      "получить письменное подтверждение",
    ],
  }),
});

const repairedGood = normalizeAnalysisResult({
  decisionStatus: "unresolved",
  sections: rawSections({
    outcome: "Понять обязательства нового собственника после сигнала муниципалитета.",
    fork: REPAIRED_OBLIGATION_FORK,
    fact: DETERMINING_FACT,
    sources: [{ role: "Legal", result: "Письменное подтверждение решения муниципалитета." }],
    actions: [
      "запросить статус / решение муниципалитета",
      "получить письменное подтверждение",
    ],
  }),
});

const repairedCompleteOrDelay = normalizeAnalysisResult({
  decisionStatus: "unresolved",
  sections: rawSections({
    outcome: "Понять обязательства нового собственника после сигнала муниципалитета.",
    fork: REPAIRED_COMPLETE_OR_DELAY,
    fact: DETERMINING_FACT,
    sources: [{ role: "Legal", result: "Письменное подтверждение решения муниципалитета." }],
    actions: ["запросить статус / решение муниципалитета"],
  }),
});

const validFirstPass = normalizeAnalysisResult({
  decisionStatus: "unresolved",
  sections: rawSections({
    outcome: "Понять, создаёт ли повторное рассмотрение обязательства.",
    fork: "municipality imposes material obligations on owner vs no additional obligations",
    fact: DETERMINING_FACT,
    sources: [{ role: "Legal", result: "Оценка обязательности требований." }],
    actions: ["получить письменное разъяснение муниципалитета"],
  }),
});

const resolved = normalizeAnalysisResult({
  decisionStatus: "resolved",
  sections: rawSections({
    outcome: "Завершить сделку в согласованный срок.",
    fork: "Решение определено: завершить сделку в согласованный срок.",
    fact: RESOLVED_DETERMINING_FACT,
    actions: ["Завершить сделку в согласованный срок."],
  }),
});

assert(MAX_FORK_REPAIR_CALLS === 1, "At most one repair call");
assert(shouldRepairActionShapedFork(actionShaped), "A: wait-vs-measures fork triggers repair");
assert(
  shouldRepairActionShapedFork({
    decisionStatus: "unresolved",
    sections: rawSections({
      outcome: "x",
      fork: WAIT_VS_MEASURES_EN,
      fact: DETERMINING_FACT,
      sources: [{ role: "Legal", result: "Status." }],
      actions: ["request status"],
    }),
  }),
  "A: English wait-vs-take-measures fork triggers repair",
);

const completedContextChoice = chooseRepairedAnalysisResult(
  actionShaped,
  repairedCompleteOrDelay,
  COMPLETED_CONTEXT,
);
assert(!completedContextChoice.usedRepair, "A: complete-vs-delay repair is rejected");
assert(completedContextChoice.reason === "repaired_past_fact", "A: rejection reason is Past-Fact");
assert(completedContextChoice.result === actionShaped, "A: original wait-vs-measures result remains active");

const chosenGood = chooseRepairedAnalysisResult(actionShaped, repairedGood, COMPLETED_CONTEXT);
assert(chosenGood.usedRepair, "B: repaired obligation fork is accepted");
assert(chosenGood.reason === "accepted", "B: acceptance reason");
assert(
  sectionContent(chosenGood.result, SECTION_TITLES[1]).includes("обязательств"),
  "B: accepted fork is municipality obligations vs none",
);

assert(!shouldRepairActionShapedFork(validFirstPass), "C: valid first-pass route fork does not trigger");
assert(
  chooseRepairedAnalysisResult(validFirstPass, repairedGood).usedRepair === false,
  "C: choose() does not replace a valid first-pass fork",
);

assert(!shouldRepairActionShapedFork(resolved), "D: resolved analysis never triggers repair");
assert(
  chooseRepairedAnalysisResult(resolved, repairedGood).usedRepair === false,
  "D: resolved original is kept even if a repaired fork is offered",
);

assert(
  chooseRepairedAnalysisResult(actionShaped, actionShaped, COMPLETED_CONTEXT).reason ===
    "repaired_action_shaped",
  "C: still action-shaped repair is rejected",
);
assert(
  chooseRepairedAnalysisResult(actionShaped, resolved, COMPLETED_CONTEXT).reason === "repaired_resolved",
  "D: unresolved → resolved repair is rejected",
);
assert(chooseRepairedAnalysisResult(actionShaped, null).usedRepair === false, "missing repair keeps original");

const correctionChoice = chooseRepairedAnalysisResult(
  actionShaped,
  repairedCompleteOrDelay,
  CORRECTION_CONTEXT,
);
assert(correctionChoice.usedRepair, "E: explicit correction may accept a completion-related live fork");
assert(correctionChoice.result === repairedCompleteOrDelay, "E: correction supersedes completed-deal memory");

const repairContext = {
  confirmedFacts: COMPLETED_CONTEXT.confirmedFacts,
  caseMemory: COMPLETED_CONTEXT.caseMemory,
  currentMessage: COMPLETED_CONTEXT.currentMessage,
  schemaIsContinue: true,
};

const repairPrompt = buildForkRepairUserPrompt(actionShaped, repairContext);
assert(repairPrompt.includes("The Determining Fact is the route selector."), "Repair prompt has rewrite contract");
assert(repairPrompt.includes("wait vs act"), "Repair prompt forbids wait vs act");
assert(repairPrompt.includes("Do not reconstruct a completed decision."), "G: repair must not rebuild completed deal");
assert(repairPrompt.includes("Сделка завершена."), "G: confirmed completed transaction is in the repair prompt");
assert(repairPrompt.includes(WAIT_VS_MEASURES), "Repair prompt includes the invalid fork");
assert(repairPrompt.includes(DETERMINING_FACT), "Repair prompt includes the determining fact");

const firstResponse = {
  result: actionShaped,
  caseMemory: "- Сделка завершена.",
  usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
};

void (async () => {
  let repairCalls = 0;
  const repairedOnce = await maybeRepairActionShapedFork(firstResponse, repairContext, async () => {
    repairCalls += 1;
    return {
      result: repairedGood,
      caseMemory: "- Сделка завершена.",
      usage: { prompt_tokens: 8, completion_tokens: 4, total_tokens: 12 },
    };
  });
  assert(repairCalls === MAX_FORK_REPAIR_CALLS, "A: repair path makes exactly one extra call");
  assert(
    sectionContent(repairedOnce.result, SECTION_TITLES[1]).includes("обязательств"),
    "B: maybeRepair accepts the obligation fork",
  );
  assert(repairedOnce.usage?.total_tokens === 27, "Repair usage is added to the first call");

  repairCalls = 0;
  const skippedValid = await maybeRepairActionShapedFork(
    { result: validFirstPass, caseMemory: "", usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 } },
    repairContext,
    async () => {
      repairCalls += 1;
      throw new Error("repair must not run");
    },
  );
  assert(repairCalls === 0, "C: valid first-pass makes no repair call");
  assert(skippedValid.result === validFirstPass, "C: original valid result is returned");

  repairCalls = 0;
  const skippedResolved = await maybeRepairActionShapedFork(
    { result: resolved, caseMemory: "", usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 } },
    repairContext,
    async () => {
      repairCalls += 1;
      throw new Error("repair must not run for resolved");
    },
  );
  assert(repairCalls === 0, "D: resolved analysis makes no repair call");

  repairCalls = 0;
  const stillBad = await maybeRepairActionShapedFork(firstResponse, repairContext, async () => {
    repairCalls += 1;
    return { result: actionShaped, caseMemory: firstResponse.caseMemory };
  });
  assert(repairCalls === 1, "C: still action-shaped repair is not retried");
  assert(stillBad.result === actionShaped, "C: first usable analysis is kept");

  repairCalls = 0;
  const pastFactRejected = await maybeRepairActionShapedFork(firstResponse, repairContext, async () => {
    repairCalls += 1;
    return { result: repairedCompleteOrDelay, caseMemory: firstResponse.caseMemory };
  });
  assert(repairCalls === 1, "A: Past-Fact rejection does not trigger another AI call");
  assert(pastFactRejected.result === actionShaped, "A: original remains after complete-vs-delay repair");

  repairCalls = 0;
  const invalidRepair = await maybeRepairActionShapedFork(firstResponse, repairContext, async () => {
    repairCalls += 1;
    throw new Error("OpenAI returned invalid JSON");
  });
  assert(repairCalls === 1, "F: invalid repair is not retried");
  assert(invalidRepair.result === actionShaped, "F: original usable analysis remains");

  const downstreamRepair = chooseRepairedAnalysisResult(actionShaped, repairedGood, COMPLETED_CONTEXT);
  assert(
    !/завершить сделк|отложить/.test(sectionContent(downstreamRepair.result, SECTION_TITLES[1])),
    "G: repaired fork concerns downstream obligations, not completing/delaying the deal",
  );

  console.log("Analysis fork-repair test passed.");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
