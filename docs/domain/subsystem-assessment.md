# Subsystem Assessment

Version: 1.0
Status: Approved Draft
Owner: FO Brain

---

# Purpose

A `SubsystemAssessment` captures the analysis of a single operational domain within an OperationalBrief.

Examples of subsystems include:

- Finance
- Legal
- Real Estate
- Lifestyle
- Security
- HR
- Travel
- Technology
- Tax
- Compliance
- Health (coordination only, not medical advice)

Multiple Subsystem Assessments together form the Operational Picture used by the Decision Engine.

---

# Definition

A Subsystem Assessment records:

- the subsystem being analysed;
- its current state;
- findings;
- risks;
- dependencies;
- unknowns;
- assumptions;
- opportunities;
- recommended actions.

It is analytical, not authoritative.

---

# Identity

Each assessment contains:

- assessmentId
- briefId
- subsystem
- version
- createdAt
- createdBy
- status

---

# Status

Allowed values:

- Draft
- Reviewed
- Final

Only Final assessments may contribute to a published Operational Picture.

---

# Structure

## Scope

Defines what is included and excluded.

## Current State

Objective description of the subsystem.

## Findings

Verified observations.

Each finding should include:

- description
- evidence
- severity
- confidence

## Risks

Material risks affecting this subsystem.

Each risk includes:

- description
- likelihood
- impact
- owner
- mitigation

## Dependencies

Internal and external dependencies.

Examples:

- vendors
- approvals
- funding
- regulations
- people
- technology

## Assumptions

Explicit assumptions used during analysis.

## Unknowns

Questions that prevent reliable conclusions.

## Opportunities

Potential improvements or strategic advantages.

## Recommended Actions

Suggested actions relevant to this subsystem only.

## Confidence

Overall confidence level supported by available evidence.

---

# Relationship to Operational Picture

The Operational Picture is produced by combining multiple Final Subsystem Assessments.

Conflicting assessments must remain visible until resolved.

No assessment may overwrite another subsystem.

---

# Cross-Subsystem Dependencies

Assessments may reference dependencies across domains.

Example:

Legal approval required before Finance can release funds.

Such dependencies should be explicit and traceable.

---

# Validation Rules

A valid assessment requires:

- existing OperationalBrief
- subsystem identifier
- current state
- findings or justified absence
- evidence references
- confidence level
- version consistency

---

# Domain Events

Typical events:

- SubsystemAssessmentCreated
- SubsystemAssessmentReviewed
- SubsystemAssessmentFinalised

Events include:

- assessmentId
- briefId
- subsystem
- actor
- timestamp
- correlationId

---

# Failure Behaviour

Suggested error codes:

- INVALID_SUBSYSTEM
- MISSING_SCOPE
- INSUFFICIENT_EVIDENCE
- VERSION_CONFLICT

Failed commands emit no Domain Event.

---

# AI Boundary

The Decision Engine may:

- analyse subsystem evidence;
- identify risks and dependencies;
- compare assessments;
- highlight conflicts;
- recommend additional investigation.

The Decision Engine must not:

- fabricate evidence;
- mark an assessment Final;
- hide conflicting assessments.

---

# Invariants

1. One assessment describes one subsystem.
2. Assessments are evidence-based.
3. Final assessments contribute to the Operational Picture.
4. Conflicting assessments remain visible until resolved.
5. Assessments are immutable once finalised.
6. New evidence creates a new version.
7. AI may analyse but not approve assessments.
8. Cross-subsystem dependencies must be explicit and traceable.
