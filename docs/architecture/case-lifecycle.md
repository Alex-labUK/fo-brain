# Case Status and Case Lifecycle

Version: 1.3  
Status: Stage 3 implementation note, with decision-resolution and execution context  
Path: `docs/architecture/case-lifecycle.md`

---

## Purpose

This document records how two different status models on `Case` relate to each other.

It does not merge the enums, redesign the lifecycle, or replace the Decision Engine.

---

## Two fields, two jobs

### `CaseStatus`

`CaseStatus` is the **legacy / general case record status**.

Current values: `hypothetical`, `real_in_progress`, `real_closed`, `cancelled`.

It answers whether the stored case record is hypothetical, an active real situation, closed, or cancelled. Existing library filters, badges, and record-level actions still use it.

### `CaseLifecycleState`

`CaseLifecycleState` describes **where an active case currently is in its operational decision lifecycle**.

Current values: `new`, `under_analysis`, `waiting_for_fact`, `waiting_for_third_party`, `waiting_for_principal`, `executing`, `monitoring`, `closed`.

Blocker fields (`blockerType`, `blockerNote`) belong to this model. They record what, if anything, is holding the case in a waiting or execution state.

`CaseLifecycleState` is the **lifecycle source of truth for the new case-management flow**.

---

## Human control

For now, lifecycle remains **explicitly human-controlled**.

- A person updates lifecycle from the case page.
- The server persists the chosen state after normalization.
- There is no automatic inference from analysis, dialogue, or priority.

**AI must not write lifecycle state or blocker fields.** Analysis, case memory, and priority updates must leave `lifecycleState`, `blockerType`, `blockerNote`, and `lifecycleUpdatedAt` unchanged.

---

## `lifecycleUpdatedAt`

Whenever lifecycle state or blocker data actually changes, `lifecycleUpdatedAt` **must be set explicitly to the current time**.

Do not rely on `@default(now())` or `updatedAt` for this. Those timestamps are not the lifecycle clock.

Unchanged submissions must not bump `lifecycleUpdatedAt`.

---

## Temporary divergence from `CaseStatus`

`CaseLifecycleState.closed` and `CaseStatus.real_closed` are **not automatically synchronized yet**.

A case can be lifecycle-`closed` while still `real_in_progress`, or `real_closed` while still `under_analysis`. That divergence is **intentional in Stage 2**.

It must be resolved **before automated lifecycle transitions are introduced**. Until then, do not infer one field from the other.

---

## Not OperationalBrief lifecycle

Domain documents describe an `OperationalBrief` lifecycle (aggregate status such as Open / Closed / Archived, and workflow phases such as Intake / Assessment / Decision / Execution).

That is a **separate domain concept**. It must not be silently conflated with `CaseLifecycleState`.

This Stage 2 overlay lives on the existing `Case` record. It does not introduce domain events, command envelopes, or the Operational Brief aggregate.

---

## AI lifecycle suggestion (Stage 3)

After each AI analysis cycle, FO Brain may **suggest** a lifecycle state and blocker note.

Rules:

- AI may suggest lifecycle.
- AI may not apply lifecycle.
- Human approval is required for every lifecycle write.
- The suggestion is **advisory**. It is not a second source of truth.

`Case.lifecycleSuggestion` stores the latest advisory payload (`state`, optional `blockerNote`, `reason`, `dismissed`). It is overwritten on every successful new analysis so a newer cycle cannot leave a stale recommendation on screen.

The suggestion is generated in a separate call and transported/stored **outside** `AnalysisResult`. `AnalysisResult` now also carries an additive `decisionStatus` (`unresolved` | `resolved`) used by the Decision Engine. That field is **not** a lifecycle write and must not be copied into `lifecycleState`.

Guidance for the suggestion model (advisory only, not hard-coded):

- `resolved` + agreed actions still underway → `executing`
- `resolved` + only observation remaining → `monitoring`
- `resolved` + nothing material remaining → `closed`
- `unresolved` + Principal decision required → `waiting_for_principal`
- `unresolved` + fact required → `waiting_for_fact`

A resolved decision is **not** case closure. Example: Principal has decided to complete, all risk questions are resolved, legal completion has not yet occurred → `decisionStatus = resolved`, lifecycle suggestion would normally remain `executing`.

If case memory says the Principal already approved the route, and the latest message does not revoke that, the suggestion must not be `waiting_for_principal` unless a **new** explicit Principal decision is genuinely required.

`Применить` goes through the existing human-controlled `updateCaseLifecycle` path (normalization + explicit `lifecycleUpdatedAt`). `Оставить как есть` only dismisses the visible suggestion.

A closed case never shows this card. `visibleLifecycleSuggestion` returns null while `lifecycleState` is `closed`. Closing (or later reopening) also dismisses the stored JSON so an obsolete pre-closure recommendation cannot reappear. Lifecycle state remains the only source of truth; the suggestion stays advisory.

AI analysis and dialogue updates must still never persist `lifecycleState`, `blockerType`, `blockerNote`, or `lifecycleUpdatedAt`.

---

## Invariants for this stage

1. Do not merge `CaseStatus` and `CaseLifecycleState`.
2. Do not let AI write lifecycle or blocker fields.
3. Do not auto-transition lifecycle from analysis or from `CaseStatus`.
4. Persist blocker type from lifecycle state where the mapping is deterministic.
5. Treat `CaseLifecycleState` as the source of truth for the new case-management flow.
6. An AI lifecycle suggestion is advisory until a human applies it through `updateCaseLifecycle`.
7. `decisionStatus` on `AnalysisResult` is not a lifecycle field. A resolved decision may still be `executing`.
8. AI must not write execution fields. A resolved decision is not an execution step, and a completed step is not case closure.

---

## Execution (Stage 1)

See `docs/architecture/case-execution.md`.

FO Brain is not a task-management system. After a decision is resolved, a case may carry **one current execution step** (`executionStep`, `executionOwner`, `executionStatus`, `executionUpdatedAt`).

```text
Decision Resolution  →  Execution  →  Completion  →  Human-confirmed Case Closure
```

These remain separate. Completing the step does not auto-close the case. Closing still goes through `updateCaseLifecycle`. If a resolved decision later becomes unresolved, a pending step stays stored and is marked for human review.
