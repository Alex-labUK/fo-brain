import { IntakeForm } from "@/app/analyze/IntakeForm";

export default function AnalyzePage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Новая ситуация</h1>
      <p className="mt-1 text-sm text-zinc-500">Опишите, что произошло. Можно своими словами.</p>
      <IntakeForm />
    </main>
  );
}
