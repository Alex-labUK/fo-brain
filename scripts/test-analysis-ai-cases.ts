import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { generateAnalysisWithAI } from "../src/core/orchestration/analysis-ai";
import type { AnalysisInput } from "../src/core/orchestration/analysis-core";

function loadEnvFile(): void {
  const envPath = resolve(process.cwd(), ".env");
  try {
    const content = readFileSync(envPath, "utf-8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // .env optional for CI without key
  }
}

const CASES: Array<{ id: string; input: AnalysisInput }> = [
  {
    id: "A_UK_conflict",
    input: {
      whatHappened:
        "Течь в тамбуре, управляющая компания отказывается искать причину, ссылаясь на отсутствие доступа к общему имуществу. Клиент купил квартиру без due diligence FO, есть незаконная перепланировка, о которой ни FO, ни клиент не знали заранее.",
      desiredOutcome:
        "Устранить причину протечки и зафиксировать ответственность УК, не привлекая внимания к статусу перепланировки.",
    },
  },
  {
    id: "B_insurance_spv",
    input: {
      whatHappened:
        "Яхта переведена с физлица на SPV несколько лет назад, страховой брокер не уведомлён. Гость получил травму на борту, выдвигает иск; страховая обнаружила несовпадение страхователя с фактическим владельцем и грозит отказать в выплате.",
      desiredOutcome:
        "Сохранить страховое покрытие по инциденту и не потерять отношения с пострадавшим гостем.",
    },
  },
  {
    id: "C_warranty_defect",
    input: {
      whatHappened:
        "Подрядчик отказывается за свой счёт устранять протечку кровли после сдачи ремонта. При подготовке претензии выяснилось, что часть работ (перепланировка несущей стены) выполнена без разрешения на строительство — принципал сознательно пошёл на это.",
      desiredOutcome: "Добиться от подрядчика устранения дефекта за его счёт.",
    },
  },
];

async function main(): Promise<void> {
  loadEnvFile();

  if (!process.env.OPENAI_API_KEY?.trim()) {
    console.error("OPENAI_API_KEY is not set in .env — AI path cannot run.");
    process.exit(1);
  }

  let allOk = true;

  for (const testCase of CASES) {
    console.log(`\n========== CASE ${testCase.id} ==========`);
    try {
      const { result, usage } = await generateAnalysisWithAI(testCase.input);
      console.log("PATH: ai");
      if (usage) {
        console.log("USAGE:", usage);
      }
      console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      allOk = false;
      console.log("PATH: ai FAILED");
      console.error(error instanceof Error ? error.message : error);
    }
  }

  if (!allOk) process.exit(1);
}

void main();
