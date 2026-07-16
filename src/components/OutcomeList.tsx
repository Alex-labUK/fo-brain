import Link from "next/link";
import type { OutcomeStage } from "@prisma/client";
import { OutcomeStageBadge } from "@/components/StatusBadge";

type OutcomeListItem = {
  id: string;
  statement: string;
  stage: OutcomeStage;
  _count: {
    activations: number;
  };
};

export function OutcomeList({ outcomes }: { outcomes: OutcomeListItem[] }) {
  if (outcomes.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-zinc-500">
        Активных outcomes пока нет.{" "}
        <Link href="/requests/new" className="font-medium text-zinc-700 underline">
          Создать новый запрос
        </Link>
      </p>
    );
  }

  return (
    <ul className="divide-y divide-zinc-100">
      {outcomes.map((outcome) => (
        <li key={outcome.id}>
          <Link
            href={`/outcomes/${outcome.id}`}
            className="flex flex-col gap-2 px-4 py-4 transition-colors hover:bg-zinc-50 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0 flex-1">
              <p className="font-medium text-zinc-900">{outcome.statement}</p>
              <p className="mt-1 text-xs text-zinc-400">{outcome.id}</p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span className="text-xs text-zinc-400">
                {outcome._count.activations} activation(s)
              </span>
              <OutcomeStageBadge status={outcome.stage} />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
