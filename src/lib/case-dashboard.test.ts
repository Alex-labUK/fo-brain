import { readFileSync } from "fs";
import path from "path";
import {
  RESOLVED_DETERMINING_FACT,
  SECTION_TITLES,
  normalizeAnalysisResult,
} from "@/core/orchestration/analysis-core";
import {
  MAX_NOW_CASES,
  buildDashboardPortfolio,
  classifyCaseForDashboard,
  dashboardCounts,
  dashboardOpenCount,
  decisionsHref,
  deriveFocusLine,
  deriveNowStatus,
  isPrimaryAttentionCandidate,
  listDecisionsCases,
  listRegisterRows,
  matchesRegisterSearch,
  registerEmptyMessage,
  registerSubtitle,
  selectNowCases,
  toDashboardCard,
  toRegisterRow,
  visibleDashboardReopen,
  type DashboardCaseInput,
} from "@/lib/case-dashboard";
import { deriveReopenSuggestion } from "@/lib/decision-cycle";
import { priorityColorBadgeClass, priorityColorMarkerClass } from "@/lib/priority";

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

const unresolvedMunicipal = normalizeAnalysisResult({
  decisionStatus: "unresolved",
  sections: rawSections({
    outcome: "Снизить пост-закрытиевые риски.",
    fork: "Муниципалитет создаёт обязательства для собственника либо дополнительных обязательств нет.",
    fact: "Потребуются ли обязательные действия от нового собственника.",
    sources: [{ role: "Муниципалитет", result: "Письменное разъяснение." }],
    actions: ["запросить разъяснение"],
  }),
});

function baseCase(overrides: Partial<DashboardCaseInput> & Pick<DashboardCaseInput, "id">): DashboardCaseInput {
  return {
    title: overrides.title ?? overrides.id,
    lifecycleState: "under_analysis",
    ...overrides,
  };
}

const legacyThirteen = Array.from({ length: 13 }, (_, index) =>
  baseCase({ id: `legacy-${index}`, lifecycleState: "under_analysis" }),
);
const legacyPortfolio = buildDashboardPortfolio(legacyThirteen);
assert(legacyPortfolio.now.length === 0, "A: sparse under_analysis cases are not primary");
assert(legacyPortfolio.other.length === 13, "A: sparse legacy cases go to Other");
assert(
  legacyThirteen.every((caseItem) => !isPrimaryAttentionCandidate(caseItem)),
  "A: default under_analysis is not a now-candidate",
);

const manyOpen = Array.from({ length: 13 }, (_, index) =>
  baseCase({
    id: `open-${index}`,
    lifecycleState: "under_analysis",
    priorityUrgency: "soon",
    priorityStake: "moderate",
    analysisResult: unresolvedMunicipal,
    updatedAt: `2026-09-0${(index % 9) + 1}T12:00:00.000Z`,
  }),
);
const manyPortfolio = buildDashboardPortfolio(manyOpen);
assert(manyPortfolio.now.length === MAX_NOW_CASES, "B: primary list is capped");
assert(manyPortfolio.now.length <= 3, "B: primary list never exceeds 3");
assert(manyPortfolio.other.length === 10, "B: overflow open cases become Other");

const ranked = selectNowCases([
  baseCase({
    id: "normal",
    lifecycleState: "under_analysis",
    priorityUrgency: "soon",
    priorityStake: "moderate",
    analysisResult: unresolvedMunicipal,
    updatedAt: "2026-09-04T12:00:00.000Z",
  }),
  baseCase({
    id: "urgent",
    lifecycleState: "under_analysis",
    priorityUrgency: "urgent",
    priorityStake: "moderate",
    analysisResult: unresolvedMunicipal,
    updatedAt: "2026-09-01T12:00:00.000Z",
  }),
]);
assert(ranked[0]?.id === "urgent", "C: urgent case ranks above normal case");

assert(
  isPrimaryAttentionCandidate(baseCase({ id: "principal", lifecycleState: "waiting_for_principal" })),
  "D: waiting_for_principal is primary attention",
);
assert(
  classifyCaseForDashboard(baseCase({ id: "principal-group", lifecycleState: "waiting_for_principal" })) ===
    "other",
  "D: principal is not a waiting/executing operational group",
);
assert(
  deriveNowStatus(baseCase({ id: "principal-status", lifecycleState: "waiting_for_principal" })) ===
    "Нужна позиция Principal",
  "D: principal focus signal",
);
assert(
  selectNowCases([baseCase({ id: "principal-now", lifecycleState: "waiting_for_principal" })]).length === 1,
  "D: principal appears in Сейчас",
);

assert(
  classifyCaseForDashboard(baseCase({ id: "wait-fact", lifecycleState: "waiting_for_fact" })) === "waiting",
  "E: waiting_for_fact is secondary Waiting",
);
assert(
  !isPrimaryAttentionCandidate(baseCase({ id: "wait-fact-now", lifecycleState: "waiting_for_fact" })),
  "E: waiting_for_fact is not primary",
);
assert(
  buildDashboardPortfolio([baseCase({ id: "wait-fact-port", lifecycleState: "waiting_for_fact" })]).waiting
    .length === 1,
  "E: waiting_for_fact lands in Waiting",
);

assert(
  classifyCaseForDashboard(baseCase({ id: "exec", lifecycleState: "executing" })) === "executing",
  "F: executing lifecycle is secondary Executing",
);
assert(
  classifyCaseForDashboard(
    baseCase({
      id: "pending-monitor",
      lifecycleState: "monitoring",
      executionStatus: "pending",
      executionStep: "Завершить регистрацию",
    }),
  ) === "executing",
  "F: pending execution is secondary Executing",
);
assert(
  !isPrimaryAttentionCandidate(
    baseCase({
      id: "pending-not-now",
      lifecycleState: "executing",
      executionStatus: "pending",
      executionStep: "Завершить регистрацию",
    }),
  ),
  "F: ordinary pending execution is not primary",
);

assert(
  classifyCaseForDashboard(
    baseCase({
      id: "monitor",
      lifecycleState: "monitoring",
      priorityUrgency: "soon",
      priorityStake: "moderate",
    }),
  ) === "monitoring",
  "G: monitoring is secondary Monitoring",
);
assert(
  !isPrimaryAttentionCandidate(
    baseCase({
      id: "monitor-now",
      lifecycleState: "monitoring",
      priorityUrgency: "soon",
      priorityStake: "moderate",
    }),
  ),
  "G: ordinary monitoring is not primary",
);

assert(classifyCaseForDashboard(baseCase({ id: "closed", lifecycleState: "closed" })) === "closed", "H: closed is archive");
assert(
  !isPrimaryAttentionCandidate(baseCase({ id: "closed-now", lifecycleState: "closed" })),
  "H: closed is not primary",
);
assert(
  buildDashboardPortfolio([baseCase({ id: "closed-port", lifecycleState: "closed" })]).now.length === 0,
  "H: closed does not appear in Сейчас",
);

const closedReopen = baseCase({
  id: "closed-reopen",
  lifecycleState: "closed",
  analysisResult: unresolvedMunicipal,
  reopenSuggestion: { ...deriveReopenSuggestion(unresolvedMunicipal), dismissed: false },
  executionStep: "Завершить регистрацию перехода права собственности",
  executionStatus: "completed",
  priorityUrgency: "urgent",
  priorityStake: "high_irreversible",
});
assert(classifyCaseForDashboard(closedReopen) === "closed", "I: closed + reopen stays closed");
assert(!isPrimaryAttentionCandidate(closedReopen), "I: reopen does not promote to primary");
assert(visibleDashboardReopen(closedReopen) !== null, "I: reopen marker remains available in archive");
assert(buildDashboardPortfolio([closedReopen]).now.length === 0, "I: closed + reopen is not in Сейчас");
assert(buildDashboardPortfolio([closedReopen]).closed.length === 1, "I: closed + reopen stays in archive");

const sparse = toDashboardCard({
  id: "sparse-old",
  title: "Старый кейс",
  lifecycleState: "under_analysis",
});
assert(sparse.group === "other", "J: sparse legacy falls into Other");
assert(!isPrimaryAttentionCandidate({ id: "sparse-cand", title: "Старый кейс", lifecycleState: "under_analysis" }), "J: sparse is not primary");
assert(sparse.contextLine === null, "J: missing analysis does not invent context");
assert(sparse.statusLine === null, "J: no generic attention status");

const focusCase = baseCase({
  id: "focus",
  lifecycleState: "under_analysis",
  priorityUrgency: "urgent",
  priorityStake: "moderate",
  blockerNote: "Нужен звонок юристу.",
  analysisResult: unresolvedMunicipal,
});
assert(
  deriveFocusLine(focusCase) === "Потребуются ли обязательные действия от нового собственника.",
  "K: Determining Fact is preferred as focus text",
);
assert(
  toDashboardCard(focusCase, "now").contextLine === "Потребуются ли обязательные действия от нового собственника.",
  "K: now card uses Determining Fact",
);
assert(toDashboardCard(focusCase, "now").statusLine === "Срочно", "K: now card uses a short urgency signal");
assert(
  !`${toDashboardCard(focusCase, "now").statusLine ?? ""} ${toDashboardCard(focusCase, "now").contextLine ?? ""}`.includes(
    "Требует внимания сейчас",
  ),
  "K: generic attention copy is not used",
);

const mixedInputs: DashboardCaseInput[] = [
  baseCase({ id: "a", lifecycleState: "closed" }),
  baseCase({ id: "b", lifecycleState: "waiting_for_fact" }),
  baseCase({ id: "c", lifecycleState: "executing" }),
  baseCase({ id: "d", lifecycleState: "monitoring" }),
  baseCase({ id: "e", lifecycleState: "waiting_for_principal" }),
  baseCase({ id: "f", lifecycleState: "under_analysis" }),
];
const mixed = buildDashboardPortfolio(mixedInputs);
const groupedIds = [
  ...mixed.now,
  ...mixed.waiting,
  ...mixed.executing,
  ...mixed.monitoring,
  ...mixed.other,
  ...mixed.closed,
].map((item) => item.id);
assert(groupedIds.length === 6, "no case is dropped");
assert(new Set(groupedIds).size === 6, "no duplicated case across now and secondary groups");
assert(mixed.now.map((item) => item.id).join(",") === "e", "principal is the only now card in the mixed set");

const counts = dashboardCounts(mixed);
assert(counts.waiting === 1 && counts.executing === 1 && counts.monitoring === 1, "secondary operational counts");
assert(counts.other === 1, "Другие открытые is remaining open cases");
assert(counts.closed === 1, "archive remains secondary");

const urgentCard = toDashboardCard(
  baseCase({
    id: "urgent-visual",
    priorityUrgency: "urgent",
    priorityStake: "moderate",
    analysisResult: unresolvedMunicipal,
  }),
  "now",
);
const soonCard = toDashboardCard(
  baseCase({
    id: "soon-visual",
    priorityUrgency: "soon",
    priorityStake: "moderate",
    analysisResult: unresolvedMunicipal,
  }),
  "now",
);
assert(urgentCard.priorityColor === "red" && urgentCard.statusLine === "Срочно", "urgent is red Срочно");
assert(soonCard.priorityColor === "amber" && soonCard.statusLine === "Скоро", "soon is amber Скоро");
assert(priorityColorMarkerClass("red") === "bg-red-500", "urgent uses red traffic-light dot");
assert(priorityColorMarkerClass("amber") === "bg-amber-500", "soon uses amber traffic-light dot");
assert(priorityColorBadgeClass("red").includes("red"), "urgent badge is red");
assert(priorityColorBadgeClass("amber").includes("amber"), "soon badge is amber");

const root = process.cwd();
const header = readFileSync(path.join(root, "src/components/AppHeader.tsx"), "utf8");
assert(!header.includes("Сейчас"), "top nav has no Сейчас");
assert(!header.includes("Библиотека"), "top nav has no Библиотека");
assert(!header.includes("Анализировать"), "top nav has no Анализировать");
assert(header.includes("Решения"), "top nav has Решения");
assert(header.includes('href="/cases"'), "Решения header link opens Decisions page");
assert(!header.includes("?view="), "Решения default is all-open, not a home query");
assert(header.includes("Новая ситуация"), "top nav has Новая ситуация");
assert(header.includes('href="/"'), "logo returns home");
assert(header.includes('href="/analyze"'), "Новая ситуация is the analyze entry");

const home = readFileSync(path.join(root, "src/app/page.tsx"), "utf8");
assert(home.includes("Требуют решения"), "home heading is Требуют решения");
assert(home.includes("Вопросы, которые требуют вашего внимания"), "home has the decision subtitle");
assert(!home.includes("searchParams"), "home does not use ?view= expansion");
assert(!home.includes("isSecondaryView"), "home does not read a view query");

const cockpit = readFileSync(path.join(root, "src/components/DecisionCockpit.tsx"), "utf8");
assert(!cockpit.includes("Анализировать"), "cockpit has no Анализировать");
assert(!cockpit.includes("Новая ситуация"), "no duplicate bottom Новая ситуация");
assert(cockpit.includes("В работе"), "secondary section is В работе");
assert(cockpit.includes("Другие открытые"), "secondary uses Другие открытые");
assert(cockpit.includes("Ожидают") && cockpit.includes("Исполняются") && cockpit.includes("Мониторинг"), "work categories are named");
assert(cockpit.includes("grid-cols-2") && cockpit.includes("sm:grid-cols-4"), "В работе uses status cells, not inline metadata");
assert(!cockpit.includes("SecondaryCaseRow"), "home never renders a secondary case list");
assert(!cockpit.includes("/?view="), "home cells do not use home ?view= expansion");
assert(cockpit.includes('href={`/cases/${card.id}`}'), "primary cards open the case page");
assert(decisionsHref("waiting") === "/cases?view=waiting", "waiting link uses waiting filter");
assert(decisionsHref("executing") === "/cases?view=executing", "executing link uses executing filter");
assert(decisionsHref("monitoring") === "/cases?view=monitoring", "monitoring link uses monitoring filter");
assert(decisionsHref("other") === "/cases?view=other", "other-open link uses other filter");
assert(decisionsHref("closed") === "/cases?view=closed", "archive link uses closed filter");
assert(decisionsHref() === "/cases", "Решения without view is the Decisions page");
assert(cockpit.includes('decisionsHref(item.key)'), "work cells link to Decisions via decisionsHref");
assert(cockpit.includes('decisionsHref("closed")'), "archive links to Decisions closed filter");
assert(cockpit.includes("priorityColorMarkerClass"), "cards use traffic-light dots");
assert(cockpit.includes("border-l-red-500") && cockpit.includes("border-l-amber-500"), "cards use restrained red/amber accent");

assert(
  listDecisionsCases(mixed, "waiting").map((item) => item.id).join(",") === "b",
  "Decisions waiting filter uses classification",
);
assert(
  listDecisionsCases(mixed, "closed").map((item) => item.id).join(",") === "a",
  "Decisions closed filter stays archive",
);
assert(
  !listDecisionsCases(mixed).some((item) => item.id === "a"),
  "default Decisions list is all-open and excludes archive",
);

const openRegister = listRegisterRows(mixedInputs);
assert(
  openRegister.every((row) => row.id !== "a") && openRegister.length === 5,
  "A: /cases default shows all open cases, not closed",
);
assert(
  listRegisterRows(mixedInputs, "waiting").every((row) => row.group === "waiting") &&
    listRegisterRows(mixedInputs, "waiting").map((row) => row.id).join(",") === "b",
  "B: waiting filter returns only waiting",
);
assert(
  listRegisterRows(mixedInputs, "executing").every((row) => row.group === "executing") &&
    listRegisterRows(mixedInputs, "executing").map((row) => row.id).join(",") === "c",
  "C: executing filter returns only executing",
);
assert(
  listRegisterRows(mixedInputs, "monitoring").every((row) => row.group === "monitoring") &&
    listRegisterRows(mixedInputs, "monitoring").map((row) => row.id).join(",") === "d",
  "D: monitoring filter returns only monitoring",
);
assert(
  listRegisterRows(mixedInputs, "other").every((row) => row.group === "other") &&
    listRegisterRows(mixedInputs, "other").map((row) => row.id).join(",") === "f",
  "E: other filter returns only other/open",
);
assert(
  listRegisterRows(mixedInputs, "closed").every((row) => row.group === "closed") &&
    listRegisterRows(mixedInputs, "closed").map((row) => row.id).join(",") === "a",
  "F: closed filter returns only archive cases",
);

const closedReopenRow = toRegisterRow(closedReopen);
assert(closedReopenRow.group === "closed", "G: closed + reopen remains closed");
assert(
  closedReopenRow.statusLine === "FO Brain рекомендует возобновить",
  "G: closed + reopen uses the reopen status",
);
assert(
  !listRegisterRows([closedReopen]).some((row) => row.id === "closed-reopen"),
  "G: closed + reopen is not in all-open",
);

const principalRow = openRegister.find((row) => row.id === "e");
assert(principalRow !== undefined, "H: waiting_for_principal appears in all-open");
assert(principalRow?.statusLine === "Нужна позиция Principal", "H: waiting_for_principal has correct label");

assert(toRegisterRow(baseCase({ id: "st-new", lifecycleState: "new" })).statusLine === "Новый", "register maps new");
assert(
  toRegisterRow(baseCase({ id: "st-analysis", lifecycleState: "under_analysis" })).statusLine === "На анализе",
  "register maps under_analysis",
);
assert(
  toRegisterRow(baseCase({ id: "st-third", lifecycleState: "waiting_for_third_party" })).statusLine ===
    "Ожидаем третью сторону",
  "register maps waiting_for_third_party",
);
assert(
  toRegisterRow(baseCase({ id: "st-monitor", lifecycleState: "monitoring" })).statusLine === "Мониторинг",
  "register maps monitoring",
);
assert(
  toRegisterRow(baseCase({ id: "st-closed", lifecycleState: "closed" })).statusLine === "Закрыт",
  "register maps closed",
);

assert(
  toRegisterRow(
    baseCase({
      id: "exec-owner",
      lifecycleState: "executing",
      executionOwner: "Юрист / transaction team",
    }),
  ).statusLine === "Исполняется",
  "I: executing status is lifecycle mapping, not owner text",
);
assert(
  toRegisterRow(
    baseCase({
      id: "wait-owner",
      lifecycleState: "waiting_for_fact",
      analysisResult: unresolvedMunicipal,
    }),
  ).statusLine === "Ожидаем факт",
  "J: waiting status is not invented from analysis roles",
);
assert(
  toRegisterRow(
    baseCase({
      id: "wait-prose",
      lifecycleState: "waiting_for_fact",
      blockerNote: "Муниципалитет должен ответить письменно.",
    }),
  ).statusLine === "Ожидаем факт",
  "J: waiting status is not invented from blockerNote",
);

assert(
  toRegisterRow(
    baseCase({
      id: "suggest-status",
      lifecycleState: "under_analysis",
      lifecycleSuggestion: {
        state: "waiting_for_fact",
        reason: "Нужно запросить разъяснение.",
        dismissed: false,
      },
    }),
  ).statusLine === "Требует подтверждения",
  "visible lifecycle suggestion is Требует подтверждения",
);
assert(
  toRegisterRow(
    baseCase({
      id: "exec-review-status",
      lifecycleState: "executing",
      executionStatus: "pending",
      executionStep: "Завершить регистрацию",
      analysisResult: unresolvedMunicipal,
    }),
  ).statusLine === "Требует подтверждения",
  "execution review is Требует подтверждения",
);
assert(
  toRegisterRow(
    baseCase({
      id: "monitor-pending",
      lifecycleState: "monitoring",
      executionStatus: "pending",
      executionStep: "Проверить статус регистрации",
    }),
  ).statusLine === "Исполняется",
  "monitoring + pending execution displays Исполняется",
);
assert(
  toRegisterRow(
    baseCase({
      id: "wait-pending",
      lifecycleState: "waiting_for_fact",
      executionStatus: "pending",
      executionStep: "Дождаться ответа и закрыть шаг",
    }),
  ).statusLine === "Исполняется",
  "waiting_for_fact + pending execution displays Исполняется",
);
assert(
  toRegisterRow(
    baseCase({
      id: "closed-pending",
      lifecycleState: "closed",
      executionStatus: "pending",
      executionStep: "Завершить регистрацию",
    }),
  ).statusLine === "Закрыт",
  "closed remains Закрыт unless reopen suggestion exists",
);
assert(
  toRegisterRow(
    baseCase({
      id: "monitor-pending-review",
      lifecycleState: "monitoring",
      executionStatus: "pending",
      executionStep: "Проверить статус регистрации",
      analysisResult: unresolvedMunicipal,
    }),
  ).statusLine === "Требует подтверждения",
  "approval state still overrides pending execution",
);

const urgentRegister = toRegisterRow(
  baseCase({
    id: "urgent-status",
    lifecycleState: "under_analysis",
    priorityUrgency: "urgent",
    priorityStake: "moderate",
    analysisResult: unresolvedMunicipal,
  }),
);
assert(urgentRegister.statusLine === "На анализе", "priority is not used as status");
assert(urgentRegister.priorityLabel === "Срочно", "urgent still has a separate Срочно badge");
assert(!openRegister.some((row) => row.statusLine === "Открыт"), "no row uses the generic Открыт status");

assert(
  listRegisterRows([
    baseCase({
      id: "soon-open",
      lifecycleState: "under_analysis",
      priorityUrgency: "soon",
      priorityStake: "moderate",
      analysisResult: unresolvedMunicipal,
      updatedAt: "2026-09-04T12:00:00.000Z",
    }),
    baseCase({
      id: "urgent-open",
      lifecycleState: "under_analysis",
      priorityUrgency: "urgent",
      priorityStake: "moderate",
      analysisResult: unresolvedMunicipal,
      updatedAt: "2026-09-01T12:00:00.000Z",
    }),
  ])[0]?.id === "urgent-open",
  "K: urgent sorts before soon/normal",
);
assert(
  listRegisterRows(
    [
      baseCase({
        id: "closed-old",
        lifecycleState: "closed",
        lifecycleUpdatedAt: "2026-01-01T00:00:00.000Z",
      }),
      baseCase({
        id: "closed-new",
        lifecycleState: "closed",
        lifecycleUpdatedAt: "2026-09-01T00:00:00.000Z",
      }),
    ],
    "closed",
  )[0]?.id === "closed-new",
  "L: closed sorted most recently closed first",
);

const searchRow = toRegisterRow(
  baseCase({
    id: "search-row",
    title: "Продажа квартиры в Вене",
    analysisResult: unresolvedMunicipal,
  }),
);
assert(matchesRegisterSearch(searchRow, "вене"), "M: search matches title");
assert(matchesRegisterSearch(searchRow, "обязательные действия"), "N: search matches context line");

const filteredCategoryIds = [
  ...listRegisterRows(mixedInputs, "waiting"),
  ...listRegisterRows(mixedInputs, "executing"),
  ...listRegisterRows(mixedInputs, "monitoring"),
  ...listRegisterRows(mixedInputs, "other"),
  ...listRegisterRows(mixedInputs, "closed"),
].map((row) => row.id);
assert(
  filteredCategoryIds.length === new Set(filteredCategoryIds).size,
  "O: no duplicate case across filtered categories",
);

const sparseRegister = toRegisterRow({
  id: "sparse-reg",
  title: "Старый кейс",
  lifecycleState: "under_analysis",
});
assert(sparseRegister.statusLine === "На анализе" && sparseRegister.contextLine === null, "P: sparse legacy case renders safely");
assert(dashboardOpenCount(mixed) === 5, "open count is now + secondary open groups");
assert(registerSubtitle() === "Все открытые решения", "default subtitle is Все открытые решения");
assert(registerEmptyMessage("waiting") === "Нет решений в ожидании.", "waiting empty copy");
assert(registerEmptyMessage("closed") === "Архив пуст.", "archive empty copy");

const decisionsPage = readFileSync(path.join(root, "src/app/cases/page.tsx"), "utf8");
assert(decisionsPage.includes("Решения"), "Decisions page heading is Решения");
assert(decisionsPage.includes("registerSubtitle"), "Decisions page shows the selected category");
assert(decisionsPage.includes("DecisionsRegister"), "Decisions page uses the register");
assert(!decisionsPage.includes("CaseFilters"), "Decisions page has no domain/status CRM filters");
assert(!decisionsPage.includes("CaseList"), "Decisions page does not use the old case list");

const registerUi = readFileSync(path.join(root, "src/components/DecisionsRegister.tsx"), "utf8");
assert(registerUi.includes("Найти решение"), "register has search placeholder");
assert(registerUi.includes("{row.statusLine}"), "every row shows the mapped status");
assert(!registerUi.includes("Применить"), "register has no Apply control");
assert(!registerUi.includes("border-l-"), "register rows have no left accent line");
assert(registerUi.includes("border-b border-black"), "active filter has a thin black underline");
assert(registerUi.includes("decisionsHref(item.view)"), "filters keep existing view URLs");
assert(registerUi.includes('href={`/cases/${row.id}`}'), "whole row opens the case page");
assert(registerUi.includes("REGISTER_FILTERS"), "register uses compact category filters");
assert(registerUi.includes("bg-zinc-300"), "missing priority uses a neutral grey dot");
assert(cockpit.includes("border-l-red-500"), "home cockpit left accent is unchanged");

console.log("Case dashboard classification test passed.");
