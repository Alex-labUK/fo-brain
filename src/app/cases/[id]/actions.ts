"use server";

import type { CaseStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
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
