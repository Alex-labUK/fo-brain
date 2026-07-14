"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { CaseStatus } from "@prisma/client";
import { createCase } from "@/app/cases/new/actions";
import { WizardStepper } from "@/components/wizard/WizardStepper";
import { caseStatusLabels, domainLabels, knownDomains } from "@/lib/labels";

type BranchOption = {
  id: string;
  name: string;
  appliesWhen: string;
};

type CaseWizardProps = {
  branches: BranchOption[];
  existingDomains: string[];
};

type FormState = {
  title: string;
  facts: string;
  domainPreset: string;
  customDomain: string;
  status: CaseStatus;
  branchId: string;
  decisionTree: string;
  outcome: string;
};

const initialState: FormState = {
  title: "",
  facts: "",
  domainPreset: knownDomains[0] ?? "",
  customDomain: "",
  status: "hypothetical",
  branchId: "",
  decisionTree: "",
  outcome: "",
};

export function CaseWizard({ branches, existingDomains }: CaseWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(initialState);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const domainOptions = Array.from(new Set([...knownDomains, ...existingDomains])).sort();

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError(null);
  }

  function resolveDomain(): string {
    if (form.domainPreset === "__custom__") {
      return form.customDomain.trim();
    }
    return form.domainPreset;
  }

  function validateStep(): string | null {
    if (step === 0 && !form.title.trim()) {
      return "Укажите название кейса";
    }
    if (step === 1) {
      const domain = resolveDomain();
      if (!domain) {
        return "Укажите домен кейса";
      }
    }
    return null;
  }

  function goNext() {
    const validationError = validateStep();
    if (validationError) {
      setError(validationError);
      return;
    }
    setStep((prev) => Math.min(prev + 1, 3));
  }

  function goBack() {
    setError(null);
    setStep((prev) => Math.max(prev - 1, 0));
  }

  function handleSave() {
    const validationError = validateStep();
    if (validationError) {
      setError(validationError);
      return;
    }

    startTransition(async () => {
      try {
        const { id } = await createCase({
          title: form.title,
          facts: form.facts,
          domain: resolveDomain(),
          status: form.status,
          branchId: form.branchId || null,
          decisionTree: form.decisionTree,
          outcome: form.outcome,
        });
        router.push(`/cases/${id}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Не удалось сохранить кейс");
      }
    });
  }

  return (
    <div className="space-y-8">
      <WizardStepper currentStep={step} />

      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        {step === 0 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900">Что произошло?</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Опишите ситуацию своими словами — можно вставить сырой текст без структуры.
              </p>
            </div>

            <label className="block space-y-1">
              <span className="text-sm font-medium text-zinc-700">Название кейса</span>
              <input
                type="text"
                value={form.title}
                onChange={(e) => updateField("title", e.target.value)}
                placeholder="Краткая формулировка для журнала"
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-sm font-medium text-zinc-700">Факты</span>
              <textarea
                value={form.facts}
                onChange={(e) => updateField("facts", e.target.value)}
                rows={10}
                placeholder="Что произошло, кто участвует, какой контекст..."
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm leading-relaxed"
              />
            </label>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900">Классификация</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Выберите домен и ветку Decision Engine вручную. Если рамка не подходит — оставьте
                «без ветки».
              </p>
            </div>

            <label className="block space-y-1">
              <span className="text-sm font-medium text-zinc-700">Домен</span>
              <select
                value={form.domainPreset}
                onChange={(e) => updateField("domainPreset", e.target.value)}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              >
                {domainOptions.map((domain) => (
                  <option key={domain} value={domain}>
                    {domainLabels[domain] ?? domain}
                  </option>
                ))}
                <option value="__custom__">Другой домен…</option>
              </select>
            </label>

            {form.domainPreset === "__custom__" && (
              <label className="block space-y-1">
                <span className="text-sm font-medium text-zinc-700">Свой домен</span>
                <input
                  type="text"
                  value={form.customDomain}
                  onChange={(e) => updateField("customDomain", e.target.value)}
                  placeholder="например: vendor_conflict"
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                />
              </label>
            )}

            <label className="block space-y-1">
              <span className="text-sm font-medium text-zinc-700">Статус кейса</span>
              <select
                value={form.status}
                onChange={(e) => updateField("status", e.target.value as CaseStatus)}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              >
                {(Object.keys(caseStatusLabels) as CaseStatus[]).map((status) => (
                  <option key={status} value={status}>
                    {caseStatusLabels[status]}
                  </option>
                ))}
              </select>
            </label>

            <fieldset className="space-y-3">
              <legend className="text-sm font-medium text-zinc-700">Ветка Decision Engine</legend>

              <label className="flex cursor-pointer gap-3 rounded-lg border border-zinc-200 p-3 hover:bg-zinc-50">
                <input
                  type="radio"
                  name="branch"
                  value=""
                  checked={form.branchId === ""}
                  onChange={() => updateField("branchId", "")}
                  className="mt-1"
                />
                <div>
                  <p className="font-medium text-zinc-900">Без ветки</p>
                  <p className="text-sm text-zinc-500">Кейс не укладывается в стандартную рамку</p>
                </div>
              </label>

              {branches.map((branch) => (
                <label
                  key={branch.id}
                  className="flex cursor-pointer gap-3 rounded-lg border border-zinc-200 p-3 hover:bg-zinc-50"
                >
                  <input
                    type="radio"
                    name="branch"
                    value={branch.id}
                    checked={form.branchId === branch.id}
                    onChange={() => updateField("branchId", branch.id)}
                    className="mt-1"
                  />
                  <div>
                    <p className="font-medium text-zinc-900">{branch.name}</p>
                    <p className="text-sm text-zinc-500">{branch.appliesWhen}</p>
                  </div>
                </label>
              ))}
            </fieldset>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900">Дерево решений / рассуждение</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Связный текст или блоки «если… → тогда…». Можно оставить пустым, если кейс не
                укладывается в дерево.
              </p>
            </div>

            <textarea
              value={form.decisionTree}
              onChange={(e) => updateField("decisionTree", e.target.value)}
              rows={12}
              placeholder={"Если контрагент отказывается проверять → проверить самостоятельно\n→ если подтверждается → ..."}
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 font-mono text-sm leading-relaxed"
            />
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900">Итог</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Что решили и что произошло по факту. Для «реальный, в процессе» можно оставить
                пустым и вернуться позже.
              </p>
            </div>

            <textarea
              value={form.outcome}
              onChange={(e) => updateField("outcome", e.target.value)}
              rows={8}
              placeholder="Принятое решение, текущий статус, следующие шаги..."
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm leading-relaxed"
            />

            <div className="rounded-lg bg-zinc-50 p-4 text-sm text-zinc-600">
              <p className="font-medium text-zinc-800">Сводка перед сохранением</p>
              <ul className="mt-2 space-y-1">
                <li>
                  <span className="text-zinc-500">Название:</span> {form.title || "—"}
                </li>
                <li>
                  <span className="text-zinc-500">Домен:</span>{" "}
                  {(domainLabels[resolveDomain()] ?? resolveDomain()) || "—"}
                </li>
                <li>
                  <span className="text-zinc-500">Статус:</span> {caseStatusLabels[form.status]}
                </li>
                <li>
                  <span className="text-zinc-500">Ветка:</span>{" "}
                  {branches.find((b) => b.id === form.branchId)?.name ?? "Без ветки"}
                </li>
              </ul>
              <p className="mt-3 text-xs text-zinc-400">
                Шаги «Вопросы» и «Обновление базы» — в следующих итерациях.
              </p>
            </div>
          </div>
        )}

        {error && (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div>
          {step > 0 ? (
            <button
              type="button"
              onClick={goBack}
              disabled={isPending}
              className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
            >
              Назад
            </button>
          ) : (
            <Link
              href="/"
              className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Отмена
            </Link>
          )}
        </div>

        <div>
          {step < 3 ? (
            <button
              type="button"
              onClick={goNext}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
            >
              Далее
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
            >
              {isPending ? "Сохранение…" : "Сохранить кейс"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
