import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { join } from "path";

type SeedData = {
  decisionEngineBranches: Array<{
    id: string;
    name: string;
    appliesWhen: string;
    blocks: string[];
  }>;
  principles: Array<{
    id: string;
    title: string;
    statement: string;
    status: "candidate" | "pattern" | "principle" | "explicit_stated";
    confirmedByCases: string[];
    personalCalibrationNote?: string;
  }>;
  patterns: Array<{
    id: string;
    title?: string;
    statement: string;
    status: "single_case" | "two_case" | "tactical" | "candidate";
    cases: string[];
  }>;
  cases: Array<{
    id: string;
    title: string;
    domain: string;
    status: "hypothetical" | "real_in_progress" | "real_closed" | "cancelled";
    branch: string | null;
  }>;
  openQuestions: string[];
};

type SubsystemSeedItem = {
  id: string;
  key: string;
  name: string;
  description?: string;
  ownerRoleKey?: string;
};

type SeedSyncStats = {
  branches: number;
  principles: number;
  patterns: number;
  cases: number;
  principleLinks: number;
  patternLinks: number;
  openQuestions: number;
};

function loadSeedData(): SeedData {
  const seedPath = join(process.cwd(), "seed-data.json");
  const raw = readFileSync(seedPath, "utf-8");
  return JSON.parse(raw) as SeedData;
}

function patternTitle(pattern: { id: string; title?: string }): string {
  const title = pattern.title?.trim();
  return title || pattern.id;
}

function loadSubsystems(): SubsystemSeedItem[] {
  const seedPath = join(process.cwd(), "data", "subsystems.json");
  const raw = readFileSync(seedPath, "utf-8");
  return JSON.parse(raw) as SubsystemSeedItem[];
}

export async function seedSubsystems(prisma: PrismaClient): Promise<number> {
  const subsystems = loadSubsystems();
  let created = 0;

  for (const subsystem of subsystems) {
    const existing = await prisma.subsystem.findUnique({
      where: { key: subsystem.key },
    });
    if (existing) continue;

    await prisma.subsystem.create({
      data: {
        id: subsystem.id,
        key: subsystem.key,
        name: subsystem.name,
        description: subsystem.description ?? null,
        ownerRoleKey: subsystem.ownerRoleKey ?? null,
      },
    });
    created += 1;
  }

  if (created > 0) {
    console.log(`  ✓ ${created} subsystems`);
  }

  return created;
}

function logSeedSyncSummary(stats: SeedSyncStats): void {
  console.log(
    `[seed] sync complete — new: ${stats.cases} cases, ${stats.principles} principles, ${stats.patterns} patterns, ${stats.principleLinks + stats.patternLinks} links (${stats.principleLinks} principle, ${stats.patternLinks} pattern), ${stats.openQuestions} open questions${stats.branches > 0 ? `, ${stats.branches} branches` : ""}`,
  );
}

export async function seedDatabase(prisma: PrismaClient): Promise<boolean> {
  await seedSubsystems(prisma);

  const data = loadSeedData();
  const stats: SeedSyncStats = {
    branches: 0,
    principles: 0,
    patterns: 0,
    cases: 0,
    principleLinks: 0,
    patternLinks: 0,
    openQuestions: 0,
  };

  console.log("Syncing seed data from seed-data.json...");

  for (const branch of data.decisionEngineBranches) {
    const existing = await prisma.decisionEngineBranch.findUnique({
      where: { id: branch.id },
    });

    if (existing) {
      await prisma.decisionEngineBranch.update({
        where: { id: branch.id },
        data: {
          name: branch.name,
          appliesWhen: branch.appliesWhen,
          blocks: branch.blocks,
        },
      });
    } else {
      await prisma.decisionEngineBranch.create({
        data: {
          id: branch.id,
          name: branch.name,
          appliesWhen: branch.appliesWhen,
          blocks: branch.blocks,
        },
      });
      stats.branches += 1;
    }
  }

  for (const principle of data.principles) {
    const existing = await prisma.principle.findUnique({
      where: { id: principle.id },
    });

    if (existing) {
      await prisma.principle.update({
        where: { id: principle.id },
        data: {
          title: principle.title,
          statement: principle.statement,
          status: principle.status,
          personalCalibrationNote: principle.personalCalibrationNote ?? null,
        },
      });
    } else {
      await prisma.principle.create({
        data: {
          id: principle.id,
          title: principle.title,
          statement: principle.statement,
          status: principle.status,
          personalCalibrationNote: principle.personalCalibrationNote ?? null,
        },
      });
      stats.principles += 1;
    }
  }

  for (const pattern of data.patterns) {
    const existing = await prisma.pattern.findUnique({
      where: { id: pattern.id },
    });

    if (existing) {
      await prisma.pattern.update({
        where: { id: pattern.id },
        data: {
          title: patternTitle(pattern),
          statement: pattern.statement,
          status: pattern.status,
        },
      });
    } else {
      await prisma.pattern.create({
        data: {
          id: pattern.id,
          title: patternTitle(pattern),
          statement: pattern.statement,
          status: pattern.status,
        },
      });
      stats.patterns += 1;
    }
  }

  for (const caseItem of data.cases) {
    const existing = await prisma.case.findUnique({
      where: { id: caseItem.id },
    });
    if (existing) continue;

    await prisma.case.create({
      data: {
        id: caseItem.id,
        title: caseItem.title,
        domain: caseItem.domain,
        status: caseItem.status,
        branchId: caseItem.branch,
      },
    });
    stats.cases += 1;
  }

  for (const principle of data.principles) {
    for (const caseId of principle.confirmedByCases) {
      const existingLink = await prisma.caseConfirmsPrinciple.findUnique({
        where: {
          caseId_principleId: {
            caseId,
            principleId: principle.id,
          },
        },
      });
      if (existingLink) continue;

      const caseExists = await prisma.case.findUnique({ where: { id: caseId } });
      const principleExists = await prisma.principle.findUnique({
        where: { id: principle.id },
      });
      if (!caseExists || !principleExists) continue;

      await prisma.caseConfirmsPrinciple.create({
        data: {
          caseId,
          principleId: principle.id,
        },
      });
      stats.principleLinks += 1;
    }
  }

  for (const pattern of data.patterns) {
    for (const caseId of pattern.cases) {
      const existingLink = await prisma.caseConfirmsPattern.findUnique({
        where: {
          caseId_patternId: {
            caseId,
            patternId: pattern.id,
          },
        },
      });
      if (existingLink) continue;

      const caseExists = await prisma.case.findUnique({ where: { id: caseId } });
      const patternExists = await prisma.pattern.findUnique({ where: { id: pattern.id } });
      if (!caseExists || !patternExists) continue;

      await prisma.caseConfirmsPattern.create({
        data: {
          caseId,
          patternId: pattern.id,
        },
      });
      stats.patternLinks += 1;
    }
  }

  for (let i = 0; i < data.openQuestions.length; i++) {
    const id = `oq${i + 1}`;
    const text = data.openQuestions[i];
    const existing = await prisma.openQuestion.findUnique({ where: { id } });

    if (existing) {
      if (existing.text !== text) {
        await prisma.openQuestion.update({
          where: { id },
          data: { text },
        });
      }
    } else {
      await prisma.openQuestion.create({
        data: {
          id,
          text,
          status: "open",
        },
      });
      stats.openQuestions += 1;
    }
  }

  const questionIdByText = new Map<string, string>();
  const existingQuestions = await prisma.question.findMany({ select: { id: true, text: true } });
  for (const question of existingQuestions) {
    questionIdByText.set(question.text, question.id);
  }

  let questionCounter = existingQuestions.length;

  for (const branch of data.decisionEngineBranches) {
    for (const blockText of branch.blocks) {
      if (questionIdByText.has(blockText)) continue;

      questionCounter += 1;
      const questionId = `q_branch_${questionCounter}`;
      questionIdByText.set(blockText, questionId);

      await prisma.question.create({
        data: {
          id: questionId,
          text: blockText,
          domainTags: [],
          sourceCaseIds: [],
        },
      });
    }
  }

  logSeedSyncSummary(stats);

  return Object.values(stats).some((count) => count > 0);
}
