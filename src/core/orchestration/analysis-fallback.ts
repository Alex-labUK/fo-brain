import type { AnalysisInput, AnalysisResult, RoleAssignment, DecisionScenario } from "@/core/orchestration/analysis-core";
import {
  containsForbiddenPhrase,
  collectAnalysisText,
  MAX_ACTIONS,
  MAX_DECISION_SCENARIOS,
  SECTION_TITLES,
} from "@/core/orchestration/analysis-core";
import type { SubsystemCatalogItem } from "@/core/orchestration/types";

type CaseProfile =
  | "repeat_leak_warranty"
  | "child_injury_trip_cancel"
  | "bank_payment_block"
  | "staff_employment"
  | "legal_dispute"
  | "insufficient";

import type { AnalysisPriority } from "@/lib/priority";

type CaseContext = {
  whatHappened: string;
  desiredOutcome: string;
  haystack: string;
  profile: CaseProfile;
  repairSubject: string;
};

const FALLBACK_PRIORITY: AnalysisPriority = {
  urgency: "soon",
  stake: "moderate",
  note: "Автоматическая оценка недоступна — резервный путь",
};

function includesAny(haystack: string, keywords: string[]): boolean {
  return keywords.some((k) => haystack.includes(k.toLowerCase()));
}

function shortenFact(sentence: string, maxLength = 140): string {
  const trimmed = sentence.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength - 1)}…`;
}

function detectRepairSubject(haystack: string): string {
  if (includesAny(haystack, ["дымоход", "chimney"])) return "дымохода";
  if (includesAny(haystack, ["кровл", "roof"])) return "кровли";
  if (includesAny(haystack, ["крыш"])) return "крыши";
  return "объекта";
}

function detectProfile(whatHappened: string, desiredOutcome?: string): CaseProfile {
  const haystack = `${whatHappened} ${desiredOutcome ?? ""}`.toLowerCase();

  const hasLeak = includesAny(haystack, ["протеч", "течь", "теч", "leak", "кровл", "крыш", "дымоход"]);
  const hasRepeatOrRepair = includesAny(haystack, [
    "повтор",
    "снова",
    "вновь",
    "ремонт",
    "подрядчик",
    "гарант",
  ]);
  const hasWarrantyContext =
    hasRepeatOrRepair ||
    includesAny(haystack, ["дефект", "устранен", "бесплатн", "ответствен"]);

  if (hasLeak && hasWarrantyContext) return "repeat_leak_warranty";

  const hasChildInjury = includesAny(haystack, ["ребен", "ребён", "перелом", "сломал", "травм"]);
  const hasTripCancel = includesAny(haystack, ["отмен", "поезд", "normandy", "норmand", "отел", "рейс"]);
  if (hasChildInjury && hasTripCancel) return "child_injury_trip_cancel";

  if (includesAny(haystack, ["банк", "блок", "платеж", "платёж", "перевод", "счёт", "счет"])) {
    return "bank_payment_block";
  }

  if (includesAny(haystack, ["найм", "увольн", "сотрудник", "персонал", "hr", "кадров"])) {
    return "staff_employment";
  }

  if (includesAny(haystack, ["юрид", "суд", "претенз", "иск", "договор", "контраг"])) {
    return "legal_dispute";
  }

  return "insufficient";
}

function buildContext(input: AnalysisInput): CaseContext {
  const whatHappened = input.whatHappened.trim();
  const desiredOutcome = input.desiredOutcome?.trim() ?? "";
  const haystack = `${whatHappened} ${desiredOutcome}`.toLowerCase();
  return {
    whatHappened,
    desiredOutcome,
    haystack,
    profile: detectProfile(whatHappened, desiredOutcome),
    repairSubject: detectRepairSubject(haystack),
  };
}

function standardRoutes(confirmed: string, disproved: string, unknown: string): DecisionScenario[] {
  return [
    { tone: "positive", action: confirmed },
    { tone: "negative", action: disproved },
    { tone: "warning", action: unknown },
  ];
}

function buildLeakAnalysis(ctx: CaseContext): AnalysisResult {
  const outcome = shortenFact(
    ctx.desiredOutcome ||
      "Устранить протечку и определить, кто несёт ответственность за ремонт.",
    160,
  );
  const fork =
    "Можно ли уже сейчас признать случай гарантийным, или сначала нужно подтвердить, что повторный дефект относится к гарантийным обязательствам подрядчика?";
  const determiningFact =
    "Относится ли повторная протечка к гарантийным обязательствам подрядчика по договору прошлого ремонта.";

  const roleAssignments: RoleAssignment[] = [
    { role: "House Manager", result: "Техническое заключение о причине протечки и повторении дефекта." },
    { role: "Legal", result: "Заключение о применимости гарантии к этому дефекту." },
  ];

  const actions = [
    `Поднять историю ремонта ${ctx.repairSubject}.`,
    "Организовать осмотр места протечки.",
    "Сверить место протечки с прошлым ремонтом.",
    "Подготовить техническое заключение.",
  ].slice(0, MAX_ACTIONS);

  const scenarios = standardRoutes(
    "Предъявить требования подрядчику по гарантии.",
    "Готовить коммерческий ремонт за счёт семьи.",
    "Не признавать ответственность и не давать письменное согласие до проверки договора и технической причины дефекта.",
  );

  return renderAnalysis(outcome, fork, determiningFact, roleAssignments, actions, scenarios);
}

function buildGenericAnalysis(ctx: CaseContext): AnalysisResult {
  const inferredOutcome = ctx.desiredOutcome
    ? shortenFact(ctx.desiredOutcome, 160)
    : `Предполагаемая цель принципала: ${shortenFact(
        `защитить интересы принципала и закрыть ситуацию «${ctx.whatHappened.slice(0, 80)}»`,
        140,
      )}`;
  const outcome = inferredOutcome;
  const fork = ctx.desiredOutcome
    ? `Достигать «${shortenFact(ctx.desiredOutcome, 90)}» с имеющимися фактами или сначала закрыть один пробел в данных?`
    : `Действовать по текущим данным или сначала получить один подтверждённый факт?`;
  const determiningFact = "Какой один подтверждённый факт снимет главную развилку по этому кейсу.";

  const roleAssignments: RoleAssignment[] = [
    { role: "Head of Family Office", result: "Подтверждённый факт, меняющий маршрут решения." },
  ];

  const actions = [
    "Назначить owner, который вернёт факт.",
    "Собрать первичные документы по ситуации.",
    "Зафиксировать, что уже подтверждено письменно.",
  ].slice(0, MAX_ACTIONS);

  const scenarios = standardRoutes(
    "Пересобрать маршрут с подтверждённым фактом.",
    "Не принимать необратимых решений без факта.",
    "Не эскалировать к принципалу до получения факта или явного тупика.",
  );

  return renderAnalysis(outcome, fork, determiningFact, roleAssignments, actions, scenarios);
}

function renderAnalysis(
  outcome: string,
  fork: string,
  determiningFact: string,
  roleAssignments: RoleAssignment[],
  actions: string[],
  scenarios: DecisionScenario[],
): AnalysisResult {
  const result: AnalysisResult = {
    sections: [
      { title: SECTION_TITLES[0], content: outcome },
      { title: SECTION_TITLES[1], content: fork },
      { title: SECTION_TITLES[2], content: determiningFact },
      { title: SECTION_TITLES[3], roleAssignments },
      { title: SECTION_TITLES[4], actions: actions.slice(0, MAX_ACTIONS) },
      {
        title: SECTION_TITLES[5],
        scenarios: scenarios.slice(0, MAX_DECISION_SCENARIOS),
      },
    ],
    priority: FALLBACK_PRIORITY,
  };

  if (containsForbiddenPhrase(collectAnalysisText(result))) {
    throw new Error("Analysis output contains forbidden generic phrasing");
  }

  return result;
}

/** Deterministic fallback when AI is unavailable or fails. */
export function generateDeterministicAnalysis(
  input: AnalysisInput,
  catalog: SubsystemCatalogItem[] = [],
): AnalysisResult {
  void catalog;
  const ctx = buildContext(input);

  switch (ctx.profile) {
    case "repeat_leak_warranty":
      return buildLeakAnalysis(ctx);
    default:
      return buildGenericAnalysis(ctx);
  }
}
