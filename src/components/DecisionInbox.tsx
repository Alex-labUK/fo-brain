import Link from "next/link";
import {
  ATTENTION_ACTION_LABEL,
  ATTENTION_EMPTY_COPY,
  attentionPriorityLabel,
  type DecisionAttentionItem,
  type DecisionAttentionPriority,
} from "@/lib/decision-attention";
import { DECISIONS_PATH } from "@/lib/case-dashboard";
import { priorityColorBadgeClass, priorityColorMarkerClass } from "@/lib/priority";

function markerClass(priority: DecisionAttentionPriority): string {
  if (priority === "urgent") return priorityColorMarkerClass("red");
  if (priority === "soon") return priorityColorMarkerClass("amber");
  return "bg-zinc-300";
}

function badgeClass(priority: DecisionAttentionPriority): string {
  if (priority === "urgent") return priorityColorBadgeClass("red");
  if (priority === "soon") return priorityColorBadgeClass("amber");
  return "bg-zinc-100 text-zinc-600 border-zinc-200";
}

function accentClass(priority: DecisionAttentionPriority): string {
  if (priority === "urgent") return "border-l-red-500";
  if (priority === "soon") return "border-l-amber-500";
  return "border-l-zinc-200";
}

function AttentionRow({ item }: { item: DecisionAttentionItem }) {
  const colored = item.priority === "urgent" || item.priority === "soon";

  return (
    <Link
      href={item.href}
      className={`flex items-start justify-between gap-4 border-l-2 px-3 py-3 transition-colors hover:bg-zinc-50 ${accentClass(item.priority)}`}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${markerClass(item.priority)}`} aria-hidden />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span
              className={`inline-flex items-center rounded-full border px-2 py-px text-[11px] font-medium ${
                colored ? badgeClass(item.priority) : badgeClass("normal")
              }`}
            >
              {attentionPriorityLabel(item.priority)}
            </span>
            <span className="truncate text-[15px] font-medium tracking-tight text-zinc-900">{item.title}</span>
          </div>
          <p className="mt-1 text-sm text-zinc-800">{item.headline}</p>
          {item.detail ? <p className="mt-0.5 line-clamp-2 text-sm leading-snug text-zinc-500">{item.detail}</p> : null}
        </div>
      </div>
      <span className="shrink-0 pt-1 text-sm text-zinc-500">{ATTENTION_ACTION_LABEL}</span>
    </Link>
  );
}

export function DecisionInbox({ items }: { items: DecisionAttentionItem[] }) {
  if (items.length === 0) {
    return <p className="text-base leading-relaxed text-zinc-500">{ATTENTION_EMPTY_COPY}</p>;
  }

  return (
    <div className="divide-y divide-zinc-100 border-t border-zinc-100">
      {items.map((item) => (
        <AttentionRow key={item.caseId} item={item} />
      ))}
    </div>
  );
}

export function DecisionInboxRegisterLink() {
  return (
    <p className="mt-10">
      <Link href={DECISIONS_PATH} className="text-sm text-zinc-500 hover:text-zinc-800">
        Все решения
      </Link>
    </p>
  );
}
