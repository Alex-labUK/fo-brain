import { prisma } from "./prisma";

export async function generateCaseId(): Promise<string> {
  const cases = await prisma.case.findMany({ select: { id: true } });

  let maxNumber = 0;
  for (const caseItem of cases) {
    const match = caseItem.id.match(/^c(\d+)/);
    if (match) {
      maxNumber = Math.max(maxNumber, Number.parseInt(match[1], 10));
    }
  }

  return `c${maxNumber + 1}`;
}
