import { readFileSync } from "fs";
import path from "path";
import {
  RESOLVED_DETERMINING_FACT,
  SECTION_TITLES,
  normalizeAnalysisResult,
} from "@/core/orchestration/analysis-core";
import { analysisCycleKey, deriveReopenSuggestion } from "@/lib/decision-cycle";
import {
  ATTENTION_ACTION_LABEL,
  ATTENTION_EMPTY_COPY,
  ATTENTION_HEADLINES,
  PRINCIPAL_CAPTURE_RETRY_HEADLINE,
  STATE_REVIEW_DETAILS,
  deriveDecisionAttentionItem,
  deriveDecisionAttentionQueue,
  sortDecisionAttentionItems,
  type AttentionCaseInput,
} from "@/lib/decision-attention";
import { deriveRegisterStatus, type DashboardCaseInput } from "@/lib/case-dashboard";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

const root = process.cwd();
const helper = readFileSync(path.join(root, "src/lib/decision-attention.ts"), "utf8");
const inboxUi = readFileSync(path.join(root, "src/components/DecisionInbox.tsx"), "utf8");
const home = readFileSync(path.join(root, "src/app/page.tsx"), "utf8");
const schema = readFileSync(path.join(root, "prisma/schema.prisma"), "utf8");
const registerPage = readFileSync(path.join(root, "src/app/cases/page.tsx"), "utf8");
const dashboard = readFileSync(path.join(root, "src/lib/case-dashboard.ts"), "utf8");

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

const QUESTION = "Готовы ли мы принять остаточный юридический риск ради завершения сделки?";
const FACT = "Потребуются ли обязательные действия от нового собственника.";

const unresolvedFact = normalizeAnalysisResult({
  decisionStatus: "unresolved",
  sections: rawSections({
    outcome: "Снизить пост-закрытиевые риски.",
    fork: "Муниципалитет создаёт обязательства либо дополнительных обязательств нет.",
    fact: FACT,
    sources: [{ role: "Муниципалитет", result: "Письменное разъяснение." }],
    actions: ["запросить разъяснение"],
  }),
});

const principalOwned = normalizeAnalysisResult({
  decisionStatus: "resolved",
  sections: rawSections({
    outcome: "Завершить сделку без недопустимого правового риска.",
    fork: "Решение определено: завершить сделку, приняв остаточный юридический риск.",
    fact: RESOLVED_DETERMINING_FACT,
    sources: [{ role: "Юрист", result: "Письменное заключение." }],
    actions: ["Получить решение Principal"],
  }),
  decisionAuthority: {
    owner: "principal",
    principalQuestion: QUESTION,
    reason: "Остаточный риск — ценностное суждение.",
  },
});

const familyOffice = normalizeAnalysisResult({
  decisionStatus: "unresolved",
  sections: rawSections({
    outcome: "Снять юридический риск.",
    fork: "Исправление снимает риск, либо риск остаётся.",
    fact: FACT,
    sources: [{ role: "Юрист", result: "Письменное заключение." }],
    actions: ["Получить заключение юриста"],
  }),
  decisionAuthority: {
    owner: "family_office",
    reason: "Сначала нужен факт юриста.",
  },
});

const resolvedDone = normalizeAnalysisResult({
  decisionStatus: "resolved",
  sections: rawSections({
    outcome: "Завершить регистрацию.",
    fork: "Решение определено: завершить регистрацию перехода права.",
    fact: RESOLVED_DETERMINING_FACT,
    sources: [{ role: "Юрист", result: "Регистрация." }],
    actions: ["Завершить регистрацию"],
  }),
  decisionAuthority: {
    owner: "family_office",
    reason: "Исполнение уже утверждённого курса.",
  },
});

function baseCase(overrides: Partial<AttentionCaseInput> & Pick<AttentionCaseInput, "id">): AttentionCaseInput {
  return {
    title: overrides.title ?? overrides.id,
    lifecycleState: "under_analysis",
    ...overrides,
  };
}

function kindOf(input: AttentionCaseInput) {
  return deriveDecisionAttentionItem(input)?.kind ?? null;
}

assert(
  deriveDecisionAttentionItem(baseCase({ id: "closed-normal", lifecycleState: "closed" })) === null,
  "A: closed normal case is absent",
);

const closedReopen = baseCase({
  id: "closed-reopen",
  lifecycleState: "closed",
  analysisResult: unresolvedFact,
  reopenSuggestion: { ...deriveReopenSuggestion(unresolvedFact), dismissed: false },
  executionStep: "Завершить регистрацию",
  executionStatus: "completed",
});
assert(kindOf(closedReopen) === "reopen", "B: closed + reopen is a reopen item");
assert(
  deriveDecisionAttentionItem(closedReopen)?.headline === ATTENTION_HEADLINES.reopen,
  "B: reopen headline is fixed copy",
);

assert(
  kindOf(
    baseCase({
      id: "principal-now",
      lifecycleState: "under_analysis",
      analysisResult: principalOwned,
    }),
  ) === "principal_decision",
  "C: current Principal authority is a principal_decision item",
);
assert(
  deriveDecisionAttentionItem(
    baseCase({
      id: "principal-q",
      analysisResult: principalOwned,
    }),
  )?.detail === QUESTION,
  "C: principal detail is the current question",
);

assert(
  kindOf(
    baseCase({
      id: "stale-principal",
      lifecycleState: "waiting_for_principal",
      analysisResult: familyOffice,
    }),
  ) !== "principal_decision",
  "D: stale waiting_for_principal without current Principal authority is not a Principal item",
);
assert(
  kindOf(
    baseCase({
      id: "stale-principal-fact",
      lifecycleState: "waiting_for_principal",
      analysisResult: familyOffice,
    }),
  ) === "missing_fact",
  "D: stale principal lifecycle falls through to the current fact wait",
);

assert(
  kindOf(
    baseCase({
      id: "missing",
      lifecycleState: "under_analysis",
      analysisResult: unresolvedFact,
    }),
  ) === "missing_fact",
  "E: unresolved with Determining Fact is missing_fact",
);

assert(
  kindOf(
    baseCase({
      id: "third-wins",
      lifecycleState: "waiting_for_third_party",
      blockerType: "third_party",
      blockerNote: "Ждём письменный ответ муниципалитета.",
      analysisResult: unresolvedFact,
    }),
  ) === "third_party",
  "F: waiting_for_third_party wins over determining fact",
);

assert(
  kindOf(
    baseCase({
      id: "exec",
      lifecycleState: "executing",
      executionStatus: "pending",
      executionStep: "Завершить регистрацию перехода права",
      analysisResult: resolvedDone,
    }),
  ) === "execution",
  "G: resolved + pending execution is execution",
);

assert(
  kindOf(
    baseCase({
      id: "closable",
      lifecycleState: "executing",
      executionStatus: "completed",
      executionStep: "Завершить регистрацию перехода права",
      analysisResult: resolvedDone,
    }),
  ) === "ready_to_close",
  "H: completed execution + open + resolved is ready_to_close",
);

assert(
  kindOf(baseCase({ id: "brand-new", lifecycleState: "new" })) === "analysis_needed",
  "I: new case without a higher signal is analysis_needed",
);
assert(
  kindOf(baseCase({ id: "idle-analysis", lifecycleState: "under_analysis" })) === null,
  "I: idle under_analysis without analysis is omitted",
);

assert(
  kindOf(
    baseCase({
      id: "monitor-quiet",
      lifecycleState: "monitoring",
      analysisResult: resolvedDone,
    }),
  ) === null,
  "J: monitoring with no action is omitted",
);

assert(
  kindOf(
    baseCase({
      id: "historical-record",
      lifecycleState: "closed",
      analysisResult: resolvedDone,
      executionStatus: "completed",
      executionStep: "Завершить регистрацию",
    }),
  ) === null,
  "K: normal closed historical record is absent",
);

const oldCapture = {
  decision: "Продолжать только при полном снятии риска.",
  question: "Старый вопрос прошлого цикла",
  decidedAt: "2026-08-01T12:00:00.000Z",
  analysisKey: "old-cycle-key",
};
assert(
  kindOf(
    baseCase({
      id: "old-capture",
      analysisResult: principalOwned,
      principalDecision: oldCapture,
    }),
  ) === "principal_decision",
  "L: historical principalDecision does not suppress current Principal attention",
);
assert(
  deriveDecisionAttentionItem(
    baseCase({
      id: "old-capture-headline",
      analysisResult: principalOwned,
      principalDecision: oldCapture,
    }),
  )?.headline === ATTENTION_HEADLINES.principal_decision,
  "L: old-cycle capture still asks for a Principal decision",
);

const movedOn = kindOf(
  baseCase({
    id: "captured-moved",
    analysisResult: resolvedDone,
    executionStatus: "pending",
    executionStep: "Завершить регистрацию перехода права",
    principalDecision: {
      decision: "Продолжать только при полном снятии риска.",
      question: QUESTION,
      decidedAt: "2026-09-18T12:00:00.000Z",
      analysisKey: analysisCycleKey(principalOwned),
    },
  }),
);
assert(movedOn === "execution", "M: after analysis moves off Principal, the Principal item is gone");

const capturedSameCycle = deriveDecisionAttentionItem(
  baseCase({
    id: "captured-retry",
    analysisResult: principalOwned,
    principalDecision: {
      decision: "Продолжать только при полном снятии риска.",
      question: QUESTION,
      decidedAt: "2026-09-18T12:00:00.000Z",
      analysisKey: analysisCycleKey(principalOwned),
    },
  }),
);
assert(capturedSameCycle?.kind === "principal_decision", "M/retry: stored capture on the current analysis stays in Inbox");
assert(
  capturedSameCycle?.headline === PRINCIPAL_CAPTURE_RETRY_HEADLINE,
  "M/retry: headline says the Principal decision is saved and analysis still needs a rerun",
);

const reopenConflicts = deriveDecisionAttentionQueue([
  {
    ...closedReopen,
    executionStatus: "pending",
    executionStep: "Старый шаг",
  },
]);
assert(reopenConflicts.length === 1, "N: one item only");
assert(reopenConflicts[0]?.kind === "reopen", "N: reopen wins over Principal/execution on a closed case");
assert(
  kindOf(
    baseCase({
      id: "principal-vs-exec",
      analysisResult: principalOwned,
      executionStatus: "pending",
      executionStep: "Завершить регистрацию",
    }),
  ) === "principal_decision",
  "N: Principal wins over pending execution while Principal judgment is current",
);

const sortedPriority = deriveDecisionAttentionQueue([
  baseCase({
    id: "fact-normal",
    title: "Нормальный факт",
    analysisResult: unresolvedFact,
    priorityUrgency: "no_deadline",
    priorityStake: "low_reversible",
    lifecycleUpdatedAt: "2026-09-01T00:00:00.000Z",
  }),
  baseCase({
    id: "fact-urgent",
    title: "Срочный факт",
    analysisResult: unresolvedFact,
    priorityUrgency: "urgent",
    priorityStake: "moderate",
    lifecycleUpdatedAt: "2026-08-01T00:00:00.000Z",
  }),
  baseCase({
    id: "fact-soon",
    title: "Скоро факт",
    analysisResult: unresolvedFact,
    priorityUrgency: "soon",
    priorityStake: "moderate",
    lifecycleUpdatedAt: "2026-09-02T00:00:00.000Z",
  }),
]);
assert(
  sortedPriority.map((item) => item.priority).join(",") === "urgent,soon,normal",
  "O: same kind sorts urgent before soon before normal",
);

const recency = deriveDecisionAttentionQueue([
  baseCase({
    id: "older",
    title: "AAA older",
    analysisResult: unresolvedFact,
    priorityUrgency: "soon",
    priorityStake: "moderate",
    lifecycleUpdatedAt: "2026-08-01T00:00:00.000Z",
  }),
  baseCase({
    id: "newer",
    title: "AAA newer",
    analysisResult: unresolvedFact,
    priorityUrgency: "soon",
    priorityStake: "moderate",
    lifecycleUpdatedAt: "2026-09-01T00:00:00.000Z",
  }),
]);
assert(recency[0]?.caseId === "newer", "O: same kind and priority sorts by recency");

const mixedKind = sortDecisionAttentionItems([
  deriveDecisionAttentionItem(
    baseCase({
      id: "urgent-fact",
      analysisResult: unresolvedFact,
      priorityUrgency: "urgent",
      priorityStake: "high_irreversible",
    }),
  )!,
  deriveDecisionAttentionItem(closedReopen)!,
]);
assert(mixedKind[0]?.kind === "reopen", "O: reopen outranks generic urgent operational work");

const queue = deriveDecisionAttentionQueue([
  closedReopen,
  baseCase({ id: "closed-normal", lifecycleState: "closed" }),
  baseCase({ id: "principal-now", analysisResult: principalOwned }),
  baseCase({
    id: "exec",
    lifecycleState: "executing",
    executionStatus: "pending",
    executionStep: "Завершить регистрацию",
    analysisResult: resolvedDone,
  }),
  baseCase({ id: "missing", analysisResult: unresolvedFact }),
]);
assert(new Set(queue.map((item) => item.caseId)).size === queue.length, "P: max one item per case");
assert(
  queue.every((item) => item.actionLabel === ATTENTION_ACTION_LABEL),
  "P: inbox only navigates",
);

assert(!helper.includes("openai"), "Q: no AI client");
assert(!helper.includes("generateAnalysis"), "Q: no extra analysis call");
assert(!inboxUi.includes("openai"), "Q: UI has no AI");
assert(home.includes("deriveDecisionAttentionQueue"), "Q: home derives the queue at read time");

assert(!schema.includes("model Task"), "R: no Task table");
assert(!schema.includes("model InboxItem"), "R: no InboxItem table");
assert(!schema.includes("model Notification"), "R: no Notification table");
assert(!helper.includes("prisma."), "R: derivation does not persist");

assert(!helper.includes("prisma.case.update"), "S: derivation does not mutate the case");
assert(!helper.includes("$transaction"), "S: derivation has no writes");

assert(
  deriveRegisterStatus({
    id: "st-third",
    title: "st-third",
    lifecycleState: "waiting_for_third_party",
  } satisfies DashboardCaseInput) === "Ожидаем третью сторону",
  "T: Decisions Register waiting_for_third_party status is unchanged",
);
assert(
  deriveRegisterStatus({
    id: "st-principal-life",
    title: "st-principal-life",
    lifecycleState: "waiting_for_principal",
  }) === "Нужна позиция Principal",
  "T: Decisions Register still maps waiting_for_principal by lifecycle",
);
assert(registerPage.includes("DecisionsRegister"), "T: /cases remains the register");
assert(dashboard.includes("deriveRegisterStatus"), "T: register status helper remains");
assert(!home.includes("listRegisterRows"), "T: Inbox does not replace the register list");

assert(inboxUi.includes(ATTENTION_EMPTY_COPY) || helper.includes("ATTENTION_EMPTY_COPY"), "empty copy is calm");
assert(inboxUi.includes("Все решения"), "inbox links to the Decisions Register");
assert(home.includes("ATTENTION_TITLE"), "home uses Требует внимания");
assert(!inboxUi.includes("capturePrincipalDecision"), "U: inbox has no Principal capture UI");
assert(!inboxUi.includes("closeCase"), "U: inbox does not close");
assert(!inboxUi.includes("completeCaseExecution"), "U: inbox does not complete execution");
assert(!helper.includes("support_not_recorded"), "U: Decision Support is not an inbox kind");
assert(!helper.includes("decisionChallenge"), "U: Decision Challenge is not an inbox kind");

const reviewFact = deriveDecisionAttentionItem(
  baseCase({
    id: "review-fact",
    lifecycleState: "waiting_for_fact",
    analysisResult: resolvedDone,
  }),
);
assert(reviewFact?.kind === "state_review", "state_review A: resolved + waiting_for_fact is state_review");
assert(reviewFact?.headline === ATTENTION_HEADLINES.state_review, "state_review A: compact integrity headline");
assert(reviewFact?.detail === STATE_REVIEW_DETAILS.waitingForFact, "state_review A: waiting-for-fact mismatch copy");

assert(
  kindOf(
    baseCase({
      id: "review-exec-wins",
      lifecycleState: "waiting_for_fact",
      executionStatus: "pending",
      executionStep: "Завершить регистрацию перехода права",
      analysisResult: resolvedDone,
    }),
  ) === "execution",
  "state_review B: resolved + waiting_for_fact + pending execution keeps execution",
);

const stalePrincipalReview = deriveDecisionAttentionItem(
  baseCase({
    id: "review-principal",
    lifecycleState: "waiting_for_principal",
    analysisResult: resolvedDone,
  }),
);
assert(stalePrincipalReview?.kind === "state_review", "state_review C: resolved + stale waiting_for_principal is state_review");
assert(stalePrincipalReview?.kind !== "principal_decision", "state_review C: is not principal_decision");
assert(
  stalePrincipalReview?.detail === STATE_REVIEW_DETAILS.stalePrincipal,
  "state_review C: stale Principal mismatch copy",
);

assert(
  kindOf(
    baseCase({
      id: "review-real-fact",
      lifecycleState: "waiting_for_fact",
      analysisResult: unresolvedFact,
    }),
  ) === "missing_fact",
  "state_review D: unresolved determining fact stays missing_fact",
);

assert(
  kindOf(
    baseCase({
      id: "review-closable",
      lifecycleState: "executing",
      executionStatus: "completed",
      executionStep: "Завершить регистрацию перехода права",
      analysisResult: resolvedDone,
    }),
  ) === "ready_to_close",
  "state_review E: completed execution + closable stays ready_to_close",
);
assert(
  kindOf(
    baseCase({
      id: "review-completed-unresolved",
      lifecycleState: "executing",
      executionStatus: "completed",
      executionStep: "Завершить регистрацию перехода права",
      analysisResult: unresolvedFact,
    }),
  ) === "state_review",
  "state_review E: completed + still executing + not closable is state_review",
);

assert(
  kindOf(
    baseCase({
      id: "review-monitor",
      lifecycleState: "monitoring",
      analysisResult: resolvedDone,
    }),
  ) === null,
  "state_review F: consistent resolved monitoring has no state_review",
);

const reviewQueue = deriveDecisionAttentionQueue([
  baseCase({
    id: "review-fact",
    lifecycleState: "waiting_for_fact",
    analysisResult: resolvedDone,
  }),
  baseCase({
    id: "review-exec-wins",
    lifecycleState: "waiting_for_fact",
    executionStatus: "pending",
    executionStep: "Завершить регистрацию перехода права",
    analysisResult: resolvedDone,
  }),
]);
assert(reviewQueue.length === 2, "state_review G: mixed queue keeps one row per case");
assert(new Set(reviewQueue.map((item) => item.caseId)).size === 2, "state_review G: one item per case remains true");
assert(reviewQueue.filter((item) => item.kind === "state_review").length === 1, "state_review G: only the unmatched case is review");
assert(reviewQueue.some((item) => item.kind === "execution"), "state_review G: stronger action is not replaced");

assert(!helper.includes("openai"), "state_review H: no AI client");
assert(!helper.includes("callOpenAI"), "state_review H: no OpenAI calls");
assert(!helper.includes("generateAnalysis"), "state_review H: no generateAnalysis");
assert(!helper.includes("continueAnalysis"), "state_review H: no continueAnalysis");
assert(!inboxUi.includes("openai"), "state_review H: UI has no AI");
assert(!home.includes("continueAnalysis"), "state_review H: home does not call analysis");

assert(!schema.includes("model Task"), "state_review I: no Task table");
assert(!schema.includes("InboxItem"), "state_review I: no InboxItem");
assert(!helper.includes("prisma."), "state_review I: no persistence");

console.log("Decision Inbox / Attention Queue test passed.");

