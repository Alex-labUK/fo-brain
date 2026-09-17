import { existsSync, readFileSync } from "fs";
import path from "path";

export type KnowledgeKind = "principle" | "pattern";

export type FamilyOfficeKnowledgeItem = {
  id: string;
  kind: KnowledgeKind;
  title: string;
  principle: string;
  status?: string;
  source?: string;
};

const MAX_CONCISE_LENGTH = 420;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function compact(value: unknown): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function concisePrincipleText(item: Record<string, unknown>): string {
  const summary = compact(item.promptSummary);
  if (summary) {
    return summary.length > MAX_CONCISE_LENGTH ? `${summary.slice(0, MAX_CONCISE_LENGTH).trim()}…` : summary;
  }
  const statement = compact(item.statement);
  if (!statement) return "";
  const first = statement.split(/(?<=\.)\s+/)[0] ?? statement;
  return first.length > MAX_CONCISE_LENGTH ? `${first.slice(0, MAX_CONCISE_LENGTH).trim()}…` : first;
}

function looksLikeInternalId(title: string): boolean {
  return /^(p|pat|pattern|principle)_/i.test(title);
}

function parseKnowledgeItem(raw: unknown, kind: KnowledgeKind): FamilyOfficeKnowledgeItem | null {
  if (!isRecord(raw)) return null;
  const id = compact(raw.id);
  const title = compact(raw.title);
  const principle = concisePrincipleText(raw);
  if (!id || !title || looksLikeInternalId(title) || principle.length < 12) return null;

  const item: FamilyOfficeKnowledgeItem = { id, kind, title, principle };
  const status = compact(raw.status);
  if (status) item.status = status;
  const source = compact(raw.source);
  if (
    source &&
    !source.includes("/") &&
    !source.includes("\\") &&
    !/\.(md|json)\b/i.test(source)
  ) {
    item.source = source;
  }
  return item;
}

function parseKnowledgeList(raw: unknown, kind: KnowledgeKind): FamilyOfficeKnowledgeItem[] {
  if (!Array.isArray(raw)) return [];
  const items: FamilyOfficeKnowledgeItem[] = [];
  for (const entry of raw) {
    try {
      const parsed = parseKnowledgeItem(entry, kind);
      if (parsed) items.push(parsed);
    } catch {
      // skip malformed knowledge items
    }
  }
  return items;
}

let cached: FamilyOfficeKnowledgeItem[] | null = null;

/** Curated KB only. Never writes seed files. Skips malformed items. */
export function loadFamilyOfficeKnowledge(): FamilyOfficeKnowledgeItem[] {
  if (cached) return cached;
  try {
    const seedPath = path.join(process.cwd(), "seed-data.json");
    if (!existsSync(seedPath)) {
      cached = [];
      return cached;
    }
    const raw = JSON.parse(readFileSync(seedPath, "utf-8")) as unknown;
    if (!isRecord(raw)) {
      cached = [];
      return cached;
    }
    cached = [
      ...parseKnowledgeList(raw.principles, "principle"),
      ...parseKnowledgeList(raw.patterns, "pattern"),
    ];
    return cached;
  } catch {
    cached = [];
    return cached;
  }
}

export function parseFamilyOfficeKnowledge(raw: unknown): FamilyOfficeKnowledgeItem[] {
  if (!isRecord(raw)) return [];
  return [
    ...parseKnowledgeList(raw.principles, "principle"),
    ...parseKnowledgeList(raw.patterns, "pattern"),
  ];
}
