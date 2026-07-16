"use server";

import { revalidatePath } from "next/cache";
import type { CreateOutcomeInput } from "@/core/orchestration/types";
import { generateOutcomeId } from "@/core/orchestration/outcome-id";
import { prisma } from "@/lib/prisma";

export async function createOutcomeWithActivations(
  input: CreateOutcomeInput,
): Promise<{ id: string }> {
  const statement = input.statement.trim();
  const requestFacts = input.requestFacts.trim();

  if (!statement) {
    throw new Error("Укажите desired outcome — что принципал хочет получить");
  }

  if (!requestFacts) {
    throw new Error("Укажите факты запроса");
  }

  const outcomeId = await generateOutcomeId();

  await prisma.$transaction(async (tx) => {
    await tx.outcome.create({
      data: {
        id: outcomeId,
        statement,
        successCondition: input.successCondition?.trim() || null,
        requestFacts,
        headFocus: input.headFocus?.trim() || null,
        stage: "active",
      },
    });

    const existingActivations = await tx.activation.findMany({ select: { id: true } });
    let nextActivationNumber = 0;
    for (const item of existingActivations) {
      const match = item.id.match(/^a(\d+)/);
      if (match) {
        nextActivationNumber = Math.max(nextActivationNumber, Number.parseInt(match[1], 10));
      }
    }

    for (const activation of input.activations) {
      nextActivationNumber += 1;
      const activationId = `a${nextActivationNumber}`;
      await tx.activation.create({
        data: {
          id: activationId,
          outcomeId,
          subsystemId: activation.subsystemId,
          context: activation.context.trim(),
          expectedFeedback: activation.expectedFeedback.trim(),
          status: activation.status,
          excludeReason:
            activation.status === "excluded" ? activation.excludeReason?.trim() || null : null,
        },
      });
    }
  });

  revalidatePath("/");
  revalidatePath(`/outcomes/${outcomeId}`);

  return { id: outcomeId };
}
