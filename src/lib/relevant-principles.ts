import {
  currentDecisionQueryFromWorkspace,
  tokenizeRelevanceText,
  type CurrentDecisionQuery,
} from "@/lib/relevant-past-decisions";
import {
  loadFamilyOfficeKnowledge,
  type FamilyOfficeKnowledgeItem,
  type KnowledgeKind,
} from "@/lib/family-office-knowledge";

export const RELEVANT_PRINCIPLES_MAX = 2;
export const RELEVANT_PRINCIPLES_MIN_SCORE = 0.18;
export const RELEVANT_PRINCIPLES_MIN_SHARED_TOKENS = 3;
export const RELEVANT_PRINCIPLES_KIND_TIE = 0.04;

const GENERIC_TOKENS = new Set([
  "принципал",
  "принципала",
  "принципалу",
  "принципалом",
  "office",
  "family",
  "решен",
  "решения",
  "решению",
  "решением",
  "развилк",
  "факт",
  "факта",
  "факте",
  "цель",
  "предполагаем",
  "подтвержд",
  "случае",
  "кейс",
  "fo",
]);

export type RelevantPrinciple = {
  id?: string;
  kind: KnowledgeKind;
  title: string;
  principle: string;
  source?: string;
  relevanceReason?: string;
  relevanceScore: number;
};

export type PrincipleMatchDebug = {
  score: number;
  sharedTokens: string[];
};

type WeightedBag = Map<string, number>;

function principleToken(token: string): string {
  if (GENERIC_TOKENS.has(token)) return "";
  if (token.length <= 5) return token;
  const stripped = token.replace(/[аыиуеоя]$/u, "");
  return stripped.length >= 4 ? stripped : token;
}

function addTokens(bag: WeightedBag, text: string, weight: number): void {
  if (!text.trim() || weight <= 0) return;
  for (const raw of tokenizeRelevanceText(text)) {
    const token = principleToken(raw);
    if (!token || GENERIC_TOKENS.has(token)) continue;
    bag.set(token, (bag.get(token) ?? 0) + weight);
  }
}

function queryCoreBag(current: CurrentDecisionQuery): WeightedBag {
  const query = currentDecisionQueryFromWorkspace(current);
  const bag: WeightedBag = new Map();
  addTokens(bag, query.determiningFact ?? "", 3);
  addTokens(bag, query.decision ?? "", 2.5);
  addTokens(bag, query.outcome ?? "", 2);
  addTokens(bag, query.title ?? "", 1.2);
  return bag;
}

function memoryOverlapBag(current: CurrentDecisionQuery, candidate: WeightedBag): WeightedBag {
  const query = currentDecisionQueryFromWorkspace(current);
  const memory: WeightedBag = new Map();
  addTokens(memory, query.caseMemory ?? "", 0.7);
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

function itemBag(item: FamilyOfficeKnowledgeItem): WeightedBag {
  const bag: WeightedBag = new Map();
  addTokens(bag, item.title, 2.5);
  addTokens(bag, item.principle, 2);
  return bag;
}

function principleCoverage(query: WeightedBag, candidate: WeightedBag): number {
  if (query.size === 0 || candidate.size === 0) return 0;
  let covered = 0;
  let total = 0;
  for (const [token, weight] of candidate) {
    total += weight;
    const queryWeight = query.get(token) ?? 0;
    if (queryWeight > 0) covered += Math.min(weight, queryWeight);
  }
  return total > 0 ? covered / total : 0;
}

function sharedTokens(left: WeightedBag, right: WeightedBag): string[] {
  return [...left.keys()].filter((token) => right.has(token)).sort();
}

export function scoreRelevantPrinciple(
  current: CurrentDecisionQuery,
  item: FamilyOfficeKnowledgeItem,
): PrincipleMatchDebug {
  const candidate = itemBag(item);
  const query = mergeBags(queryCoreBag(current), memoryOverlapBag(current, candidate));
  return {
    score: principleCoverage(query, candidate),
    sharedTokens: sharedTokens(query, candidate),
  };
}

function toPresentation(item: FamilyOfficeKnowledgeItem, score: number): RelevantPrinciple {
  const result: RelevantPrinciple = {
    kind: item.kind,
    title: item.title,
    principle: item.principle,
    relevanceScore: score,
  };
  if (item.id) result.id = item.id;
  if (item.source) result.source = item.source;
  return result;
}

function kindRank(kind: KnowledgeKind): number {
  return kind === "principle" ? 1 : 0;
}

/** Deterministic, read-only. Never mutates the current case or analysis. */
export function findRelevantPrinciples(input: {
  current: CurrentDecisionQuery;
  items?: FamilyOfficeKnowledgeItem[];
  maxResults?: number;
  minScore?: number;
  minSharedTokens?: number;
}): RelevantPrinciple[] {
  const maxResults = input.maxResults ?? RELEVANT_PRINCIPLES_MAX;
  const minScore = input.minScore ?? RELEVANT_PRINCIPLES_MIN_SCORE;
  const minSharedTokens = input.minSharedTokens ?? RELEVANT_PRINCIPLES_MIN_SHARED_TOKENS;
  const knowledge = input.items ?? loadFamilyOfficeKnowledge();
  if (queryCoreBag(input.current).size === 0) return [];

  const ranked: RelevantPrinciple[] = [];
  for (const item of knowledge) {
    const debug = scoreRelevantPrinciple(input.current, item);
    if (debug.score < minScore) continue;
    if (debug.sharedTokens.length < minSharedTokens) continue;
    ranked.push(toPresentation(item, debug.score));
  }

  ranked.sort((left, right) => {
    const scoreDelta = right.relevanceScore - left.relevanceScore;
    if (Math.abs(scoreDelta) > RELEVANT_PRINCIPLES_KIND_TIE) return scoreDelta;
    const kindDelta = kindRank(right.kind) - kindRank(left.kind);
    if (kindDelta !== 0) return kindDelta;
    return scoreDelta;
  });

  return ranked.slice(0, maxResults);
}
