"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { normalizeAnalysisResult } from "@/core/orchestration/analysis-core";
import { continueCaseAnalysis } from "@/app/cases/[id]/dialogue-actions";
import { activeCycleNumber } from "@/lib/decision-record";
import type { DecisionChangeSummaryPayload } from "@/lib/decision-change-summary";
import {
  buildPrincipalDecision,
  formatPrincipalDecisionMessage,
  planPrincipalCapture,
  parsePrincipalDecision,
  rememberPrincipalDecision,
  type PrincipalDecisionRecord,
} from "@/lib/principal-decision";
import { prisma } from "@/lib/prisma";

export type PrincipalCaptureResult = {
  persisted: boolean;
  analysisUpdated: boolean;
  changeSummary: DecisionChangeSummaryPayload | null;
};

function emptyCaptureResult(): PrincipalCaptureResult {
  return { persisted: true, analysisUpdated: false, changeSummary: null };
}

async function rerunPrincipalCaptureAnalysis(
  caseId: string,
  record: PrincipalDecisionRecord,
): Promise<PrincipalCaptureResult> {
  try {
    const result = await continueCaseAnalysis(caseId, {
      newMessage: formatPrincipalDecisionMessage(record.decision),
      createUserMessage: false,
    });
    return {
      persisted: true,
      analysisUpdated: result.status === "updated",
      changeSummary: result.changeSummary,
    };
  } catch {
    return emptyCaptureResult();
  }
}

export async function capturePrincipalDecision(
  caseId: string,
  decision: string,
): Promise<PrincipalCaptureResult> {
  const trimmed = decision.trim();
  if (!trimmed) {
    throw new Error("Решение Principal не может быть пустым");
  }

  const caseItem = await prisma.case.findUnique({
    where: { id: caseId },
    select: {
      id: true,
      lifecycleState: true,
      analysisResult: true,
      caseMemory: true,
      decisionCycleHistory: true,
      principalDecision: true,
    },
  });

  if (!caseItem) {
    throw new Error("Кейс не найден");
  }
  if (caseItem.lifecycleState === "closed") {
    throw new Error("Для закрытого кейса фиксация решения Principal недоступна");
  }

  let analysis;
  try {
    analysis = caseItem.analysisResult ? normalizeAnalysisResult(caseItem.analysisResult) : null;
  } catch {
    analysis = null;
  }
  const question = analysis?.decisionAuthority?.principalQuestion?.trim();
  if (!analysis || analysis.decisionAuthority?.owner !== "principal" || !question) {
    throw new Error("Сейчас нет суждения Principal для фиксации");
  }

  const next = buildPrincipalDecision({
    decision: trimmed,
    question,
    analysis,
    cycleNumber: activeCycleNumber(caseItem.decisionCycleHistory),
  });
  if (!next) {
    throw new Error("Не удалось сохранить решение Principal");
  }

  const stored = parsePrincipalDecision(caseItem.principalDecision);
  const plan = planPrincipalCapture({ stored, next });
  if (plan === "noop") {
    return { persisted: false, analysisUpdated: false, changeSummary: null };
  }
  if (plan === "retry_analysis" && stored) {
    return rerunPrincipalCaptureAnalysis(caseId, stored);
  }

  await prisma.$transaction([
    prisma.case.update({
      where: { id: caseId },
      data: {
        principalDecision: next as Prisma.InputJsonValue,
        caseMemory: rememberPrincipalDecision(caseItem.caseMemory, next.decision),
      },
    }),
    prisma.caseMessage.create({
      data: {
        id: randomUUID(),
        caseId,
        role: "user",
        content: formatPrincipalDecisionMessage(next.decision),
      },
    }),
  ]);

  revalidatePath("/");
  revalidatePath("/cases");
  revalidatePath(`/cases/${caseId}`);

  return rerunPrincipalCaptureAnalysis(caseId, next);
}

export async function retryPrincipalDecisionAnalysis(caseId: string): Promise<PrincipalCaptureResult> {
  const caseItem = await prisma.case.findUnique({
    where: { id: caseId },
    select: {
      id: true,
      lifecycleState: true,
      principalDecision: true,
    },
  });

  if (!caseItem) {
    throw new Error("Кейс не найден");
  }
  if (caseItem.lifecycleState === "closed") {
    throw new Error("Для закрытого кейса фиксация решения Principal недоступна");
  }

  const stored = parsePrincipalDecision(caseItem.principalDecision);
  if (!stored) {
    throw new Error("Сейчас нет зафиксированного решения Principal");
  }

  return rerunPrincipalCaptureAnalysis(caseId, stored);
}
