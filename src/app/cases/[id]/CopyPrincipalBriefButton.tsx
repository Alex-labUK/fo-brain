"use client";

import { useState } from "react";
import { workspaceType } from "@/app/cases/[id]/workspace-ui";

type CopyPrincipalBriefButtonProps = {
  text: string;
};

export function CopyPrincipalBriefButton({ text }: CopyPrincipalBriefButtonProps) {
  const [copied, setCopied] = useState(false);
  const payload = text.trim();
  if (!payload) return null;

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(payload);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1600);
        } catch {
          setCopied(false);
        }
      }}
      className={`mt-3 text-left text-sm text-zinc-600 underline-offset-2 hover:text-zinc-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300/60 focus-visible:ring-offset-2 ${workspaceType.muted}`}
    >
      {copied ? "Скопировано" : "Скопировать brief"}
    </button>
  );
}
