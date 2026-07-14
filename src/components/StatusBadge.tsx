import type { CaseStatus, PrincipleStatus } from "@prisma/client";
import {
  caseStatusBadgeClass,
  caseStatusLabels,
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
