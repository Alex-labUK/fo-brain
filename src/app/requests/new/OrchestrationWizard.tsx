"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { createOutcomeWithActivations } from "@/core/orchestration/actions";
import { draftSubsystemProposals } from "@/core/orchestration/draft-subsystem-proposals";
import {
  orchestrationWizardSteps,
  type SubsystemCatalogItem,
} from "@/core/orchestration/types";

type ActivationRowStatus = "pending" | "confirmed" | "excluded";

type ActivationRow = {
  clientKey: string;
  subsystemId: string;
  subsystemName: string;
  ownerRoleKey: string | null;
  reasonForActivation: string;
  context: string;
  expectedFeedback: string;
  status: ActivationRowStatus;
  excludeReason: string;
  isDraftSuggestion: boolean;
};

type OrchestrationWizardProps = {
  subsystems: SubsystemCatalogItem[];
};

type IntakeState = {
  requestFacts: string;
  statement: string;
  successCondition: string;
  headFocus: string;
};

const initialIntake: IntakeState = {
  requestFacts: "",
  statement: "",
  successCondition: "",
  headFocus: "",
};

function createClientKey(subsystemId: string): string {
  return `${subsystemId}-${Math.random().toString(36).slice(2, 9)}`;
}

export function OrchestrationWizard({ subsystems }: OrchestrationWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [intake, setIntake] = useState<IntakeState>(initialIntake);
  const [rows, setRows] = useState<ActivationRow[]>([]);
  const [manualSubsystemId, setManualSubsystemId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const usedSubsystemIds = useMemo(() => new Set(rows.map((row) => row.subsystemId)), [rows]);

  const availableSubsystems = subsystems.filter((item) => !usedSubsystemIds.has(item.id));

  function updateIntake<K extends keyof IntakeState>(key: K, value: IntakeState[K]) {
    setIntake((prev) => ({ ...prev, [key]: value }));
    setError(null);
  }

  function validateStep0(): string | null {
    if (!intake.requestFacts.trim()) return "Укажите факты запроса";
    if (!intake.statement.trim()) return "Укажите desired outcome";
    return null;
  }

  function goToSubsystemStep() {
    const validationError = validateStep0();
    if (validationError) {
      setError(validationError);
      return;
    }

    const proposals = draftSubsystemProposals(
      intake.requestFacts,
      intake.statement,
      subsystems,
    );

    setRows(
      proposals.map((proposal) => ({
        clientKey: createClientKey(proposal.subsystemId),
        subsystemId: proposal.subsystemId,
        subsystemName: proposal.subsystemName,
        ownerRoleKey: proposal.ownerRoleKey,
        reasonForActivation: proposal.reasonForActivation,
        context: proposal.roleRelevantContext,
        expectedFeedback: proposal.expectedFeedback,
        status: "pending",
        excludeReason: "",
        isDraftSuggestion: true,
      })),
    );
    setError(null);
    setStep(1);
  }

  function updateRow(clientKey: string, patch: Partial<ActivationRow>) {
    setRows((prev) =>
      prev.map((row) => (row.clientKey === clientKey ? { ...row, ...patch } : row)),
    );
    setError(null);
  }

  function addManualSubsystem() {
    const subsystem = subsystems.find((item) => item.id === manualSubsystemId);
    if (!subsystem) {
      setError("Выберите подсистему для добавления");
      return;
    }

    if (usedSubsystemIds.has(subsystem.id)) {
      setError("Эта подсистема уже добавлена");
      return;
    }

    setRows((prev) => [
      ...prev,
      {
        clientKey: createClientKey(subsystem.id),
        subsystemId: subsystem.id,
        subsystemName: subsystem.name,
        ownerRoleKey: subsystem.ownerRoleKey,
        reasonForActivation: "",
        context: "",
        expectedFeedback: "Подтверждённый результат или исключение, без детального плана задач.",
        status: "pending",
        excludeReason: "",
        isDraftSuggestion: false,
      },
    ]);
    setManualSubsystemId("");
    setError(null);
  }

  function validateStep1(): string | null {
    if (rows.length === 0) {
      return "Добавьте хотя бы одну подсистему или подтвердите предложение";
    }

    const unresolved = rows.some((row) => row.status === "pending");
    if (unresolved) {
      return "Для каждой подсистемы выберите «Подтвердить» или «Исключить»";
    }

    const invalidConfirmed = rows.some(
      (row) =>
        row.status === "confirmed" &&
        (!row.context.trim() || !row.expectedFeedback.trim()),
    );
    if (invalidConfirmed) {
      return "У подтверждённых activations должны быть context и expected feedback";
    }

    return null;
  }

  function goToSummary() {
    const validationError = validateStep1();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setStep(2);
  }

  function handleSave() {
    const validationError = validateStep0() ?? validateStep1();
    if (validationError) {
      setError(validationError);
      return;
    }

    startTransition(async () => {
      try {
        const { id } = await createOutcomeWithActivations({
          statement: intake.statement,
          successCondition: intake.successCondition,
          requestFacts: intake.requestFacts,
          headFocus: intake.headFocus,
          activations: rows
            .filter(
              (row): row is ActivationRow & { status: "confirmed" | "excluded" } =>
                row.status === "confirmed" || row.status === "excluded",
            )
            .map((row) => ({
              subsystemId: row.subsystemId,
              context: row.context,
              expectedFeedback: row.expectedFeedback,
              status: row.status,
              excludeReason: row.excludeReason,
            })),
        });
        router.push(`/outcomes/${id}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Не удалось сохранить outcome");
      }
    });
  }

  const confirmedCount = rows.filter((row) => row.status === "confirmed").length;
  const excludedCount = rows.filter((row) => row.status === "excluded").length;

  return (
    <div className="space-y-8">
      <nav aria-label="Шаги оркестрации">
        <ol className="flex flex-wrap gap-2">
          {orchestrationWizardSteps.map((wizardStep, index) => (
            <li
              key={wizardStep.id}
              className={`rounded-full px-3 py-1 text-sm ${
                index === step
                  ? "bg-zinc-900 text-white"
                  : index < step
                    ? "bg-zinc-200 text-zinc-700"
                    : "bg-zinc-100 text-zinc-400"
              }`}
            >
              {index + 1}. {wizardStep.label}
            </li>
          ))}
        </ol>
      </nav>

      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        {step === 0 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900">Новый запрос</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Зафиксируйте факты и desired outcome — что принципал хочет получить.
              </p>
            </div>

            <label className="block space-y-1">
              <span className="text-sm font-medium text-zinc-700">Факты запроса</span>
              <textarea
                value={intake.requestFacts}
                onChange={(e) => updateIntake("requestFacts", e.target.value)}
                rows={8}
                placeholder="Что произошло или что запрошено..."
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm leading-relaxed"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-sm font-medium text-zinc-700">Desired outcome</span>
              <textarea
                value={intake.statement}
                onChange={(e) => updateIntake("statement", e.target.value)}
                rows={3}
                placeholder="Что принципал хочет получить..."
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm leading-relaxed"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-sm font-medium text-zinc-700">
                Условие успеха (опционально)
              </span>
              <input
                type="text"
                value={intake.successCondition}
                onChange={(e) => updateIntake("successCondition", e.target.value)}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-sm font-medium text-zinc-700">
                Head of FO focus (опционально)
              </span>
              <textarea
                value={intake.headFocus}
                onChange={(e) => updateIntake("headFocus", e.target.value)}
                rows={2}
                placeholder="Что сейчас требует личного внимания Head of FO..."
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm leading-relaxed"
              />
            </label>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900">Подсистемы</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Черновые предложения по ключевым словам — не Reference Method. Подтвердите,
                исключите, отредактируйте context и expected feedback или добавьте подсистему
                вручную.
              </p>
            </div>

            {rows.length === 0 && (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Автоматических предложений нет. Добавьте подсистему вручную из каталога.
              </p>
            )}

            <div className="space-y-4">
              {rows.map((row) => (
                <div key={row.clientKey} className="rounded-lg border border-zinc-200 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-zinc-900">{row.subsystemName}</p>
                      {row.isDraftSuggestion && (
                        <p className="mt-1 text-xs text-amber-700">Черновое предложение</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => updateRow(row.clientKey, { status: "confirmed" })}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                          row.status === "confirmed"
                            ? "bg-emerald-600 text-white"
                            : "border border-zinc-200 text-zinc-700"
                        }`}
                      >
                        Подтвердить
                      </button>
                      <button
                        type="button"
                        onClick={() => updateRow(row.clientKey, { status: "excluded" })}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                          row.status === "excluded"
                            ? "bg-zinc-700 text-white"
                            : "border border-zinc-200 text-zinc-700"
                        }`}
                      >
                        Исключить
                      </button>
                    </div>
                  </div>

                  {row.status !== "excluded" && (
                    <>
                      {row.reasonForActivation && (
                        <p className="mt-4 text-sm text-zinc-600">
                          <span className="text-xs font-medium text-zinc-500">
                            Reason for activation
                          </span>
                          <span className="mt-1 block">{row.reasonForActivation}</span>
                        </p>
                      )}
                      <label className="mt-4 block space-y-1">
                        <span className="text-xs font-medium text-zinc-500">
                          Role-relevant context
                        </span>
                        <textarea
                          value={row.context}
                          onChange={(e) => updateRow(row.clientKey, { context: e.target.value })}
                          rows={3}
                          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                        />
                      </label>
                      <label className="mt-3 block space-y-1">
                        <span className="text-xs font-medium text-zinc-500">
                          Expected feedback
                        </span>
                        <textarea
                          value={row.expectedFeedback}
                          onChange={(e) =>
                            updateRow(row.clientKey, { expectedFeedback: e.target.value })
                          }
                          rows={2}
                          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                        />
                      </label>
                    </>
                  )}

                  {row.status === "excluded" && (
                    <label className="mt-4 block space-y-1">
                      <span className="text-xs font-medium text-zinc-500">
                        Причина исключения (опционально)
                      </span>
                      <input
                        type="text"
                        value={row.excludeReason}
                        onChange={(e) =>
                          updateRow(row.clientKey, { excludeReason: e.target.value })
                        }
                        className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                      />
                    </label>
                  )}
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-end gap-2 border-t border-zinc-100 pt-4">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-zinc-500">Добавить подсистему</span>
                <select
                  value={manualSubsystemId}
                  onChange={(e) => setManualSubsystemId(e.target.value)}
                  className="rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                >
                  <option value="">Выберите...</option>
                  {availableSubsystems.map((subsystem) => (
                    <option key={subsystem.id} value={subsystem.id}>
                      {subsystem.name}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={addManualSubsystem}
                className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Добавить
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 text-sm text-zinc-700">
            <h2 className="text-lg font-semibold text-zinc-900">Сводка</h2>
            <p>
              <span className="text-zinc-500">Outcome:</span> {intake.statement}
            </p>
            {intake.headFocus && (
              <p>
                <span className="text-zinc-500">Head of FO focus:</span> {intake.headFocus}
              </p>
            )}
            <p>
              <span className="text-zinc-500">Подтверждено activations:</span> {confirmedCount}
            </p>
            <p>
              <span className="text-zinc-500">Исключено:</span> {excludedCount}
            </p>
            <p className="text-xs text-zinc-500">
              После сохранения можно открыть Decision Engine, если требуется структурированное
              суждение.
            </p>
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
              onClick={() => {
                setError(null);
                setStep((prev) => prev - 1);
              }}
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
          {step === 0 && (
            <button
              type="button"
              onClick={goToSubsystemStep}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
            >
              Далее
            </button>
          )}
          {step === 1 && (
            <button
              type="button"
              onClick={goToSummary}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
            >
              К сводке
            </button>
          )}
          {step === 2 && (
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
            >
              {isPending ? "Сохранение…" : "Сохранить outcome"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
