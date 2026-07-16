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
    title: string;
    statement: string;
    status: "single_case" | "two_case" | "tactical" | "candidate";
    cases: string[];
  }>;
  cases: Array<{
    id: string;
    title: string;
    domain: string;
    status: "hypothetical" | "real_in_progress" | "real_closed";
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

function loadSeedData(): SeedData {
  const seedPath = join(process.cwd(), "seed-data.json");
  const raw = readFileSync(seedPath, "utf-8");
  return JSON.parse(raw) as SeedData;
}

function loadSubsystems(): SubsystemSeedItem[] {
  const seedPath = join(process.cwd(), "data", "subsystems.json");
  const raw = readFileSync(seedPath, "utf-8");
  return JSON.parse(raw) as SubsystemSeedItem[];
}

export async function seedSubsystems(prisma: PrismaClient): Promise<number> {
  const count = await prisma.subsystem.count();
  if (count > 0) {
    return 0;
  }

  const subsystems = loadSubsystems();
  for (const subsystem of subsystems) {
    await prisma.subsystem.create({
      data: {
        id: subsystem.id,
        key: subsystem.key,
        name: subsystem.name,
        description: subsystem.description ?? null,
        ownerRoleKey: subsystem.ownerRoleKey ?? null,
      },
    });
  }

  console.log(`  ✓ ${subsystems.length} subsystems`);
  return subsystems.length;
}

export async function seedDatabase(prisma: PrismaClient): Promise<boolean> {
  await seedSubsystems(prisma);

  const branchCount = await prisma.decisionEngineBranch.count();
  if (branchCount > 0) {
    return false;
  }

  const data = loadSeedData();

  console.log("Importing seed data from seed-data.json...");

  for (const branch of data.decisionEngineBranches) {
    await prisma.decisionEngineBranch.create({
      data: {
        id: branch.id,
        name: branch.name,
        appliesWhen: branch.appliesWhen,
        blocks: branch.blocks,
      },
    });
  }
  console.log(`  ✓ ${data.decisionEngineBranches.length} decision engine branches`);

  for (const principle of data.principles) {
    await prisma.principle.create({
      data: {
        id: principle.id,
        title: principle.title,
        statement: principle.statement,
        status: principle.status,
        personalCalibrationNote: principle.personalCalibrationNote ?? null,
      },
    });
  }
  console.log(`  ✓ ${data.principles.length} principles`);

  for (const pattern of data.patterns) {
    await prisma.pattern.create({
      data: {
        id: pattern.id,
        title: pattern.title,
        statement: pattern.statement,
        status: pattern.status,
      },
    });
  }
  console.log(`  ✓ ${data.patterns.length} patterns`);

  for (const caseItem of data.cases) {
    await prisma.case.create({
      data: {
        id: caseItem.id,
        title: caseItem.title,
        domain: caseItem.domain,
        status: caseItem.status,
        branchId: caseItem.branch,
      },
    });
  }
  console.log(`  ✓ ${data.cases.length} cases`);

  let principleLinks = 0;
  for (const principle of data.principles) {
    for (const caseId of principle.confirmedByCases) {
      await prisma.caseConfirmsPrinciple.create({
        data: {
          caseId,
          principleId: principle.id,
        },
      });
      principleLinks++;
    }
  }
  console.log(`  ✓ ${principleLinks} case–principle confirmations`);

  let patternLinks = 0;
  for (const pattern of data.patterns) {
    for (const caseId of pattern.cases) {
      await prisma.caseConfirmsPattern.create({
        data: {
          caseId,
          patternId: pattern.id,
        },
      });
      patternLinks++;
    }
  }
  console.log(`  ✓ ${patternLinks} case–pattern confirmations`);

  for (let i = 0; i < data.openQuestions.length; i++) {
    await prisma.openQuestion.create({
      data: {
        id: `oq${i + 1}`,
        text: data.openQuestions[i],
        status: "open",
      },
    });
  }
  console.log(`  ✓ ${data.openQuestions.length} open questions`);

  const questionIdByText = new Map<string, string>();
  let questionCounter = 0;

  for (const branch of data.decisionEngineBranches) {
    for (const blockText of branch.blocks) {
      if (questionIdByText.has(blockText)) continue;

      questionCounter++;
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
  console.log(`  ✓ ${questionCounter} questions from branch blocks`);

  console.log("Seed import complete.");
  return true;
}
