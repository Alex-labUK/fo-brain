import type { SubsystemCatalogItem } from "@/core/orchestration/types";
import { generateDeterministicAnalysis } from "@/core/orchestration/analysis-fallback";

export type {
  AnalysisInput,
  AnalysisResult,
  AnalysisSection,
  DecisionScenario,
  RoleAssignment,
  RoleFactGroup,
} from "@/core/orchestration/analysis-core";

export {
  ANALYSIS_INPUT_STORAGE_KEY,
  ANALYSIS_RESULT_STORAGE_KEY,
  FORBIDDEN_PHRASES,
  MAX_CRITICAL_FACTS,
  MAX_DECISION_SCENARIOS,
  collectAnalysisText,
  containsForbiddenPhrase,
  countAnalysisCriticalFacts,
  flattenFacts,
  isForbiddenMainQuestion,
  normalizeAnalysisResult,
  scenarioSymbol as getScenarioSymbol,
} from "@/core/orchestration/analysis-core";

import type { AnalysisInput, AnalysisResult } from "@/core/orchestration/analysis-core";

/** Sync entry point — deterministic fallback (tests, client emergency fallback). */
export function generateAnalysisStub(
  input: AnalysisInput,
  catalog: SubsystemCatalogItem[],
): AnalysisResult {
  return generateDeterministicAnalysis(input, catalog);
}
