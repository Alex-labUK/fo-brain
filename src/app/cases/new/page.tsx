import Link from "next/link";
import { CaseWizard } from "@/components/wizard/CaseWizard";
import { ensureSeeded } from "@/lib/ensure-seeded";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ outcomeId?: string }>;
};

export default async function NewCasePage({ searchParams }: PageProps) {
  await ensureSeeded();
  const { outcomeId } = await searchParams;

  const [branches, domainRows, linkedOutcome] = await Promise.all([
    prisma.decisionEngineBranch.findMany({
      select: { id: true, name: true, appliesWhen: true },
      orderBy: { id: "asc" },
    }),
    prisma.case.findMany({
      select: { domain: true },
      distinct: ["domain"],
      orderBy: { domain: "asc" },
    }),
    outcomeId
      ? prisma.outcome.findUnique({
          where: { id: outcomeId },
          select: { id: true, statement: true, requestFacts: true },
        })
      : Promise.resolve(null),
  ]);

  const backHref = linkedOutcome ? `/outcomes/${linkedOutcome.id}` : "/";

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
      <Link href={backHref} className="text-sm text-zinc-500 hover:text-zinc-700">
        {linkedOutcome ? "← К outcome" : "← К дашборду"}
      </Link>

      <div className="mt-4">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          Decision Engine
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          {linkedOutcome
            ? "Структурированный разбор кейса, связанного с outcome"
            : "Мастер разбора — шаги 1, 2, 4, 5 (без ИИ)"}
        </p>
      </div>

      <div className="mt-8">
        <CaseWizard
          branches={branches}
          existingDomains={domainRows.map((row) => row.domain)}
          outcomeId={linkedOutcome?.id}
          prefillTitle={linkedOutcome?.statement}
          prefillFacts={linkedOutcome?.requestFacts}
          cancelHref={backHref}
        />
      </div>
    </main>
  );
}
