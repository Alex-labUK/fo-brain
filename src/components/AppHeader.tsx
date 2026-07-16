import Link from "next/link";

export function AppHeader() {
  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="group">
          <h1 className="text-lg font-semibold tracking-tight text-zinc-900 group-hover:text-zinc-700">
            Family Office Brain
          </h1>
          <p className="text-sm text-zinc-500">Method + Decision Engine</p>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/cases/new"
            className="text-sm font-medium text-zinc-600 hover:text-zinc-900"
          >
            Decision Engine
          </Link>
          <Link
            href="/requests/new"
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
          >
            Новый запрос
          </Link>
        </div>
      </div>
    </header>
  );
}
