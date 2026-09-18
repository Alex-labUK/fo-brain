import { DecisionInbox, DecisionInboxRegisterLink } from "@/components/DecisionInbox";
import { deriveDecisionAttentionQueue, ATTENTION_SUBTITLE, ATTENTION_TITLE } from "@/lib/decision-attention";
import type { AttentionCaseInput } from "@/lib/decision-attention";
import { ensureSeeded } from "@/lib/ensure-seeded";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function Home() {
  await ensureSeeded();

  const cases = await prisma.case.findMany({
    where: { status: { notIn: ["hypothetical", "cancelled"] } },
    select: {
      id: true,
      title: true,
      lifecycleState: true,
      blockerType: true,
      blockerNote: true,
      lifecycleUpdatedAt: true,
      lifecycleSuggestion: true,
      executionStep: true,
      executionOwner: true,
      executionStatus: true,
      executionUpdatedAt: true,
      priorityUrgency: true,
      priorityStake: true,
      updatedAt: true,
      analysisResult: true,
      reopenSuggestion: true,
      principalDecision: true,
    },
  });

  const items = deriveDecisionAttentionQueue(
    cases.map(
      (caseItem): AttentionCaseInput => ({
        id: caseItem.id,
        title: caseItem.title,
        lifecycleState: caseItem.lifecycleState,
        blockerType: caseItem.blockerType,
        blockerNote: caseItem.blockerNote,
        lifecycleUpdatedAt: caseItem.lifecycleUpdatedAt,
        lifecycleSuggestion: caseItem.lifecycleSuggestion,
        executionStep: caseItem.executionStep,
        executionOwner: caseItem.executionOwner,
        executionStatus: caseItem.executionStatus,
        executionUpdatedAt: caseItem.executionUpdatedAt,
        priorityUrgency: caseItem.priorityUrgency,
        priorityStake: caseItem.priorityStake,
        updatedAt: caseItem.updatedAt,
        analysisResult: caseItem.analysisResult,
        reopenSuggestion: caseItem.reopenSuggestion,
        principalDecision: caseItem.principalDecision,
      }),
    ),
  );

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
        {ATTENTION_TITLE}
        <span className="text-zinc-400"> · {items.length}</span>
      </h1>
      <p className="mt-1 text-sm text-zinc-500">{ATTENTION_SUBTITLE}</p>
      <div className="mt-8">
        <DecisionInbox items={items} />
      </div>
      <DecisionInboxRegisterLink />
    </main>
  );
}
