import { readFileSync } from "fs";
import path from "path";
import { RESOLVED_DETERMINING_FACT } from "@/core/orchestration/analysis-core";
import type { DecisionRecord } from "@/lib/decision-record";
import {
  RELEVANT_PAST_DECISIONS_MAX,
  RELEVANT_PAST_DECISIONS_MIN_SCORE,
  extractHistoricalDecisionRecords,
  findRelevantPastDecisions,
  scoreRelevantPastDecision,
  shouldShowRelevantPastDecisions,
  unresolvedHistoricalDecisionCopy,
  type CurrentDecisionQuery,
  type HistoricalCaseSource,
} from "@/lib/relevant-past-decisions";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

const root = process.cwd();

function decisionRecord(partial: Partial<DecisionRecord> & Pick<DecisionRecord, "decision">): DecisionRecord {
  const record: DecisionRecord = {
    version: 1,
    closedAt: partial.closedAt ?? "2026-09-16T10:00:00.000Z",
    cycleNumber: partial.cycleNumber ?? 1,
    analysisKey: partial.analysisKey ?? "cycle-key",
    decisionStatusAtClose: partial.decisionStatusAtClose ?? "resolved",
    outcome: partial.outcome ?? partial.decision,
    decision: partial.decision,
  };
  if (partial.determiningFact) record.determiningFact = partial.determiningFact;
  if (partial.resolvingEvidence) record.resolvingEvidence = partial.resolvingEvidence;
  if (partial.factualOutcome) record.factualOutcome = partial.factualOutcome;
  return record;
}

function source(
  id: string,
  title: string,
  record?: DecisionRecord | unknown,
  history?: unknown,
): HistoricalCaseSource {
  return {
    id,
    title,
    decisionRecord: record,
    decisionCycleHistory: history,
  };
}

const apartmentCurrent: CurrentDecisionQuery = {
  caseId: "current-apartment",
  title: "Покупка квартиры с неузаконенной перепланировкой",
  outcome: "Приобрести объект, если юридический риск можно устранить.",
  decision: "Приобрести объект, если юридический риск можно устранить.",
  determiningFact: "Можно ли полностью легализовать перепланировку до завершения сделки?",
};

const houseRecord = decisionRecord({
  decision: "Завершить покупку после подтверждения юридической допустимости.",
  outcome: "Завершить сделку после подтверждения юридической допустимости.",
  determiningFact: "Снимается ли юридический риск после исправления документов?",
  factualOutcome: "Сделка завершена после устранения риска.",
  analysisKey: "house",
});

const houseCase = source("hist-house", "Покупка дома — разрешение на пристройку", houseRecord);

const poolRecord = decisionRecord({
  closedAt: "2026-08-01T10:00:00.000Z",
  decision: "Сменить подрядчика после повторного срыва графика работ.",
  outcome: "Обеспечить регулярное обслуживание бассейна без простоев.",
  determiningFact: "Подтверждён ли систематический срыв сроков текущим подрядчиком?",
  factualOutcome: "Подрядчик заменён. В договоре был риск штрафа.",
  analysisKey: "pool",
});

const poolCase = source("hist-pool", "Замена подрядчика по обслуживанию бассейна", poolRecord);

function find(current: CurrentDecisionQuery, historical: HistoricalCaseSource[]) {
  return findRelevantPastDecisions({ current, historical });
}

// A. genuinely similar historical resolved record
const similar = find(apartmentCurrent, [houseCase, poolCase]);
assert(similar.length === 1, `A: only the similar record should return, got ${similar.length}`);
assert(similar[0].sourceCaseId === "hist-house", "A: house purchase ranks as relevant");
assert(similar[0].decisionStatusAtClose === "resolved", "A: resolved record is returned as resolved");
assert(similar[0].decision.includes("юридической допустимости"), "A: actual decision is shown");
assert((similar[0].relevanceScore ?? 0) >= RELEVANT_PAST_DECISIONS_MIN_SCORE, "A: score meets threshold");

const houseDebug = scoreRelevantPastDecision(
  apartmentCurrent,
  extractHistoricalDecisionRecords([houseCase])[0],
);
assert(houseDebug.sharedTokens.length >= 2, `A: similar records share tokens, got ${houseDebug.sharedTokens.join(",")}`);
assert(
  houseDebug.sharedTokens.some((token) => token.startsWith("юридическ") || token.startsWith("риск") || token.startsWith("сдел")),
  "A: overlap is in decision-relevant tokens",
);

// B. unrelated record
const unrelated = find(apartmentCurrent, [poolCase]);
assert(unrelated.length === 0, "B: pool contractor is not returned from generic overlap");

// C. fewer than 3 relevant records
const fewer = find(apartmentCurrent, [houseCase, poolCase]);
assert(fewer.length === 1, "C: only relevant records shown");

const landRecord = decisionRecord({
  closedAt: "2026-07-02T10:00:00.000Z",
  decision: "Заключить сделку после снятия юридического риска по земле.",
  outcome: "Приобрести участок, если правовой риск устраним до сделки.",
  determiningFact: "Можно ли устранить юридический риск до завершения покупки?",
  factualOutcome: "Сделка проведена после исправления документов.",
  analysisKey: "land",
});
const landCase = source("hist-land", "Покупка участка — правовой риск", landRecord);

const permitRecord = decisionRecord({
  closedAt: "2026-06-02T10:00:00.000Z",
  decision: "Продолжить покупку после подтверждения допустимости перепланировки.",
  outcome: "Купить объект при устранимом юридическом риске.",
  determiningFact: "Легализуется ли перепланировка до завершения сделки?",
  factualOutcome: "Риск снят, сделка завершена.",
  analysisKey: "permit",
});
const permitCase = source("hist-permit", "Квартира — согласование перепланировки", permitRecord);

const annexRecord = decisionRecord({
  closedAt: "2026-05-02T10:00:00.000Z",
  decision: "Завершить приобретение после юридической проверки пристройки.",
  outcome: "Приобрести дом, если юридический риск по пристройке снимается.",
  determiningFact: "Снимается ли юридический риск после исправления?",
  factualOutcome: "Документы исправлены, сделка завершена.",
  analysisKey: "annex",
});
const annexCase = source("hist-annex", "Дом с пристройкой — юридическая проверка", annexRecord);

// D. more than 3 relevant records
const moreThanThree = find(apartmentCurrent, [houseCase, landCase, permitCase, annexCase]);
assert(moreThanThree.length === RELEVANT_PAST_DECISIONS_MAX, "D: top 3 only");
assert(
  new Set(moreThanThree.map((item) => item.sourceCaseId)).size === 3,
  "D: three distinct source cases",
);

// E. weak matches below threshold
const weakRecord = decisionRecord({
  closedAt: "2026-04-01T10:00:00.000Z",
  decision: "Продлить договор страхования на следующий год.",
  outcome: "Сохранить покрытие без изменения условий.",
  determiningFact: "Нужно ли менять лимиты по текущему полису?",
  factualOutcome: "Договор продлён. Риск остался прежним.",
  analysisKey: "weak",
});
const weakCase = source("hist-weak", "Продление страхового договора", weakRecord);
const weak = find(apartmentCurrent, [weakCase]);
assert(weak.length === 0, "E: weak matches below threshold are not shown");

// F. resolved vs unresolved historical records
const unresolvedTwin = decisionRecord({
  closedAt: "2026-09-10T10:00:00.000Z",
  decisionStatusAtClose: "unresolved",
  decision: "Завершать покупку сейчас — или ждать подтверждения юридической допустимости.",
  outcome: "Завершить сделку после подтверждения юридической допустимости.",
  determiningFact: "Снимается ли юридический риск после исправления документов?",
  factualOutcome: "Кейс закрыт до получения ответа юриста.",
  analysisKey: "unresolved-twin",
});
const unresolvedCase = source("hist-unresolved", "Покупка дома — разрешение на пристройку", unresolvedTwin);
const rankedStatus = find(apartmentCurrent, [unresolvedCase, houseCase]);
assert(rankedStatus.length >= 1, "F: comparable historical records are returned");
assert(rankedStatus[0].sourceCaseId === "hist-house", "F: resolved is preferred when otherwise comparable");
assert(rankedStatus[0].decisionStatusAtClose === "resolved", "F: first result is resolved");
const unresolvedHit = rankedStatus.find((item) => item.sourceCaseId === "hist-unresolved");
if (unresolvedHit) {
  assert(unresolvedHit.decisionStatusAtClose === "unresolved", "F: unresolved stays marked unresolved");
}

const unresolvedOnly = find(apartmentCurrent, [unresolvedCase]);
if (unresolvedOnly.length > 0) {
  assert(unresolvedOnly[0].decisionStatusAtClose === "unresolved", "F: unresolved record is not treated as resolved");
}

assert(
  unresolvedHistoricalDecisionCopy() === "Кейс был закрыт без окончательного определения решения.",
  "F: unresolved copy is explicit",
);

// G. current case excluded
const selfCase = source("current-apartment", apartmentCurrent.title ?? "", houseRecord);
const selfMatch = find(apartmentCurrent, [selfCase, houseCase]);
assert(
  selfMatch.every((item) => item.sourceCaseId !== "current-apartment"),
  "G: current case is excluded",
);
assert(selfMatch.some((item) => item.sourceCaseId === "hist-house"), "G: other cases can still match");

const extractedSelf = extractHistoricalDecisionRecords([selfCase, houseCase], "current-apartment");
assert(
  extractedSelf.every((item) => item.sourceCaseId !== "current-apartment"),
  "G: extractor excludes the current case",
);

// H. archived Decision Record extraction
const archivedOnly = source("hist-archived", "Покупка дома — разрешение на пристройку", null, [
  {
    archivedAt: "2026-09-12T10:00:00.000Z",
    analysis: { decisionStatus: "resolved" },
    executionStep: null,
    executionOwner: null,
    executionStatus: null,
    executionUpdatedAt: null,
    closedAt: "2026-09-11T10:00:00.000Z",
    decisionRecord: houseRecord,
  },
]);
const archived = extractHistoricalDecisionRecords([archivedOnly]);
assert(archived.length === 1, "H: archived Decision Record is extracted");
assert(archived[0].sourceCaseId === "hist-archived", "H: archived record keeps source case id");
assert(archived[0].decision.includes("юридической допустимости"), "H: archived decision text is kept");
const archivedMatch = find(apartmentCurrent, [archivedOnly]);
assert(archivedMatch.length === 1, "H: archived record can rank as relevant");

const duplicateCycles = find(apartmentCurrent, [
  source("hist-dup", "Покупка дома — разрешение на пристройку", houseRecord, [
    {
      archivedAt: "2026-09-12T10:00:00.000Z",
      analysis: { decisionStatus: "resolved" },
      executionStep: null,
      executionOwner: null,
      executionStatus: null,
      executionUpdatedAt: null,
      closedAt: "2026-08-01T10:00:00.000Z",
      decisionRecord: decisionRecord({
        ...houseRecord,
        closedAt: "2026-08-01T10:00:00.000Z",
        cycleNumber: 2,
        analysisKey: "house-2",
      }),
    },
  ]),
]);
assert(duplicateCycles.length === 1, "H: one card per source case even if several cycles match");

// I. malformed historical JSON
const malformed = extractHistoricalDecisionRecords([
  source("bad-1", "Broken", "{not-json"),
  source("bad-2", "Broken history", undefined, "not-an-array"),
  source("bad-3", "Partial", { version: 1 }),
  source("bad-4", "Cycle junk", null, [
    { archivedAt: "2026-01-01T00:00:00.000Z", decisionRecord: "nope" },
    { archivedAt: "2026-01-02T00:00:00.000Z", decisionRecord: { version: 99, decision: "x" } },
  ]),
  houseCase,
]);
assert(
  malformed.every((item) => item.sourceCaseId === "hist-house"),
  "I: malformed JSON is skipped without crash",
);

// J. legacy closed case without Decision Record
const legacy = extractHistoricalDecisionRecords([
  {
    id: "legacy-closed",
    title: "Покупка квартиры с неузаконенной перепланировкой",
    decisionRecord: null,
    decisionCycleHistory: [
      {
        archivedAt: "2026-01-01T00:00:00.000Z",
        analysis: {
          decisionStatus: "resolved",
          sections: [
            { title: "Желаемый результат", content: "Приобрести объект." },
            { title: "Main Decision Fork", content: "Решение определено: купить." },
          ],
        },
        executionStep: null,
        executionOwner: null,
        executionStatus: null,
        executionUpdatedAt: null,
        closedAt: "2026-01-01T00:00:00.000Z",
      },
    ],
  },
]);
assert(legacy.length === 0, "J: legacy closed case without Decision Record is not fabricated");

// K. normal closed current case
assert(
  shouldShowRelevantPastDecisions({ lifecycleState: "closed", reopenSuggestionVisible: false }) === false,
  "K: section is hidden on a normally closed case",
);
assert(
  shouldShowRelevantPastDecisions({ lifecycleState: "under_analysis", reopenSuggestionVisible: false }) === true,
  "K: section is available on an active case",
);

// L. closed + active reopenSuggestion
assert(
  shouldShowRelevantPastDecisions({ lifecycleState: "closed", reopenSuggestionVisible: true }) === true,
  "L: closed case with reopen suggestion may show precedents",
);

// M. no additional AI call — retrieval stays deterministic/read-only
const helperSource = readFileSync(path.join(root, "src/lib/relevant-past-decisions.ts"), "utf8");
assert(!helperSource.includes("openai"), "M: matcher does not import OpenAI");
assert(!helperSource.includes("continueAnalysis"), "M: matcher does not call continueAnalysis");
assert(!helperSource.includes("generateAnalysis"), "M: matcher does not call generateAnalysis");
assert(!helperSource.includes("embeddings"), "M: matcher does not use embeddings");
assert(helperSource.includes("weightedJaccard"), "M: retrieval is deterministic token overlap");

// N. no Decision Engine prompt includes Relevant Past Decisions
const promptFiles = [
  "src/core/orchestration/analysis-ai.ts",
  "src/core/orchestration/analysis-generate.ts",
  "src/core/orchestration/analysis-priority.ts",
  "src/core/orchestration/lifecycle-suggestion.ts",
  "src/lib/case-execution.ts",
  "src/lib/decision-change-summary.ts",
  "src/app/cases/[id]/dialogue-actions.ts",
];
for (const relative of promptFiles) {
  const sourceText = readFileSync(path.join(root, relative), "utf8");
  assert(!sourceText.includes("RelevantPast"), `${relative} must not mention Relevant Past Decisions`);
  assert(!sourceText.includes("findRelevantPastDecisions"), `${relative} must not retrieve past decisions`);
  assert(!sourceText.includes("Похожие прошлые решения"), `${relative} must not inject past-decision UI copy`);
  assert(!sourceText.includes("Похожие прошлые кейсы"), `${relative} must not inject past-case UI copy`);
}

const page = readFileSync(path.join(root, "src/app/cases/[id]/page.tsx"), "utf8");
const ui = readFileSync(path.join(root, "src/app/cases/[id]/RelevantPastDecisions.tsx"), "utf8");
const contextUi = readFileSync(path.join(root, "src/app/cases/[id]/ReasoningContext.tsx"), "utf8");
assert(page.includes("visibleHistoricalDecisionCards"), "retrieval is delegated to the helper");
assert(!page.includes("tokenizeRelevanceText"), "matching logic stays out of page.tsx");
assert(contextUi.includes("RelevantPastDecisions"), "historical cards live inside Reasoning Context");
assert(
  page.indexOf("</CaseDialogueLauncher>") < page.indexOf("ReasoningContext principles"),
  "UI sits below Decision / Next Step / FO Brain guidance",
);
assert(
  page.indexOf("ReasoningContext principles") < page.indexOf("Дополнительно"),
  "UI stays above Дополнительно",
);
assert(page.includes("showReasoningContext ?"), "K: closed workspace can hide the section");
assert(!ui.includes("relevanceScore"), "relevanceScore is not exposed in the UI");
assert(!ui.includes("%"), "UI does not show similarity percentages");
assert(!ui.includes("Похожих решений не найдено"), "empty state renders nothing");
assert(ui.includes("items.length === 0"), "empty list returns nothing");
assert(ui.includes("Похожие прошлые кейсы"), "section title is past cases, not only past decisions");
assert(ui.includes('"Решение"'), "resolved cards keep the Решение label");
assert(ui.includes("Статус решения"), "unresolved cards use Статус решения");
assert(ui.includes("Ключевая неопределённость"), "unresolved cards keep the uncertainty label");
assert(ui.includes("Фактический итог"), "cards keep factual outcome");
assert(ui.includes("Открыть кейс"), "each result can open the source case");
assert(ui.includes("unresolvedHistoricalDecisionCopy"), "unresolved records use distinct copy");
assert(!ui.includes("87%"), "no numeric similarity claim in UI");

console.log("Relevant past decisions test passed.");
