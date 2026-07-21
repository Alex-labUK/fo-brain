# Operational Brief Invariants

Version: 1.0
Status: Approved Draft
Owner: FO Brain

---

# Purpose

This document defines the business invariants of the `OperationalBrief` aggregate.

An invariant is a business rule that must always remain true.

These rules are independent of UI, AI, API, database or implementation details.

If an implementation violates an invariant, the implementation is incorrect.

---

# General Invariants

## INV-001 — Single Operational Change

One Operational Change produces exactly one Operational Brief.

A Brief never represents multiple independent operational changes.

## INV-002 — Single Source of Truth

Operational Brief is the authoritative representation of the current operational picture.

Historical states are preserved in the Timeline, not in the current state.

## INV-003 — Traceability

Every business modification must record:

- timestamp
- actor
- source
- reason

Silent updates are forbidden.

---

# Lifecycle Invariants

## INV-100 — Valid Status

Every Operational Brief always has exactly one lifecycle status.

Status may never be null.

## INV-101 — Valid Status Transitions

Created
→ Understanding
→ Assessing
→ Monitoring or Decision Ready
Decision Ready → Awaiting Principal
Awaiting Principal → Executing
Monitoring → Executing
Executing → Resolved

Only these transitions are valid.

## INV-102 — Terminal State

Resolved is a terminal business state.

Business information may not be modified after resolution.

Administrative corrections remain allowed.

---

# Facts

## INV-200 — Source Required

Every Confirmed Fact must reference its origin.

## INV-201 — Confirmed Facts Are Immutable

Confirmed Facts cannot be edited.

They may only be superseded by newer confirmed facts.

## INV-202 — Draft Facts

Draft Facts become either Confirmed or Rejected.

---

# Unknowns

## INV-300 — Unknown Is Valid

Unknown information is a valid part of the operational picture.

## INV-301 — Unknown Resolution

Unknowns remain until resolved, cancelled or no longer relevant.

---

# Assumptions

## INV-400 — Assumptions Never Become Facts Automatically

Evidence is always required.

AI confidence is never sufficient.

---

# Outcome

## INV-500 — Outcome Represents Result

Outcome describes the desired operational state, never an action.

## INV-501 — Outcome Lock

After Execution starts, Outcome becomes locked.

---

# Recommendation

## INV-600 — Recommendation Is Optional

Operational Brief may exist without recommendation.

---

# Principal Decision

## INV-700 — Decision Context

Principal Decision may exist only after Decision Ready.

## INV-701 — Single Active Decision

Only one active decision request may exist.

---

# Timeline

## INV-800 — Append Only

Timeline entries are never edited or deleted.

## INV-801 — Business Events

Every significant business action creates a Timeline entry.

---

# AI

## INV-900 — AI Cannot Confirm Facts

AI may suggest but never confirm facts automatically.

## INV-901 — AI Confidence

Confidence affects prioritisation only.

It never determines business truth.

---

# Aggregate Consistency

Operational Brief owns:

- Situation
- Facts
- Unknowns
- Assumptions
- Timeline
- Active Subsystems
- Recommendation
- Decision Layer

The aggregate must remain transactionally consistent after every operation.
