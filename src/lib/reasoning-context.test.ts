import { readFileSync } from "fs";
import path from "path";
import { SECTION_TITLES } from "@/core/orchestration/analysis-core";
import { parseFamilyOfficeKnowledge, type FamilyOfficeKnowledgeItem } from "@/lib/family-office-knowledge";
import {
  hasReasoningContextContent,
  REASONING_CONTEXT_ROLE_LINE,
  shouldShowReasoningContext,
} from "@/lib/reasoning-context";
import {
  RELEVANT_PRINCIPLES_MAX,
  findRelevantPrinciples,
} from "@/lib/relevant-principles";
import {
  findRelevantPastDecisions,
  type CurrentDecisionQuery,
  type HistoricalCaseSource,
} from "@/lib/relevant-past-decisions";
import type { DecisionRecord } from "@/lib/decision-record";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

const root = process.cwd();

const legalCurrent: CurrentDecisionQuery = {
  caseId: "current-legal",
  title: "Покупка квартиры с неузаконенной перепланировкой",
  outcome: "Приобрести объект, если юридический риск можно устранить в рамках закона.",
  decision: "Завершать сделку после подтверждения юридической допустимости в стране сделки.",
  determiningFact: "Можно ли полностью легализовать перепланировку до завершения сделки по закону этой страны?",
};

const poolCurrent: CurrentDecisionQuery = {
  caseId: "current-pool",
  title: "Замена подрядчика по обслуживанию бассейна",
  outcome: "Обеспечить регулярное обслуживание без простоев.",
  decision: "Сменить подрядчика после повторного срыва графика работ.",
  determiningFact: "Подтверждён ли систематический срыв сроков текущим подрядчиком?",
};

const lawPrinciple: FamilyOfficeKnowledgeItem = {
  id: "p_act_within_law",
  kind: "principle",
  title: "Family Office всегда действует строго в рамках закона той страны, где совершается действие",
  principle:
    "Family Office всегда действует строго в рамках закона той страны, где совершается действие. Единственный безусловный принцип базы — не смягчается ставкой или необратимостью.",
  source: "Family Office Decision Principles",
};

const mandatePrinciple: FamilyOfficeKnowledgeItem = {
  id: "p_core",
  kind: "principle",
  title: "Принципал решает необратимое / FO исполняет обратимое",
  principle:
    "Принципал решает необратимые и ценностные развилки; всё обратимое внутри уже одобренной границы — зона исполнения FO без согласования каждого шага.",
};

const thirdPathPrinciple: FamilyOfficeKnowledgeItem = {
  id: "p_dont_limit_to_obvious_menu",
  kind: "principle",
  title: "Не ограничиваться очевидным набором путей",
  principle:
    "Искать инструмент, который закрывает суть юридического требования, а не идти по первому предложенному пути легализации сделки.",
};

const legalPattern: FamilyOfficeKnowledgeItem = {
  id: "pat_legal_permit",
  kind: "pattern",
  title: "Легализация объекта до завершения сделки",
  principle: "Юридический риск по перепланировке снимается только после легализации объекта до завершения сделки.",
};

const knowledge = [lawPrinciple, mandatePrinciple, thirdPathPrinciple, legalPattern];

// A. relevant existing principle appears
const legalHits = findRelevantPrinciples({ current: legalCurrent, items: knowledge });
assert(legalHits.some((item) => item.id === "p_act_within_law"), "A: relevant law principle appears");
assert(legalHits.every((item) => item.kind === "principle" || item.kind === "pattern"), "A: kind is preserved");
assert(!legalHits.some((item) => item.relevanceReason), "A: no fabricated relevance prose");

// B. no relevant principle
const poolHits = findRelevantPrinciples({ current: poolCurrent, items: knowledge });
assert(poolHits.length === 0, "B: unrelated case does not get a weak principle");

// C. max principles
const extraLegal: FamilyOfficeKnowledgeItem = {
  id: "p_legal_extra",
  kind: "principle",
  title: "Юридическая допустимость сделки важнее скорости закрытия",
  principle:
    "Не завершать сделку, пока юридический риск по объекту не устранён в рамках закона страны сделки и перепланировка не легализована.",
};
const tooMany = findRelevantPrinciples({
  current: legalCurrent,
  items: [...knowledge, extraLegal],
});
assert(tooMany.length <= RELEVANT_PRINCIPLES_MAX, "C: no more than 2 principles");

// D. principle source shown only when real
assert(legalHits.find((item) => item.id === "p_act_within_law")?.source === "Family Office Decision Principles", "D: real source is kept");
const unsourced = findRelevantPrinciples({
  current: legalCurrent,
  items: [{ ...lawPrinciple, source: undefined }],
});
assert(!unsourced[0]?.source, "D: missing source is not fabricated");

const parsedKb = parseFamilyOfficeKnowledge({
  principles: [
    {
      id: "p_with_file",
      title: "Не принимать формулировку контрагента как установленный факт",
      promptSummary: "Никогда не принимать формулировку другой стороны как установленный факт.",
      source: "decision-engine.md v0.30",
    },
  ],
  patterns: [],
});
assert(!parsedKb[0]?.source, "D: file-path sources are not exposed");

// E. relevant historical case — existing matcher still works
function decisionRecord(partial: Partial<DecisionRecord> & Pick<DecisionRecord, "decision">): DecisionRecord {
  return {
    version: 1,
    closedAt: partial.closedAt ?? "2026-09-16T10:00:00.000Z",
    cycleNumber: partial.cycleNumber ?? 1,
    analysisKey: partial.analysisKey ?? "cycle-key",
    decisionStatusAtClose: partial.decisionStatusAtClose ?? "resolved",
    outcome: partial.outcome ?? partial.decision,
    decision: partial.decision,
    determiningFact: partial.determiningFact,
    factualOutcome: partial.factualOutcome,
  };
}

const houseCase: HistoricalCaseSource = {
  id: "hist-house",
  title: "Покупка дома — разрешение на пристройку",
  decisionRecord: decisionRecord({
    decision: "Завершить покупку после подтверждения юридической допустимости.",
    outcome: "Завершить сделку после подтверждения юридической допустимости.",
    determiningFact: "Снимается ли юридический риск после исправления документов?",
    factualOutcome: "Сделка завершена после устранения риска.",
  }),
};
const past = findRelevantPastDecisions({ current: legalCurrent, historical: [houseCase] });
assert(past.length === 1 && past[0].sourceCaseId === "hist-house", "E: existing historical matcher still works");

// F. principle + historical case under one section
assert(
  hasReasoningContextContent({ principles: legalHits, pastDecisions: past }) === true,
  "F: both kinds of context can appear together",
);

// G. no principle + no precedent
assert(hasReasoningContextContent({ principles: [], pastDecisions: [] }) === false, "G: empty context is hidden");

// H/I. current facts and determining fact remain unchanged
const analysis = {
  decisionStatus: "unresolved" as const,
  sections: [
    { title: SECTION_TITLES[0], content: legalCurrent.outcome },
    { title: SECTION_TITLES[1], content: legalCurrent.decision },
    { title: SECTION_TITLES[2], content: legalCurrent.determiningFact },
  ],
};
const before = JSON.stringify(analysis);
findRelevantPrinciples({ current: { ...legalCurrent }, items: knowledge });
findRelevantPastDecisions({ current: { ...legalCurrent }, historical: [houseCase] });
assert(JSON.stringify(analysis) === before, "H: context retrieval cannot mutate analysis");
assert(analysis.sections[2]?.content === legalCurrent.determiningFact, "I: determining fact is unchanged");

// J. past decisions not added to any AI prompt
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
  assert(!sourceText.includes("findRelevantPastDecisions"), `${relative} must not retrieve past decisions`);
  assert(!sourceText.includes("findRelevantPrinciples"), `${relative} must not retrieve reasoning-context principles`);
  assert(!sourceText.includes("Контекст решения"), `${relative} must not inject Reasoning Context UI copy`);
  assert(!sourceText.includes("Похожие прошлые кейсы"), `${relative} must not inject past-case UI copy`);
}

const analysisType = readFileSync(path.join(root, "src/core/orchestration/analysis-core.ts"), "utf8");
const analysisResultBlock = analysisType.slice(
  analysisType.indexOf("export type AnalysisResult"),
  analysisType.indexOf("export const RESOLVED_DETERMINING_FACT"),
);
assert(analysisResultBlock.includes("export type AnalysisResult"), "AnalysisResult type remains the contract");
assert(!analysisResultBlock.includes("principle"), "AnalysisResult still does not select principles");

// K. principle retrieval adds no AI call
const principleSource = readFileSync(path.join(root, "src/lib/relevant-principles.ts"), "utf8");
const knowledgeSource = readFileSync(path.join(root, "src/lib/family-office-knowledge.ts"), "utf8");
assert(!principleSource.includes("openai"), "K: principle matcher does not import OpenAI");
assert(!principleSource.includes("embeddings"), "K: no embeddings");
assert(principleSource.includes("tokenizeRelevanceText"), "K: reuses deterministic normalization");
assert(knowledgeSource.includes("seed-data.json"), "K: principles come from the curated KB");
assert(!knowledgeSource.includes("writeFile"), "K: knowledge loader does not write the KB");

// L/M visibility
assert(
  shouldShowReasoningContext({ lifecycleState: "closed", reopenSuggestionVisible: false }) === false,
  "L: hidden on a normally closed case",
);
assert(
  shouldShowReasoningContext({ lifecycleState: "closed", reopenSuggestionVisible: true }) === true,
  "M: closed + reopen may show context",
);
assert(
  shouldShowReasoningContext({ lifecycleState: "waiting_for_fact", reopenSuggestionVisible: false }) === true,
  "M: active cases may show context",
);

// N. malformed knowledge item skipped
const malformed = parseFamilyOfficeKnowledge({
  principles: [
    { id: "bad" },
    { id: "p_ok", title: "p_ok", statement: "too-id-like title" },
    null,
    "nope",
    {
      id: "p_good",
      title: "Не принимать формулировку контрагента как установленный факт",
      promptSummary: "Никогда не принимать формулировку другой стороны как установленный факт.",
    },
  ],
  patterns: [{ archivedAt: true }, { id: "pat_x" }],
});
assert(
  malformed.every((item) => item.id === "p_good"),
  "N: malformed knowledge items are skipped",
);
assert(findRelevantPrinciples({ current: legalCurrent, items: malformed }).every((item) => item.id !== "bad"), "N: retrieval survives malformed items");

const page = readFileSync(path.join(root, "src/app/cases/[id]/page.tsx"), "utf8");
const contextUi = readFileSync(path.join(root, "src/app/cases/[id]/ReasoningContext.tsx"), "utf8");
const pastUi = readFileSync(path.join(root, "src/app/cases/[id]/RelevantPastDecisions.tsx"), "utf8");
assert(page.includes("ReasoningContext"), "workspace renders one Reasoning Context section");
assert(page.includes("findRelevantPrinciples"), "principle retrieval is delegated");
assert(page.includes("findRelevantPastDecisions"), "historical retrieval is reused");
assert(!page.includes("tokenizeRelevanceText"), "matching stays out of page.tsx");
assert(page.includes("shouldShowReasoningContext"), "visibility is helper-gated");
assert(
  page.indexOf("</CaseDialogueLauncher>") < page.indexOf("ReasoningContext principles"),
  "F: context sits below Decision / Next Step / FO Brain guidance",
);
assert(
  page.indexOf("ReasoningContext principles") < page.indexOf("Дополнительно"),
  "F: context stays above Дополнительно",
);
assert(!page.includes("<RelevantPastDecisions"), "historical cards are not duplicated on the page");
assert(contextUi.includes("RelevantPastDecisions"), "F: past decisions are nested in Reasoning Context");
assert(contextUi.includes("Контекст решения"), "section title is Контекст решения");
assert(
  REASONING_CONTEXT_ROLE_LINE === "Контекст помогает проверить логику решения, но не заменяет факты текущего кейса.",
  "role line copy is exact",
);
assert(contextUi.includes("REASONING_CONTEXT_ROLE_LINE"), "role line is present");
assert(contextUi.includes("Паттерн"), "pattern label is available");
assert(contextUi.includes("Принцип"), "principle label is available");
assert(contextUi.includes("item.source"), "D: source renders only when present");
assert(!contextUi.includes("relevanceScore"), "score is not shown");
assert(!contextUi.includes("sky-"), "no operational blue");
assert(!contextUi.includes("amber-"), "no uncertainty amber");
assert(!contextUi.includes("emerald-"), "no resolved green");
assert(!contextUi.includes("red-"), "no urgency red");
assert(pastUi.includes("embedded"), "past-decision cards can nest");
assert(page.includes("showReasoningContext ?"), "L: closed workspace can hide the section");

console.log("Reasoning context test passed.");
