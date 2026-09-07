const TITLE_MAX_CHARS = 80;

export const INTAKE_CASE_DOMAIN = "unspecified";

export function isMeaningfulSituation(text: string): boolean {
  return text.trim().length > 0;
}

function compactLine(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function boundTitle(text: string): string {
  const compact = compactLine(text);
  if (!compact) return "Ситуация";
  if (compact.length <= TITLE_MAX_CHARS) {
    return compact.replace(/[.]+$/u, "").trim() || compact;
  }
  const slice = compact.slice(0, TITLE_MAX_CHARS - 1);
  const cut = slice.lastIndexOf(" ");
  const kept = (cut > 40 ? slice.slice(0, cut) : slice).trimEnd();
  return `${kept}…`;
}

/** Reuse a title only if the analysis contract actually provided one. */
export function analysisProvidedTitle(analysis: unknown): string | null {
  if (!analysis || typeof analysis !== "object" || !("title" in analysis)) return null;
  const title = (analysis as { title?: unknown }).title;
  if (typeof title !== "string") return null;
  const compact = compactLine(title);
  return compact || null;
}

/**
 * Short case title without an extra model call.
 * Prefers an analysis title field when present; otherwise the start of the situation.
 */
export function deriveSituationTitle(situation: string, analysis?: unknown): string {
  const fromAnalysis = analysisProvidedTitle(analysis);
  if (fromAnalysis) return boundTitle(fromAnalysis);

  const compact = compactLine(situation);
  if (!compact) return "Ситуация";
  const sentence = compact.split(/(?<=[.!?…])\s+/u)[0] ?? compact;
  return boundTitle(sentence);
}

export const SITUATION_TITLE_MAX_CHARS = TITLE_MAX_CHARS;
