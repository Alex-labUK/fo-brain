import Link from "next/link";
import { notFound } from "next/navigation";
import { CaseStatusBadge, PrincipleStatusBadge } from "@/components/StatusBadge";
import { ensureSeeded } from "@/lib/ensure-seeded";
import { formatDomain } from "@/lib/labels";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function CaseDetailPage({ params }: PageProps) {
  await ensureSeeded();
  const { id } = await params;

  const caseItem = await prisma.case.findUnique({
    where: { id },
    include: {
      branch: true,
      outcome: { select: { id: true, statement: true } },
      confirmsPrinciples: {
        include: { principle: true },
        orderBy: { principleId: "asc" },
      },
      confirmsPatterns: {
        include: { pattern: true },
        orderBy: { patternId: "asc" },
      },
    },
  });

  if (!caseItem) {
    notFound();
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
      <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-700">
        ← К дашборду
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            {caseItem.title}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {caseItem.id} · {formatDomain(caseItem.domain)}
            {caseItem.outcome && (
              <>
                {" "}
                ·{" "}
                <Link href={`/outcomes/${caseItem.outcome.id}`} className="underline">
                  outcome
                </Link>
              </>
            )}
          </p>
        </div>
        <CaseStatusBadge status={caseItem.status} />
      </div>

      <section className="mt-8 space-y-6">
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
            Ветка Decision Engine
          </h2>
          {caseItem.branch ? (
            <div className="mt-2">
              <p className="font-medium text-zinc-900">{caseItem.branch.name}</p>
              <p className="mt-1 text-sm text-zinc-600">{caseItem.branch.appliesWhen}</p>
            </div>
          ) : (
            <p className="mt-2 text-sm text-zinc-500">Не назначена — кейс вне стандартной рамки</p>
          )}
        </div>

        {caseItem.facts && (
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">Факты</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">
              {caseItem.facts}
            </p>
          </div>
        )}

        {caseItem.decisionTree && (
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
              Дерево решений / рассуждение
            </h2>
            <p className="mt-2 whitespace-pre-wrap font-mono text-sm leading-relaxed text-zinc-700">
              {caseItem.decisionTree}
            </p>
          </div>
        )}

        {caseItem.recordedResult && (
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">Итог</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">
              {caseItem.recordedResult}
            </p>
          </div>
        )}

        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
            Подтверждённые принципы ({caseItem.confirmsPrinciples.length})
          </h2>
          {caseItem.confirmsPrinciples.length === 0 ? (
            <p className="mt-2 text-sm text-zinc-500">Нет связанных принципов</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {caseItem.confirmsPrinciples.map(({ principle }) => (
                <li key={principle.id} className="border-l-2 border-indigo-200 pl-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-zinc-900">{principle.title}</span>
                    <PrincipleStatusBadge status={principle.status} />
                  </div>
                  <p className="mt-1 text-sm text-zinc-600">{principle.statement}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
            Связанные паттерны ({caseItem.confirmsPatterns.length})
          </h2>
          {caseItem.confirmsPatterns.length === 0 ? (
            <p className="mt-2 text-sm text-zinc-500">Нет связанных паттернов</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {caseItem.confirmsPatterns.map(({ pattern }) => (
                <li key={pattern.id} className="border-l-2 border-sky-200 pl-3">
                  <p className="font-medium text-zinc-900">{pattern.title}</p>
                  <p className="mt-1 text-sm text-zinc-600">{pattern.statement}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}
