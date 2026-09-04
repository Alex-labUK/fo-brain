import type { CaseBlockerType, CaseLifecycleState } from "@prisma/client";

const WAITING_LIFECYCLE_STATES: readonly CaseLifecycleState[] = [
  "waiting_for_fact",
  "waiting_for_third_party",
  "waiting_for_principal",
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
