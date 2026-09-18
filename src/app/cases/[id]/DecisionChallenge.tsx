import { workspaceType } from "@/app/cases/[id]/workspace-ui";
import {
  DECISION_CHALLENGE_KICKER,
  visibleDecisionChallengeRows,
  type DecisionChallengeRow,
} from "@/lib/decision-challenge";
import type { DecisionChallenge as DecisionChallengeModel } from "@/core/orchestration/analysis-core";

type DecisionChallengeProps = {
  challenge: DecisionChallengeModel;
};

export function DecisionChallenge({ challenge }: DecisionChallengeProps) {
  const rows = visibleDecisionChallengeRows(challenge);
  if (rows.length === 0) return null;

  return (
    <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
      <p className={workspaceType.kicker}>{DECISION_CHALLENGE_KICKER}</p>
      {rows.map((row) => (
        <ChallengeRow key={row.key} row={row} />
      ))}
    </div>
  );
}

function ChallengeRow({ row }: { row: DecisionChallengeRow }) {
  return (
    <div className="mt-2">
      <p className={workspaceType.kicker}>{row.label}</p>
      <p className={`mt-0.5 ${workspaceType.muted}`}>{row.text}</p>
    </div>
  );
}
