"use client";

import { useCaseDialogue } from "@/app/cases/[id]/CaseDialogueLauncher";
import { workspaceType } from "@/app/cases/[id]/workspace-ui";

type NextStepResultButtonProps = {
  visible: boolean;
  stepText: string;
};

export function NextStepResultButton({ visible, stepText }: NextStepResultButtonProps) {
  const { openNextStepResult } = useCaseDialogue();

  if (!visible || !stepText.trim()) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => openNextStepResult(stepText.trim())}
      className={`mt-3 pl-9 text-left text-sm text-zinc-600 underline-offset-2 hover:text-zinc-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300/60 focus-visible:ring-offset-2 ${workspaceType.muted}`}
    >
      Добавить результат
    </button>
  );
}
