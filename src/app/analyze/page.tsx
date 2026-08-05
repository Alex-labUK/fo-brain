import { IntakeForm } from "@/app/analyze/IntakeForm";

export default function AnalyzePage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          Расскажите, что произошло
        </h1>
        <div className="mt-8">
          <IntakeForm />
        </div>
      </div>
    </main>
  );
}
