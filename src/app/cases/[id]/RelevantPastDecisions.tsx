import Link from "next/link";
import { workspaceType } from "@/app/cases/[id]/workspace-ui";
import {
  formatRelevantPastClosedAt,
  unresolvedHistoricalDecisionCopy,
  type RelevantPastDecision,
} from "@/lib/relevant-past-decisions";

type RelevantPastDecisionsProps = {
  items: RelevantPastDecision[];
};

export function RelevantPastDecisions({ items }: RelevantPastDecisionsProps) {
  if (items.length === 0) return null;

  return (
    <section className="mt-8">
      <p className={workspaceType.kicker}>Похожие прошлые кейсы</p>
      <ul className="mt-3 space-y-3">
        {items.map((item) => {
          const unresolved = item.decisionStatusAtClose !== "resolved";
          const closed = formatRelevantPastClosedAt(item.closedAt);
          const decisionText = unresolved ? unresolvedHistoricalDecisionCopy() : item.decision;
          return (
            <li
              key={`${item.sourceCaseId}:${item.cycleNumber}:${item.closedAt}`}
              className="rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm"
            >
              <p className={`${workspaceType.body} font-medium`}>{item.sourceCaseTitle}</p>
              {closed ? <p className={`mt-1 ${workspaceType.muted}`}>Закрыто {closed}</p> : null}
              {decisionText ? (
                <div className="mt-2">
                  <p className={workspaceType.kicker}>{unresolved ? "Статус решения" : "Решение"}</p>
                  <p className={`mt-0.5 ${workspaceType.body}`}>{decisionText}</p>
                </div>
              ) : null}
              {item.determiningFact ? (
                <div className="mt-2">
                  <p className={workspaceType.kicker}>
                    {unresolved ? "Ключевая неопределённость" : "Определяющий факт"}
                  </p>
                  <p className={`mt-0.5 ${workspaceType.body}`}>{item.determiningFact}</p>
                </div>
              ) : null}
              {item.factualOutcome ? (
                <div className="mt-2">
                  <p className={workspaceType.kicker}>Фактический итог</p>
                  <p className={`mt-0.5 ${workspaceType.body}`}>{item.factualOutcome}</p>
                </div>
              ) : null}
              <Link
                href={`/cases/${item.sourceCaseId}`}
                className={`mt-2 inline-block ${workspaceType.muted} hover:text-zinc-800 hover:underline`}
              >
                Открыть кейс
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
