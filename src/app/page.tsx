import type { CaseStatus } from "@prisma/client";
import { CaseFilters } from "@/components/CaseFilters";
import { CaseList } from "@/components/CaseList";
import { PrincipleStatusBadge } from "@/components/StatusBadge";
import { ensureSeeded } from "@/lib/ensure-seeded";
import { principleStatusLabels } from "@/lib/labels";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ domain?: string; status?: string }>;
};

export default async function Home({ searchParams }: PageProps) {
  await ensureSeeded();

  const { domain, status } = await searchParams;
  const statusFilter =
    status && ["hypothetical", "real_in_progress", "real_closed"].includes(status)
      ? (status as CaseStatus)
      : undefined;

  const caseWhere = {
    ...(domain ? { domain } : {}),
    ...(statusFilter ? { status: statusFilter } : {}),
  };

  const [cases, principleCounts, openQuestions, allDomains] = await Promise.all([
    prisma.case.findMany({
      where: caseWhere,
      include: {
        branch: { select: { name: true } },
        _count: {
          select: {
            confirmsPrinciples: true,
            confirmsPatterns: true,
          },
        },
      },
      orderBy: { id: "asc" },
    }),
    prisma.principle.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.openQuestion.findMany({
      where: { status: "open" },
      orderBy: { id: "asc" },
    }),
    prisma.case.findMany({
      select: { domain: true },
      distinct: ["domain"],
      orderBy: { domain: "asc" },
    }),
  ]);

  const domains = allDomains.map((item) => item.domain);
  const totalPrinciples = principleCounts.reduce((sum, item) => sum + item._count._all, 0);

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
      <section>
        <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          Принципы по статусам
        </h2>
        <div className="mt-3 flex flex-wrap gap-3">
          {principleCounts.map((item) => (
            <div
              key={item.status}
              className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 shadow-sm"
            >
              <PrincipleStatusBadge status={item.status} />
              <span className="text-lg font-semibold text-zinc-900">{item._count._all}</span>
            </div>
          ))}
          <div className="flex items-center gap-2 rounded-lg border border-dashed border-zinc-200 bg-white px-4 py-2">
            <span className="text-sm text-zinc-500">Всего</span>
            <span className="text-lg font-semibold text-zinc-900">{totalPrinciples}</span>
          </div>
        </div>
      </section>

      <div className="mt-10 grid gap-8 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
            <div className="border-b border-zinc-100 px-4 py-4">
              <h2 className="font-semibold text-zinc-900">Кейсы</h2>
              <p className="mt-1 text-sm text-zinc-500">
                {cases.length} из seed-базы · фильтр по домену и статусу
              </p>
            </div>
            <CaseFilters
              domains={domains}
              currentDomain={domain}
              currentStatus={statusFilter}
            />
            <CaseList cases={cases} />
          </div>
        </section>

        <section>
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
            <div className="border-b border-zinc-100 px-4 py-4">
              <h2 className="font-semibold text-zinc-900">Открытые вопросы</h2>
              <p className="mt-1 text-sm text-zinc-500">{openQuestions.length} без ответа</p>
            </div>
            <ul className="divide-y divide-zinc-100">
              {openQuestions.map((question) => (
                <li key={question.id} className="px-4 py-3">
                  <p className="text-sm leading-relaxed text-zinc-700">{question.text}</p>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-medium text-zinc-500">Легенда статусов принципов</h3>
            <ul className="mt-3 space-y-2">
              {(Object.keys(principleStatusLabels) as Array<keyof typeof principleStatusLabels>).map(
                (key) => (
                  <li key={key} className="flex items-center gap-2 text-sm text-zinc-600">
                    <PrincipleStatusBadge status={key} />
                  </li>
                ),
              )}
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}
