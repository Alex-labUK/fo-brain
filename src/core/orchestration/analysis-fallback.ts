import type { AnalysisInput, AnalysisResult, RoleAssignment, RoleFactGroup } from "@/core/orchestration/analysis-core";
import {
  containsForbiddenPhrase,
  collectAnalysisText,
  flattenFacts,
  MAX_CRITICAL_FACTS,
  MAX_DECISION_SCENARIOS,
} from "@/core/orchestration/analysis-core";
import type { SubsystemCatalogItem } from "@/core/orchestration/types";

type CaseProfile =
  | "repeat_leak_warranty"
  | "child_injury_trip_cancel"
  | "bank_payment_block"
  | "staff_employment"
  | "legal_dispute"
  | "insufficient";

type CaseContext = {
  whatHappened: string;
  desiredOutcome: string;
  haystack: string;
  sentences: string[];
  profile: CaseProfile;
  repairSubject: string;
};

type DecisionGate = {
  profile: CaseProfile;
  fork: string;
  context: CaseContext;
};

function includesAny(haystack: string, keywords: string[]): boolean {
  return keywords.some((k) => haystack.includes(k.toLowerCase()));
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?…])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 8);
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

function detectProfile(whatHappened: string, desiredOutcome: string): CaseProfile {
  const haystack = `${whatHappened} ${desiredOutcome}`.toLowerCase();

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
  const desiredOutcome = input.desiredOutcome.trim();
  const haystack = `${whatHappened} ${desiredOutcome}`.toLowerCase();
  return {
    whatHappened,
    desiredOutcome,
    haystack,
    sentences: splitSentences(whatHappened),
    profile: detectProfile(whatHappened, desiredOutcome),
    repairSubject: detectRepairSubject(haystack),
  };
}

function limitCriticalFacts(groups: RoleFactGroup[], max = MAX_CRITICAL_FACTS): RoleFactGroup[] {
  const flattened: Array<{ role: string; question: string }> = [];
  for (const group of groups) {
    for (const question of group.questions) {
      flattened.push({ role: group.role, question });
    }
  }

  const limited = flattened.slice(0, max);
  const byRole = new Map<string, string[]>();

  for (const item of limited) {
    const existing = byRole.get(item.role) ?? [];
    existing.push(item.question);
    byRole.set(item.role, existing);
  }

  return Array.from(byRole.entries()).map(([role, questions]) => ({ role, questions }));
}

function forkForRepeatLeakWarranty(): string {
  return "Можно ли уже сейчас признать случай гарантийным, или сначала нужно подтвердить, что повторный дефект относится к гарантийным обязательствам подрядчика?";
}

function forkForChildInjuryTripCancel(ctx: CaseContext): string {
  return includesAny(ctx.haystack, ["перелом", "сломал"])
    ? "Фиксировать ли финальные потери по отменённой поездке сейчас или дождаться подтверждения лечения перелома?"
    : "Отменять ли поездку окончательно сейчас или дождаться подтверждённого медицинского статуса ребёнка?";
}

function forkForBankPaymentBlock(): string {
  return "Снимать блокировку через банк самостоятельно или эскалировать к принципалу за документами?";
}

function forkForStaffEmployment(): string {
  return "Принимать кадровое решение в зоне полномочий FO или ждать решения принципала?";
}

function forkForLegalDispute(): string {
  return "Отвечать контрагенту с текущей позицией или сначала собрать доказательную базу?";
}

function forkForInsufficient(ctx: CaseContext): string {
  const anchor = ctx.sentences[0] ?? ctx.whatHappened;
  const outcomeAnchor = ctx.desiredOutcome
    ? shortenFact(ctx.desiredOutcome, 90)
    : shortenFact(anchor, 90);
  return ctx.desiredOutcome
    ? `Достигать «${outcomeAnchor}» с имеющимися фактами или сначала закрыть один пробел в данных?`
    : `Действовать по «${outcomeAnchor}» сейчас или сначала получить один подтверждённый факт?`;
}

function resolveFork(ctx: CaseContext): string {
  switch (ctx.profile) {
    case "repeat_leak_warranty":
      return forkForRepeatLeakWarranty();
    case "child_injury_trip_cancel":
      return forkForChildInjuryTripCancel(ctx);
    case "bank_payment_block":
      return forkForBankPaymentBlock();
    case "staff_employment":
      return forkForStaffEmployment();
    case "legal_dispute":
      return forkForLegalDispute();
    case "insufficient":
    default:
      return forkForInsufficient(ctx);
  }
}

function determineDecisionGate(caseContext: CaseContext): DecisionGate {
  return {
    profile: caseContext.profile,
    fork: resolveFork(caseContext),
    context: caseContext,
  };
}

function buildKeyQuestions(caseContext: CaseContext, decisionGate: DecisionGate): RoleFactGroup[] {
  void decisionGate;
  const ctx = caseContext;

  switch (ctx.profile) {
    case "repeat_leak_warranty":
      return limitCriticalFacts([
        {
          role: "House Manager",
          questions: [
            "Кто выполнял последний ремонт и когда?",
            "Течь возникла в том же месте?",
            "Какова техническая причина повторной протечки?",
            "Является ли дефект повторением предыдущего ремонта?",
          ],
        },
        {
          role: "Legal",
          questions: ["Действует ли гарантия именно на этот дефект?"],
        },
      ]);

    case "child_injury_trip_cancel":
      return limitCriticalFacts([
        {
          role: includesAny(ctx.haystack, ["врач", "клиник", "лечен"])
            ? "Медицинский координатор"
            : "Семейный координатор",
          questions: [
            includesAny(ctx.haystack, ["перелом", "сломал"])
              ? "Назначено ли лечение перелома и кто его ведёт?"
              : "Каков подтверждённый медицинский статус ребёнка?",
            "Какие семейные потребности возникают в ближайшие 24 часа?",
          ],
        },
        {
          role: "Travel-менеджер",
          questions: [
            includesAny(ctx.haystack, ["отел", "hotel"])
              ? "Какова подтверждённая сумма невозвратных потерь по отелям?"
              : "Какие бронирования уже отменены и какова сумма потерь?",
            includesAny(ctx.haystack, ["рейс", "вылет", "аэропорт"])
              ? "Есть ли штрафы по билетам, которые уже нельзя снять?"
              : "Какие транспортные обязательства ещё создают экспозицию?",
          ].slice(0, includesAny(ctx.haystack, ["страх", "полис"]) ? 1 : 2),
        },
        ...(includesAny(ctx.haystack, ["страх", "полис"])
          ? [{ role: "Legal", questions: ["Покрывает ли полис отмену по этому медицинскому основанию?"] }]
          : []),
      ]);

    case "bank_payment_block":
      return limitCriticalFacts([
        {
          role: "Банковские операции",
          questions: [
            "Какие платежи заблокированы и на какую сумму?",
            "Банк назвал причину блокировки?",
            "Есть ли срок автоматического снятия блокировки?",
          ],
        },
        { role: "Legal", questions: ["Требует ли разблокировка документов или решения принципала?"] },
      ]);

    case "staff_employment":
      return limitCriticalFacts([
        {
          role: "HR / Staff",
          questions: [
            "Какое кадровое действие уже инициировано?",
            "Есть ли договор и документированные основания?",
          ],
        },
        {
          role: "Legal",
          questions: [
            "Соответствует ли решение законодательству юрисдикции?",
            "Есть ли риск претензии до уведомления сотрудника?",
          ],
        },
      ]);

    case "legal_dispute":
      return limitCriticalFacts([
        {
          role: "Legal",
          questions: [
            "Какие документы подтверждают позицию семьи?",
            "Какой срок на ответ установлен контрагентом или судом?",
            "Какой шаг создаст необратимое признание ответственности?",
          ],
        },
        ...(includesAny(ctx.haystack, ["протеч", "течь", "дефект", "ремонт"])
          ? [{ role: "House Manager", questions: ["Есть ли техническое заключение по предмету спора?"] }]
          : []),
      ]);

    case "insufficient":
    default: {
      const anchor = ctx.sentences[0] ?? ctx.whatHappened;
      return limitCriticalFacts([
        {
          role: "Head of Family Office",
          questions: [
            `Кто подтвердил: «${shortenFact(anchor, 100)}»?`,
            ctx.desiredOutcome
              ? `Что должно быть правдой, чтобы «${shortenFact(ctx.desiredOutcome, 80)}» стало достижимым?`
              : "Какой ответ в ближайшие 24 часа снимет развилку?",
          ],
        },
      ]);
    }
  }
}

function assignOwners(questions: RoleFactGroup[], decisionGate: DecisionGate): RoleAssignment[] {
  void questions;
  const ctx = decisionGate.context;

  switch (decisionGate.profile) {
    case "repeat_leak_warranty":
      return [
        {
          role: "House Manager",
          tasks: [
            `Поднять историю ремонта ${ctx.repairSubject}.`,
            "Организовать техническое обследование.",
            "Подтвердить техническую причину повторной протечки и повторение предыдущего дефекта.",
          ],
          result: "Техническое заключение.",
        },
        {
          role: "Legal",
          tasksHeading: "Проверить",
          tasks: [
            "действует ли гарантия;",
            "распространяется ли она на данный дефект;",
            "создаёт ли письменное согласие признание ответственности.",
          ],
          result: "Юридическое заключение.",
        },
      ];

    case "child_injury_trip_cancel":
      return [
        {
          role: "Семейный координатор",
          tasks: [
            "Подтвердить медицинский статус ребёнка и план лечения на 24–48 часов.",
            "Доложить Head of FO, требуется ли личное внимание принципала.",
          ],
          result: "Подтверждённый медицинский статус и список семейных потребностей.",
        },
        {
          role: "Travel-менеджер",
          tasks: [
            "Зафиксировать отменённые бронирования и сумму необратимых потерь.",
            "Не давать новых обещаний контрагентам до закрытия развилки.",
          ],
          result: "Таблица отмен и подтверждённая финансовая экспозиция.",
        },
        ...(includesAny(ctx.haystack, ["страх", "полис"])
          ? [
              {
                role: "Legal",
                tasksHeading: "Проверить",
                tasks: [
                  "покрывает ли полис отмену по медицинскому основанию;",
                  "какие документы нужны для claim.",
                ],
                result: "Заключение о покрытии и recoverable amount.",
              },
            ]
          : []),
      ];

    case "bank_payment_block":
      return [
        {
          role: "Банковские операции",
          tasks: [
            "Запросить у банка причину блокировки и перечень затронутых платежей.",
            "Зафиксировать дедлайны, когда срыв платежа станет необратимым.",
          ],
          result: "Письменное подтверждение причины блокировки и списка затронутых платежей.",
        },
        {
          role: "Legal",
          tasksHeading: "Проверить",
          tasks: [
            "снимается ли блокировка документами FO;",
            "нужен ли принципал для compliance-решения.",
          ],
          result: "Заключение: FO действует самостоятельно или нужен Decision Required.",
        },
      ];

    case "staff_employment":
      return [
        {
          role: "HR / Staff",
          tasks: [
            "Собрать договор, переписку и хронологию событий по сотруднику.",
            "Зафиксировать, какое решение уже озвучено и кому.",
          ],
          result: "Комплект документов и хронология без пробелов.",
        },
        {
          role: "Legal",
          tasksHeading: "Проверить",
          tasks: [
            "допустимость планируемого шага;",
            "риск претензии до уведомления сотрудника.",
          ],
          result: "Юридическое заключение по допустимости решения.",
        },
      ];

    case "legal_dispute":
      return [
        {
          role: "Legal",
          tasks: [
            "Собрать договоры, переписку и доказательства по предмету спора.",
            "Подготовить черновик позиции без отправки контрагенту.",
          ],
          result: "Юридическое заключение и проект позиции.",
        },
      ];

    case "insufficient":
    default:
      return [
        {
          role: "Head of Family Office",
          tasks: [
            "Назначить одного owner, который вернёт первый подтверждённый факт по развилке.",
            "Запретить параллельные обещания контрагентам до ответа.",
          ],
          result: "Один подтверждённый факт, меняющий маршрут решения.",
        },
      ];
  }
}

function buildDecisionBranches(decisionGate: DecisionGate) {
  switch (decisionGate.profile) {
    case "repeat_leak_warranty":
      return [
        {
          tone: "positive" as const,
          conditions: ["гарантия действует", "дефект гарантийный"],
          action: "предъявить требования подрядчику.",
        },
        {
          tone: "negative" as const,
          conditions: ["гарантия закончилась"],
          action: "готовить коммерческий ремонт.",
        },
        {
          tone: "warning" as const,
          conditions: ["договор или техническая причина не проверены"],
          action:
            "не признавать ответственность и не давать письменное согласие до проверки договора и технической причины дефекта.",
        },
      ];

    case "child_injury_trip_cancel":
      return [
        {
          tone: "positive" as const,
          conditions: ["медицинский статус подтверждён", "невозвратные потери по поездке известны"],
          action: "вынести принципалу Decision Required только по сумме, которую нельзя закрыть без его выбора.",
        },
        {
          tone: "positive" as const,
          conditions: ["есть основание для страхового claim"],
          action: "инициировать claim и не фиксировать итоговые потери до ответа страховой.",
        },
        {
          tone: "negative" as const,
          conditions: ["медицинский статус или суммы потерь не подтверждены"],
          action: "не сообщать принципалу итоговые цифры и не согласовывать с контрагентами необратимые шаги.",
        },
      ];

    case "bank_payment_block":
      return [
        {
          tone: "positive" as const,
          conditions: ["блокировка техническая", "снимается без участия принципала"],
          action: "закрыть вопрос через банк и доложить принципалу Executive Update.",
        },
        {
          tone: "negative" as const,
          conditions: ["нужны документы принципала или compliance-решение"],
          action: "вынести принципалу Decision Required с перечнем требуемых документов.",
        },
        {
          tone: "warning" as const,
          conditions: ["причина блокировки не подтверждена"],
          action: "не запускать альтернативные платёжные маршруты до ответа банка.",
        },
      ];

    case "staff_employment":
      return [
        {
          tone: "positive" as const,
          conditions: ["решение в зоне полномочий FO", "юридических рисков нет"],
          action: "реализовать решение и доложить принципалу Executive Update.",
        },
        {
          tone: "negative" as const,
          conditions: ["требуется решение принципала или риск претензии высок"],
          action: "вынести принципалу Decision Required до уведомления сотрудника.",
        },
        {
          tone: "warning" as const,
          conditions: ["документы или основания не собраны"],
          action: "не уведомлять сотрудника об окончательном решении.",
        },
      ];

    case "legal_dispute":
      return [
        {
          tone: "positive" as const,
          conditions: ["позиция подтверждена документами", "срок позволяет подготовку"],
          action: "согласовать с принципалом тактику ответа или переговоров.",
        },
        {
          tone: "negative" as const,
          conditions: ["позиция слабая или срок критичен"],
          action: "вынести принципалу Decision Required до любого письма контрагенту.",
        },
        {
          tone: "warning" as const,
          conditions: ["документы не собраны"],
          action: "не отправлять претензию и не соглашаться на условия контрагента.",
        },
      ];

    case "insufficient":
    default:
      return [
        {
          tone: "positive" as const,
          conditions: ["ключевой факт подтверждён"],
          action: "пересобрать анализ с обновлёнными данными и сузить следующий шаг.",
        },
        {
          tone: "negative" as const,
          conditions: ["ключевой факт не подтверждён"],
          action: "не принимать необратимых решений и не эскалировать к принципалу без фактов.",
        },
      ];
  }
}

function renderFallbackAnalysis(
  decisionGate: DecisionGate,
  questions: RoleFactGroup[],
  assignments: RoleAssignment[],
  branches: ReturnType<typeof buildDecisionBranches>,
): AnalysisResult {
  const result: AnalysisResult = {
    sections: [
      { title: "Главная развилка", content: decisionGate.fork },
      { title: "Что нужно выяснить", facts: flattenFacts(questions), roleGroups: questions },
      { title: "Кому поручить", roleAssignments: assignments },
      { title: "Если выяснится...", scenarios: branches.slice(0, MAX_DECISION_SCENARIOS) },
    ],
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
  const caseContext = buildContext(input);
  const decisionGate = determineDecisionGate(caseContext);
  const questions = buildKeyQuestions(caseContext, decisionGate);
  const assignments = assignOwners(questions, decisionGate);
  const branches = buildDecisionBranches(decisionGate);
  return renderFallbackAnalysis(decisionGate, questions, assignments, branches);
}
