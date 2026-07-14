import Link from "next/link";
import { CaseWizard } from "@/components/wizard/CaseWizard";
import { ensureSeeded } from "@/lib/ensure-seeded";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function NewCasePage() {
  await ensureSeeded();

  const [branches, domainRows] = await Promise.all([
    prisma.decisionEngineBranch.findMany({
      select: { id: true, name: true, appliesWhen: true },
      orderBy: { id: "asc" },
    }),
    prisma.case.findMany({
      select: { domain: true },
      distinct: ["domain"],
      orderBy: { domain: "asc" },
    }),
  ]);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
      <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-700">
        ← К дашборду
      </Link>

      <div className="mt-4">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Новый кейс</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Мастер разбора — шаги 1, 2, 4, 5 (без ИИ)
        </p>
      </div>

      <div className="mt-8">
        <CaseWizard
          branches={branches}
          existingDomains={domainRows.map((row) => row.domain)}
        />
      </div>
    </main>
  );
}
