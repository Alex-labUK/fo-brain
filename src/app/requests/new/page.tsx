import Link from "next/link";
import { OrchestrationWizard } from "@/app/requests/new/OrchestrationWizard";
import { ensureSeeded } from "@/lib/ensure-seeded";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function NewRequestPage() {
  await ensureSeeded();

  const subsystems = await prisma.subsystem.findMany({
    orderBy: { name: "asc" },
  });

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
      <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-700">
        ← К дашборду
      </Link>

      <div className="mt-4">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Новый запрос</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Outcome → подсистемы → опционально Decision Engine
        </p>
      </div>

      <div className="mt-8">
        <OrchestrationWizard subsystems={subsystems} />
      </div>
    </main>
  );
}
