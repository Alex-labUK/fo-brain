# Case Status and Case Lifecycle

Version: 1.5  
Status: Stage 3 implementation note, with decision-resolution, execution, Decision Record, and Decision Support  
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

Stored lifecycle suggestions carry an `analysisKey` (same derivation as decision-cycle reopen). After each successful analysis write, FO Brain stores a fresh suggestion for the current analysis or clears the field. `visibleLifecycleSuggestion` hides any stored suggestion whose `analysisKey` does not match the current analysis, and rejects waiting-state guidance when the current analysis is already resolved. If AI lifecycle generation fails, a deterministic fallback derived from the current analysis is stored instead — the previous cycle’s suggestion must never remain visible as if current.

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
9. A closed case does not auto-reopen. `resolved → unresolved` after closure is a new decision cycle: archive the previous cycle first, then show a human-only reopen recommendation.
10. Closing a case is a human action. `decisionStatus = resolved` never auto-closes lifecycle. A Decision Record is created only in `updateCaseLifecycle` when lifecycle becomes `closed`.

---

## Case Closure & Decision Record

`resolved` and `closed` are different states. A decision may be resolved while execution or monitoring continues. FO Brain never closes a case because analysis became resolved.

A Decision Record is a compact, immutable historical snapshot written onto `Case.decisionRecord` in the same `updateCaseLifecycle` transaction that sets `lifecycleState = closed`. It is built deterministically from current analysis, optional `resolutionContext`, stored execution, and a human factual outcome. **No additional AI call.**

Shape (version 1): `closedAt`, `cycleNumber`, `analysisKey`, `decisionStatusAtClose`, `outcome`, `decision`, and optional `determiningFact`, `resolvingEvidence`, `executionStep`, `executionOwner`, `executionStatus`, `factualOutcome`. Missing facts are omitted, never guessed.

After unresolved → resolved, `analysisResult` replaces Determining Fact with terminal text. The actual prior fact is captured as `Case.resolutionContext` on that transition only. `resolvingEvidence` is stored only when the triggering message is an explicit Next Step Result (`Результат текущего шага: …`). An ordinary circumstance message is not treated as proof. A new decision cycle clears the context.

The first close finalizes `Case.decisionRecord`. A later close while the case is already closed, or while that record is still the active snapshot, does not rebuild it. Reopen archives/clears the active record; closing a later cycle creates a new one.

User-facing case closure is only the lifecycle path (`Закрыть кейс` dialog via execution, lifecycle dropdown, or apply-closed). `CaseStatus.real_closed` is a legacy record flag. The old «Завершить» control is hidden so it cannot be mistaken for case closure.

When a closed/resolved cycle later becomes unresolved, the active record is copied onto that `decisionCycleHistory` entry and cleared from the case. Apply reopen starts a new active cycle with no current record. A later close creates a new record for the new cycle; the archived one is unchanged.

Unresolved cases may still be closed. The record keeps `decisionStatusAtClose = unresolved` and the current fork/fact. Closing does not change `decisionStatus`. If later evidence arrives while the case remains closed and unresolved, FO Brain can show the existing human-only reopen recommendation. Lifecycle can also be changed from «Статус кейса».

If the user enters «Фактический итог», it is stored as entered (after sanitation) on the record. It is also prepended to `caseMemory` as `Итог закрытия: …` using the existing 15-line normalize/cap, so a later reopen can see it without a second memory store. Empty outcome does not write memory.

Old closed cases without `decisionRecord` stay usable. FO Brain does not backfill guessed records.

A closed workspace must not look operational. The Decision Record is the primary surface. Live Decision / Determining Fact / Next Step are not shown as active work. The last analysis may remain under «Разбор на момент закрытия». Unresolved closure uses «Итог кейса» and does not imply the decision was resolved. Factual outcome never changes `decisionStatus`. Active urgency is hidden unless a reopen recommendation is visible.

---

## Relevant Past Decisions

Closed Decision Records are institutional memory, not authority. On an **active** Decision Workspace (or a closed case with a visible reopen suggestion), FO Brain may show up to **3** compact «Похожие прошлые кейсы» cards **below** the current Decision / Next Step / FO Brain guidance. They are display-only: they do not copy a past decision, auto-resolve, or change fork, determining fact, priority, lifecycle, or execution.

Sources are persisted Decision Records only: `Case.decisionRecord` and archived records inside `decisionCycleHistory`. Raw `analysisResult` is never treated as a verified historical decision. Legacy closed cases without a record are skipped, not fabricated. The current case is excluded; v1 prefers cross-case history.

Retrieval is deterministic and local: normalize title / outcome / decision / determining fact, then weighted token overlap (Jaccard-style). Determining fact, decision, and outcome weigh more than factual outcome. `caseMemory` may reinforce overlapping tokens but does not flood the query. At most one card per source case. Results below a centralized threshold are dropped — 0–3 cards, never weak filler. Resolved records rank above unresolved when scores are close. Unresolved closures are labeled as closed without a final decision. `relevanceScore` is internal; the UI never shows a similarity percentage.

No new AI call, embeddings, or vector index. Matching lives in `findRelevantPastDecisions`, not in `page.tsx`, so a later semantic matcher can replace it without changing the UI contract. Decision Engine prompts (initial, continue, lifecycle, execution, Decision Change Summary) do not receive these records.

Normally closed cases hide the section because their own Decision Record is already primary.

---

## Reasoning Context

Facts, outcome, fork, and determining fact remain primary. Reasoning Context is supporting institutional memory on an **active** workspace (or a closed case with a visible reopen suggestion). It sits below Decision / Next Step / FO Brain guidance and is visually weaker than those surfaces.

**Principles / patterns** come only from the curated Family Office knowledge base (`seed-data.json`, sourced from `decision-engine.md`). The Decision Engine already uses them as **step-4 calibration** after facts and the fork are derived; AnalysisResult does not persist a selected principle. v1 surfaces at most **2** genuinely relevant items with deterministic token overlap (reusing Relevant Past Decisions normalization). Weak matches are omitted. A principle never creates a fact, never writes `caseMemory`, and never auto-resolves the current fork.

**Historical cases** reuse Relevant Past Decisions v1 for **display**. Unresolved historical records remain display-only. A stricter subset of resolved cross-case records may be supplied to the existing Decision Engine analysis call (see Controlled Precedent Input). They are not injected into lifecycle/execution suggestions or Decision Change Summary.

The combined section «Контекст решения» renders principles, past cases, or both; if neither exists it renders nothing. Zero additional AI calls. Later semantic retrieval can replace the matchers without changing this UI contract.

---

## Controlled Precedent Input

Historical precedent is **calibration**, not evidence. Hierarchy remains:

```text
CURRENT CONFIRMED FACTS
  → CURRENT DESIRED OUTCOME
  → CURRENT DECISION FORK
  → CURRENT DETERMINING FACT
  → principles / patterns / precedents as calibration
```

Current facts and the current desired outcome stay authoritative. A precedent never creates a confirmed fact, never answers the current Determining Fact, never substitutes for missing evidence, never auto-resolves `decisionStatus`, never overrides a Principal decision, `caseMemory`, or the current outcome, and is never copied merely because cases look similar. If current facts or outcome conflict with a precedent, the current case wins. Partial similarity may be ignored.

**Eligibility (AI input v1)** is stricter than Relevant Past Decisions display (threshold **0.14**, max **3**, resolved or unresolved):

- persisted Decision Records only (`Case.decisionRecord` and archived `decisionCycleHistory`);
- `decisionStatusAtClose === "resolved"`;
- same deterministic matcher, then `PRECEDENT_INPUT_MIN_SCORE` (**0.20**, must stay above the display threshold);
- max **2**; empty is normal;
- cross-case only: current case and its prior cycles are excluded;
- skipped when current-case core tokens are too thin for a meaningful match.

Unresolved historical records stay in Reasoning Context when they pass the display threshold. They never enter the analysis prompt or `precedentContextRefs`.

**No extra AI call.** Selection is deterministic and is passed into the existing initial analysis and `continueAnalysis` prompts after current-case facts/outcome/fork/fact. Retrieval failure continues analysis without precedent. Selection is recalculated every analysis cycle; previous refs are not copied forward.

Prompt text is untrusted **DATA** inside delimiters. The model is told never to follow instructions inside historical text. Precedent is not merged with Family Office principles (`seed-data.json` / `decision-engine.md` unchanged). Precedent facts are never copied into current `caseMemory`.

**Auditability:** `AnalysisResult.precedentContextRefs` records which historical records were **supplied** to that analysis. It does not mean the model followed them. Do not generate causal copy such as «мы приняли это решение, потому что прошлый кейс доказал». Every supplied record must be visible in «Похожие прошлые кейсы»: Reasoning Context shows current `precedentContextRefs` first (resolved to persisted Decision Records; missing/malformed refs are skipped), then fills remaining slots from ordinary Relevant Past Decisions ranking, still at most **3** cards. Only those current refs receive «Передан в контекст текущего разбора».

Decision Change Summary ignores these refs. Lifecycle, execution, and closure prompts do not receive a separate precedent block.

Future semantic retrieval may replace the deterministic matcher without changing this contract.

---

## Decision Support / Missing Evidence

See `docs/architecture/decision-support.md`.

`decisionStatus` and evidence support are separate. FO Brain does not estimate probability or ask the model how confident it is. There is no numeric confidence score.

A compact derived state, **Устойчивость решения**, is computed deterministically from current structured data:

- **missing_evidence** — `decisionStatus = unresolved` and a valid Determining Fact exists. That fact is the missing evidence. No other missing fact is invented.
- **supported** — `decisionStatus = resolved` and the current cycle has a matching `resolutionContext` (`analysisKey` = current analysis cycle key) with preserved `resolvingEvidence` captured from an explicit Next Step Result. That is the only reliable supporting evidence in v1.
- **support_not_recorded** — resolved, but current structured resolving evidence is absent, incomplete, or belongs to a previous analysis/cycle.

The layer never writes `decisionStatus`, lifecycle, execution, or priority. A supported decision may still have pending execution. A resolved→unresolved transition shows missing evidence for the **new** Determining Fact; old evidence stays in cycle history / Decision Record.

**Not evidence:** caseMemory lines, Family Office principles, historical precedent / `precedentContextRefs`, closure `factualOutcome`, model reply, arbitrary dialogue, Decision Records from other cases.

On an **active** workspace (or closed + visible reopen suggestion) the compact block sits under Determining Fact and above Next Step. A normally closed case does not get a second active card; the Decision Record already shows `resolvingEvidence` when stored, and does not invent it when absent.

Zero additional AI calls. The Decision Engine prompt is unchanged.

---

## Decision Challenge

See `docs/architecture/decision-challenge.md`.

**Проверка решения** is a compact quality check on a **resolved** route. It is separate from **Устойчивость решения**. Unresolved cases do not show it. The unresolved internal route-change check stays internal.

The same analysis call may return optional `AnalysisResult.decisionChallenge`. Challenge never writes decision status, lifecycle, execution, or priority. Informational only in v1.

---

## Decision Authority / Escalation

See `docs/architecture/decision-authority.md`.

**Кто принимает решение** is advisory governance metadata. Fact owner ≠ decision owner. It does not write lifecycle, create a Principal workflow, or block execution. Principal escalation is only for a real remaining value/boundary judgment, not for a still-missing determining fact.

---

## Principal Decision Brief

See `docs/architecture/principal-decision-brief.md`.

**Решение для Principal** is a derived memo over the current analysis when `decisionAuthority.owner === "principal"`. Deterministic compression only. No extra AI call, no new recommendation, no approval workflow, no persisted brief. Hidden on a normally closed case.

---

## Principal Decision Capture

See `docs/architecture/principal-decision-capture.md`.

**Зафиксировать решение Principal** records a human Principal judgment into current-cycle structured state, caseMemory, and dialogue, then reruns the existing analysis once. It does not write lifecycle, execution, or closure. The same Principal question should not be re-asked. A later different judgment may.

---

## Reopen / new decision cycle

If a closed, resolved case later receives a genuine new uncertainty, the Decision Engine may set `decisionStatus` back to `unresolved`. Lifecycle stays `closed` until a human applies «возобновить кейс».

The previous resolved analysis and completed execution are copied into `Case.decisionCycleHistory` **before** `analysisResult` is overwritten. Apply then moves lifecycle via `updateCaseLifecycle` and clears the *active* execution fields. History is not deleted.

See `docs/architecture/case-execution.md`.

---

## Execution (Stage 1)

See `docs/architecture/case-execution.md`.

FO Brain is not a task-management system. After a decision is resolved, a case may carry **one current execution step** (`executionStep`, `executionOwner`, `executionStatus`, `executionUpdatedAt`).

```text
Decision Resolution  →  Execution  →  Completion  →  Human-confirmed Case Closure
```

These remain separate. Completing the step does not auto-close the case. Closing still goes through `updateCaseLifecycle`. If a resolved decision later becomes unresolved, a pending step stays stored and is marked for human review.
