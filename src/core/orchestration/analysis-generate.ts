import type {
  AnalysisInput,
  AnalysisRunResult,
  ContinueAnalysisInput,
  HistoricalPrecedentRecord,
} from "@/core/orchestration/analysis-core";
import { generateAnalysisWithAI, continueAnalysisWithAI } from "@/core/orchestration/analysis-ai";
import { generateDeterministicAnalysis } from "@/core/orchestration/analysis-fallback";
import {
  analysisQueryFromContinueInput,
  analysisQueryFromGenerateInput,
  attachPrecedentContextRefs,
  toHistoricalPrecedentRecord,
} from "@/lib/historical-precedent";
import { prisma } from "@/lib/prisma";
import type { CurrentDecisionQuery, HistoricalCaseSource } from "@/lib/relevant-past-decisions";
import { selectPrecedentsForAnalysis } from "@/lib/relevant-past-decisions";

async function loadHistoricalCaseSources(excludeCaseId?: string): Promise<HistoricalCaseSource[]> {
  try {
    return await prisma.case.findMany({
      where: excludeCaseId ? { id: { not: excludeCaseId } } : undefined,
      select: {
        id: true,
        title: true,
        decisionRecord: true,
        decisionCycleHistory: true,
      },
    });
  } catch (error) {
    console.error("[precedent] historical load failed, continuing without precedent:", error);
    return [];
  }
}

async function resolveHistoricalPrecedents(
  current: CurrentDecisionQuery,
  provided?: HistoricalPrecedentRecord[],
  excludeCaseId?: string,
): Promise<HistoricalPrecedentRecord[]> {
  if (provided) return provided;
  try {
    const historical = await loadHistoricalCaseSources(excludeCaseId);
    return selectPrecedentsForAnalysis({ current, historical }).map(toHistoricalPrecedentRecord);
  } catch (error) {
    console.error("[precedent] resolve failed, continuing without precedent:", error);
    return [];
  }
}

/** Primary analysis path: AI with Decision Engine; deterministic templates as fallback. */
export async function generateAnalysis(input: AnalysisInput): Promise<AnalysisRunResult> {
  const historicalPrecedents = await resolveHistoricalPrecedents(
    analysisQueryFromGenerateInput(input),
    input.historicalPrecedents,
    input.caseId,
  );
  const analysisInput = { ...input, historicalPrecedents };

  if (process.env.OPENAI_API_KEY?.trim()) {
    try {
      const { result, usage } = await generateAnalysisWithAI(analysisInput);
      attachPrecedentContextRefs(result, historicalPrecedents);
      console.info("[analysis] path=ai", usage ? { usage } : undefined);
      return { result, source: "ai", usage };
    } catch (error) {
      console.error("[analysis] AI failed, using deterministic fallback:", error);
    }
  } else {
    console.warn("[analysis] OPENAI_API_KEY missing, path=fallback");
  }

  console.info("[analysis] path=fallback");
  return {
    result: generateDeterministicAnalysis(input),
    source: "fallback",
  };
}

/** Continue analysis after a new message in case dialogue. */
export async function continueAnalysis(input: ContinueAnalysisInput): Promise<AnalysisRunResult> {
  const historicalPrecedents = await resolveHistoricalPrecedents(
    analysisQueryFromContinueInput(input),
    input.historicalPrecedents,
    input.caseId,
  );
  const analysisInput = { ...input, historicalPrecedents };

  if (process.env.OPENAI_API_KEY?.trim()) {
    try {
      const { result, usage, caseMemory } = await continueAnalysisWithAI(analysisInput);
      attachPrecedentContextRefs(result, historicalPrecedents);
      console.info("[analysis] path=ai continue", usage ? { usage } : undefined);
      return { result, source: "ai", usage, updatedCaseMemory: caseMemory };
    } catch (error) {
      console.error("[analysis] AI continue failed:", error);
    }
  } else {
    console.warn("[analysis] OPENAI_API_KEY missing, path=fallback (continue)");
  }

  console.info("[analysis] path=fallback (continue)");
  return {
    result: {
      sections: [],
      priority: {
        urgency: "no_deadline",
        stake: "low_reversible",
        note: "AI analysis is temporarily unavailable.",
      },
      reply: "AI analysis is temporarily unavailable.",
    },
    source: "fallback",
  };
}
