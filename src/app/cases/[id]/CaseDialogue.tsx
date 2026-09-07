"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import type { CaseDialogueMode } from "@/app/cases/[id]/case-dialogue-mode";
import { postCaseMessage } from "@/app/cases/[id]/dialogue-actions";
import { workspaceType } from "@/app/cases/[id]/workspace-ui";
import { storeDecisionChangeSummary } from "@/lib/decision-change-summary";
import { formatNextStepResultMessage } from "@/lib/next-step-result-flow";

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
  onSuccess?: () => void;
  mode?: CaseDialogueMode;
  /** Display-only context for next-step result mode; not sent as authoritative state. */
  currentStepText?: string | null;
};

export function CaseDialogue({
  caseId,
  messages,
  className,
  onSuccess,
  mode = "circumstance",
  currentStepText,
}: CaseDialogueProps) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const submitLockRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
  }, [messages.length, messages.at(-1)?.id]);

  function handleSubmit(event?: React.FormEvent) {
    event?.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || isPending || submitLockRef.current) return;

    setError(null);
    submitLockRef.current = true;
    startTransition(async () => {
      try {
        const messageText =
          mode === "next_step_result" ? formatNextStepResultMessage(trimmed) : trimmed;
        const changePayload = await postCaseMessage(caseId, messageText);
        if (changePayload) {
          storeDecisionChangeSummary(caseId, changePayload);
        }
        setText("");
        onSuccess?.();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Не удалось отправить сообщение");
      } finally {
        submitLockRef.current = false;
      }
    });
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  }

  const emptyHistoryHint =
    mode === "next_step_result"
      ? "Сообщите, что удалось выяснить или что произошло после выполнения шага — разбор обновится с учётом новых фактов."
      : "Напишите, что изменилось или что нужно уточнить — разбор обновится с учётом новых фактов.";

  const inputPlaceholder =
    mode === "next_step_result" ? "Что удалось выяснить или что произошло?" : "Что нового?";

  return (
    <section className={`flex min-h-0 flex-col ${className ?? ""}`}>
      {mode === "next_step_result" && (
        <div className="shrink-0 space-y-2 border-b border-zinc-100 pb-3 pt-3">
          <p className={workspaceType.muted}>
            Сообщите, что удалось выяснить или что произошло после выполнения шага.
          </p>
          {currentStepText?.trim() && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2">
              <p className={workspaceType.kicker}>Текущий шаг</p>
              <p className={`mt-1 ${workspaceType.body} text-base`}>{currentStepText.trim()}</p>
            </div>
          )}
        </div>
      )}

      <div
        ref={scrollRef}
        className="min-h-[160px] flex-1 space-y-3 overflow-y-auto overscroll-contain pr-1 pt-3"
      >
        {messages.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-500">
            {emptyHistoryHint}
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
          placeholder={inputPlaceholder}
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
