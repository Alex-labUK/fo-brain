# Recommendation

Version: 1.0
Status: Approved Draft
Owner: FO Brain

---

# Purpose

A Recommendation is the proposed course of action produced from the current
Operational Picture.

It answers the question:

"What should we do next?"

Recommendations help the Principal or operator make better decisions.

They are not decisions themselves.

---

# Definition

A Recommendation is generated after evaluating:

- Confirmed Facts
- Unknowns
- Assumptions
- Outcome
- Expert Assessments
- Operational Constraints

A Recommendation should always be explainable.

---

# Lifecycle

Draft
    ↓
Proposed
    ↓
Updated
    ↓
Accepted

or

Proposed
    ↓
Rejected

or

Proposed
    ↓
Withdrawn

---

# Required Fields

Every Recommendation contains:

- Recommendation ID
- Statement
- Rationale
- Status
- Created At
- Created By

---

# Rationale

Every Recommendation must explain:

- Why this recommendation exists.
- Which Facts support it.
- Which Unknowns increase uncertainty.
- Which Assumptions influence it.
- Which Outcome it is intended to achieve.

---

# Business Rules

- Every Recommendation belongs to exactly one Operational Brief.
- Recommendations are optional.
- Multiple Recommendations may coexist.
- Only one Recommendation may be marked as Primary.
- Recommendations may change while analysis is in progress.
- Recommendations do not bind the Principal.

---

# Relationship to Other Objects

Recommendation != Decision

Recommendation != Outcome

Recommendation != Task

Recommendations are proposals intended to achieve the Outcome.

The Principal Decision may accept, reject or modify a Recommendation.

---

# Success Criteria

A high-quality Recommendation is:

- evidence-based
- understandable
- actionable
- aligned with the Outcome
- transparent about uncertainty
