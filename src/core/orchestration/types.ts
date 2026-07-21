import type { ActivationStatus } from "@prisma/client";

export type SubsystemCatalogItem = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  ownerRoleKey: string | null;
};

export type DraftSubsystemProposal = {
  subsystemId: string;
  subsystemKey: string;
  subsystemName: string;
  ownerRoleKey: string | null;
  /** Draft-only explanation — not persisted to Prisma in Phase 1.1. */
  reasonForActivation: string;
  roleRelevantContext: string;
  expectedFeedback: string;
  /** Always true in Phase 1 — keyword rules are draft suggestions only. */
  isDraftSuggestion: true;
};

export type ActivationDraftInput = {
  subsystemId: string;
  context: string;
  expectedFeedback: string;
  status: Extract<ActivationStatus, "confirmed" | "excluded">;
  excludeReason?: string;
};

export type CreateOutcomeInput = {
  statement: string;
  successCondition?: string;
  requestFacts: string;
  headFocus?: string;
  activations: ActivationDraftInput[];
};

export type OrchestrationWizardStep = {
  id: number;
  label: string;
};

export const orchestrationWizardSteps: OrchestrationWizardStep[] = [
  { id: 0, label: "Запрос и outcome" },
  { id: 1, label: "Подсистемы" },
  { id: 2, label: "Сохранение" },
];
