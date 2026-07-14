"use server";

import type { CaseStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { generateCaseId } from "@/lib/case-id";
import { prisma } from "@/lib/prisma";

export type CreateCaseInput = {
  title: string;
  facts: string;
  domain: string;
  status: CaseStatus;
  branchId: string | null;
  decisionTree: string;
  outcome: string;
};

export async function createCase(input: CreateCaseInput): Promise<{ id: string }> {
  const title = input.title.trim();
  const domain = input.domain.trim();

  if (!title) {
    throw new Error("Название кейса обязательно");
  }

  if (!domain) {
    throw new Error("Домен обязателен");
  }

  const id = await generateCaseId();

  await prisma.case.create({
    data: {
      id,
      title,
      facts: input.facts.trim(),
      domain,
      status: input.status,
      branchId: input.branchId || null,
      decisionTree: input.decisionTree.trim(),
      outcome: input.outcome.trim(),
      questionsAsked: [],
    },
  });

  revalidatePath("/");
  revalidatePath(`/cases/${id}`);

  return { id };
}
