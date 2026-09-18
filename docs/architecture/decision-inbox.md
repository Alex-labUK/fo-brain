# Decision Inbox / Attention Queue

Version: 1.0  
Status: Implementation note  
Path: `docs/architecture/decision-inbox.md`

**Требует внимания** is the Head of Family Office operating layer: *what requires my attention now?* It is not a task list, CRM inbox, notification feed, reminder system, or project board.

## Source of truth

The case remains the source of truth. Inbox items are **derived at read time** from current case state. Nothing is persisted.

No Task / InboxItem / Notification / Assignment model. No due dates, reminders, checklists, or extra AI calls.

## One primary item per case

A case may have several signals. The inbox shows **one** primary `DecisionAttentionItem`. Precedence:

1. `reopen`
2. `principal_decision`
3. `ready_to_close`
4. `execution`
5. `state_review`
6. `third_party`
7. `missing_fact`
8. `analysis_needed`
9. `monitoring` (only with a concrete watch condition; ordinary monitoring is omitted)

`state_review` is only for a few clear current-state contradictions, and only when no stronger real action exists:

- resolved analysis + `waiting_for_fact`
- resolved analysis + `waiting_for_principal` while current `decisionAuthority.owner` is not Principal
- `executionStatus = completed` + lifecycle still `executing`, when the case is not otherwise `ready_to_close`

It does not auto-fix lifecycle. It does not invent a fake `missing_fact`.

Kind rank is the primary sort. Then existing case priority (`urgent` / `soon` / `normal`), then recency, then title/id. Reopen and Principal outrank generic urgent operational work. Priority never creates an item by itself.

## Surfaces

- Home `/` — Decision Inbox
- `/cases` — Decisions Register (browse / search / filter / archive)
- `/cases/[id]` — Decision Workspace (the only place Inbox v1 navigates to mutate)

Inbox v1 only navigates (`Открыть кейс`). Close, capture Principal, complete execution, reopen, and lifecycle changes stay on the case page.

## Stale-data protections

- Reopen only if `visibleReopenSuggestion` matches the current analysisKey
- Principal only from **current** `decisionAuthority.owner === "principal"`, not from `waiting_for_principal` lifecycle alone
- Historical `principalDecision` from another `analysisKey` does not suppress a new Principal item
- Lifecycle / reopen suggestions with the wrong analysisKey are ignored
- Decision Support, Decision Challenge, precedent, and principles do not create inbox items

## Principal capture + failed re-analysis

If `principalDecision` is stored for the **current** analysisKey and current authority is still Principal, Inbox keeps a `principal_decision` item with headline **Решение Principal сохранено — нужно обновить разбор**.

FO Brain cannot distinguish “AI continue failed” from “AI succeeded but still asks Principal” after reload. Both look like: current-cycle capture exists and authority is still Principal. That derived state stays in Inbox on purpose.
