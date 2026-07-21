# Unknowns

Version: 1.0
Status: Approved Draft
Owner: FO Brain

---

# Purpose

An Unknown represents information that is required but not yet available.

Unknowns are first-class business objects.

The absence of information is itself important operational information.

Unknowns help prevent premature decisions.

---

# Definition

An Unknown is a clearly formulated question that must be answered before the Operational Picture is considered complete.

Unknowns are never failures.

They simply represent gaps in current knowledge.

---

# Lifecycle

Recorded
    ↓
Investigating
    ↓
Resolved

or

Recorded
    ↓
Cancelled

---

# Required Fields

Every Unknown contains:

- Unknown ID
- Question
- Reason
- Priority
- Status
- Created At
- Created By

---

# Resolution

A Resolved Unknown must contain:

- Resolution
- Evidence
- Resolved At
- Resolved By

Resolving an Unknown may create one or more Confirmed Facts.

---

# Cancellation

Unknowns may be cancelled when:

- they are no longer relevant
- the Operational Change has evolved
- another Unknown already answers the question

Cancelled Unknowns remain in history.

---

# Business Rules

- Unknowns are explicit.
- Unknowns never become Facts automatically.
- Every Unknown belongs to exactly one Operational Brief.
- Unknowns may change priority over time.
- Unknowns may trigger additional subsystem involvement.

---

# Relationship to Other Objects

Unknown != Fact

Unknown != Assumption

Unknown != Recommendation

Resolving an Unknown may validate an Assumption or create a new Confirmed Fact.

---

# Priority

Recommended priorities:

- Critical
- High
- Medium
- Low

Priority reflects operational impact, not implementation effort.

---

# Success Criteria

A high-quality Unknown is:

- specific
- answerable
- traceable
- relevant
- actionable
