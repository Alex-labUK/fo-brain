"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { CaseDialogue, type CaseMessageItem } from "@/app/cases/[id]/CaseDialogue";
import type { CaseDialogueMode } from "@/app/cases/[id]/case-dialogue-mode";
import {
  workspaceDialogueLauncherClass,
  workspaceDialogueLauncherIconClass,
  workspaceDialogueLauncherSecondaryClass,
  workspaceType,
} from "@/app/cases/[id]/workspace-ui";

type CaseDialogueContextValue = {
  openNextStepResult: (currentStepText: string) => void;
};

const CaseDialogueContext = createContext<CaseDialogueContextValue | null>(null);

export function useCaseDialogue(): CaseDialogueContextValue {
  const context = useContext(CaseDialogueContext);
  if (!context) {
    throw new Error("useCaseDialogue must be used within CaseDialogueLauncher");
  }
  return context;
}

type CaseDialogueLauncherProps = {
  caseId: string;
  messages: CaseMessageItem[];
  secondary?: boolean;
  children?: ReactNode;
};

const MODE_COPY: Record<
  CaseDialogueMode,
  { title: string; helper?: string }
> = {
  circumstance: {
    title: "Добавить новое обстоятельство",
  },
  next_step_result: {
    title: "Результат следующего шага",
    helper: "Сообщите, что удалось выяснить или что произошло после выполнения шага.",
  },
};

export function CaseDialogueLauncher({
  caseId,
  messages,
  secondary = false,
  children,
}: CaseDialogueLauncherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<CaseDialogueMode>("circumstance");
  const [currentStepText, setCurrentStepText] = useState<string | null>(null);

  const openCircumstance = useCallback(() => {
    setMode("circumstance");
    setCurrentStepText(null);
    setIsOpen(true);
  }, []);

  const openNextStepResult = useCallback((stepText: string) => {
    setMode("next_step_result");
    setCurrentStepText(stepText.trim() || null);
    setIsOpen(true);
  }, []);

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

  const copy = MODE_COPY[mode];

  return (
    <CaseDialogueContext.Provider value={{ openNextStepResult }}>
      {children}

      <button
        type="button"
        onClick={openCircumstance}
        className={`mt-5 w-full px-4 py-3.5 text-left ${
          secondary ? workspaceDialogueLauncherSecondaryClass : workspaceDialogueLauncherClass
        }`}
      >
        <span className="flex items-start gap-3">
          <span className={workspaceDialogueLauncherIconClass} aria-hidden>
            +
          </span>
          <span className="min-w-0">
            <span className={secondary ? `${workspaceType.section} text-zinc-700` : workspaceType.section}>
              Добавить новое обстоятельство
            </span>
            <span className={`mt-0.5 block ${workspaceType.muted}`}>Сообщить, что изменилось в ситуации</span>
          </span>
        </span>
      </button>

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
              <h2 className={workspaceType.section}>{copy.title}</h2>
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
              mode={mode}
              currentStepText={currentStepText}
              className="min-h-0 flex-1 px-4 pb-4"
              onSuccess={() => setIsOpen(false)}
            />
          </div>
        </div>
      )}
    </CaseDialogueContext.Provider>
  );
}
