# Assumptions

Version: 1.0
Status: Approved Draft
Owner: FO Brain

---

# Purpose

An Assumption represents a statement that is believed to be true but has not yet
been confirmed by sufficient evidence.

Assumptions reduce uncertainty during analysis but must never be treated as facts.

---

# Definition

An Assumption fills a knowledge gap when a decision or assessment cannot wait for
complete information.

Every Assumption has an explicit confidence level and rationale.

---

# Lifecycle

Recorded
    ↓
Reviewing
    ├──────────────┐
    ↓              ↓
Validated      Rejected

Validated assumptions produce one or more Confirmed Facts.

Rejected assumptions remain part of history.

---

# Required Fields

Every Assumption contains:

- Assumption ID
- Statement
- Rationale
- Confidence
- Status
- Created At
- Created By

---

# Confidence

Recommended confidence levels:

- Low
- Medium
- High

Confidence is a prioritisation aid.

Confidence is never evidence.

---

# Validation

A validated Assumption must include:

- Supporting evidence
- Validated By
- Validated At
- Resulting Confirmed Fact(s)

Validation never edits the original Assumption.

---

# Rejection

Rejected Assumptions must record:

- Reason
- Evidence
- Rejected By
- Rejected At

Rejected Assumptions remain visible for learning and audit purposes.

---

# Business Rules

- Every Assumption belongs to exactly one Operational Brief.
- Assumptions are explicit.
- Assumptions never become Facts automatically.
- AI may create Assumptions.
- Only evidence or an authorised user may validate an Assumption.

---

# Relationship to Other Objects

Assumption != Fact

Assumption != Unknown

Assumption != Recommendation

Assumptions often originate from Unknowns and may eventually create Confirmed Facts.

---

# Success Criteria

A high-quality Assumption is:

- explicit
- testable
- traceable
- evidence-oriented
- easy to validate or reject
