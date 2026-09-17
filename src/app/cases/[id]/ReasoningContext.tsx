import { RelevantPastDecisions } from "@/app/cases/[id]/RelevantPastDecisions";
import { workspaceType } from "@/app/cases/[id]/workspace-ui";
import type { PrecedentContextRef } from "@/core/orchestration/analysis-core";
import {
  hasReasoningContextContent,
  REASONING_CONTEXT_ROLE_LINE,
} from "@/lib/reasoning-context";
import type { RelevantPastDecision } from "@/lib/relevant-past-decisions";
import type { RelevantPrinciple } from "@/lib/relevant-principles";

type ReasoningContextProps = {
  principles: RelevantPrinciple[];
  pastDecisions: RelevantPastDecision[];
  providedRefs?: PrecedentContextRef[] | null;
};

export function ReasoningContext({
  principles,
  pastDecisions,
  providedRefs,
}: ReasoningContextProps) {
  if (!hasReasoningContextContent({ principles, pastDecisions })) return null;

  return (
    <section className="mt-8">
      <p className={workspaceType.kicker}>Контекст решения</p>
      <p className={`mt-1 ${workspaceType.muted}`}>{REASONING_CONTEXT_ROLE_LINE}</p>

      {principles.length > 0 ? (
        <ul className="mt-4 space-y-3">
          {principles.map((item) => (
            <li key={item.id ?? item.title} className="border-t border-zinc-100 pt-3 first:border-t-0 first:pt-0">
              <p className={workspaceType.kicker}>{item.kind === "pattern" ? "Паттерн" : "Принцип"}</p>
              <p className={`mt-1 text-sm font-medium leading-snug text-zinc-800`}>{item.title}</p>
              <p className={`mt-1 ${workspaceType.muted}`}>{item.principle}</p>
              {item.source ? <p className={`mt-1 ${workspaceType.muted}`}>Источник: {item.source}</p> : null}
            </li>
          ))}
        </ul>
      ) : null}

      <RelevantPastDecisions items={pastDecisions} embedded providedRefs={providedRefs} />
    </section>
  );
}
