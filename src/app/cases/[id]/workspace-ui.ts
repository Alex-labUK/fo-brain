import { priorityColorBadgeClass, type PriorityColor } from "@/lib/priority";

/**
 * Workspace semantic colors:
 * - red: urgency badge only
 * - amber: unresolved uncertainty / determining fact / waiting
 * - blue (sky/slate): current operational next step only
 * - green: resolved / completed / closed decision state
 * - zinc: navigation, case-management controls, secondary UI
 */

export const workspaceType = {
  title: "text-3xl font-bold tracking-tight text-zinc-900",
  primary: "text-xl font-semibold leading-snug text-zinc-900",
  fact: "text-lg font-medium leading-snug text-zinc-800",
  section: "text-base font-semibold tracking-tight text-zinc-900",
  kicker: "text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500",
  body: "text-base leading-relaxed text-zinc-900",
  muted: "text-sm leading-relaxed text-zinc-500",
} as const;

export const workspaceSurface =
  "rounded-2xl border border-zinc-200 bg-white shadow-sm";

export function workspaceDecisionSurfaceClass(resolved: boolean): string {
  const tint = resolved ? "bg-emerald-50/50" : "bg-white";
  const accent = resolved ? "border-l-emerald-500" : "border-l-zinc-200";
  return `${workspaceSurface} border-l-2 px-4 py-4 ${tint} ${accent}`;
}

export const workspaceFactInsetClass =
  "rounded-xl border border-amber-100 bg-amber-50 px-4 py-2.5";

/** The only primary blue operational surface on the case workspace page. */
export const workspaceNextStepSurfaceClass =
  "rounded-2xl border border-slate-300 border-l-[3px] border-l-sky-500 bg-slate-100/70 px-5 py-5 shadow-sm";

export const workspaceNextStepMarkerClass =
  "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white text-[11px] font-semibold tabular-nums text-slate-600";

export const workspaceDialogueLauncherClass =
  "rounded-2xl border border-zinc-200 bg-white shadow-sm transition-colors hover:border-zinc-300 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300/60 focus-visible:ring-offset-2";

export const workspaceDialogueLauncherSecondaryClass =
  "rounded-2xl border border-zinc-200 bg-zinc-50/80 shadow-sm transition-colors hover:border-zinc-300 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300/60 focus-visible:ring-offset-2";

export const workspaceDialogueLauncherIconClass =
  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 text-base font-medium leading-none text-zinc-600";

export function workspaceNextStepOwnerLine(owner: string): string {
  const normalized = owner.trim().toLowerCase();
  if (/управля|муниципал|компан|банк|страхов|служб|орган|инспек|агентств/.test(normalized)) {
    return `Источник: ${owner.trim()}`;
  }
  return `Ответственный: ${owner.trim()}`;
}

export const workspaceGuidanceSurfaceClass =
  "rounded-2xl border border-zinc-200 border-l-2 border-l-zinc-800 bg-zinc-50 px-5 py-4 shadow-sm";

export const workspaceReopenSurfaceClass =
  "rounded-2xl border border-zinc-200 border-l-2 border-l-amber-500 bg-white px-5 py-4 shadow-sm";

export function workspaceStatusBadgeClass(input: {
  lifecycleState: string;
  executionStatus?: string | null;
}): string {
  if (input.lifecycleState === "closed") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }
  if (input.executionStatus === "pending" || input.lifecycleState === "executing") {
    return "border-zinc-200 bg-zinc-100 text-zinc-700";
  }
  if (
    input.lifecycleState === "waiting_for_fact" ||
    input.lifecycleState === "waiting_for_third_party" ||
    input.lifecycleState === "waiting_for_principal"
  ) {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }
  return "border-zinc-200 bg-zinc-100 text-zinc-700";
}

export function workspacePriorityBadgeClass(color: PriorityColor): string {
  return priorityColorBadgeClass(color);
}
