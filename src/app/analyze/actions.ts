"use server";

import type { AnalysisInput, AnalysisResult } from "@/core/orchestration/analysis-core";
import { generateAnalysis } from "@/core/orchestration/analysis-generate";

export async function runCaseAnalysis(input: AnalysisInput): Promise<AnalysisResult> {
  return generateAnalysis(input);
}
