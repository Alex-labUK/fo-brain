import type { ActivationStatus } from "@prisma/client";
import { ActivationStatusBadge } from "@/components/StatusBadge";
import { formatOwnerRole } from "@/lib/labels";

type ActivationCardProps = {
  subsystemName: string;
  ownerRoleKey: string | null;
  context: string;
  expectedFeedback: string;
  status: ActivationStatus;
  excludeReason?: string | null;
};

export function ActivationCard({
  subsystemName,
  ownerRoleKey,
  context,
  expectedFeedback,
  status,
  excludeReason,
}: ActivationCardProps) {
  return (
    <article className="rounded-lg border border-zinc-200 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-medium text-zinc-900">{subsystemName}</h3>
          <p className="mt-1 text-xs text-zinc-500">
            Owner: {formatOwnerRole(ownerRoleKey)}
          </p>
        </div>
        <ActivationStatusBadge status={status} />
      </div>

      {status === "confirmed" && (
        <>
          <div className="mt-4">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Minimum context
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">
              {context || "—"}
            </p>
          </div>
          <div className="mt-4">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Expected feedback
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">
              {expectedFeedback || "—"}
            </p>
          </div>
        </>
      )}

      {status === "excluded" && excludeReason && (
        <p className="mt-3 text-sm text-zinc-500">Причина исключения: {excludeReason}</p>
      )}
    </article>
  );
}
