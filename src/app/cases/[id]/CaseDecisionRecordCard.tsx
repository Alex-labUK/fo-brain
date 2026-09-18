import {
  workspaceRecordSurfaceClass,
  workspaceType,
  workspaceUnresolvedRecordSurfaceClass,
} from "@/app/cases/[id]/workspace-ui";
import {
  decisionRecordCycleLabel,
  decisionRecordHeading,
  formatClosureExecutionLine,
  formatDecisionRecordClosedAt,
  type DecisionRecord,
} from "@/lib/decision-record";

type CaseDecisionRecordCardProps = {
  record: DecisionRecord;
};

export function CaseDecisionRecordCard({ record }: CaseDecisionRecordCardProps) {
  const closed = formatDecisionRecordClosedAt(record.closedAt);
  const unresolved = record.decisionStatusAtClose !== "resolved";
  const executionLine = formatClosureExecutionLine({
    executionStep: record.executionStep ?? null,
    executionOwner: record.executionOwner ?? null,
    executionStatus: record.executionStatus ?? null,
  });
  const headingClass = unresolved ? `${workspaceType.kicker}` : `${workspaceType.kicker} text-emerald-800/80`;

  return (
    <section className={unresolved ? workspaceUnresolvedRecordSurfaceClass : workspaceRecordSurfaceClass}>
      <p className={headingClass}>{decisionRecordHeading(record)}</p>
      {record.outcome ? (
        <div className="mt-3">
          <p className={workspaceType.kicker}>Цель</p>
          <p className={`mt-1 ${workspaceType.body}`}>{record.outcome}</p>
        </div>
      ) : null}
      {unresolved ? (
        <div className="mt-3">
          <p className={workspaceType.kicker}>Статус решения</p>
          <p className={`mt-1 ${workspaceType.primary}`}>Решение не было определено</p>
        </div>
      ) : record.decision ? (
        <div className="mt-3">
          <p className={workspaceType.kicker}>Решение</p>
          <p className={`mt-1 ${workspaceType.primary}`}>{record.decision}</p>
        </div>
      ) : null}
      {unresolved && record.decision ? (
        <div className="mt-3">
          <p className={workspaceType.kicker}>Последнее состояние решения</p>
          <p className={`mt-1 ${workspaceType.body}`}>{record.decision}</p>
        </div>
      ) : null}
      {record.determiningFact ? (
        <div className="mt-3">
          <p className={workspaceType.kicker}>
            {unresolved ? "Ключевая неопределённость" : "Определяющий факт"}
          </p>
          <p className={`mt-1 ${workspaceType.body}`}>{record.determiningFact}</p>
        </div>
      ) : null}
      {!unresolved && record.resolvingEvidence && record.resolvingEvidence !== record.determiningFact ? (
        <div className="mt-3">
          <p className={workspaceType.kicker}>Подтверждение</p>
          <p className={`mt-1 ${workspaceType.body}`}>{record.resolvingEvidence}</p>
        </div>
      ) : null}
      {!unresolved && !record.resolvingEvidence ? (
        <p className={`mt-3 ${workspaceType.muted}`}>Основание решения зафиксировано не полностью</p>
      ) : null}
      {executionLine ? (
        <div className="mt-3">
          <p className={workspaceType.kicker}>Выполнение</p>
          <p className={`mt-1 ${workspaceType.body}`}>{executionLine}</p>
        </div>
      ) : null}
      {record.factualOutcome ? (
        <div className="mt-3">
          <p className={workspaceType.kicker}>Фактический итог</p>
          <p className={`mt-1 ${workspaceType.body}`}>{record.factualOutcome}</p>
        </div>
      ) : null}
      {closed ? (
        <p className={`mt-3 ${workspaceType.muted}`}>Закрыто {closed}</p>
      ) : null}
      <p className={`mt-1 ${workspaceType.muted}`}>{decisionRecordCycleLabel(record.cycleNumber)}</p>
    </section>
  );
}
