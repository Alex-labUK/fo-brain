"use server";

import type { CaseBlockerType, CaseLifecycleState, CaseStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import {
  hasLifecycleChanged,
  isBlockerType,
  isLifecycleState,
  normalizeLifecycleUpdate,
  parseStoredLifecycleSuggestion,
} from "@/lib/case-lifecycle";
import { prisma } from "@/lib/prisma";

function revalidateCasePaths(id: string): void {
  revalidatePath("/");
  revalidatePath("/cases");
  revalidatePath(`/cases/${id}`);
}

export async function updateCaseStatus(id: string, status: CaseStatus): Promise<void> {
  await prisma.case.update({
    where: { id },
    data: { status },
  });
  revalidateCasePaths(id);
}

export async function deleteCase(id: string): Promise<void> {
  await prisma.case.delete({ where: { id } });
  revalidatePath("/");
  revalidatePath("/cases");
}

export type UpdateCaseDetailsInput = {
  title: string;
  domain: string;
};

export async function updateCaseDetails(id: string, input: UpdateCaseDetailsInput): Promise<void> {
  const title = input.title.trim();
  const domain = input.domain.trim();

  if (!title) {
    throw new Error("Название кейса обязательно");
  }
  if (!domain) {
    throw new Error("Домен обязателен");
  }

  await prisma.case.update({
    where: { id },
    data: {
      title,
      domain,
    },
  });
  revalidateCasePaths(id);
}

export type UpdateCaseLifecycleInput = {
  lifecycleState: CaseLifecycleState;
  blockerType: CaseBlockerType;
  blockerNote?: string | null;
};

export async function updateCaseLifecycle(
  id: string,
  input: UpdateCaseLifecycleInput,
): Promise<void> {
  if (!isLifecycleState(input.lifecycleState)) {
    throw new Error("Некорректное состояние жизненного цикла");
  }
  if (!isBlockerType(input.blockerType)) {
    throw new Error("Некорректный тип блокера");
  }

  const caseItem = await prisma.case.findUnique({
    where: { id },
    select: {
      id: true,
      lifecycleState: true,
      blockerType: true,
      blockerNote: true,
    },
  });

  if (!caseItem) {
    throw new Error("Кейс не найден");
  }

  const next = normalizeLifecycleUpdate({
    lifecycleState: input.lifecycleState,
    blockerType: input.blockerType,
    blockerNote: input.blockerNote,
  });

  if (!hasLifecycleChanged(caseItem, next)) {
    return;
  }

  await prisma.case.update({
    where: { id },
    data: {
      lifecycleState: next.lifecycleState,
      blockerType: next.blockerType,
      blockerNote: next.blockerNote,
      lifecycleUpdatedAt: new Date(),
    },
  });
  revalidateCasePaths(id);
}

export async function applyLifecycleSuggestion(id: string): Promise<void> {
  const caseItem = await prisma.case.findUnique({
    where: { id },
    select: { lifecycleSuggestion: true },
  });

  if (!caseItem) {
    throw new Error("Кейс не найден");
  }

  const stored = parseStoredLifecycleSuggestion(caseItem.lifecycleSuggestion);
  if (!stored || stored.dismissed) {
    return;
  }

  await updateCaseLifecycle(id, {
    lifecycleState: stored.state,
    blockerType: stored.state === "executing" && stored.blockerNote ? "execution" : "none",
    blockerNote: stored.blockerNote ?? null,
  });

  await prisma.case.update({
    where: { id },
    data: {
      lifecycleSuggestion: { ...stored, dismissed: true },
    },
  });
  revalidateCasePaths(id);
}

export async function dismissLifecycleSuggestion(id: string): Promise<void> {
  const caseItem = await prisma.case.findUnique({
    where: { id },
    select: { lifecycleSuggestion: true },
  });

  if (!caseItem) {
    throw new Error("Кейс не найден");
  }

  const stored = parseStoredLifecycleSuggestion(caseItem.lifecycleSuggestion);
  if (!stored || stored.dismissed) {
    return;
  }

  await prisma.case.update({
    where: { id },
    data: {
      lifecycleSuggestion: { ...stored, dismissed: true },
    },
  });
  revalidateCasePaths(id);
}
