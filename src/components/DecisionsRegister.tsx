"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  decisionsHref,
  matchesRegisterSearch,
  registerEmptyMessage,
  REGISTER_FILTERS,
  type RegisterRow,
  type SecondaryView,
} from "@/lib/case-dashboard";
import { priorityColorBadgeClass, priorityColorMarkerClass, type PriorityColor } from "@/lib/priority";

function registerDotClass(color: PriorityColor): string {
  if (color === "red") return priorityColorMarkerClass("red");
  if (color === "amber") return priorityColorMarkerClass("amber");
  return "bg-zinc-300";
}

function RegisterRowLink({ row }: { row: RegisterRow }) {
  const colored = row.priorityColor === "red" || row.priorityColor === "amber";

  return (
    <Link
      href={`/cases/${row.id}`}
      className="flex items-start justify-between gap-6 py-3.5 transition-colors hover:bg-zinc-50"
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${registerDotClass(row.priorityColor)}`} aria-hidden />
        <div className="min-w-0">
          <div className="truncate text-[15px] font-medium tracking-tight text-zinc-900">{row.title}</div>
          {row.contextLine && (
            <div className="mt-1 truncate text-sm leading-relaxed text-zinc-500">{row.contextLine}</div>
          )}
        </div>
      </div>
      <div className="w-44 shrink-0 pt-0.5 text-right sm:w-52">
        <div className="text-sm text-zinc-600">{row.statusLine}</div>
        {row.priorityLabel && (
          <div
            className={`mt-1 inline-flex rounded-full border px-2 py-px text-[11px] font-medium ${
              colored ? priorityColorBadgeClass(row.priorityColor) : "text-zinc-500"
            }`}
          >
            {row.priorityLabel}
          </div>
        )}
      </div>
    </Link>
  );
}

export function DecisionsRegister({
  rows,
  view,
  counts,
}: {
  rows: RegisterRow[];
  view?: SecondaryView;
  counts: { open: number } & Record<SecondaryView, number>;
}) {
  const [query, setQuery] = useState("");
  const visible = useMemo(
    () => rows.filter((row) => matchesRegisterSearch(row, query)),
    [rows, query],
  );
  const searching = query.trim().length > 0;

  return (
    <div>
      <label className="sr-only" htmlFor="register-search">
        Найти решение
      </label>
      <input
        id="register-search"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Найти решение"
        className="w-full border-b border-zinc-200 bg-transparent py-2 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-zinc-400"
      />

      <nav className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm">
        {REGISTER_FILTERS.map((item) => {
          const active = view === item.view;
          const count = item.view ? counts[item.view] : counts.open;
          return (
            <Link
              key={item.label}
              href={decisionsHref(item.view)}
              className={
                active
                  ? "border-b border-black pb-px font-medium text-zinc-900"
                  : "border-b border-transparent pb-px text-zinc-500 transition-colors hover:text-zinc-800"
              }
            >
              {item.label}{" "}
              <span className={`tabular-nums ${active ? "text-zinc-500" : "text-zinc-400"}`}>{count}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-6 divide-y divide-zinc-100 border-t border-zinc-100">
        {rows.length === 0 ? (
          <p className="py-8 text-sm text-zinc-500">{registerEmptyMessage(view)}</p>
        ) : visible.length === 0 ? (
          <p className="py-8 text-sm text-zinc-500">
            {searching ? "Ничего не найдено." : registerEmptyMessage(view)}
          </p>
        ) : (
          visible.map((row) => <RegisterRowLink key={row.id} row={row} />)
        )}
      </div>
    </div>
  );
}
