"use server";

import type { CaseBlockerType, CaseLifecycleState, CaseStatus } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import {
  hasLifecycleChanged,
  isBlockerType,
  isLifecycleState,
  normalizeLifecycleUpdate,
  parseStoredLifecycleSuggestion,
  storedLifecycleSuggestionAfterClose,
} from "@/lib/case-lifecycle";
import { closedLifecycleFromExecution, normalizeExecutionWrite } from "@/lib/case-execution";
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
      lifecycleSuggestion: true,
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

  const lifecycleChanged = hasLifecycleChanged(caseItem, next);
  const crossingClosed =
    next.lifecycleState === "closed" || caseItem.lifecycleState === "closed";
  const dismissedSuggestion = crossingClosed
    ? storedLifecycleSuggestionAfterClose(caseItem.lifecycleSuggestion)
    : null;
  const alreadyDismissed =
    parseStoredLifecycleSuggestion(caseItem.lifecycleSuggestion)?.dismissed === true;
  const shouldDismissSuggestion =
    crossingClosed &&
    ((dismissedSuggestion !== null && !alreadyDismissed) ||
      (dismissedSuggestion === null && caseItem.lifecycleSuggestion != null));

  if (!lifecycleChanged && !shouldDismissSuggestion) {
    return;
  }

  const data: {
    lifecycleState: typeof next.lifecycleState;
    blockerType: typeof next.blockerType;
    blockerNote: typeof next.blockerNote;
    lifecycleUpdatedAt?: Date;
    lifecycleSuggestion?: Prisma.InputJsonValue | typeof Prisma.DbNull;
  } = {
    lifecycleState: next.lifecycleState,
    blockerType: next.blockerType,
    blockerNote: next.blockerNote,
  };

  if (lifecycleChanged) {
    data.lifecycleUpdatedAt = new Date();
  }

  if (shouldDismissSuggestion) {
    data.lifecycleSuggestion = dismissedSuggestion ?? Prisma.DbNull;
  }

  await prisma.case.update({
    where: { id },
    data,
  });
  revalidateCasePaths(id);
}

export async function applyLifecycleSuggestion(id: string): Promise<void> {
  const caseItem = await prisma.case.findUnique({
    where: { id },
    select: { lifecycleSuggestion: true, lifecycleState: true },
  });

  if (!caseItem) {
    throw new Error("Кейс не найден");
  }

  if (caseItem.lifecycleState === "closed") {
    return;
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

export type UpdateCaseExecutionInput = {
  step: string;
  owner?: string | null;
};

/** Human-only write. AI analysis must never call this. */
export async function applyCaseExecution(id: string, input: UpdateCaseExecutionInput): Promise<void> {
  const caseItem = await prisma.case.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!caseItem) {
    throw new Error("Кейс не найден");
  }

  const next = normalizeExecutionWrite(input);

  await prisma.case.update({
    where: { id },
    data: {
      executionStep: next.executionStep,
      executionOwner: next.executionOwner,
      executionStatus: next.executionStatus,
      executionUpdatedAt: new Date(),
    },
  });
  revalidateCasePaths(id);
}

export async function updateCaseExecution(id: string, input: UpdateCaseExecutionInput): Promise<void> {
  const caseItem = await prisma.case.findUnique({
    where: { id },
    select: { id: true, executionStatus: true },
  });

  if (!caseItem) {
    throw new Error("Кейс не найден");
  }

  const next = normalizeExecutionWrite(input);

  await prisma.case.update({
    where: { id },
    data: {
      executionStep: next.executionStep,
      executionOwner: next.executionOwner,
      executionStatus: caseItem.executionStatus ?? next.executionStatus,
      executionUpdatedAt: new Date(),
    },
  });
  revalidateCasePaths(id);
}

export async function completeCaseExecution(id: string): Promise<void> {
  const caseItem = await prisma.case.findUnique({
    where: { id },
    select: { id: true, executionStep: true, executionStatus: true },
  });

  if (!caseItem) {
    throw new Error("Кейс не найден");
  }

  if (!caseItem.executionStep?.trim() || caseItem.executionStatus !== "pending") {
    return;
  }

  await prisma.case.update({
    where: { id },
    data: {
      executionStatus: "completed",
      executionUpdatedAt: new Date(),
    },
  });
  revalidateCasePaths(id);
}

export async function clearCaseExecution(id: string): Promise<void> {
  const caseItem = await prisma.case.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!caseItem) {
    throw new Error("Кейс не найден");
  }

  await prisma.case.update({
    where: { id },
    data: {
      executionStep: null,
      executionOwner: null,
      executionStatus: null,
      executionUpdatedAt: new Date(),
    },
  });
  revalidateCasePaths(id);
}

/** Closes via the existing lifecycle path. Does not invent a second closure mechanism. */
export async function closeCaseAfterExecution(id: string): Promise<void> {
  const closed = closedLifecycleFromExecution();
  await updateCaseLifecycle(id, closed);
}
