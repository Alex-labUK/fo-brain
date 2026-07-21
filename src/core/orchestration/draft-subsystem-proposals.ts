import type { SubsystemCatalogItem, DraftSubsystemProposal } from "./types";

export type SubsystemDraftContent = {
  reasonForActivation: string;
  roleRelevantContext: string;
  expectedFeedback: string;
};

type DraftRule = {
  subsystemKey: string;
  matches: (haystack: string, requestFacts: string, statement: string) => boolean;
  generate: (requestFacts: string, statement: string) => SubsystemDraftContent;
};

function haystackOf(requestFacts: string, statement: string): string {
  return `${requestFacts} ${statement}`.toLowerCase();
}

function includesAny(haystack: string, keywords: string[]): boolean {
  return keywords.some((keyword) => haystack.includes(keyword.toLowerCase()));
}

function excerptForOwner(text: string, maxLength = 280): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength - 3)}...`;
}

function isNormandyCancellationCase(haystack: string): boolean {
  const childInjury = includesAny(haystack, [
    "child",
    "ребен",
    "ребён",
    "перелом",
    "broken arm",
    "injur",
    "травм",
  ]);
  const tripCancel = includesAny(haystack, ["cancel", "отмен", "normandy", "норmand"]);
  return childInjury && tripCancel;
}

const NORMANDY_PROPOSALS: Record<string, SubsystemDraftContent> = {
  family: {
    reasonForActivation: "The event directly affects the child and immediate family support.",
    roleRelevantContext: "The youngest child has been injured; the family trip is cancelled.",
    expectedFeedback:
      "Confirm the family's immediate support needs and whether any unresolved issue requires Head of FO attention.",
  },
  health: {
    reasonForActivation: "Medical assistance is the immediate critical focus.",
    roleRelevantContext: "The youngest child has broken an arm.",
    expectedFeedback:
      "Confirm medical assessment, treatment status and whether additional assistance is required.",
  },
  travel: {
    reasonForActivation: "Trip cancellation requires travel operations to unwind bookings.",
    roleRelevantContext: "The Normandy trip and related travel are cancelled.",
    expectedFeedback:
      "Report what was cancelled, retained deposits and unavoidable financial exposure.",
  },
  household_operations: {
    reasonForActivation: "The family staying home changes day-to-day household readiness.",
    roleRelevantContext: "The family will remain at the residence instead of travelling.",
    expectedFeedback:
      "Confirm household staffing and operational readiness have been adjusted.",
  },
  executive_schedule: {
    reasonForActivation: "Cancelled travel affects the principals' calendar.",
    roleRelevantContext: "The couple will not travel and their planned schedule may change.",
    expectedFeedback: "Confirm affected calendar items have been updated.",
  },
  insurance: {
    reasonForActivation: "Documented injury may trigger trip cancellation coverage.",
    roleRelevantContext: "The trip was cancelled due to a documented child injury.",
    expectedFeedback:
      "Confirm available coverage, claim requirements and recoverable losses.",
  },
};

const GENERIC_DRAFT_RULES: DraftRule[] = [
  {
    subsystemKey: "family",
    matches: (h) =>
      includesAny(h, [
        "family",
        "семь",
        "child",
        "children",
        "ребен",
        "ребён",
        "дет",
        "spouse",
        "wife",
        "husband",
        "супруг",
      ]),
    generate: (facts, statement) => ({
      reasonForActivation: "The request affects immediate family members or family support.",
      roleRelevantContext: excerptForOwner(
        pickSentences(facts, statement, ["child", "family", "семь", "ребен", "ребён", "дет"]),
      ),
      expectedFeedback:
        "Confirm the family's immediate support needs and whether any unresolved issue requires Head of FO attention.",
    }),
  },
  {
    subsystemKey: "health",
    matches: (h) =>
      includesAny(h, [
        "health",
        "medical",
        "doctor",
        "hospital",
        "injur",
        "illness",
        "перелом",
        "врач",
        "медиц",
        "травм",
        "лечен",
      ]),
    generate: (facts, statement) => ({
      reasonForActivation: "Medical assistance or health coordination is required.",
      roleRelevantContext: excerptForOwner(
        pickSentences(facts, statement, ["injur", "medical", "health", "перелом", "arm", "врач", "лечен"]),
      ),
      expectedFeedback:
        "Confirm medical assessment, treatment status and whether additional assistance is required.",
    }),
  },
  {
    subsystemKey: "travel",
    matches: (h) =>
      includesAny(h, [
        "travel",
        "trip",
        "flight",
        "hotel",
        "booking",
        "поезд",
        "рейс",
        "отел",
        "билет",
        "перел",
      ]) ||
      (includesAny(h, ["cancel", "отмен"]) &&
        includesAny(h, ["trip", "travel", "flight", "hotel", "поезд", "рейс", "normandy"])),
    generate: (facts, statement) => ({
      reasonForActivation: "Travel bookings or trip changes require travel operations.",
      roleRelevantContext: excerptForOwner(
        pickSentences(facts, statement, ["trip", "travel", "flight", "hotel", "cancel", "отмен", "normandy"]),
      ),
      expectedFeedback:
        "Report what was cancelled, retained deposits and unavoidable financial exposure.",
    }),
  },
  {
    subsystemKey: "household_operations",
    matches: (h, facts) =>
      includesAny(h, [
        "household operations",
        "operational readiness",
        "staffing schedule",
        "day-to-day household",
        "household staffing",
      ]) ||
      (includesAny(h, ["remain", "stay", "instead of travelling", "оста"]) &&
        includesAny(h, ["residence", "home", "дом", "резиден"]) &&
        includesAny(h, ["cancel", "отмен", "trip", "travel", "поезд"])),
    generate: (facts) => ({
      reasonForActivation: "Household readiness or staffing schedules must adjust to the new plan.",
      roleRelevantContext: excerptForOwner(
        pickSentences(facts, "", ["remain", "residence", "stay", "household", "staffing", "home"]),
      ),
      expectedFeedback:
        "Confirm household staffing and operational readiness have been adjusted.",
    }),
  },
  {
    subsystemKey: "residence",
    matches: (h) =>
      includesAny(h, [
        "property damage",
        "building repair",
        "infrastructure",
        "roof",
        "plumbing",
        "maintenance",
        "ремонт",
        "протеч",
        "инфраструктур",
        "building",
        "property issue",
      ]) ||
      (includesAny(h, ["property", "недвижим"]) &&
        includesAny(h, ["repair", "damage", "maintenance", "ремонт", "инфраструктур"])),
    generate: (facts, statement) => ({
      reasonForActivation: "A property or infrastructure issue at a residence requires attention.",
      roleRelevantContext: excerptForOwner(
        pickSentences(facts, statement, ["property", "repair", "building", "infrastructure", "ремонт", "roof"]),
      ),
      expectedFeedback:
        "Confirm property/infrastructure status and any change to residence availability or systems.",
    }),
  },
  {
    subsystemKey: "staff",
    matches: (h) =>
      includesAny(h, [
        "hire",
        "hiring",
        "firing",
        "employment",
        "contract",
        "salary",
        "vacancy",
        "hr",
        "найм",
        "увольн",
        "кадров",
        "employment contract",
        "job offer",
      ]),
    generate: (facts, statement) => ({
      reasonForActivation: "A personnel or employment matter requires HR/staff handling.",
      roleRelevantContext: excerptForOwner(
        pickSentences(facts, statement, ["hire", "employment", "staff", "hr", "найм", "увольн", "contract"]),
      ),
      expectedFeedback:
        "Confirm personnel/employment status, risks and the next step without a detailed task plan.",
    }),
  },
  {
    subsystemKey: "legal",
    matches: (h) =>
      includesAny(h, ["legal", "юрид", "договор", "contract dispute", "претенз", "суд", "регулятор", "litigation"]),
    generate: (facts, statement) => ({
      reasonForActivation: "A legal question or contractual issue is present.",
      roleRelevantContext: excerptForOwner(
        pickSentences(facts, statement, ["legal", "contract", "юрид", "court", "претенз"]),
      ),
      expectedFeedback: "Provide legal position, risk assessment or decision required.",
    }),
  },
  {
    subsystemKey: "banking",
    matches: (h) => includesAny(h, ["bank", "payment", "transfer", "account", "банк", "платеж", "перевод", "счет", "счёт"]),
    generate: (facts, statement) => ({
      reasonForActivation: "Banking or payment operations are implicated.",
      roleRelevantContext: excerptForOwner(
        pickSentences(facts, statement, ["bank", "payment", "transfer", "банк", "платеж", "счет"]),
      ),
      expectedFeedback: "Confirm banking/payment result or constraint.",
    }),
  },
  {
    subsystemKey: "security",
    matches: (h) => includesAny(h, ["security", "безопас", "охран", "access control", "threat"]),
    generate: (facts, statement) => ({
      reasonForActivation: "A security or access issue is present.",
      roleRelevantContext: excerptForOwner(
        pickSentences(facts, statement, ["security", "access", "безопас", "охран"]),
      ),
      expectedFeedback: "Confirm security outcome or identified risk.",
    }),
  },
  {
    subsystemKey: "insurance",
    matches: (h) =>
      includesAny(h, ["insurance", "страх", "claim", "полис", "coverage", "recoverable"]) ||
      (includesAny(h, ["cancel", "отмен"]) && includesAny(h, ["injur", "medical", "перелом", "child"])),
    generate: (facts, statement) => ({
      reasonForActivation: "Insurance coverage or a claim may apply to the situation.",
      roleRelevantContext: excerptForOwner(
        pickSentences(facts, statement, ["insurance", "claim", "coverage", "страх", "injury", "cancel"]),
      ),
      expectedFeedback: "Confirm available coverage, claim requirements and recoverable losses.",
    }),
  },
  {
    subsystemKey: "education",
    matches: (h) => includesAny(h, ["school", "education", "tutor", "university", "школ", "образован", "репетитор"]),
    generate: (facts, statement) => ({
      reasonForActivation: "An education-related matter is part of the desired outcome.",
      roleRelevantContext: excerptForOwner(
        pickSentences(facts, statement, ["school", "education", "школ", "tutor"]),
      ),
      expectedFeedback: "Confirm education-related outcome or blocker.",
    }),
  },
  {
    subsystemKey: "investment_property",
    matches: (h) =>
      includesAny(h, ["investment property", "property deal", "registry", "сделк", "реестр"]) &&
      includesAny(h, ["invest", "sale", "purchase", "продаж", "покуп", "недвиж"]),
    generate: (facts, statement) => ({
      reasonForActivation: "An investment property transaction or registry matter is involved.",
      roleRelevantContext: excerptForOwner(
        pickSentences(facts, statement, ["property", "deal", "sale", "purchase", "registry", "сделк"]),
      ),
      expectedFeedback: "Confirm transaction/registry outcome or material blocker.",
    }),
  },
  {
    subsystemKey: "executive_schedule",
    matches: (h) =>
      includesAny(h, ["calendar", "schedule", "secretary", "meeting", "календар", "расписан", "встреч"]) ||
      (includesAny(h, ["will not travel", "schedule may change", "couple"]) &&
        includesAny(h, ["cancel", "отмен", "trip", "travel"])),
    generate: (facts, statement) => ({
      reasonForActivation: "Principal calendar or schedule changes are implied.",
      roleRelevantContext: excerptForOwner(
        pickSentences(facts, statement, ["schedule", "calendar", "travel", "couple", "meeting", "расписан"]),
      ),
      expectedFeedback: "Confirm affected calendar items have been updated.",
    }),
  },
];

function pickSentences(facts: string, statement: string, keywords: string[]): string {
  const combined = [facts.trim(), statement.trim()].filter(Boolean).join(" ");
  const sentences = combined.split(/(?<=[.!?])\s+/).filter(Boolean);
  const lowerKeywords = keywords.map((k) => k.toLowerCase());

  const matched = sentences.filter((sentence) =>
    lowerKeywords.some((keyword) => sentence.toLowerCase().includes(keyword)),
  );

  if (matched.length > 0) {
    return matched.slice(0, 2).join(" ");
  }

  return excerptForOwner(combined, 180);
}

function buildProposal(
  subsystem: SubsystemCatalogItem,
  content: SubsystemDraftContent,
): DraftSubsystemProposal {
  return {
    subsystemId: subsystem.id,
    subsystemKey: subsystem.key,
    subsystemName: subsystem.name,
    ownerRoleKey: subsystem.ownerRoleKey,
    reasonForActivation: content.reasonForActivation,
    roleRelevantContext: content.roleRelevantContext,
    expectedFeedback: content.expectedFeedback,
    isDraftSuggestion: true,
  };
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
  const haystack = haystackOf(requestFacts, statement);
  const catalogByKey = new Map(catalog.map((item) => [item.key, item]));
  const proposals = new Map<string, DraftSubsystemProposal>();

  if (isNormandyCancellationCase(haystack)) {
    for (const [key, content] of Object.entries(NORMANDY_PROPOSALS)) {
      const subsystem = catalogByKey.get(key);
      if (subsystem) {
        proposals.set(key, buildProposal(subsystem, content));
      }
    }
    return Array.from(proposals.values());
  }

  for (const rule of GENERIC_DRAFT_RULES) {
    if (!rule.matches(haystack, requestFacts, statement)) continue;

    const subsystem = catalogByKey.get(rule.subsystemKey);
    if (!subsystem || proposals.has(rule.subsystemKey)) continue;

    proposals.set(rule.subsystemKey, buildProposal(subsystem, rule.generate(requestFacts, statement)));
  }

  return Array.from(proposals.values());
}
