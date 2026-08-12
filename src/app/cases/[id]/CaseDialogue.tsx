"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { postCaseMessage } from "@/app/cases/[id]/dialogue-actions";

export type CaseMessageItem = {
  id: string;
  role: string;
  content: string;
  createdAt: string;
};

type CaseDialogueProps = {
  caseId: string;
  messages: CaseMessageItem[];
  className?: string;
};

export function CaseDialogue({ caseId, messages, className }: CaseDialogueProps) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
  }, [messages.length, messages.at(-1)?.id]);

  function handleSubmit(event?: React.FormEvent) {
    event?.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || isPending) return;

    setError(null);
    startTransition(async () => {
      try {
        await postCaseMessage(caseId, trimmed);
        setText("");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Не удалось отправить сообщение");
      }
    });
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  }

  return (
    <section className={`flex min-h-0 flex-col ${className ?? ""}`}>
      <div
        ref={scrollRef}
        className="min-h-[160px] flex-1 space-y-3 overflow-y-auto overscroll-contain pr-1 pt-3"
      >
        {messages.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-500">
            Напишите, что изменилось или что нужно уточнить — разбор обновится с учётом новых
            фактов.
          </p>
        ) : (
          messages.map((message) => {
            const isUser = message.role === "user";
            return (
              <div
                key={message.id}
                className={`flex ${isUser ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    isUser
                      ? "bg-zinc-900 text-white"
                      : "border border-zinc-200 bg-white text-zinc-800 shadow-sm"
                  }`}
                >
                  {!isUser && (
                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-zinc-400">
                      Family Office Brain
                    </p>
                  )}
                  {isUser && (
                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-zinc-400">
                      Вы
                    </p>
                  )}
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <form onSubmit={handleSubmit} className="mt-2 shrink-0 space-y-2 border-t border-zinc-100 pt-2">
        <textarea
          rows={2}
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isPending}
          placeholder="Что нового?"
          className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm leading-relaxed focus:border-zinc-400 focus:outline-none disabled:opacity-60"
        />
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-zinc-400">Enter — отправить, Shift+Enter — новая строка</p>
          <button
            type="submit"
            disabled={isPending || !text.trim()}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-60"
          >
            {isPending ? "Отправка…" : "Отправить"}
          </button>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </section>
  );
}
