import type { CaseBlockerType, CaseLifecycleState } from "@prisma/client";

const WAITING_LIFECYCLE_STATES: readonly CaseLifecycleState[] = [
  "waiting_for_fact",
  "waiting_for_third_party",
  "waiting_for_principal",
];

const DETERMINISTIC_BLOCKER_BY_STATE: Record<
  Exclude<CaseLifecycleState, "executing">,
  CaseBlockerType
> = {
  new: "none",
  under_analysis: "none",
  waiting_for_fact: "fact",
  waiting_for_third_party: "third_party",
  waiting_for_principal: "principal",
  monitoring: "none",
  closed: "none",
};

export const lifecycleStates: readonly CaseLifecycleState[] = [
  "new",
  "under_analysis",
  "waiting_for_fact",
  "waiting_for_third_party",
  "waiting_for_principal",
  "executing",
  "monitoring",
  "closed",
];

export const lifecycleStateLabels: Record<CaseLifecycleState, string> = {
  new: "Новый",
  under_analysis: "На анализе",
  waiting_for_fact: "Ожидание факта",
  waiting_for_third_party: "Ожидание третьей стороны",
  waiting_for_principal: "Ожидание принципала",
  executing: "Исполнение",
  monitoring: "Мониторинг",
  closed: "Закрыт",
};

export const blockerTypeLabels: Record<CaseBlockerType, string> = {
  none: "Нет блокера",
  fact: "Факт",
  third_party: "Третья сторона",
  principal: "Принципал",
  execution: "Исполнение",
};

export const blockerNotePlaceholders: Partial<Record<CaseLifecycleState, string>> = {
  waiting_for_fact: "Отчёт независимого инженера, подтверждающий источник протечки",
  waiting_for_third_party: "Ответ подрядчика к пятнице",
  waiting_for_principal: "Решение принципала — продолжать ли",
  executing: "Что блокирует исполнение?",
};

export type LifecycleUpdateInput = {
  lifecycleState: CaseLifecycleState;
  blockerType: CaseBlockerType;
  blockerNote?: string | null;
};

export type NormalizedLifecycleUpdate = {
  lifecycleState: CaseLifecycleState;
  blockerType: CaseBlockerType;
  blockerNote: string | null;
};

export type LifecycleSuggestion = {
  state: CaseLifecycleState;
  blockerNote?: string;
  reason: string;
};

export type StoredLifecycleSuggestion = LifecycleSuggestion & {
  dismissed: boolean;
};

type LifecycleSnapshot = {
  lifecycleState: CaseLifecycleState;
  blockerType: CaseBlockerType;
  blockerNote: string | null;
};

/** True when the case is paused waiting on an external input. */
export function isWaitingState(state: CaseLifecycleState): boolean {
  return WAITING_LIFECYCLE_STATES.includes(state);
}

export function lifecycleLabel(state: CaseLifecycleState): string {
  return lifecycleStateLabels[state];
}

export function blockerLabel(type: CaseBlockerType): string {
  return blockerTypeLabels[type];
}

export function isBlockerApplicable(type: CaseBlockerType): boolean {
  return type !== "none";
}

/** Waiting states and executing may carry a short human note. */
export function allowsBlockerNote(state: CaseLifecycleState): boolean {
  return isWaitingState(state) || state === "executing";
}

export function isLifecycleState(value: unknown): value is CaseLifecycleState {
  return typeof value === "string" && value in lifecycleStateLabels;
}

export function isBlockerType(value: unknown): value is CaseBlockerType {
  return typeof value === "string" && value in blockerTypeLabels;
}

function trimBlockerNote(note?: string | null): string | null {
  const trimmed = note?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Derives blocker type from lifecycle state where the mapping is deterministic.
 * `executing` is the only state that may be `execution` or `none`.
 */
export function normalizeLifecycleUpdate(input: LifecycleUpdateInput): NormalizedLifecycleUpdate {
  if (!isLifecycleState(input.lifecycleState)) {
    throw new Error("Некорректное состояние жизненного цикла");
  }

  const lifecycleState = input.lifecycleState;
  const note = trimBlockerNote(input.blockerNote);

  if (lifecycleState === "executing") {
    const blockerType =
      input.blockerType === "execution" || input.blockerType === "none"
        ? input.blockerType
        : note
          ? "execution"
          : "none";

    return {
      lifecycleState,
      blockerType,
      blockerNote: blockerType === "none" ? null : note,
    };
  }

  const blockerType = DETERMINISTIC_BLOCKER_BY_STATE[lifecycleState];

  return {
    lifecycleState,
    blockerType,
    blockerNote: blockerType === "none" ? null : note,
  };
}

export function hasLifecycleChanged(
  current: LifecycleSnapshot,
  next: NormalizedLifecycleUpdate,
): boolean {
  return (
    current.lifecycleState !== next.lifecycleState ||
    current.blockerType !== next.blockerType ||
    (current.blockerNote ?? null) !== next.blockerNote
  );
}

function notesEqual(left?: string | null, right?: string | null): boolean {
  return (left?.trim() || null) === (right?.trim() || null);
}

export function suggestionDiffersFromCurrent(
  suggestion: LifecycleSuggestion,
  current: Pick<LifecycleSnapshot, "lifecycleState" | "blockerNote">,
): boolean {
  return suggestion.state !== current.lifecycleState || !notesEqual(suggestion.blockerNote, current.blockerNote);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseLifecycleSuggestion(raw: unknown): LifecycleSuggestion | null {
  if (!isRecord(raw) || !isLifecycleState(raw.state)) {
    return null;
  }

  const reason = typeof raw.reason === "string" ? raw.reason.trim() : "";
  if (!reason) {
    return null;
  }

  const note = typeof raw.blockerNote === "string" ? raw.blockerNote.trim() : "";
  const suggestion: LifecycleSuggestion = {
    state: raw.state,
    reason,
  };

  if (allowsBlockerNote(raw.state) && note) {
    suggestion.blockerNote = note;
  }

  return suggestion;
}

export function parseStoredLifecycleSuggestion(raw: unknown): StoredLifecycleSuggestion | null {
  const suggestion = parseLifecycleSuggestion(raw);
  if (!suggestion || !isRecord(raw)) {
    return null;
  }

  return {
    ...suggestion,
    dismissed: raw.dismissed === true,
  };
}

export function toStoredLifecycleSuggestion(suggestion: LifecycleSuggestion): StoredLifecycleSuggestion {
  return {
    ...suggestion,
    dismissed: false,
  };
}

export function visibleLifecycleSuggestion(
  raw: unknown,
  current: Pick<LifecycleSnapshot, "lifecycleState" | "blockerNote">,
): LifecycleSuggestion | null {
  const stored = parseStoredLifecycleSuggestion(raw);
  if (!stored || stored.dismissed || !suggestionDiffersFromCurrent(stored, current)) {
    return null;
  }

  return {
    state: stored.state,
    blockerNote: stored.blockerNote,
    reason: stored.reason,
  };
}

const MONTHS_RU_SHORT = [
  "янв.",
  "февр.",
  "мар.",
  "апр.",
  "мая",
  "июн.",
  "июл.",
  "авг.",
  "сент.",
  "окт.",
  "нояб.",
  "дек.",
] as const;

const MOSCOW_OFFSET_MS = 3 * 60 * 60 * 1000;

function asDate(value: Date | string): Date {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Некорректная дата жизненного цикла");
  }
  return date;
}

function pad2(value: number): string {
  return value.toString().padStart(2, "0");
}

/**
 * Europe/Moscow calendar parts without Intl.
 * Node ICU and Chromium ICU disagree on ru-RU (e.g. "2026 г." vs "2026"),
 * which hydrates a Client Component mismatch.
 */
function moscowDateTimeParts(date: Date): {
  day: number;
  monthIndex: number;
  year: number;
  hours: number;
  minutes: number;
} {
  const moscow = new Date(date.getTime() + MOSCOW_OFFSET_MS);
  return {
    year: moscow.getUTCFullYear(),
    monthIndex: moscow.getUTCMonth(),
    day: moscow.getUTCDate(),
    hours: moscow.getUTCHours(),
    minutes: moscow.getUTCMinutes(),
  };
}

export function formatLifecycleSince(updatedAt: Date | string, now: Date | string): string {
  const updated = asDate(updatedAt);
  const current = asDate(now);
  const elapsedMs = Math.max(0, current.getTime() - updated.getTime());
  const minutes = Math.floor(elapsedMs / 60_000);
  const hours = Math.floor(elapsedMs / 3_600_000);
  const days = Math.floor(elapsedMs / 86_400_000);

  let duration: string;
  if (minutes < 1) {
    duration = "только что";
  } else if (minutes < 60) {
    duration = `${minutes} мин`;
  } else if (hours < 24) {
    duration = `${hours} ч`;
  } else {
    duration = `${days} дн.`;
  }

  const parts = moscowDateTimeParts(updated);
  const since = `${parts.day} ${MONTHS_RU_SHORT[parts.monthIndex]} ${parts.year}, ${pad2(parts.hours)}:${pad2(parts.minutes)}`;

  return `${duration} · с ${since}`;
}
