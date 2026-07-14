import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16 text-center">
      <h1 className="text-2xl font-semibold text-zinc-900">Не найдено</h1>
      <p className="mt-3 text-zinc-600">Запрошенная страница или кейс не существует.</p>
      <Link
        href="/"
        className="mt-8 inline-block rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
      >
        На дашборд
      </Link>
    </main>
  );
}
