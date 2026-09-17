import type { PrecedentContextRef } from "@/core/orchestration/analysis-core";
import { parseDecisionCycleHistory } from "@/lib/decision-cycle";
import {
  formatDecisionRecordClosedAt,
  parseDecisionRecord,
  usableDeterminingFact,
  type DecisionRecord,
} from "@/lib/decision-record";

export const RELEVANT_PAST_DECISIONS_MAX = 3;
export const RELEVANT_PAST_DECISIONS_MIN_SCORE = 0.14;
export const RELEVANT_PAST_DECISIONS_MIN_SHARED_TOKENS = 2;
export const RELEVANT_PAST_DECISIONS_RESOLVED_TIE = 0.04;
export const RELEVANT_PAST_DECISIONS_MEMORY_CHARS = 800;

const STOP_WORDS = new Set([
  "and",
  "the",
  "for",
  "with",
  "from",
  "или",
  "либо",
  "если",
  "как",
  "что",
  "чтобы",
  "это",
  "этот",
  "эта",
  "эти",
  "все",
  "уже",
  "ещё",
  "еще",
  "был",
  "была",
  "было",
  "были",
  "будет",
  "быть",
  "есть",
  "нет",
  "после",
  "перед",
  "между",
  "через",
  "можно",
  "нужно",
  "надо",
  "также",
  "только",
  "более",
  "менее",
  "очень",
  "кейс",
  "случае",
]);

const FIELD_WEIGHTS = {
  determiningFact: 3,
  decision: 2.5,
  outcome: 2,
  title: 1.5,
  resolvingEvidence: 1,
  factualOutcome: 0.8,
  caseMemory: 0.7,
  facts: 1.2,
} as const;

export type HistoricalCaseSource = {
  id: string;
  title: string;
  decisionRecord?: unknown;
  decisionCycleHistory?: unknown;
};

export type HistoricalDecisionMemory = {
  sourceCaseId: string;
  sourceCaseTitle: string;
  cycleNumber: number;
  closedAt: string;
  analysisKey?: string;
  decisionStatusAtClose: DecisionRecord["decisionStatusAtClose"];
  outcome: string;
  decision: string;
  determiningFact?: string;
  resolvingEvidence?: string;
  factualOutcome?: string;
};

export type CurrentDecisionQuery = {
  caseId: string;
  title?: string | null;
  outcome?: string | null;
  decision?: string | null;
  determiningFact?: string | null;
  caseMemory?: string | null;
  /** Optional current-case facts; used for analysis matching, not display ranking. */
  facts?: string | null;
};

export type RelevantPastDecision = {
  sourceCaseId: string;
  sourceCaseTitle: string;
  cycleNumber: number;
  closedAt: string;
  analysisKey?: string;
  decisionStatusAtClose: DecisionRecord["decisionStatusAtClose"];
  outcome?: string;
  decision: string;
  determiningFact?: string;
  resolvingEvidence?: string;
  factualOutcome?: string;
  relevanceScore: number;
};

export type RelevanceMatchDebug = {
  score: number;
  sharedTokens: string[];
};

type WeightedBag = Map<string, number>;

function compact(value: unknown): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function stemToken(token: string): string {
  const value = token.replace(/ё/g, "е");
  if (value.length <= 4) return value;
  const stripped = value.replace(
    /(иями|ями|ами|ого|ему|ому|ыми|ими|ение|ения|ению|ением|ениях|ая|ое|ые|ие|ый|ий|ой|ою|ею|ую|юю|ах|ях|ом|ем|ам|ям|ов|ев|ей|ых|их|ить|ать|ять|ена|ено|ены|тся|ться)$/u,
    "",
  );
  if (stripped.length >= 4) return stripped;
  const shorter = value.replace(/(ка|ки|ке|ку)$/u, "");
  return shorter.length >= 4 ? shorter : value.slice(0, 5);
}

export function tokenizeRelevanceText(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !STOP_WORDS.has(token))
    .map(stemToken);
}

function addTokens(bag: WeightedBag, text: string, weight: number): void {
  if (!compact(text) || weight <= 0) return;
  for (const token of tokenizeRelevanceText(text)) {
    bag.set(token, (bag.get(token) ?? 0) + weight);
  }
}

function bagFromFields(fields: Array<{ text?: string | null; weight: number }>): WeightedBag {
  const bag: WeightedBag = new Map();
  for (const field of fields) {
    addTokens(bag, compact(field.text), field.weight);
  }
  return bag;
}

function cappedMemory(value: string | null | undefined): string {
  const text = compact(value);
  if (!text) return "";
  return text.length > RELEVANT_PAST_DECISIONS_MEMORY_CHARS
    ? text.slice(0, RELEVANT_PAST_DECISIONS_MEMORY_CHARS)
    : text;
}

export function currentDecisionQueryFromWorkspace(input: {
  caseId: string;
  title?: string | null;
  outcome?: string | null;
  decision?: string | null;
  determiningFact?: string | null;
  caseMemory?: string | null;
  facts?: string | null;
}): CurrentDecisionQuery {
  return {
    caseId: input.caseId,
    title: compact(input.title) || null,
    outcome: compact(input.outcome) || null,
    decision: compact(input.decision) || null,
    determiningFact: usableDeterminingFact(input.determiningFact),
    caseMemory: cappedMemory(input.caseMemory) || null,
    facts: compact(input.facts) || null,
  };
}

function currentCoreBag(current: CurrentDecisionQuery): WeightedBag {
  const query = currentDecisionQueryFromWorkspace(current);
  return bagFromFields([
    { text: query.determiningFact, weight: FIELD_WEIGHTS.determiningFact },
    { text: query.decision, weight: FIELD_WEIGHTS.decision },
    { text: query.outcome, weight: FIELD_WEIGHTS.outcome },
    { text: query.title, weight: FIELD_WEIGHTS.title },
    { text: query.facts, weight: FIELD_WEIGHTS.facts },
  ]);
}

function memoryOverlapBag(current: CurrentDecisionQuery, candidate: WeightedBag): WeightedBag {
  const memory = bagFromFields([
    {
      text: currentDecisionQueryFromWorkspace(current).caseMemory,
      weight: FIELD_WEIGHTS.caseMemory,
    },
  ]);
  const overlap: WeightedBag = new Map();
  for (const [token, weight] of memory) {
    if (candidate.has(token)) overlap.set(token, weight);
  }
  return overlap;
}

function mergeBags(left: WeightedBag, right: WeightedBag): WeightedBag {
  const merged: WeightedBag = new Map(left);
  for (const [token, weight] of right) {
    merged.set(token, (merged.get(token) ?? 0) + weight);
  }
  return merged;
}

function historicalBag(record: HistoricalDecisionMemory): WeightedBag {
  return bagFromFields([
    { text: record.determiningFact, weight: FIELD_WEIGHTS.determiningFact },
    { text: record.decision, weight: FIELD_WEIGHTS.decision },
    { text: record.outcome, weight: FIELD_WEIGHTS.outcome },
    { text: record.sourceCaseTitle, weight: FIELD_WEIGHTS.title },
    { text: record.resolvingEvidence, weight: FIELD_WEIGHTS.resolvingEvidence },
    { text: record.factualOutcome, weight: FIELD_WEIGHTS.factualOutcome },
  ]);
}

function weightedJaccard(left: WeightedBag, right: WeightedBag): number {
  if (left.size === 0 || right.size === 0) return 0;
  const tokens = new Set([...left.keys(), ...right.keys()]);
  let intersection = 0;
  let union = 0;
  for (const token of tokens) {
    const a = left.get(token) ?? 0;
    const b = right.get(token) ?? 0;
    intersection += Math.min(a, b);
    union += Math.max(a, b);
  }
  return union > 0 ? intersection / union : 0;
}

function sharedTokens(left: WeightedBag, right: WeightedBag): string[] {
  return [...left.keys()].filter((token) => right.has(token)).sort();
}

function hasMeaningfulContent(
  record: Pick<HistoricalDecisionMemory, "decision" | "determiningFact" | "outcome" | "factualOutcome">,
): boolean {
  return (
    compact(record.decision).length >= 8 ||
    compact(record.determiningFact).length >= 8 ||
    compact(record.outcome).length >= 8 ||
    compact(record.factualOutcome).length >= 8
  );
}

function memoryKey(
  record: Pick<HistoricalDecisionMemory, "sourceCaseId" | "cycleNumber" | "closedAt">,
): string {
  return `${record.sourceCaseId}:${record.cycleNumber}:${record.closedAt}`;
}

function fromParsedRecord(
  source: HistoricalCaseSource,
  parsed: DecisionRecord,
): HistoricalDecisionMemory | null {
  const memory: HistoricalDecisionMemory = {
    sourceCaseId: source.id,
    sourceCaseTitle: compact(source.title) || source.id,
    cycleNumber: parsed.cycleNumber,
    closedAt: parsed.closedAt,
    decisionStatusAtClose: parsed.decisionStatusAtClose,
    outcome: parsed.outcome,
    decision: parsed.decision,
  };
  if (parsed.analysisKey) memory.analysisKey = parsed.analysisKey;
  if (parsed.determiningFact) memory.determiningFact = parsed.determiningFact;
  if (parsed.resolvingEvidence) memory.resolvingEvidence = parsed.resolvingEvidence;
  if (parsed.factualOutcome) memory.factualOutcome = parsed.factualOutcome;
  if (!hasMeaningfulContent(memory)) return null;
  return memory;
}

/** Extracts verified Decision Records from cases. Skips malformed JSON. Never fabricates records. */
export function extractHistoricalDecisionRecords(
  cases: HistoricalCaseSource[],
  excludeCaseId?: string,
): HistoricalDecisionMemory[] {
  const byKey = new Map<string, HistoricalDecisionMemory>();

  for (const source of cases) {
    if (!source?.id || source.id === excludeCaseId) continue;

    try {
      const active = parseDecisionRecord(source.decisionRecord);
      if (active) {
        const memory = fromParsedRecord(source, active);
        if (memory) byKey.set(memoryKey(memory), memory);
      }
    } catch {
      // skip malformed active record
    }

    let cycles: ReturnType<typeof parseDecisionCycleHistory> = [];
    try {
      cycles = parseDecisionCycleHistory(source.decisionCycleHistory);
    } catch {
      cycles = [];
    }

    for (const cycle of cycles) {
      try {
        const parsed = parseDecisionRecord(cycle.decisionRecord);
        if (!parsed) continue;
        const memory = fromParsedRecord(source, parsed);
        if (memory) byKey.set(memoryKey(memory), memory);
      } catch {
        // skip malformed archived record
      }
    }
  }

  return [...byKey.values()];
}

export function scoreRelevantPastDecision(
  current: CurrentDecisionQuery,
  historical: HistoricalDecisionMemory,
): RelevanceMatchDebug {
  const candidate = historicalBag(historical);
  const query = mergeBags(currentCoreBag(current), memoryOverlapBag(current, candidate));
  return {
    score: weightedJaccard(query, candidate),
    sharedTokens: sharedTokens(query, candidate),
  };
}

function toPresentation(record: HistoricalDecisionMemory, score: number): RelevantPastDecision {
  const item: RelevantPastDecision = {
    sourceCaseId: record.sourceCaseId,
    sourceCaseTitle: record.sourceCaseTitle,
    cycleNumber: record.cycleNumber,
    closedAt: record.closedAt,
    decisionStatusAtClose: record.decisionStatusAtClose,
    decision: record.decision,
    relevanceScore: score,
  };
  if (record.analysisKey) item.analysisKey = record.analysisKey;
  if (record.outcome) item.outcome = record.outcome;
  if (record.determiningFact) item.determiningFact = record.determiningFact;
  if (record.resolvingEvidence) item.resolvingEvidence = record.resolvingEvidence;
  if (record.factualOutcome) item.factualOutcome = record.factualOutcome;
  return item;
}

export function findRelevantPastDecisions(input: {
  current: CurrentDecisionQuery;
  historical: HistoricalCaseSource[];
  maxResults?: number;
  minScore?: number;
  minSharedTokens?: number;
  resolvedOnly?: boolean;
}): RelevantPastDecision[] {
  const maxResults = input.maxResults ?? RELEVANT_PAST_DECISIONS_MAX;
  const minScore = input.minScore ?? RELEVANT_PAST_DECISIONS_MIN_SCORE;
  const minSharedTokens = input.minSharedTokens ?? RELEVANT_PAST_DECISIONS_MIN_SHARED_TOKENS;
  if (currentCoreBag(input.current).size === 0) return [];

  const records = extractHistoricalDecisionRecords(input.historical, input.current.caseId);
  const ranked: RelevantPastDecision[] = [];

  for (const record of records) {
    if (input.resolvedOnly && record.decisionStatusAtClose !== "resolved") continue;
    const debug = scoreRelevantPastDecision(input.current, record);
    if (debug.score < minScore) continue;
    if (debug.sharedTokens.length < minSharedTokens) continue;
    ranked.push(toPresentation(record, debug.score));
  }

  ranked.sort((left, right) => {
    const scoreDelta = right.relevanceScore - left.relevanceScore;
    if (Math.abs(scoreDelta) > RELEVANT_PAST_DECISIONS_RESOLVED_TIE) return scoreDelta;
    const leftResolved = left.decisionStatusAtClose === "resolved" ? 1 : 0;
    const rightResolved = right.decisionStatusAtClose === "resolved" ? 1 : 0;
    if (rightResolved !== leftResolved) return rightResolved - leftResolved;
    if (scoreDelta !== 0) return scoreDelta;
    return right.closedAt.localeCompare(left.closedAt);
  });

  const unique: RelevantPastDecision[] = [];
  const seenCases = new Set<string>();
  for (const item of ranked) {
    if (seenCases.has(item.sourceCaseId)) continue;
    seenCases.add(item.sourceCaseId);
    unique.push(item);
    if (unique.length >= maxResults) break;
  }
  return unique;
}

function cardKey(item: { sourceCaseId: string; cycleNumber: number }): string {
  return `${item.sourceCaseId}:${item.cycleNumber}`;
}

/** Resolves current-analysis precedent refs to persisted Decision Records. Skips missing/malformed refs. */
export function resolveSuppliedHistoricalDecisions(input: {
  current?: CurrentDecisionQuery;
  historical: HistoricalCaseSource[];
  providedRefs?: PrecedentContextRef[] | null;
}): RelevantPastDecision[] {
  const refs = input.providedRefs;
  if (!refs || refs.length === 0) return [];

  try {
    const records = extractHistoricalDecisionRecords(input.historical, input.current?.caseId);
    const cards: RelevantPastDecision[] = [];
    const seenKeys = new Set<string>();
    const seenCases = new Set<string>();

    for (const ref of refs) {
      const caseId = typeof ref?.caseId === "string" ? ref.caseId.trim() : "";
      const cycleNumber = typeof ref?.cycleNumber === "number" ? ref.cycleNumber : NaN;
      if (!caseId || !Number.isInteger(cycleNumber) || cycleNumber < 1) continue;
      const key = `${caseId}:${cycleNumber}`;
      if (seenKeys.has(key) || seenCases.has(caseId)) continue;

      const record = records.find((item) => item.sourceCaseId === caseId && item.cycleNumber === cycleNumber);
      if (!record) continue;

      seenKeys.add(key);
      seenCases.add(caseId);
      const score = input.current ? scoreRelevantPastDecision(input.current, record).score : 0;
      cards.push(toPresentation(record, score));
    }
    return cards;
  } catch (error) {
    console.error("[precedent] supplied ref resolve failed:", error);
    return [];
  }
}

/** Supplied current-analysis records first, then ordinary display ranking. One card per source case. */
export function mergeVisibleHistoricalDecisions(input: {
  supplied: RelevantPastDecision[];
  ranked: RelevantPastDecision[];
  maxResults?: number;
}): RelevantPastDecision[] {
  const maxResults = input.maxResults ?? RELEVANT_PAST_DECISIONS_MAX;
  const visible: RelevantPastDecision[] = [];
  const seenKeys = new Set<string>();
  const seenCases = new Set<string>();

  const push = (item: RelevantPastDecision): void => {
    if (visible.length >= maxResults) return;
    const key = cardKey(item);
    if (seenKeys.has(key) || seenCases.has(item.sourceCaseId)) return;
    seenKeys.add(key);
    seenCases.add(item.sourceCaseId);
    visible.push(item);
  };

  for (const item of input.supplied) push(item);
  for (const item of input.ranked) push(item);
  return visible;
}

/** Visible Reasoning Context historical cards: current supplied precedents first, then display ranking. */
export function visibleHistoricalDecisionCards(input: {
  current: CurrentDecisionQuery;
  historical: HistoricalCaseSource[];
  providedRefs?: PrecedentContextRef[] | null;
}): RelevantPastDecision[] {
  return mergeVisibleHistoricalDecisions({
    supplied: resolveSuppliedHistoricalDecisions(input),
    ranked: findRelevantPastDecisions({
      current: input.current,
      historical: input.historical,
    }),
  });
}

export const PRECEDENT_INPUT_MIN_SCORE = 0.2;
export const PRECEDENT_INPUT_MAX = 2;

export function selectPrecedentsForAnalysis(input: {
  current: CurrentDecisionQuery;
  historical: HistoricalCaseSource[];
}): RelevantPastDecision[] {
  try {
    if (currentCoreBag(input.current).size < 3) return [];
    return findRelevantPastDecisions({
      current: input.current,
      historical: input.historical,
      maxResults: PRECEDENT_INPUT_MAX,
      minScore: PRECEDENT_INPUT_MIN_SCORE,
      resolvedOnly: true,
    });
  } catch (error) {
    console.error("[precedent] selection failed, continuing without precedent:", error);
    return [];
  }
}

export function shouldShowRelevantPastDecisions(input: {
  lifecycleState: string;
  reopenSuggestionVisible: boolean;
}): boolean {
  if (input.lifecycleState !== "closed") return true;
  return input.reopenSuggestionVisible;
}

export function unresolvedHistoricalDecisionCopy(): string {
  return "Кейс был закрыт без окончательного определения решения.";
}

export function formatRelevantPastClosedAt(iso: string): string | null {
  return formatDecisionRecordClosedAt(iso);
}
