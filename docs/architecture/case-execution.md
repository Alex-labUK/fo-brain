# Case Execution

Version: 1.0  
Status: Stage 1 implementation note  
Path: `docs/architecture/case-execution.md`

---

## Purpose

FO Brain is **not a task manager**. Stage 1 adds only the **current execution step** for a case whose decision is already resolved.

There are no task lists, subtasks, boards, reminders, dependencies, or multiple in-flight steps.

---

## Three distinct states

These must not be collapsed into one another.

1. **Decision resolved** (`AnalysisResult.decisionStatus = resolved`)  
   The relevant uncertainty is gone and the route is clear. Example: the Principal has approved the purchase.

2. **Execution pending / completed** (`Case.executionStatus`)  
   The current concrete action that implements that decision. Example: complete the transaction by the agreed date.

3. **Case closed** (`CaseLifecycleState.closed`)  
   A human has confirmed that no further case-management work is required.

A resolved decision may still be executing. A completed execution step does not close the case. Only a human close write, through the existing lifecycle path, closes the case.

```text
Decision Resolution
  → Execution (human-approved current step)
  → Completion (human marks the step done)
  → Human-confirmed Case Closure
```

---

## Data model

On `Case`, nullable and default-safe:

- `executionStep` — the current concrete action
- `executionOwner` — person/role responsible
- `executionStatus` — `pending` | `completed`
- `executionUpdatedAt` — set explicitly on every execution write

Source of truth after human approval: these Case fields. There is no Task model and no second execution store.

Old cases stay valid with all four fields null. Do not backfill fake steps.

---

## Suggestion vs source of truth

When `decisionStatus = resolved`, the case is not closed, and no execution step is stored, FO Brain may **recommend** a step.

Stage 1 derives that suggestion **deterministically** from the current resolved analysis (first execution action, otherwise the resolution statement). No extra AI call.

AI may recommend. AI must **not** write `executionStep`, `executionOwner`, `executionStatus`, or `executionUpdatedAt`. Human `Применить` / `Изменить` / `Выполнено` / `Сбросить` are the only writes.

---

## Completion and closure

`Выполнено` sets `executionStatus = completed` and updates `executionUpdatedAt`. It does **not** change lifecycle.

After completion, the UI may ask: «Текущий шаг выполнен. Закрыть кейс?»  
`Закрыть кейс` calls the existing `updateCaseLifecycle` path (`closed`, blocker `none`, note cleared). There is no second closure mechanism.

---

## Decision reopens

If later evidence makes `decisionStatus` `unresolved` while a **pending** step is stored:

- do not delete or replace the step
- do not treat it as unquestionably valid
- show «Решение изменилось. Текущий шаг требует пересмотра.»

The human edits or clears it.
