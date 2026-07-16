import { prisma } from "@/lib/prisma";

export async function generateOutcomeId(): Promise<string> {
  const outcomes = await prisma.outcome.findMany({ select: { id: true } });

  let maxNumber = 0;
  for (const outcome of outcomes) {
    const match = outcome.id.match(/^o(\d+)/);
    if (match) {
      maxNumber = Math.max(maxNumber, Number.parseInt(match[1], 10));
    }
  }

  return `o${maxNumber + 1}`;
}
