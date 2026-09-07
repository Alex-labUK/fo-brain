import { readFileSync } from "fs";
import path from "path";
import {
  RESOLVED_DETERMINING_FACT,
  SECTION_TITLES,
  normalizeAnalysisResult,
} from "@/core/orchestration/analysis-core";
import type { DecisionCycleRecord } from "@/lib/decision-cycle";
import {
  isRepetitiveWorkspaceExplanation,
  presentUnresolvedNextStep,
  previousCyclePreview,
  previousCyclesLabel,
  shouldShowDeterminingFact,
  shouldShowFactGatheringNextStep,
  workspaceActionFirstNextStep,
  workspaceDecision,
  workspaceDeterminingFact,
  workspaceExecutionPlacement,
  workspaceNextStep,
  workspaceOperationalStatus,
  workspaceOutcome,
  workspacePriorityLabel,
} from "@/lib/case-workspace";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
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

const unresolved = normalizeAnalysisResult({
  decisionStatus: "unresolved",
  sections: rawSections({
    outcome: "Снять юридический риск пристройки.",
    fork: "Исправление снимает риск, либо риск остаётся.",
    fact: "Снимет ли исправление пристройки юридический риск.",
    sources: [
      { role: "Юрист", result: "Подтвердить, снимет ли исправление пристройки юридический риск." },
    ],
    actions: [
      "Получить письменное заключение",
      "Проверить согласование пристройки",
      "Лишнее действие четыре",
      "Лишнее действие пять",
    ],
  }),
});

const resolved = normalizeAnalysisResult({
  decisionStatus: "resolved",
  sections: rawSections({
    outcome: "Снять юридический риск пристройки.",
    fork: "Решение определено: исправление снимает риск.",
    fact: RESOLVED_DETERMINING_FACT,
    sources: [{ role: "Юрист", result: "Письменное заключение." }],
    actions: ["Направить уведомление продавцу"],
  }),
});

assert(workspaceOutcome(unresolved) === "Снять юридический риск пристройки.", "A: outcome is available");
assert(Boolean(workspaceDecision(unresolved)?.includes("Исправление снимает риск")), "A: current decision is visible");
assert(
  workspaceDeterminingFact(unresolved) === "Снимет ли исправление пристройки юридический риск.",
  "A: determining fact is visible",
);
assert(shouldShowDeterminingFact(unresolved), "A: unresolved cases show determining fact");
assert(shouldShowFactGatheringNextStep(unresolved), "A: owner/actions combine into next-step");
const next = workspaceNextStep(unresolved);
assert(next.owner === "Юрист", "A: fact owner remains available");
assert(next.evidence?.includes("подтвердить") || Boolean(next.evidence), "A: required evidence stays available");
assert(next.actions.length === 3, "A: next-step keeps at most 3 actions");
assert(!next.actions.includes("Лишнее действие пять"), "A: extra actions are dropped");
const actionFirst = workspaceActionFirstNextStep(unresolved);
assert(actionFirst.primary === "Получить письменное заключение", "A: unresolved next-step leads with the first action");
assert(actionFirst.owner === "Юрист", "A: owner is available quietly");
assert(Boolean(actionFirst.support?.includes("Проверить согласование пристройки")), "A: remaining actions become quieter supporting copy");
assert(!("remaining" in actionFirst), "A: next-step is not a list of remaining moves");
assert(
  !isRepetitiveWorkspaceExplanation("Ждём письменное заключение юриста.", [
    actionFirst.primary,
    actionFirst.support,
    workspaceDeterminingFact(unresolved),
  ]),
  "F: short operational waiting line is not treated as repetition",
);
assert(
  isRepetitiveWorkspaceExplanation(
    "Для принятия решения необходимо получить подтверждение, снимет ли исправление пристройки юридический риск.",
    [workspaceDeterminingFact(unresolved), actionFirst.primary, actionFirst.support],
  ),
  "F: a reason that restates the fact/next-step is repetitive",
);

const legalization = presentUnresolvedNextStep({
  fact: "Есть ли возможность легализовать перепланировку в кратчайшие сроки без значительных затрат?",
  owner: "Юрист",
  evidence: null,
  actions: [
    "Запросить у юриста оценку возможности легализации перепланировки в кратчайшие сроки без значительных затрат.",
    "Проверить у юриста, какие документы и действия необходимы для легализации.",
    "Оценить у юриста возможные затраты на легализацию.",
  ],
});
assert(legalization.primary !== null, "A: related fact-gathering actions produce one primary Next Step");
assert(legalization.primary === "Получить у юриста оценку возможности легализации перепланировки", "A: primary is one obtain-the-fact move");
assert(!String(legalization.primary).includes("Проверить у юриста"), "A: remaining actions are not separate next steps");
assert(!Boolean(legalization.support?.includes("Запросить у юриста")), "A: supporting copy is not a second action list");
assert(Boolean(legalization.support?.startsWith("Нужно подтвердить")), "A: related remainder becomes one supporting line");
assert(!Boolean(legalization.support?.includes("у юриста")), "A: owner is not repeated inside supporting copy");
assert(Boolean(legalization.support?.includes("документы") || legalization.support?.includes("действия")), "A: supporting copy keeps remaining aspects");
assert(Boolean(legalization.support?.includes("затрат")), "A: supporting copy keeps cost aspect from stored actions");
assert(legalization.owner === "Юрист", "A: owner stays on the quiet source line");

const singleAction = presentUnresolvedNextStep({
  fact: "Снимет ли исправление пристройки юридический риск.",
  owner: "Юрист",
  evidence: null,
  actions: ["Получить письменное заключение"],
});
assert(singleAction.primary === "Получить письменное заключение", "B: a single action remains the primary Next Step");
assert(singleAction.support === null, "B: one action does not invent supporting copy");

const noAction = presentUnresolvedNextStep({
  fact: "Снимет ли исправление пристройки юридический риск.",
  owner: "Юрист",
  evidence: "Подтвердить, снимет ли исправление пристройки юридический риск.",
  actions: [],
});
assert(noAction.primary === null, "D: no action does not invent a Next Step");
assert(noAction.support === null, "D: evidence is not promoted into a Next Step");

const unrelatedFallback = presentUnresolvedNextStep({
  fact: "Снимет ли исправление пристройки юридический риск.",
  owner: "Юрист",
  evidence: null,
  actions: ["Получить письменное заключение", "Проверить согласование пристройки", "Лишнее действие четыре"],
});
assert(unrelatedFallback.primary === "Получить письменное заключение", "fallback: first action stays primary when remainder cannot combine");
assert(Boolean(unrelatedFallback.support?.includes("Проверить согласование пристройки")), "fallback: remaining actions are quieter copy");
assert(Boolean(unrelatedFallback.support?.includes("Лишнее действие четыре")), "fallback: leftover actions stay in supporting copy");

assert(Boolean(workspaceDecision(resolved)?.startsWith("Решение определено")), "B: resolution is visible");
assert(!shouldShowDeterminingFact(resolved), "B: resolved cases do not force determining fact");
assert(workspaceDeterminingFact(resolved) === null, "B: terminal determining-fact text is hidden");
assert(!shouldShowFactGatheringNextStep(resolved), "B: resolved cases do not force fact-gathering next-step");

assert(
  workspaceExecutionPlacement({
    hasExecution: true,
    executionStatus: "pending",
    decisionStatus: "resolved",
  }) === "primary",
  "C: pending execution is primary",
);
assert(
  workspaceExecutionPlacement({
    hasExecution: true,
    executionStatus: "completed",
    decisionStatus: "resolved",
    lifecycleState: "executing",
  }) === "quiet",
  "D: completed execution on a resolved case is secondary",
);
assert(
  workspaceExecutionPlacement({
    hasExecution: true,
    executionStatus: "completed",
    decisionStatus: "unresolved",
    lifecycleState: "under_analysis",
  }) === "history",
  "D: completed execution on a new unresolved cycle is historical",
);
assert(
  workspaceExecutionPlacement({
    hasExecution: true,
    executionStatus: "completed",
    decisionStatus: "resolved",
    lifecycleState: "closed",
  }) === "history",
  "D: completed execution on a closed case is not dominant",
);

assert(workspaceOperationalStatus({ lifecycleState: "under_analysis" }) === "На анализе", "header: under analysis");
assert(workspaceOperationalStatus({ lifecycleState: "waiting_for_fact" }) === "Ожидаем факт", "header: waiting for fact");
assert(
  workspaceOperationalStatus({ lifecycleState: "waiting_for_third_party" }) === "Ожидаем третью сторону",
  "header: waiting for third party",
);
assert(
  workspaceOperationalStatus({ lifecycleState: "waiting_for_principal" }) === "Нужна позиция Principal",
  "header: principal",
);
assert(
  workspaceOperationalStatus({ lifecycleState: "under_analysis", executionStatus: "pending" }) === "Исполняется",
  "header: pending execution overrides analysis",
);
assert(workspaceOperationalStatus({ lifecycleState: "closed" }) === "Закрыт", "header: closed");
assert(workspaceOperationalStatus({ lifecycleState: "monitoring" }) === "Мониторинг", "header: monitoring");
assert(workspacePriorityLabel("red") === "Срочно", "J: urgent is a compact priority signal");
assert(workspacePriorityLabel("amber") === "Скоро", "J: soon is a compact priority signal");
assert(workspacePriorityLabel("green") === null, "J: calm priority has no extra badge");

assert(previousCyclesLabel(1) === "1 цикл", "H: previous-cycle count is readable");
assert(previousCyclesLabel(2) === "2 цикла", "H: few previous cycles use the dual form");
assert(previousCyclesLabel(5) === "5 циклов", "H: many previous cycles use the plural");

const cycle: DecisionCycleRecord = {
  archivedAt: "2026-01-01T00:00:00.000Z",
  analysis: {
    sections: [{ title: SECTION_TITLES[1], content: "Прошлое решение: риск снят." }],
  },
  executionStep: "Направить уведомление",
  executionOwner: "Юрист",
  executionStatus: "completed",
  executionUpdatedAt: "2026-01-02T00:00:00.000Z",
  closedAt: "2026-01-03T00:00:00.000Z",
};
const preview = previousCyclePreview(cycle);
assert(preview.resolution === "Прошлое решение: риск снят.", "H: previous resolution is available");
assert(preview.execution === "Направить уведомление", "H: previous execution is available");
assert(preview.closedAt === "2026-01-03T00:00:00.000Z", "H: closed date is available");

const duplicateFact = normalizeAnalysisResult({
  decisionStatus: "unresolved",
  sections: rawSections({
    outcome: "Цель",
    fork: "Развилка",
    fact: "Нужен отчёт юриста",
    sources: [{ role: "Юрист", result: "Нужен отчёт юриста" }],
    actions: ["Запросить отчёт"],
  }),
});
assert(workspaceNextStep(duplicateFact).evidence === null, "A: determining fact is not repeated as evidence");

const root = process.cwd();
const page = readFileSync(path.join(root, "src/app/cases/[id]/page.tsx"), "utf8");
const workspaceUi = readFileSync(path.join(root, "src/app/cases/[id]/workspace-ui.ts"), "utf8");
const details = readFileSync(path.join(root, "src/app/cases/[id]/WorkspaceDetails.tsx"), "utf8");
const lifecyclePanel = readFileSync(path.join(root, "src/app/cases/[id]/CaseLifecyclePanel.tsx"), "utf8");
const lifecycleSuggestion = readFileSync(
  path.join(root, "src/app/cases/[id]/CaseLifecycleSuggestionCard.tsx"),
  "utf8",
);
const reopenSuggestion = readFileSync(path.join(root, "src/app/cases/[id]/CaseReopenSuggestionCard.tsx"), "utf8");
const dialogue = readFileSync(path.join(root, "src/app/cases/[id]/CaseDialogueLauncher.tsx"), "utf8");
const executionPanel = readFileSync(path.join(root, "src/app/cases/[id]/CaseExecutionPanel.tsx"), "utf8");

assert(page.includes("← Решения"), "back link remains");
assert(page.includes('href="/cases"'), "back link still goes to the register");
assert(!page.includes("← К решениям"), "breadcrumb matches the register name");
assert(!page.includes("CaseStatusBadge"), "header no longer stacks case-status badges");
assert(!page.includes("<PriorityBadge"), "J: priority has no standalone card");
assert(!page.includes("AnalysisSections"), "analysis is not a wall of English section cards");
assert(!page.includes("formatDomain"), "I: technical domain is not shown");
assert(!page.includes("{caseItem.id} ·"), "I: technical id is not shown");
assert(!page.includes("Требует внимания сейчас"), "header does not reuse the old red badge copy");
assert(!page.includes("Реальный, в процессе"), "header does not show overlapping status copy");
assert(!page.includes("Предыдущих циклов решений"), "H: technical cycle count line is gone");
assert(!page.includes(">Приоритет<") && !page.includes("Приоритет</h2>"), "J: no large Priority heading");

assert(page.includes("Цель:"), "A: Outcome is presented as compact Цель");
assert(page.includes("kicker}>Решение"), "A: Main Decision Fork is presented as Решение");
assert(page.includes("Что определит решение"), "A: Determining Fact uses the Russian label");
assert(page.includes("workspaceActionFirstNextStep"), "A: unresolved next-step is action-first");
assert(!page.includes("nextStep.remaining"), "A: unresolved Next Step is not a list of remaining actions");
assert(page.includes("workspaceType.fact"), "determining fact is lighter than Decision");
assert(page.includes("workspaceFactInsetClass"), "determining fact is a distinct inset");
assert(page.includes("workspaceNextStepOwnerLine"), "A: next-step metadata shows owner/source only");
assert(!page.includes('join(" · ")'), "A: lifecycle status is not duplicated in Next Step metadata");
assert(!page.includes("Ответственный / источник:"), "A: owner is not a document source line");
assert(page.includes("showReason={showLifecycleReason}"), "F: repetitive recommendation copy can be hidden");
assert(workspaceUi.includes("px-4 py-4"), "Decision block padding is tighter");
assert(page.includes("workspaceDecisionSurfaceClass"), "Decision is one shared decision surface");
assert(!workspaceUi.includes("border-l-red"), "Decision surface never uses red accent");
assert(!workspaceUi.includes('color === "red"'), "Decision surface ignores priority color");
assert(workspaceUi.includes("border-l-sky-500"), "Next Step keeps the blue operational accent");
assert(!dialogue.includes("sky-"), "Dialogue launcher is neutral, not blue");
assert(page.includes("workspaceNextStepSurfaceClass"), "Next Step is a distinct operational surface");
assert(lifecycleSuggestion.includes("showReason"), "F: recommendation reason is optional in the UI");
assert(page.includes("decisionSurfaceResolved"), "closed lifecycle uses resolved decision coloring");
assert(page.includes("workspaceDeterminingFact"), "B: determining fact is gated");
assert(page.includes("shouldShowFactGatheringNextStep"), "B: fact-gathering is gated for resolved cases");
assert(page.includes('executionPlacement === "primary"'), "C: pending execution can stay near next-step");
assert(page.includes('tone={executionPlacement === "primary" ? "default" : "quiet"}'), "D: completed execution can be quiet");
assert(page.includes("hideTitle={executionPlacement === \"primary\"}"), "C: pending execution uses the Next Step surface");
assert(page.includes('executionPlacement === "history"'), "D: historical execution moves to secondary");
assert(page.includes('title="Статус кейса"'), "E: lifecycle controls are secondary");
assert(page.includes("<CaseLifecyclePanel"), "E: lifecycle controls remain available");
assert(page.includes("bare"), "E: lifecycle panel is nested, not a dominant card");
assert(!details.includes("defaultOpen"), "E: secondary details stay collapsed by default");
assert(!/\sopen(?:\s|=|>)/.test(details), "E: WorkspaceDetails does not force itself open");
assert(lifecyclePanel.includes("updateCaseLifecycle"), "E: lifecycle save path is unchanged");
assert(lifecycleSuggestion.includes("applyLifecycleSuggestion"), "F: lifecycle suggestion remains actionable");
assert(lifecycleSuggestion.includes("dismissLifecycleSuggestion"), "F: leave-as-is remains available");
assert(lifecycleSuggestion.includes("FO Brain"), "F: suggestion is system guidance");
assert(lifecycleSuggestion.includes("Рекомендует →"), "F: suggestion is a compact recommendation");
assert(lifecycleSuggestion.includes("lifecycleLabel(suggestion.state)"), "F: recommended state is the strong line");
assert(lifecycleSuggestion.includes("workspaceGuidanceSurfaceClass"), "F: lifecycle suggestion has a distinct guidance surface");
assert(!lifecycleSuggestion.includes("FO Brain рекомендует:"), "F: title and state are split, not one grey line");
assert(lifecycleSuggestion.includes("Оставить как есть"), "F: human can decline the suggestion");
assert(reopenSuggestion.includes("applyReopenSuggestion"), "G: reopen remains actionable");
assert(reopenSuggestion.includes("dismissReopenSuggestion"), "G: leave-closed remains human-controlled");
assert(reopenSuggestion.includes("Рекомендует возобновить кейс"), "G: reopen copy is compact");
assert(reopenSuggestion.includes("workspaceReopenSurfaceClass"), "G: reopen is visually distinct from the lifecycle strip");
assert(!reopenSuggestion.includes("rounded-xl border border-zinc-200 bg-zinc-100"), "G: reopen is not the same tinted lifecycle card");
assert(reopenSuggestion.includes("Оставить закрытым"), "G: closed cases stay closed unless applied");
assert(page.indexOf("reopenSuggestion") < page.indexOf("Цель:"), "G: reopen recommendation is near the top");
assert(page.includes('title="История решений"'), "H: previous-cycle history remains accessible");
assert(page.includes("previousCyclesLabel"), "H: history uses a readable count");
assert(page.includes("CaseDialogueLauncher"), "K: continue-analysis remains accessible");
assert(page.includes("secondary={Boolean(reopenSuggestion || lifecycleSuggestion || executionSuggestion)}"), "K: continue-analysis recedes when approval is required");
assert(dialogue.includes("Добавить новое обстоятельство"), "K: launcher is Добавить новое обстоятельство");
assert(dialogue.includes("Сообщить, что изменилось в ситуации"), "K: launcher has supporting copy");
assert(!dialogue.includes("Продолжить разбор"), "K: previous continue-analysis phrasing is gone");
assert(!dialogue.includes("Обсудить с ИИ"), "K: chatbot phrasing is gone");
assert(!dialogue.includes("messages.length"), "K: message count is not in the primary UI");
assert(!dialogue.includes("bg-zinc-900 px-5 py-3"), "K: add-information is not a competing primary CTA");
assert(page.includes("max-w-2xl"), "reading column is a workspace, not a wide article");
assert(page.includes("workspaceType.title"), "title uses the shared type scale");
assert(page.includes("workspaceType.primary"), "primary content uses the shared type scale");
assert(page.includes("workspaceType.section"), "section labels use the shared type scale");
assert(page.includes("mt-14 border-t border-zinc-200 pt-8"), "Дополнительно is separated from the workspace");
assert(details.includes("min-h-11"), "Дополнительно rows share one height");
assert(details.includes("Показать"), "Дополнительно rows use Показать");
assert(details.includes("last:border-b"), "Дополнительно rows are a register, not cards");
assert(details.includes("workspaceType.body"), "Дополнительно rows use body type");
assert(reopenSuggestion.includes("workspaceReopenSurfaceClass"), "G: reopen card is compact");
assert(reopenSuggestion.includes("line-clamp-2"), "G: reopen reason is height-limited");
assert(reopenSuggestion.includes("Новая неопределённость"), "G: reopen keeps the new fork label");
assert(reopenSuggestion.includes("После подтверждения:"), "G: reopen keeps the after-apply line");
assert(page.includes("priorityNote"), "priority explanation sits in the Decision block, not under the title");
assert(!page.includes("caseItem.priorityNote?.trim() ?"), "priority note is not a header subtitle");
assert(page.includes('title="Действия"'), "actions remain available");
assert(page.includes("CaseDetailControls"), "actions panel is not removed");
assert(executionPanel.includes("completeCaseExecution"), "C: pending execution can still be completed");
assert(executionPanel.includes("Выполнено"), "C: pending execution keeps the done action");
assert(executionPanel.includes('tone?: "default" | "quiet"'), "D: execution has a quieter completed state");
assert(executionPanel.includes("hideTitle?: boolean"), "C: execution heading can yield to Next Step");

const goalIdx = page.indexOf("Цель:");
const decisionIdx = page.indexOf("kicker}>Решение");
const nextIdx = page.indexOf("Следующий шаг");
const extraIdx = page.indexOf("Дополнительно");
const dialogueIdx = page.indexOf("CaseDialogueLauncher");
assert(decisionIdx < goalIdx, "visual order: Решение kicker before compact Цель");
assert(goalIdx < nextIdx, "visual order: Decision surface before Следующий шаг");
assert(nextIdx < extraIdx, "visual order: next-step before Дополнительно");
assert(dialogueIdx < extraIdx, "visual order: dialogue before secondary controls");

console.log("Case workspace presentation test passed.");
