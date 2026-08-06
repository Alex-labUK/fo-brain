import Link from "next/link";
import { PriorityCaseList } from "@/components/PriorityCaseList";
import { ensureSeeded } from "@/lib/ensure-seeded";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function Home() {
  await ensureSeeded();

  const activeCases = await prisma.case.findMany({
    where: { status: "real_in_progress" },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Сейчас важно</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Активные реальные ситуации, отсортированные по приоритету
          </p>
        </div>
        <Link
          href="/analyze"
          className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-700"
        >
          Новая ситуация
        </Link>
      </div>

      <div className="mt-8">
        <PriorityCaseList cases={activeCases} />
      </div>
    </main>
  );
}
