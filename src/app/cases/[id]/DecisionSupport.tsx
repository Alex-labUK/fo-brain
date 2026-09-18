import { workspaceType } from "@/app/cases/[id]/workspace-ui";
import {
  DECISION_SUPPORT_KICKER,
  decisionSupportDetail,
  decisionSupportHeadline,
  type DecisionSupportState,
} from "@/lib/decision-support";

type DecisionSupportProps = {
  state: DecisionSupportState;
  determiningFactVisible?: boolean;
};

function surfaceClass(status: DecisionSupportState["status"]): string {
  if (status === "missing_evidence") {
    return "mt-3 rounded-xl border border-amber-100 bg-amber-50/80 px-3 py-2";
  }
  if (status === "supported") {
    return "mt-3 rounded-xl border border-emerald-100 bg-emerald-50/80 px-3 py-2";
  }
  return "mt-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2";
}

function kickerClass(status: DecisionSupportState["status"]): string {
  if (status === "missing_evidence") return `${workspaceType.kicker} text-amber-800/80`;
  if (status === "supported") return `${workspaceType.kicker} text-emerald-800/80`;
  return workspaceType.kicker;
}

export function DecisionSupport({ state, determiningFactVisible = false }: DecisionSupportProps) {
  const detail = decisionSupportDetail(state, { determiningFactVisible });
  return (
    <div className={surfaceClass(state.status)}>
      <p className={kickerClass(state.status)}>{DECISION_SUPPORT_KICKER}</p>
      <p className={`mt-1 text-sm font-medium leading-snug text-zinc-800`}>{decisionSupportHeadline(state)}</p>
      {state.status === "supported" && state.determiningFact && !determiningFactVisible ? (
        <p className={`mt-1 ${workspaceType.muted}`}>Определяющий факт: {state.determiningFact}</p>
      ) : null}
      {detail ? <p className={`mt-1 ${workspaceType.muted}`}>{detail}</p> : null}
    </div>
  );
}
