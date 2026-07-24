# Recommendation

Version: 1.0
Status: Approved Draft
Owner: FO Brain

---

# Purpose

`Recommendation` is a structured proposal describing one possible course of action for an `OperationalBrief`.

A Recommendation bridges analytical understanding (`AnalysisResult`) and an authorised `PrincipalDecision`.

A Recommendation is advisory. It has no authority to change domain state by itself.

---

# Definition

A Recommendation describes:

- what should be done;
- why it should be done;
- expected outcome;
- assumptions;
- constraints;
- risks;
- dependencies;
- trade-offs.

Multiple Recommendations may coexist for the same Operational Brief.

---

# Identity

Each Recommendation contains:

- recommendationId
- briefId
- sourceAnalysisId
- version
- createdAt
- createdBy
- status

---

# Status

Allowed values:

- Draft
- Active
- Superseded
- Withdrawn
- Accepted
- Rejected

Only one Recommendation may become the basis for a Principal Decision, but multiple Active recommendations may exist for comparison.

---

# Structure

## Summary

A concise description of the proposed course of action.

## Intended Outcome

The operational objective expected if the recommendation is followed.

## Rationale

Why this recommendation is preferred.

## Supporting Facts

References to confirmed Facts supporting the proposal.

## Material Unknowns

Unknowns that could materially affect success.

## Material Assumptions

Assumptions required for the recommendation to remain valid.

## Constraints

Operational, legal, financial, timing or policy constraints.

## Risks

Material risks together with proposed mitigations.

## Dependencies

Required approvals, people, systems, vendors or external events.

## Trade-offs

Explicit advantages and disadvantages.

Trade-offs must never be hidden.

## Alternatives

Optional references to competing Recommendations.

## Confidence

An analytical confidence estimate.

Confidence does not imply authority or correctness.

---

# Relationship to AnalysisResult

A Recommendation should reference exactly one source AnalysisResult.

If the AnalysisResult becomes stale, the Recommendation must be reviewed before use.

---

# Relationship to PrincipalDecision

A Recommendation is never a Principal Decision.

Flow:

AnalysisResult
→ Recommendation
→ Human Review
→ PrincipalDecision

The Decision Engine may generate Recommendations.

Only an authorised actor may record a Principal Decision.

---

# Revision Rules

Recommendations are immutable once created.

Changes require a new Recommendation version.

Previous versions remain available for audit.

---

# Comparison

Recommendations may be compared using:

- expected outcome
- risk
- cost
- urgency
- feasibility
- dependency complexity
- reversibility
- uncertainty

The comparison must preserve each Recommendation independently.

---

# Validation Rules

A valid Recommendation requires:

- source OperationalBrief
- source AnalysisResult
- rationale
- intended outcome
- supporting facts
- identified risks
- identified assumptions
- status

---

# Failure Behaviour

Invalid recommendations must be rejected before persistence.

Suggested error codes:

- INVALID_RECOMMENDATION
- MISSING_RATIONALE
- MISSING_ANALYSIS_RESULT
- STALE_ANALYSIS_RESULT
- INVALID_STATUS

---

# Invariants

1. A Recommendation never changes the OperationalBrief.
2. A Recommendation is advisory.
3. Recommendations originate from analytical work.
4. Multiple Recommendations may coexist.
5. Trade-offs must remain explicit.
6. Recommendations are versioned.
7. Accepted does not mean executed.
8. Only a PrincipalDecision authorises execution.
