import {
  storedLifecycleSuggestionAfterClose,
  visibleLifecycleSuggestion,
  type StoredLifecycleSuggestion,
} from "@/lib/case-lifecycle";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

const staleSuggestion: StoredLifecycleSuggestion = {
  state: "executing",
  blockerNote: "Завершение сделки в согласованный срок",
  reason: "Все условия выполнены, остаётся провести сделку.",
  dismissed: false,
};

assert(
  visibleLifecycleSuggestion(staleSuggestion, {
    lifecycleState: "closed",
    blockerNote: null,
  }) === null,
  "A: closed case never shows a lifecycle suggestion",
);

assert(
  visibleLifecycleSuggestion(staleSuggestion, {
    lifecycleState: "executing",
    blockerNote: "Другая заметка",
  }) !== null,
  "A: same suggestion remains visible while the case is not closed",
);

const afterClose = storedLifecycleSuggestionAfterClose(staleSuggestion);
assert(afterClose?.dismissed === true, "B: closing dismisses the stored suggestion");
assert(
  visibleLifecycleSuggestion(afterClose, {
    lifecycleState: "executing",
    blockerNote: "Другая заметка",
  }) === null,
  "B: dismissed pre-closure suggestion cannot reappear after reopen",
);
assert(
  visibleLifecycleSuggestion(afterClose, {
    lifecycleState: "closed",
    blockerNote: null,
  }) === null,
  "B: dismissed suggestion stays hidden while closed",
);

assert(storedLifecycleSuggestionAfterClose(null) === null, "B: nothing to dismiss when empty");
assert(
  storedLifecycleSuggestionAfterClose(afterClose)?.dismissed === true,
  "B: already-dismissed remains dismissed",
);

console.log("Case lifecycle suggestion visibility test passed.");
