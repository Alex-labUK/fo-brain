import type { AnalysisInput, AnalysisResult } from "@/core/orchestration/analysis-core";
import { generateAnalysisWithAI } from "@/core/orchestration/analysis-ai";
import { generateDeterministicAnalysis } from "@/core/orchestration/analysis-fallback";

/** Primary analysis path: AI with Decision Engine; deterministic templates as fallback. */
export async function generateAnalysis(input: AnalysisInput): Promise<AnalysisResult> {
  if (process.env.OPENAI_API_KEY?.trim()) {
    try {
      const result = await generateAnalysisWithAI(input);
      console.info("[analysis] path=ai");
      return result;
    } catch (error) {
      console.error("[analysis] AI failed, using deterministic fallback:", error);
    }
  } else {
    console.warn("[analysis] OPENAI_API_KEY missing, path=fallback");
  }

  console.info("[analysis] path=fallback");
  return generateDeterministicAnalysis(input);
}
