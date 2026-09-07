import { existsSync, readFileSync } from "fs";
import path from "path";
import {
  analysisProvidedTitle,
  deriveSituationTitle,
  isMeaningfulSituation,
  SITUATION_TITLE_MAX_CHARS,
} from "@/lib/situation-title";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

assert(!isMeaningfulSituation(""), "A: empty situation cannot be submitted");
assert(!isMeaningfulSituation("   \n\t  "), "A: whitespace situation cannot be submitted");
assert(isMeaningfulSituation("Принципал рассматривает покупку дома."), "A: meaningful text is accepted");

const example =
  "Принципал рассматривает покупку дома. Технический отчёт выявил проблему с пристройкой, продавец обещает её устранить, но пока неизвестно, снимет ли это юридический риск.";
assert(
  deriveSituationTitle(example) === "Принципал рассматривает покупку дома",
  "G: fallback title uses the start of the situation",
);
assert(!deriveSituationTitle(example).includes("Новый кейс"), "G: fallback title is not Новый кейс");
assert(
  deriveSituationTitle("   ").length > 0 && deriveSituationTitle("   ").length <= SITUATION_TITLE_MAX_CHARS,
  "G: empty input still yields a bounded readable title",
);

const long = `${"Очень длинное описание ситуации без точек ".repeat(12)}конец`;
const bounded = deriveSituationTitle(long);
assert(bounded.length <= SITUATION_TITLE_MAX_CHARS, "G: fallback title is bounded in length");
assert(bounded.endsWith("…"), "G: long title is truncated");

assert(analysisProvidedTitle({ sections: [] }) === null, "E: analysis without title field is ignored");
assert(
  deriveSituationTitle("Ситуация из текста", { title: "  Покупка дома в пригороде  " }) ===
    "Покупка дома в пригороде",
  "A-field: existing analysis title is reused when present",
);

const root = process.cwd();
const actions = readFileSync(path.join(root, "src/app/analyze/actions.ts"), "utf8");
assert(actions.includes("export async function startNewSituation"), "intake has startNewSituation");
assert(actions.includes("runCaseAnalysis({ whatHappened: situation })"), "D: existing analysis path is invoked");
assert(actions.includes("saveAnalysisAsCase("), "B: existing case creation is reused");
assert(!actions.includes("generateAnalysisWithAI"), "D: no parallel analysis-ai call in intake action");
assert(!actions.includes("generateDeterministicAnalysis"), "D: no parallel fallback generator in intake action");
assert(!/openai|OpenAI/i.test(actions.split("startNewSituation")[1] ?? ""), "E: no extra title-generation AI call");
assert(actions.includes("input.input.whatHappened"), "C: save path uses the situation as the user message");
assert(actions.includes('role: "user", content: userMessage'), "C: initial situation is stored as dialogue");
assert(actions.includes("Опишите, что произошло"), "A: server rejects empty situation");

const form = readFileSync(path.join(root, "src/app/analyze/IntakeForm.tsx"), "utf8");
assert(form.includes("startNewSituation"), "form submits through startNewSituation");
assert(form.includes("isMeaningfulSituation"), "A: form validates meaningful text");
assert(form.includes("if (submitting) return"), "F: duplicate submit is ignored");
assert(form.includes("disabled={submitting}"), "F: controls disable while submitting");
assert(form.includes("Разбираю ситуацию…"), "loading button copy");
assert(form.includes("Разобрать ситуацию"), "primary action copy");
assert(!form.includes("Анализировать"), "no Анализировать button");
assert(!form.includes("sessionStorage"), "intake does not use a one-off session store");
assert(form.includes("router.push(`/cases/${id}`)"), "redirects to the existing case page");
assert(!form.includes("Название кейса"), "no title field");
assert(!form.includes("desiredOutcome"), "no desired-result field");

const page = readFileSync(path.join(root, "src/app/analyze/page.tsx"), "utf8");
assert(page.includes("Новая ситуация"), "page heading");
assert(page.includes("Опишите, что произошло. Можно своими словами."), "page subtitle");
assert(!page.includes("rounded-xl border border-zinc-200 bg-white p-6 shadow-sm"), "no extra card wrapper");

const header = readFileSync(path.join(root, "src/components/AppHeader.tsx"), "utf8");
assert(header.includes("Новая ситуация") && header.includes('href="/analyze"'), "H: header still opens /analyze");
assert(!header.includes("Анализировать"), "H: header has no Анализировать");

const savePath = actions.slice(actions.indexOf("export async function saveAnalysisAsCase"));
assert(savePath.includes("messages:"), "H: existing saveAnalysisAsCase still writes dialogue");
assert(savePath.includes("generateLifecycleSuggestion"), "H: existing save path remains compatible");

const casePage = readFileSync(path.join(root, "src/app/cases/[id]/page.tsx"), "utf8");
assert(casePage.includes("← Решения"), "case page back link is Решения");
assert(casePage.includes('href="/cases"'), "case page back link goes to /cases");
assert(!casePage.includes("К библиотеке кейсов"), "old library back link is gone");
assert(!casePage.includes("{caseItem.id} · {formatDomain(caseItem.domain)}"), "technical id/domain line is hidden");

assert(!existsSync(path.join(root, "src/app/analyze/result/page.tsx")), "old /analyze/result page is removed");
assert(!existsSync(path.join(root, "src/app/analyze/result/AnalysisResult.tsx")), "old /analyze/result UI is removed");

console.log("Situation intake test passed.");
