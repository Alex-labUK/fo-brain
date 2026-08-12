import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Case, Prisma } from "@prisma/client";
import { allocateRealCaseId, isSeedStyleCaseId } from "../src/lib/case-id";
import { prisma } from "../src/lib/prisma";

type SeedCaseRef = { id: string; title: string };

type SeedDataCases = {
  cases: SeedCaseRef[];
};

function loadSeedCases(): Map<string, SeedCaseRef> {
  const seedPath = resolve(process.cwd(), "seed-data.json");
  const raw = JSON.parse(readFileSync(seedPath, "utf-8")) as SeedDataCases;
  if (!Array.isArray(raw.cases)) {
    throw new Error("seed-data.json: expected cases array");
  }
  return new Map(raw.cases.map((item) => [item.id, item]));
}

function isMisplacedRealCase(caseItem: Pick<Case, "id" | "title">, seedCases: Map<string, SeedCaseRef>): boolean {
  if (!isSeedStyleCaseId(caseItem.id)) {
    return false;
  }

  const seedCase = seedCases.get(caseItem.id);
  if (!seedCase) {
    return true;
  }

  return caseItem.title.trim() !== seedCase.title.trim();
}

function caseCreateData(caseItem: Case, id: string): Prisma.CaseCreateInput {
  return {
    id,
    title: caseItem.title,
    domain: caseItem.domain,
    status: caseItem.status,
    branch: caseItem.branchId ? { connect: { id: caseItem.branchId } } : undefined,
    outcome: caseItem.outcomeId ? { connect: { id: caseItem.outcomeId } } : undefined,
    facts: caseItem.facts,
    questionsAsked: caseItem.questionsAsked ?? [],
    decisionTree: caseItem.decisionTree,
    recordedResult: caseItem.recordedResult,
    analysisResult: caseItem.analysisResult ?? undefined,
    priorityUrgency: caseItem.priorityUrgency,
    priorityStake: caseItem.priorityStake,
    priorityNote: caseItem.priorityNote,
    createdAt: caseItem.createdAt,
    updatedAt: caseItem.updatedAt,
  };
}

async function reassignCaseForeignKeys(
  tx: Prisma.TransactionClient,
  oldId: string,
  newId: string,
): Promise<void> {
  await tx.caseMessage.updateMany({
    where: { caseId: oldId },
    data: { caseId: newId },
  });

  const principleLinks = await tx.caseConfirmsPrinciple.findMany({
    where: { caseId: oldId },
  });
  for (const link of principleLinks) {
    await tx.caseConfirmsPrinciple.create({
      data: { caseId: newId, principleId: link.principleId },
    });
    await tx.caseConfirmsPrinciple.delete({
      where: { caseId_principleId: { caseId: oldId, principleId: link.principleId } },
    });
  }

  const patternLinks = await tx.caseConfirmsPattern.findMany({
    where: { caseId: oldId },
  });
  for (const link of patternLinks) {
    await tx.caseConfirmsPattern.create({
      data: { caseId: newId, patternId: link.patternId },
    });
    await tx.caseConfirmsPattern.delete({
      where: { caseId_patternId: { caseId: oldId, patternId: link.patternId } },
    });
  }

  await tx.openQuestion.updateMany({
    where: { relatedCaseId: oldId },
    data: { relatedCaseId: newId },
  });

  const questions = await tx.question.findMany();
  for (const question of questions) {
    const sourceCaseIds = question.sourceCaseIds;
    if (!Array.isArray(sourceCaseIds) || !sourceCaseIds.includes(oldId)) {
      continue;
    }
    await tx.question.update({
      where: { id: question.id },
      data: {
        sourceCaseIds: sourceCaseIds.map((caseId) => (caseId === oldId ? newId : caseId)),
      },
    });
  }
}

async function migrateCaseId(
  tx: Prisma.TransactionClient,
  caseItem: Case,
  newId: string,
): Promise<void> {
  await tx.case.create({ data: caseCreateData(caseItem, newId) });
  await reassignCaseForeignKeys(tx, caseItem.id, newId);
  await tx.case.delete({ where: { id: caseItem.id } });
}

async function main(): Promise<void> {
  const seedCases = loadSeedCases();
  const allCases = await prisma.case.findMany({ orderBy: { id: "asc" } });
  const toMigrate = allCases.filter((caseItem) => isMisplacedRealCase(caseItem, seedCases));

  if (toMigrate.length === 0) {
    console.log("No misplaced real cases found — nothing to migrate.");
    return;
  }

  const reservedIds = new Set(allCases.map((caseItem) => caseItem.id));
  const moves: Array<{ oldId: string; newId: string; title: string }> = [];

  for (const caseItem of toMigrate) {
    const newId = allocateRealCaseId(reservedIds);
    reservedIds.add(newId);

    await prisma.$transaction(async (tx) => {
      await migrateCaseId(tx, caseItem, newId);
    });

    moves.push({ oldId: caseItem.id, newId, title: caseItem.title });
  }

  console.log("\nMigrated real cases off seed ids:\n");
  console.log("OLD ID\tNEW ID\tTITLE");
  for (const move of moves) {
    console.log(`${move.oldId}\t${move.newId}\t${move.title}`);
  }
  console.log(`\nTotal migrated: ${moves.length}`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
