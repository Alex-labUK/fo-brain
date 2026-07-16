import type { SubsystemCatalogItem, DraftSubsystemProposal } from "./types";

type KeywordRule = {
  subsystemKey: string;
  keywords: string[];
  expectedFeedbackTemplate: string;
};

const KEYWORD_RULES: KeywordRule[] = [
  {
    subsystemKey: "travel",
    keywords: ["поезд", "рейс", "отел", "hotel", "flight", "trip", "travel", "билет", "отмен"],
    expectedFeedbackTemplate: "Подтверждённый результат по travel-операциям: что отменено, что сохранено, финансовая экспозиция.",
  },
  {
    subsystemKey: "residence",
    keywords: ["дом", "резиден", "house", "квартир", "staff", "персонал", "управля"],
    expectedFeedbackTemplate: "Подтверждённый результат по дому/резиденции: что изменено в быту, доступности, персонале.",
  },
  {
    subsystemKey: "legal",
    keywords: ["legal", "юрид", "договор", "претенз", "суд", "контраг", "регулятор"],
    expectedFeedbackTemplate: "Юридический результат или блокер: позиция, риск, нужное решение.",
  },
  {
    subsystemKey: "staff",
    keywords: ["найм", "увольн", "водител", "повар", "сотрудник", "hr", "персонал"],
    expectedFeedbackTemplate: "Результат по персоналу: статус, риски, следующий шаг без детального плана задач.",
  },
  {
    subsystemKey: "banking",
    keywords: ["банк", "платеж", "перевод", "счет", "счёт", "payment", "bank"],
    expectedFeedbackTemplate: "Подтверждённый банковский результат или ограничение.",
  },
  {
    subsystemKey: "security",
    keywords: ["security", "безопас", "охран", "доступ"],
    expectedFeedbackTemplate: "Подтверждённый результат по безопасности или выявленный риск.",
  },
  {
    subsystemKey: "insurance",
    keywords: ["страх", "insurance", "полис", "claim"],
    expectedFeedbackTemplate: "Статус страхового покрытия или результата урегулирования.",
  },
  {
    subsystemKey: "education",
    keywords: ["школ", "образован", "education", "репетитор", "универс"],
    expectedFeedbackTemplate: "Подтверждённый результат по образовательному вопросу.",
  },
  {
    subsystemKey: "investment_property",
    keywords: ["недвиж", "property", "сделк", "реестр", "продаж", "покуп"],
    expectedFeedbackTemplate: "Результат по сделке/реестру или материальный блокер.",
  },
  {
    subsystemKey: "executive_schedule",
    keywords: ["календар", "расписан", "schedule", "секретар", "встреч"],
    expectedFeedbackTemplate: "Подтверждённое изменение календаря/расписания.",
  },
];

function buildContextExcerpt(requestFacts: string, statement: string): string {
  const combined = [requestFacts.trim(), statement.trim()].filter(Boolean).join("\n\n");
  if (combined.length <= 500) return combined;
  return `${combined.slice(0, 497)}...`;
}

/**
 * Temporary draft proposal mechanism — NOT the Reference Method.
 * Output is always unconfirmed; the user must confirm, exclude, or edit.
 */
export function draftSubsystemProposals(
  requestFacts: string,
  statement: string,
  catalog: SubsystemCatalogItem[],
): DraftSubsystemProposal[] {
  const haystack = `${requestFacts} ${statement}`.toLowerCase();
  const context = buildContextExcerpt(requestFacts, statement);
  const catalogByKey = new Map(catalog.map((item) => [item.key, item]));
  const matchedKeys = new Set<string>();

  for (const rule of KEYWORD_RULES) {
    if (rule.keywords.some((keyword) => haystack.includes(keyword.toLowerCase()))) {
      matchedKeys.add(rule.subsystemKey);
    }
  }

  return Array.from(matchedKeys)
    .map((key) => {
      const subsystem = catalogByKey.get(key);
      const rule = KEYWORD_RULES.find((item) => item.subsystemKey === key);
      if (!subsystem || !rule) return null;

      return {
        subsystemId: subsystem.id,
        subsystemKey: subsystem.key,
        subsystemName: subsystem.name,
        ownerRoleKey: subsystem.ownerRoleKey,
        context,
        expectedFeedback: rule.expectedFeedbackTemplate,
        isDraftSuggestion: true as const,
      };
    })
    .filter((item): item is DraftSubsystemProposal => item !== null);
}
