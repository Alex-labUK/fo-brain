# Analysis Result

Version: 1.0
Status: Approved Draft
Owner: FO Brain

---

# Purpose

`AnalysisResult` is the immutable output produced by one Decision Engine execution.

It represents the analytical understanding of one `OperationalBrief` at a specific aggregate version.

It never mutates domain state.

---

# Identity

- analysisId
- briefId
- briefVersion
- engineVersion
- engineConfigurationVersion
- requestedAt
- completedAt
- requestedBy
- correlationId

---

# Lifecycle

Requested → Running → Completed | Blocked | Incomplete | Failed

Completed results are immutable.

---

# Structure

## Operational Picture

Explains what is happening, why it matters, priorities, constraints and active subsystems.

## Findings

Each finding contains statement, rationale, significance, supporting references and confidence.

## Contradictions

Lists conflicting information and proposed resolution.

## Risks

Probability, impact, urgency, mitigation and residual risk.

## Dependencies

People, systems, approvals, timing and external events.

## Missing Information

Information still required before reliable recommendations.

## Questions

Questions recommended by the engine.

## Recommendation Proposals

Advisory recommendations including intended outcome, rationale, supporting facts, unknowns, assumptions, risks, constraints and confidence.

## Decision Context

Optional context for a future Principal Decision.

---

# Traceability

Every material statement must reference supporting Facts, Unknowns, Assumptions, Evidence or previous analytical objects.

---

# AI Boundary

The Decision Engine may analyse, infer, explain and propose.

It must not confirm facts, record recommendations, record principal decisions, execute commands or mutate the OperationalBrief.

---

# Invariants

1. Immutable.
2. Never modifies the OperationalBrief.
3. Analyses exactly one aggregate version.
4. Every conclusion is traceable.
5. Facts, Unknowns and Assumptions remain separate.
6. Produces no Domain Events.
7. AI proposals require validated Commands.
8. Principal Decisions remain human-authorised.
