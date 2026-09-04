import type { SubsystemCatalogItem } from "@/core/orchestration/types";
import { generateDeterministicAnalysis } from "@/core/orchestration/analysis-fallback";

export type {
  AnalysisInput,
  AnalysisResult,
  AnalysisRunResult,
  AnalysisSection,
  AnalysisSource,
  ConversationTurn,
  DecisionStatus,
  RoleAssignment,
} from "@/core/orchestration/analysis-core";

export {
  ANALYSIS_INPUT_STORAGE_KEY,
  ANALYSIS_RESULT_STORAGE_KEY,
  FORBIDDEN_PHRASES,
  MAX_ACTIONS,
  RESOLVED_DETERMINING_FACT,
  SECTION_TITLES,
  collectAnalysisText,
  containsForbiddenPhrase,
  countAnalysisActions,
  countAnalysisCriticalFacts,
  decisionStatusLabel,
  isForbiddenMainQuestion,
  isResolvedAnalysis,
  normalizeAnalysisResult,
  parseDecisionStatus,
} from "@/core/orchestration/analysis-core";

import type { AnalysisInput, AnalysisResult } from "@/core/orchestration/analysis-core";

/** Sync entry point — deterministic fallback (tests, client emergency fallback). */
export function generateAnalysisStub(
  input: AnalysisInput,
  catalog: SubsystemCatalogItem[],
): AnalysisResult {
  return generateDeterministicAnalysis(input, catalog);
}
