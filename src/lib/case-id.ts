import { prisma } from "./prisma";

const REAL_CASE_ID_PATTERN = /^real-(\d+)$/;

export function isSeedStyleCaseId(id: string): boolean {
  return /^c\d+[a-z]?$/.test(id);
}

function maxRealCaseNumber(ids: Iterable<string>): number {
  let maxNumber = 0;
  for (const id of ids) {
    const match = id.match(REAL_CASE_ID_PATTERN);
    if (match) {
      maxNumber = Math.max(maxNumber, Number.parseInt(match[1], 10));
    }
  }
  return maxNumber;
}

/** Next `real-N` id given ids already reserved (e.g. during batch migration). */
export function allocateRealCaseId(reservedIds: Iterable<string>): string {
  return `real-${maxRealCaseNumber(reservedIds) + 1}`;
}

export async function generateCaseId(): Promise<string> {
  const cases = await prisma.case.findMany({ select: { id: true } });
  return allocateRealCaseId(cases.map((caseItem) => caseItem.id));
}
