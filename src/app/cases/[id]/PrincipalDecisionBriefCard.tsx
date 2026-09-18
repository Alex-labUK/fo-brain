import type { ReactNode } from "react";
import { CopyPrincipalBriefButton } from "@/app/cases/[id]/CopyPrincipalBriefButton";
import { CapturePrincipalDecisionButton } from "@/app/cases/[id]/CapturePrincipalDecisionButton";
import { workspaceType } from "@/app/cases/[id]/workspace-ui";
import {
  PRINCIPAL_BRIEF_KICKER,
  PRINCIPAL_BRIEF_LABELS,
  formatPrincipalDecisionBriefText,
  type PrincipalDecisionBrief,
} from "@/lib/principal-decision-brief";

type PrincipalDecisionBriefCardProps = {
  brief: PrincipalDecisionBrief;
  caseId?: string;
  showCapture?: boolean;
};

function BriefSection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mt-3">
      <p className={workspaceType.kicker}>{label}</p>
      <div className="mt-0.5 text-sm leading-relaxed text-zinc-700">{children}</div>
    </div>
  );
}

export function PrincipalDecisionBriefCard({ brief, caseId, showCapture }: PrincipalDecisionBriefCardProps) {
  const copyText = formatPrincipalDecisionBriefText(brief);

  return (
    <div className="mt-3 rounded-xl border border-zinc-300 bg-zinc-50 px-4 py-3">
      <p className={workspaceType.kicker}>{PRINCIPAL_BRIEF_KICKER}</p>
      <p className={workspaceType.kicker + " mt-3"}>{PRINCIPAL_BRIEF_LABELS.question}</p>
      <p className="mt-1 text-base font-semibold leading-snug text-zinc-900">{brief.question}</p>
      {brief.reason ? (
        <BriefSection label={PRINCIPAL_BRIEF_LABELS.reason}>{brief.reason}</BriefSection>
      ) : null}
      {brief.knownFacts?.length ? (
        <BriefSection label={PRINCIPAL_BRIEF_LABELS.knownFacts}>
          {brief.knownFacts.map((fact) => (
            <p key={fact}>{fact}</p>
          ))}
        </BriefSection>
      ) : null}
      {brief.remainingUncertainty ? (
        <BriefSection label={PRINCIPAL_BRIEF_LABELS.remainingUncertainty}>{brief.remainingUncertainty}</BriefSection>
      ) : null}
      {brief.routes?.length ? (
        <BriefSection label={PRINCIPAL_BRIEF_LABELS.routes}>
          {brief.routes.map((route) => (
            <p key={route.text}>{route.label ? `${route.label}. ${route.text}` : route.text}</p>
          ))}
        </BriefSection>
      ) : null}
      {brief.currentRoute ? (
        <BriefSection label={PRINCIPAL_BRIEF_LABELS.currentRoute}>{brief.currentRoute}</BriefSection>
      ) : null}
      {brief.evidenceNote ? (
        <BriefSection label={PRINCIPAL_BRIEF_LABELS.evidenceNote}>{brief.evidenceNote}</BriefSection>
      ) : null}
      {brief.reconsiderIf ? (
        <BriefSection label={PRINCIPAL_BRIEF_LABELS.reconsiderIf}>{brief.reconsiderIf}</BriefSection>
      ) : null}
      <CopyPrincipalBriefButton text={copyText} />
      {showCapture && caseId ? (
        <CapturePrincipalDecisionButton
          caseId={caseId}
          question={brief.question}
          currentRoute={brief.currentRoute}
        />
      ) : null}
    </div>
  );
}
