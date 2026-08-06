"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import type { CaseStatus } from "@prisma/client";
import { deleteCase, updateCaseDetails, updateCaseStatus } from "@/app/cases/[id]/actions";
import { formatDomain, knownDomains } from "@/lib/labels";

export type CaseDetailData = {
  id: string;
  title: string;
  domain: string;
  status: CaseStatus;
};

type CaseDetailControlsProps = {
  caseItem: CaseDetailData;
};

export function CaseDetailControls({ caseItem }: CaseDetailControlsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);

  const [editTitle, setEditTitle] = useState(caseItem.title);
  const [editDomain, setEditDomain] = useState(caseItem.domain);

  useEffect(() => {
    setEditTitle(caseItem.title);
    setEditDomain(caseItem.domain);
  }, [caseItem]);

  const isActive =
    caseItem.status === "real_in_progress" || caseItem.status === "hypothetical";
  const isClosedOrCancelled =
    caseItem.status === "real_closed" || caseItem.status === "cancelled";

  function runAction(action: () => Promise<void>) {
    setError(null);
    startTransition(async () => {
      try {
        await action();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Не удалось выполнить действие");
      }
    });
  }

  function handleStatusChange(status: CaseStatus) {
    runAction(() => updateCaseStatus(caseItem.id, status));
  }

  function handleDelete() {
    if (
      !confirm(
        `Удалить кейс «${caseItem.title}» без возможности восстановления?`,
      )
    ) {
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        await deleteCase(caseItem.id);
        router.push("/cases");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Не удалось удалить кейс");
      }
    });
  }

  function handleSaveDetails(event: React.FormEvent) {
    event.preventDefault();
    runAction(() =>
      updateCaseDetails(caseItem.id, {
        title: editTitle,
        domain: editDomain,
      }),
    );
  }

  return (
    <div className="mt-6">
      <section className="rounded-xl border border-zinc-200 bg-white px-5 py-4 shadow-sm">
        <h2 className="text-sm font-semibold text-zinc-900">Действия</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {isActive && (
            <>
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleStatusChange("real_closed")}
                className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-800 hover:bg-emerald-100 disabled:opacity-60"
              >
                Завершить
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleStatusChange("cancelled")}
                className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-60"
              >
                Отменить
              </button>
            </>
          )}
          {isClosedOrCancelled && (
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleStatusChange("real_in_progress")}
              className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-60"
            >
              Вернуть в работу
            </button>
          )}
          <button
            type="button"
            disabled={isPending}
            onClick={() => setShowEditForm((value) => !value)}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
          >
            {showEditForm ? "Скрыть редактирование" : "Редактировать"}
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={handleDelete}
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-800 hover:bg-red-100 disabled:opacity-60"
          >
            Удалить кейс
          </button>
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </section>

      {showEditForm && (
        <section className="mt-4 rounded-xl border border-zinc-200 bg-white px-5 py-4 shadow-sm">
          <h2 className="text-sm font-semibold text-zinc-900">Редактирование</h2>
          <form onSubmit={handleSaveDetails} className="mt-4 space-y-4">
            <div>
              <label htmlFor="edit-title" className="block text-sm font-medium text-zinc-700">
                Название
              </label>
              <input
                id="edit-title"
                type="text"
                required
                value={editTitle}
                onChange={(event) => setEditTitle(event.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="edit-domain" className="block text-sm font-medium text-zinc-700">
                Домен
              </label>
              <select
                id="edit-domain"
                value={editDomain}
                onChange={(event) => setEditDomain(event.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              >
                {knownDomains.map((domainKey) => (
                  <option key={domainKey} value={domainKey}>
                    {formatDomain(domainKey)}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-60"
            >
              {isPending ? "Сохранение…" : "Сохранить изменения"}
            </button>
          </form>
        </section>
      )}
    </div>
  );
}
