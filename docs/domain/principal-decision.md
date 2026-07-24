# Principal Decision

Version: 1.0
Status: Approved Draft
Owner: FO Brain

---

# Purpose

`PrincipalDecision` records an authorised human decision for an `OperationalBrief`.

It is the formal boundary between advisory analysis and authorised action.

A Principal Decision may be informed by one or more Recommendations, but it is never created automatically by the Decision Engine.

---

# Definition

A Principal Decision records:

- what was decided;
- who decided it;
- when it was decided;
- why it was decided;
- which Recommendations or evidence informed it;
- whether execution is required;
- any conditions, limits, or delegated authority.

---

# Identity

Each Principal Decision contains:

- decisionId
- briefId
- version
- decidedAt
- decidedBy
- authorityBasis
- status

---

# Status

Allowed values:

- Active
- Superseded
- Cancelled
- Completed

`Active` means the decision is currently authoritative.

`Superseded` means a later decision replaced it.

`Cancelled` means the authority was withdrawn before completion.

`Completed` means the authorised action was fully carried out or the decision required no further execution.

---

# Decision Types

## Recommendation-Based Decision

References one or more Recommendations and records which option was selected.

## Manual Decision

Records an authorised decision made without a formal Recommendation.

Manual Decisions must still include rationale and relevant context.

## Delegated Decision

Records a decision made under explicitly delegated authority.

The delegation source and scope must be recorded.

---

# Structure

## Decision Statement

Clear description of what has been decided.

## Rationale

Why the decision was taken.

## Selected Recommendation

Optional reference to the accepted Recommendation.

## Rejected Alternatives

Optional references to Recommendations or options not selected.

## Conditions

Conditions that must be satisfied before or during execution.

## Constraints

Legal, financial, timing, operational, or policy limits.

## Execution Requirement

Indicates whether execution is required.

## Effective Date

When the decision becomes effective.

## Expiry or Review Date

Optional date after which the decision must be reviewed or expires.

## Delegation

Optional delegated authority details:

- delegatedBy
- delegatedTo
- scope
- limits
- expiry

---

# Authority Rules

A Principal Decision may only be recorded by an authorised actor.

The actor must have:

- direct authority; or
- valid delegated authority.

The Decision Engine may prepare decision context but may not record, approve, supersede, or cancel a Principal Decision.

---

# Relationship to Recommendations

A Principal Decision may:

- accept one Recommendation;
- combine elements from several Recommendations;
- reject all Recommendations;
- record a Manual Decision.

Accepting a Recommendation does not modify the Recommendation.

The Decision must explicitly reference the Recommendation version used.

---

# Relationship to Execution

Execution may begin only when:

- an Active Principal Decision exists;
- execution is required;
- all mandatory conditions are satisfied.

Execution does not change the historical Decision.

Operational progress is recorded separately.

---

# Immutability

A recorded Principal Decision is immutable.

Corrections require a new Decision version or a superseding Decision.

Historical decisions must never be silently edited.

---

# Superseding a Decision

A Decision may be superseded when:

- new facts emerge;
- assumptions become invalid;
- constraints change;
- a Principal changes direction;
- execution reveals material issues.

A superseding Decision must reference the previous Decision and record the reason for replacement.

---

# Cancelling a Decision

A Decision may be cancelled when authority is withdrawn before completion.

Cancellation must record:

- cancelledBy
- cancelledAt
- reason
- execution impact
- continuing obligations

Cancellation does not delete the original Decision.

---

# Completion

A Decision may be marked Completed when:

- authorised execution is complete; or
- no execution was required and the decision has taken effect.

Completion must not erase unresolved risks or lessons.

---

# Domain Events

Typical events:

- PrincipalDecisionRecorded
- PrincipalDecisionSuperseded
- PrincipalDecisionCancelled
- PrincipalDecisionCompleted

Events must include:

- decisionId
- briefId
- actor
- timestamp
- correlationId

---

# Validation Rules

A valid Principal Decision requires:

- existing OperationalBrief
- authorised actor
- decision statement
- rationale
- authority basis
- status
- execution requirement
- immutable version

When based on a Recommendation, the referenced Recommendation must exist and the version must match.

---

# Failure Behaviour

Suggested error codes:

- UNAUTHORISED_DECISION_MAKER
- INVALID_DELEGATION
- INVALID_DECISION
- MISSING_RATIONALE
- RECOMMENDATION_NOT_FOUND
- RECOMMENDATION_VERSION_MISMATCH
- DECISION_ALREADY_SUPERSEDED
- DECISION_ALREADY_CANCELLED
- INVALID_DECISION_STATUS
- VERSION_CONFLICT

A failed command must emit no Domain Event.

---

# AI Boundary

The Decision Engine may:

- explain options
- compare Recommendations
- surface risks
- prepare decision context
- draft a decision statement for review

The Decision Engine must not:

- approve a Recommendation
- record a Principal Decision
- impersonate an authorised actor
- supersede or cancel a Decision
- initiate execution without authority

---

# Invariants

1. Principal Decisions are human-authorised.
2. AI cannot create, approve, supersede, or cancel a Principal Decision.
3. Decisions are immutable once recorded.
4. Changes require superseding or cancelling events.
5. Recommendations remain advisory.
6. Execution requires an Active Decision.
7. Delegated authority must be explicit and valid.
8. Historical Decisions remain auditable.
9. A Decision may exist without a Recommendation.
10. Decision completion does not erase residual risks, obligations, or lessons.
