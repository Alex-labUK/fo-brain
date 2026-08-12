"use client";

import { useEffect, useState } from "react";
import { CaseDialogue, type CaseMessageItem } from "@/app/cases/[id]/CaseDialogue";

type CaseDialogueLauncherProps = {
  caseId: string;
  messages: CaseMessageItem[];
};

export function CaseDialogueLauncher({ caseId, messages }: CaseDialogueLauncherProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return (
    <>
      <div className="mt-8 border-t border-zinc-200 pt-6">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-5 py-3 text-sm font-medium text-white hover:bg-zinc-700"
        >
          <span aria-hidden>💬</span>
          Обсудить с ИИ
          {messages.length > 0 && (
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">{messages.length}</span>
          )}
        </button>
      </div>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setIsOpen(false);
            }
          }}
        >
          <div className="flex h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:h-[85vh] sm:rounded-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-zinc-200 px-4 py-3">
              <h2 className="text-sm font-semibold text-zinc-900">Переписка</h2>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                aria-label="Закрыть"
              >
                ✕
              </button>
            </div>
            <CaseDialogue
              caseId={caseId}
              messages={messages}
              className="min-h-0 flex-1 px-4 pb-4"
            />
          </div>
        </div>
      )}
    </>
  );
}
