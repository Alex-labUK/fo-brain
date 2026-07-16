import type { ActivationStatus, CaseStatus, OutcomeStage, PrincipleStatus } from "@prisma/client";
import {
  activationStatusBadgeClass,
  activationStatusLabels,
  caseStatusBadgeClass,
  caseStatusLabels,
  outcomeStageBadgeClass,
  outcomeStageLabels,
  principleStatusBadgeClass,
  principleStatusLabels,
} from "@/lib/labels";

export function CaseStatusBadge({ status }: { status: CaseStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${caseStatusBadgeClass(status)}`}
    >
      {caseStatusLabels[status]}
    </span>
  );
}

export function PrincipleStatusBadge({ status }: { status: PrincipleStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${principleStatusBadgeClass(status)}`}
    >
      {principleStatusLabels[status]}
    </span>
  );
}

export function OutcomeStageBadge({ status }: { status: OutcomeStage }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${outcomeStageBadgeClass(status)}`}
    >
      {outcomeStageLabels[status]}
    </span>
  );
}

export function ActivationStatusBadge({ status }: { status: ActivationStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${activationStatusBadgeClass(status)}`}
    >
      {activationStatusLabels[status]}
    </span>
  );
}
