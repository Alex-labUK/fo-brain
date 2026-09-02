import type {
  AnalysisInput,
  AnalysisRunResult,
  ContinueAnalysisInput,
} from "@/core/orchestration/analysis-core";
import { generateAnalysisWithAI, continueAnalysisWithAI } from "@/core/orchestration/analysis-ai";
import { generateDeterministicAnalysis } from "@/core/orchestration/analysis-fallback";

/** Primary analysis path: AI with Decision Engine; deterministic templates as fallback. */
export async function generateAnalysis(input: AnalysisInput): Promise<AnalysisRunResult> {
  if (process.env.OPENAI_API_KEY?.trim()) {
    try {
      const { result, usage } = await generateAnalysisWithAI(input);
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
  if (process.env.OPENAI_API_KEY?.trim()) {
    try {
      const { result, usage, caseMemory } = await continueAnalysisWithAI(input);
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
