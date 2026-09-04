"use server";

import type { CaseStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import type { AnalysisInput, AnalysisResult, AnalysisRunResult } from "@/core/orchestration/analysis-core";
import { SECTION_TITLES } from "@/core/orchestration/analysis-core";
import { generateAnalysis } from "@/core/orchestration/analysis-generate";
import { generateLifecycleSuggestion } from "@/core/orchestration/lifecycle-suggestion";
import { generateCaseId } from "@/lib/case-id";
import { toStoredLifecycleSuggestion } from "@/lib/case-lifecycle";
import { prisma } from "@/lib/prisma";

export async function runCaseAnalysis(input: AnalysisInput): Promise<AnalysisRunResult> {
  return generateAnalysis(input);
}

export type SaveAnalysisAsCaseInput = {
  title: string;
  domain: string;
  status: CaseStatus;
  input: AnalysisInput;
  analysisResult: AnalysisResult;
};

function buildFactsFromInput(input: AnalysisInput): string {
  const lines = ["Что произошло:", input.whatHappened.trim()];
  const desired = input.desiredOutcome?.trim();
  if (desired) {
    lines.push("", "Желаемый результат принципала:", desired);
  }
  return lines.join("\n");
}

function buildRecordedResultFromAnalysis(analysis: AnalysisResult): string {
  const outcome = analysis.sections.find((section) => section.title === SECTION_TITLES[0])?.content;
  const fork = analysis.sections.find((section) => section.title === SECTION_TITLES[1])?.content;
  return [outcome, fork].filter(Boolean).join(" ");
}

function buildInitialAssistantMessage(analysis: AnalysisResult): string {
  const reply = analysis.reply?.trim();
  if (reply) return reply;

  const outcome = analysis.sections.find((section) => section.title === SECTION_TITLES[0])?.content;
  return outcome?.trim() || "Разбор готов.";
}

export async function saveAnalysisAsCase(input: SaveAnalysisAsCaseInput): Promise<{ id: string }> {
  const title = input.title.trim();
  const domain = input.domain.trim();

  if (!title) {
    throw new Error("Название кейса обязательно");
  }

  if (!domain) {
    throw new Error("Домен обязателен");
  }

  const id = await generateCaseId();
  const userMessage = input.input.whatHappened.trim();
  const assistantMessage = buildInitialAssistantMessage(input.analysisResult);
  const lifecycleSuggestion = await generateLifecycleSuggestion({
    lifecycleState: "under_analysis",
    blockerType: "none",
    blockerNote: null,
    caseMemory: "",
    facts: buildFactsFromInput(input.input),
    analysis: input.analysisResult,
    dialogue: [
      { role: "user", content: userMessage },
      { role: "assistant", content: assistantMessage },
    ],
  });

  await prisma.case.create({
    data: {
      id,
      title,
      domain,
      status: input.status,
      facts: buildFactsFromInput(input.input),
      analysisResult: input.analysisResult,
      recordedResult: buildRecordedResultFromAnalysis(input.analysisResult),
      priorityUrgency: input.analysisResult.priority?.urgency ?? null,
      priorityStake: input.analysisResult.priority?.stake ?? null,
      priorityNote: input.analysisResult.priority?.note ?? null,
      ...(lifecycleSuggestion
        ? { lifecycleSuggestion: toStoredLifecycleSuggestion(lifecycleSuggestion) }
        : {}),
      branchId: null,
      outcomeId: null,
      questionsAsked: [],
      messages: {
        create: [
          { id: randomUUID(), role: "user", content: userMessage },
          { id: randomUUID(), role: "assistant", content: assistantMessage },
        ],
      },
    },
  });

  revalidatePath("/");
  revalidatePath("/cases");
  revalidatePath(`/cases/${id}`);

  return { id };
}
