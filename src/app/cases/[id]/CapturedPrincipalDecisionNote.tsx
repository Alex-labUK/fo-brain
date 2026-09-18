"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { retryPrincipalDecisionAnalysis } from "@/app/cases/[id]/principal-decision-actions";
import { workspaceType } from "@/app/cases/[id]/workspace-ui";
import { storeDecisionChangeSummary } from "@/lib/decision-change-summary";
import {
  PRINCIPAL_ANALYSIS_RETRY_ACTION,
  PRINCIPAL_ANALYSIS_RETRY_NOTICE,
  PRINCIPAL_DECISION_KICKER,
  type PrincipalDecisionRecord,
} from "@/lib/principal-decision";

type CapturedPrincipalDecisionNoteProps = {
  record: PrincipalDecisionRecord;
  caseId?: string;
  showRetry?: boolean;
};

export function CapturedPrincipalDecisionNote({
  record,
  caseId,
  showRetry,
}: CapturedPrincipalDecisionNoteProps) {
  const router = useRouter();
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const submitLockRef = useRef(false);

  function handleRetry() {
    if (!caseId || isPending || submitLockRef.current) return;
    submitLockRef.current = true;
    startTransition(async () => {
      try {
        const result = await retryPrincipalDecisionAnalysis(caseId);
        if (result.changeSummary) {
          storeDecisionChangeSummary(caseId, result.changeSummary);
        }
        if (!result.analysisUpdated) {
          setNotice(PRINCIPAL_ANALYSIS_RETRY_NOTICE);
        }
        router.refresh();
      } catch {
        setNotice(PRINCIPAL_ANALYSIS_RETRY_NOTICE);
      } finally {
        submitLockRef.current = false;
      }
    });
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
      <p className={workspaceType.kicker}>{PRINCIPAL_DECISION_KICKER}</p>
      <p className={`mt-1 ${workspaceType.body}`}>{record.decision}</p>
      {showRetry && caseId ? (
        <div className="mt-2">
          <p className={workspaceType.muted}>{notice ?? PRINCIPAL_ANALYSIS_RETRY_NOTICE}</p>
          <button
            type="button"
            disabled={isPending}
            onClick={handleRetry}
            className={`mt-2 text-left text-sm text-zinc-600 underline-offset-2 hover:text-zinc-900 hover:underline ${workspaceType.muted}`}
          >
            {isPending ? "Обновление…" : PRINCIPAL_ANALYSIS_RETRY_ACTION}
          </button>
        </div>
      ) : null}
    </div>
  );
}
