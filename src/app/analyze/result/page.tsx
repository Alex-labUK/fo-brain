import Link from "next/link";
import { AnalysisResult } from "@/app/analyze/result/AnalysisResult";
import { ensureSeeded } from "@/lib/ensure-seeded";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AnalyzeResultPage() {
  await ensureSeeded();

  const subsystems = await prisma.subsystem.findMany({
    orderBy: { name: "asc" },
  });

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
      <Link href="/analyze" className="text-sm text-zinc-500 hover:text-zinc-700">
        ← Назад
      </Link>

      <div className="mt-4">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Анализ ситуации</h1>
      </div>

      <div className="mt-8">
        <AnalysisResult subsystems={subsystems} />
      </div>
    </main>
  );
}
