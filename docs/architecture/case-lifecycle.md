# Case Status and Case Lifecycle

Version: 1.1  
Status: Stage 3 implementation note  
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

The public Decision Engine `AnalysisResult` contract is unchanged. The suggestion is generated in a separate call and transported/stored outside `AnalysisResult`.

`Применить` goes through the existing human-controlled `updateCaseLifecycle` path (normalization + explicit `lifecycleUpdatedAt`). `Оставить как есть` only dismisses the visible suggestion.

AI analysis and dialogue updates must still never persist `lifecycleState`, `blockerType`, `blockerNote`, or `lifecycleUpdatedAt`.

---

## Invariants for this stage

1. Do not merge `CaseStatus` and `CaseLifecycleState`.
2. Do not let AI write lifecycle or blocker fields.
3. Do not auto-transition lifecycle from analysis or from `CaseStatus`.
4. Persist blocker type from lifecycle state where the mapping is deterministic.
5. Treat `CaseLifecycleState` as the source of truth for the new case-management flow.
6. An AI lifecycle suggestion is advisory until a human applies it through `updateCaseLifecycle`.
