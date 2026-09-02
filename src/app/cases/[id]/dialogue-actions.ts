"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import type { ConversationTurn } from "@/core/orchestration/analysis-core";
import { SECTION_TITLES } from "@/core/orchestration/analysis-core";
import { continueAnalysis } from "@/core/orchestration/analysis-generate";
import { prisma } from "@/lib/prisma";

const AI_UNAVAILABLE_REPLY =
  "⚠ Не получилось обновить разбор — сервис ИИ сейчас недоступен. Ваше сообщение сохранено, попробуйте отправить его ещё раз через минуту.";

function generateMessageId(): string {
  return randomUUID();
}

function buildRecordedResultFromAnalysis(sections: { title: string; content?: string }[]): string {
  const outcome = sections.find((section) => section.title === SECTION_TITLES[0])?.content;
  const fork = sections.find((section) => section.title === SECTION_TITLES[1])?.content;
  return [outcome, fork].filter(Boolean).join(" ");
}

export async function postCaseMessage(caseId: string, text: string): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("Сообщение не может быть пустым");
  }

  const caseItem = await prisma.case.findUnique({
    where: { id: caseId },
    select: { id: true, facts: true, caseMemory: true, analysisResult: true },
  });

  if (!caseItem) {
    throw new Error("Кейс не найден");
  }

  const currentSections = Array.isArray((caseItem.analysisResult as { sections?: unknown } | null)?.sections)
    ? (caseItem.analysisResult as { sections: { title: string; content?: string }[] }).sections
    : [];
  const currentFork = currentSections.find((section) => section.title === SECTION_TITLES[1])?.content;
  const currentDeterminingFact = currentSections.find((section) => section.title === SECTION_TITLES[2])?.content;

  await prisma.caseMessage.create({
    data: {
      id: generateMessageId(),
      caseId,
      role: "user",
      content: trimmed,
    },
  });

  const priorMessages = await prisma.caseMessage.findMany({
    where: { caseId },
    orderBy: { createdAt: "asc" },
    select: { role: true, content: true },
  });

  const history: ConversationTurn[] = priorMessages.slice(0, -1).map((message) => ({
    role: message.role as ConversationTurn["role"],
    content: message.content,
  }));

  const run = await continueAnalysis({
    facts: caseItem.facts,
    history,
    newMessage: trimmed,
    caseMemory: caseItem.caseMemory,
    currentFork,
    currentDeterminingFact,
  });

  if (run.source === "ai") {
    const assistantContent =
      run.result.reply?.trim() ||
      run.result.sections.find((section) => section.title === SECTION_TITLES[0])?.content?.trim() ||
      "Разбор обновлён.";

    const persistedCaseMemory = run.updatedCaseMemory?.trim() || caseItem.caseMemory;

    const caseUpdate: {
      analysisResult: typeof run.result;
      recordedResult: string;
      caseMemory: string;
      priorityUrgency?: string | null;
      priorityStake?: string | null;
      priorityNote?: string | null;
    } = {
      analysisResult: run.result,
      recordedResult: buildRecordedResultFromAnalysis(run.result.sections),
      caseMemory: persistedCaseMemory,
    };

    if (run.result.priority) {
      caseUpdate.priorityUrgency = run.result.priority.urgency;
      caseUpdate.priorityStake = run.result.priority.stake;
      caseUpdate.priorityNote = run.result.priority.note;
    }

    await prisma.$transaction([
      prisma.case.update({
        where: { id: caseId },
        data: caseUpdate,
      }),
      prisma.caseMessage.create({
        data: {
          id: generateMessageId(),
          caseId,
          role: "assistant",
          content: assistantContent,
        },
      }),
    ]);
  } else {
    await prisma.caseMessage.create({
      data: {
        id: generateMessageId(),
        caseId,
        role: "assistant",
        content: AI_UNAVAILABLE_REPLY,
      },
    });
  }

  revalidatePath("/");
  revalidatePath("/cases");
  revalidatePath(`/cases/${caseId}`);
}
