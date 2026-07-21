# Facts

Version: 1.0
Status: Approved Draft
Owner: FO Brain

---

# Purpose

A Fact represents information accepted by the business as true at a specific point in time.

Facts are one of the core building blocks of the Operational Brief.

Facts describe reality.

They never describe assumptions, opinions or recommendations.

---

# Fact Lifecycle

Draft Fact
    ↓
Confirmed Fact
    ↓
Superseded Fact

A Draft Fact may also become Rejected.

---

# Draft Fact

A Draft Fact is information that has not yet been verified.

It may originate from:

- AI extraction
- User input
- Email
- WhatsApp
- Document
- Phone call summary
- Expert assessment

Draft Facts must never be treated as business truth.

---

# Confirmed Fact

A Confirmed Fact is supported by sufficient evidence or confirmed by an authorised user.

Every Confirmed Fact must contain:

- Fact ID
- Statement
- Source
- Confirmed By
- Confirmed At

Confirmed Facts are immutable.

---

# Superseded Fact

A Confirmed Fact is never edited.

If reality changes:

1. mark the existing Fact as Superseded
2. create a new Confirmed Fact

History must always be preserved.

---

# Source

Every Fact must reference its provenance.

Examples:

- Email
- WhatsApp
- Expert Report
- Legal Opinion
- Principal
- House Manager

Facts without provenance are invalid.

---

# Business Rules

- Facts describe reality.
- Facts never contain recommendations.
- Facts never contain assumptions.
- AI may propose Facts but cannot confirm them.
- Every Fact belongs to exactly one Operational Brief.

---

# Relationship to Other Objects

Fact != Assumption

Fact != Recommendation

Fact != Outcome

Facts provide evidence for decisions but are not decisions themselves.

---

# Success Criteria

A high-quality Fact is:

- true
- traceable
- immutable
- understandable
- supported by evidence
