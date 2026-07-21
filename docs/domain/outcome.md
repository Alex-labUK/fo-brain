# Outcome

Version: 1.0
Status: Approved Draft
Owner: FO Brain

---

# Purpose

An Outcome defines the desired operational result.

It answers one question:

"What should be true when this Operational Change is successfully resolved?"

Outcome is the destination, not the journey.

---

# Definition

An Outcome describes the future operational state that the organisation intends to achieve.

It is independent from implementation details.

It never describes tasks.

---

# Examples

Correct:

- Property is safe and fully operational.
- Tenant has received a formal response.
- Principal has enough information to make a decision.

Incorrect:

- Call the engineer.
- Send an email.
- Book a flight.

Those are actions, not outcomes.

---

# Lifecycle

Draft
    ↓
Defined
    ↓
Updated
    ↓
Locked
    ↓
Achieved

or

Locked
    ↓
Not Achieved

---

# Required Fields

Every Outcome contains:

- Outcome ID
- Statement
- Status
- Defined By
- Defined At

---

# Business Rules

- Every Operational Brief has one primary Outcome.
- Outcome describes a result, never an action.
- Outcome may evolve during analysis.
- Outcome becomes locked when execution starts.
- Changing a locked Outcome requires a new Operational Change.

---

# Relationship to Other Objects

Outcome != Recommendation

Outcome != Decision

Outcome != Task

Recommendations and Decisions exist to achieve the Outcome.

---

# Success Criteria

A high-quality Outcome is:

- measurable
- understandable
- business-oriented
- independent of implementation
- verifiable
