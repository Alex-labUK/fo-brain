import Link from "next/link";
import type { DashboardCard, DashboardPortfolio } from "@/lib/case-dashboard";
import { dashboardCounts, decisionsHref, type SecondaryView } from "@/lib/case-dashboard";
import {
  priorityColorBadgeClass,
  priorityColorMarkerClass,
  type PriorityColor,
} from "@/lib/priority";

const WORK_ITEMS: { key: Exclude<SecondaryView, "closed">; label: string }[] = [
  { key: "waiting", label: "Ожидают" },
  { key: "executing", label: "Исполняются" },
  { key: "monitoring", label: "Мониторинг" },
  { key: "other", label: "Другие открытые" },
];

function accentClass(color: PriorityColor): string {
  if (color === "red") return "border-l-red-500";
  if (color === "amber") return "border-l-amber-500";
  return "border-l-zinc-200";
}

function urgencyBadgeClass(color: PriorityColor): string {
  if (color === "red" || color === "amber") return priorityColorBadgeClass(color);
  return "bg-zinc-100 text-zinc-600 border-zinc-200";
}

function FocusCard({ card }: { card: DashboardCard }) {
  const colored = card.priorityColor === "red" || card.priorityColor === "amber";

  return (
    <Link
      href={`/cases/${card.id}`}
      className={`block rounded-2xl border border-zinc-200 border-l-2 bg-white px-5 py-5 shadow-sm transition-colors hover:border-zinc-300 hover:bg-zinc-50 ${accentClass(card.priorityColor)}`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${priorityColorMarkerClass(card.priorityColor)}`}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <span className="text-lg font-medium tracking-tight text-zinc-900">{card.title}</span>
            {card.statusLine && (
              <span
                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                  colored ? urgencyBadgeClass(card.priorityColor) : "text-zinc-500"
                }`}
              >
                {card.statusLine}
              </span>
            )}
          </div>
          {card.contextLine && (
            <div className="mt-3 max-w-xl text-base leading-relaxed text-zinc-600">{card.contextLine}</div>
          )}
        </div>
      </div>
    </Link>
  );
}

export function DecisionCockpit({ portfolio }: { portfolio: DashboardPortfolio }) {
  const counts = dashboardCounts(portfolio);

  return (
    <div>
      {portfolio.now.length === 0 ? (
        <p className="text-base leading-relaxed text-zinc-500">
          Нет вопросов, которые требуют вашего внимания.
        </p>
      ) : (
        <div className="space-y-4">
          {portfolio.now.map((card) => (
            <FocusCard key={card.id} card={card} />
          ))}
        </div>
      )}

      <section className="mt-14">
        <h2 className="text-lg font-medium tracking-tight text-zinc-900">В работе</h2>
        <nav className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {WORK_ITEMS.map((item) => (
            <Link
              key={item.key}
              href={decisionsHref(item.key)}
              className="rounded-xl border border-zinc-200 bg-white px-4 py-4 transition-colors hover:border-zinc-300 hover:bg-zinc-50"
            >
              <div className="text-sm text-zinc-500">{item.label}</div>
              <div className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-zinc-900">
                {counts[item.key]}
              </div>
            </Link>
          ))}
        </nav>
        <div className="mt-8">
          <Link
            href={decisionsHref("closed")}
            className="text-sm text-zinc-400 hover:text-zinc-600"
          >
            Архив {counts.closed}
          </Link>
        </div>
      </section>
    </div>
  );
}
