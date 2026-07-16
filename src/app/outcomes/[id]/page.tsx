import Link from "next/link";
import { notFound } from "next/navigation";
import { ActivationCard } from "@/components/ActivationCard";
import { OutcomeStageBadge } from "@/components/StatusBadge";
import { ensureSeeded } from "@/lib/ensure-seeded";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function OutcomeDetailPage({ params }: PageProps) {
  await ensureSeeded();
  const { id } = await params;

  const outcome = await prisma.outcome.findUnique({
    where: { id },
    include: {
      activations: {
        include: { subsystem: true },
        orderBy: { createdAt: "asc" },
      },
      cases: {
        select: { id: true, title: true },
        orderBy: { id: "asc" },
      },
    },
  });

  if (!outcome) {
    notFound();
  }

  const confirmed = outcome.activations.filter((item) => item.status === "confirmed");
  const excluded = outcome.activations.filter((item) => item.status === "excluded");

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
      <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-700">
        ← К дашборду
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            {outcome.statement}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">{outcome.id}</p>
        </div>
        <OutcomeStageBadge status={outcome.stage} />
      </div>

      <section className="mt-8 space-y-6">
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
            Факты запроса
          </h2>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">
            {outcome.requestFacts}
          </p>
        </div>

        {outcome.successCondition && (
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
              Условие успеха
            </h2>
            <p className="mt-2 text-sm text-zinc-700">{outcome.successCondition}</p>
          </div>
        )}

        {outcome.headFocus && (
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
              Head of FO focus
            </h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">
              {outcome.headFocus}
            </p>
          </div>
        )}

        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
              Подтверждённые activations ({confirmed.length})
            </h2>
            <Link
              href={`/cases/new?outcomeId=${outcome.id}`}
              className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700"
            >
              Открыть Decision Engine
            </Link>
          </div>

          {confirmed.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-500">Нет подтверждённых activations</p>
          ) : (
            <div className="mt-4 space-y-3">
              {confirmed.map((activation) => (
                <ActivationCard
                  key={activation.id}
                  subsystemName={activation.subsystem.name}
                  ownerRoleKey={activation.subsystem.ownerRoleKey}
                  context={activation.context}
                  expectedFeedback={activation.expectedFeedback}
                  status={activation.status}
                />
              ))}
            </div>
          )}
        </div>

        {excluded.length > 0 && (
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
              Исключённые ({excluded.length})
            </h2>
            <div className="mt-4 space-y-3">
              {excluded.map((activation) => (
                <ActivationCard
                  key={activation.id}
                  subsystemName={activation.subsystem.name}
                  ownerRoleKey={activation.subsystem.ownerRoleKey}
                  context={activation.context}
                  expectedFeedback={activation.expectedFeedback}
                  status={activation.status}
                  excludeReason={activation.excludeReason}
                />
              ))}
            </div>
          </div>
        )}

        {outcome.cases.length > 0 && (
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
              Связанные кейсы Decision Engine
            </h2>
            <ul className="mt-3 space-y-2">
              {outcome.cases.map((caseItem) => (
                <li key={caseItem.id}>
                  <Link href={`/cases/${caseItem.id}`} className="text-sm text-zinc-700 underline">
                    {caseItem.title} ({caseItem.id})
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </main>
  );
}
