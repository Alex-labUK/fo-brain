import { workspaceType } from "@/app/cases/[id]/workspace-ui";
import {
  DECISION_AUTHORITY_KICKER,
  decisionAuthorityHeadline,
} from "@/lib/decision-authority";
import type { DecisionAuthority } from "@/core/orchestration/analysis-core";

type DecisionAuthorityCardProps = {
  authority: DecisionAuthority;
};

export function DecisionAuthorityCard({ authority }: DecisionAuthorityCardProps) {
  return (
    <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
      <p className={workspaceType.kicker}>{DECISION_AUTHORITY_KICKER}</p>
      <p className="mt-1 text-sm font-medium leading-snug text-zinc-800">{decisionAuthorityHeadline(authority)}</p>
      {authority.reason ? (
        <div className="mt-2">
          <p className={workspaceType.kicker}>Почему</p>
          <p className={`mt-0.5 ${workspaceType.muted}`}>{authority.reason}</p>
        </div>
      ) : null}
      {authority.owner === "principal" && authority.principalQuestion ? (
        <div className="mt-2">
          <p className={workspaceType.kicker}>Что нужно решить</p>
          <p className={`mt-0.5 ${workspaceType.muted}`}>{authority.principalQuestion}</p>
        </div>
      ) : null}
    </div>
  );
}
