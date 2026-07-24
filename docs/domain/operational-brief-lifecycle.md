# Operational Brief Lifecycle

Version: 1.0  
Status: Approved Draft  
Owner: FO Brain

---

# Purpose

This document defines the lifecycle of the `OperationalBrief` aggregate.

It separates:

- **aggregate status** — whether the brief is open, closed, or archived;
- **workflow phase** — where the brief currently sits in the decision flow.

This prevents analytical progress from being confused with the legal state of the aggregate.

---

# Aggregate Status

An Operational Brief has exactly one aggregate status.

## `Open`

The brief may accept authorised commands and continue through the decision flow.

## `Closed`

The brief is no longer active because the required decision, execution, outcome, or authorised closure condition has been completed.

A closed brief preserves its full history.

## `Archived`

The brief is retained for audit, learning, and reference but is not available for normal operational change.

Archiving does not delete or rewrite history.

---

# Workflow Phase

An open Operational Brief has one current workflow phase.

## `Intake`

The brief has been created and initial context is being recorded.

Typical work:

- define the request;
- record the Objective;
- record Constraints;
- attach Evidence;
- establish ownership and urgency.

## `Assessment`

The system is building the current Operational Picture.

Typical work:

- record Facts;
- identify Unknowns;
- record Assumptions;
- obtain Subsystem Assessments;
- identify risks, dependencies, and missing information;
- request, accept, reject, or supersede an Operational Picture.

## `Recommendation`

The accepted Operational Picture is being converted into one or more proposed courses of action.

Typical work:

- request a Recommendation;
- record a Recommendation;
- compare Recommendations;
- revise or withdraw a Recommendation.

## `Decision`

An authorised human decision is required or has been submitted for recording.

Typical work:

- approve or reject a Recommendation;
- record a Manual Decision;
- supersede or cancel a Decision.

AI must never make or record the final business decision on behalf of the authorised human.

## `Execution`

An authorised Decision is being implemented.

Typical work:

- start execution;
- record execution updates;
- complete execution.

## `Resolution`

The observed Outcome and reusable learning are being recorded.

Typical work:

- record the Outcome;
- record Lessons;
- verify closure conditions;
- close the brief.

---

# Default Flow

```text
CreateBrief
    ↓
Open / Intake
    ↓
Assessment
    ↓
Recommendation
    ↓
Decision
    ↓
Execution
    ↓
Resolution
    ↓
Closed
    ↓
Archived
```

The flow is not strictly linear.

An open brief may return to an earlier phase when material information changes.

Examples:

- new Evidence may return a brief from `Recommendation` to `Assessment`;
- rejection of a Recommendation may return it from `Decision` to `Recommendation`;
- execution failure may return it from `Execution` to `Assessment`, `Recommendation`, or `Decision`;
- a changed Objective may invalidate the current Operational Picture and Recommendation.

---

# Status Transitions

| Current status | Command | New status | Event |
|---|---|---|---|
| none | `CreateBrief` | `Open` | `BriefCreated` |
| `Open` | `CloseBrief` | `Closed` | `BriefClosed` |
| `Closed` | `ReopenBrief` | `Open` | `BriefReopened` |
| `Closed` | `ArchiveBrief` | `Archived` | `BriefArchived` |

An archived brief cannot return to normal operation through an implicit update.

Any future unarchive behavior must be introduced as an explicit domain command and event.

---

# Phase Progression

Workflow phases are projections of accepted domain state.

They must not be advanced by arbitrary UI actions.

## Enter `Assessment`

The brief may enter `Assessment` when:

- an Objective exists;
- sufficient initial context exists to begin analysis.

## Enter `Recommendation`

The brief may enter `Recommendation` when:

- an accepted Operational Picture exists;
- critical Unknowns are resolved or explicitly accepted as residual uncertainty.

## Enter `Decision`

The brief may enter `Decision` when:

- at least one active Recommendation exists; or
- an authorised Manual Decision is being recorded.

## Enter `Execution`

The brief may enter `Execution` when:

- an authorised Decision exists;
- execution has been explicitly started.

## Enter `Resolution`

The brief may enter `Resolution` when:

- execution is complete; or
- no execution is required and an authorised Outcome can be recorded.

---

# Closure Rules

`CloseBrief` must fail unless the authorised closure conditions are satisfied.

Closure requires:

- a closure reason;
- the final workflow phase;
- the current Outcome state;
- any unresolved material Unknowns;
- any residual Risks;
- any continuing obligations;
- the actor and time of closure.

A brief may be closed without execution only when the authorised decision or operational conclusion requires no execution.

Closing a brief must not:

- delete unresolved information;
- mark assumptions as facts;
- rewrite Recommendations or Decisions;
- imply that all risks disappeared;
- erase incomplete or unsuccessful outcomes.

---

# Reopening Rules

`ReopenBrief` is allowed only when:

- the brief is `Closed`;
- new material information, a new authorised request, or a continuing obligation requires further work;
- the reason for reopening is recorded.

Reopening:

- returns the aggregate status to `Open`;
- preserves the previous closure;
- creates a new lifecycle event;
- restores the workflow phase required by the new context.

The reopened phase must be derived from the reason for reopening, not automatically reset to `Intake`.

---

# Archive Rules

`ArchiveBrief` is allowed only when:

- the brief is `Closed`;
- no active operational work remains;
- retention and access requirements are satisfied.

Archiving:

- preserves the complete event history;
- prevents normal state-changing commands;
- does not remove the brief from audit, reporting, or learning projections.

---

# Invariants

1. `OperationalBrief` is the lifecycle owner.
2. Every brief has exactly one aggregate status.
3. Every open brief has exactly one current workflow phase.
4. Only validated Commands may change aggregate state.
5. Every successful lifecycle change emits the corresponding Domain Event.
6. Invalid Commands change neither state nor history.
7. Confirmed historical information is never silently rewritten.
8. Closed briefs accept no normal mutation commands.
9. Archived briefs are read-only.
10. Reopening preserves prior closure and decision history.
11. A Recommendation is not a Decision.
12. AI may propose lifecycle-related commands but may not approve Recommendations, record final Decisions, or bypass validation.

---

# Failure Behaviour

A rejected lifecycle command must return a structured domain error.

Suggested error codes:

- `BRIEF_NOT_FOUND`
- `INVALID_BRIEF_STATUS`
- `INVALID_WORKFLOW_PHASE`
- `CLOSURE_CONDITIONS_NOT_MET`
- `REOPEN_REASON_REQUIRED`
- `ARCHIVE_CONDITIONS_NOT_MET`
- `BRIEF_ALREADY_CLOSED`
- `BRIEF_ALREADY_ARCHIVED`
- `UNAUTHORISED_ACTOR`
- `VERSION_CONFLICT`

No Domain Event may be emitted for a failed command.

---

# Implementation Rule

Aggregate status is persisted as authoritative domain state.

Workflow phase may be persisted or projected, but it must always be derivable from accepted aggregate state and Domain Events.

UI labels, task statuses, and external system states must not redefine this lifecycle.
