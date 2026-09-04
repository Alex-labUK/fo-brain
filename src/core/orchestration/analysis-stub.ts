import type { SubsystemCatalogItem } from "@/core/orchestration/types";
import { generateDeterministicAnalysis } from "@/core/orchestration/analysis-fallback";

export type {
  ForkRepairFactContext,
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
  FORK_FACT_ACTIONS_RULES,
  PAST_FACT_ROUTE_RULES,
  MAX_ACTIONS,
  MAX_FORK_REPAIR_CALLS,
  RESOLVED_DETERMINING_FACT,
  SECTION_TITLES,
  chooseRepairedAnalysisResult,
  collectAnalysisText,
  containsForbiddenPhrase,
  countAnalysisActions,
  countAnalysisCriticalFacts,
  decisionStatusLabel,
  forkContradictsCompletedFacts,
  forkLooksLikeActionMethods,
  isForbiddenMainQuestion,
  isResolvedAnalysis,
  normalizeAnalysisResult,
  parseDecisionStatus,
  shouldRepairActionShapedFork,
  unresolvedForkContradictsCompletedFacts,
  unresolvedForkLooksLikeActionMethods,
} from "@/core/orchestration/analysis-core";

import type { AnalysisInput, AnalysisResult } from "@/core/orchestration/analysis-core";

/** Sync entry point — deterministic fallback (tests, client emergency fallback). */
export function generateAnalysisStub(
  input: AnalysisInput,
  catalog: SubsystemCatalogItem[],
): AnalysisResult {
  return generateDeterministicAnalysis(input, catalog);
}
