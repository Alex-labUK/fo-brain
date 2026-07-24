# Outcome

Version: 1.0
Status: Approved Draft
Owner: FO Brain

---

# Purpose

`Outcome` records the verified result of an Execution.

It captures whether the authorised objective was achieved, what actually happened, what was learned, and what should influence future decisions.

Outcome is the organisational learning boundary of FO Brain.

---

# Definition

An Outcome records:

- the result achieved;
- comparison between expected and actual outcomes;
- evidence supporting the result;
- residual risks and obligations;
- lessons learned;
- follow-up actions;
- whether a new OperationalBrief should be created.

---

# Identity

Each Outcome contains:

- outcomeId
- briefId
- executionId
- decisionId
- version
- recordedAt
- recordedBy
- status

---

# Status

Allowed values:

- Draft
- Verified
- Superseded

Only a Verified Outcome may be used as organisational knowledge.

---

# Outcome Classification

- Successful
- Partially Successful
- Unsuccessful
- Inconclusive

Classification must be justified by evidence.

---

# Structure

## Objective

The intended objective authorised by the Principal Decision.

## Actual Result

A factual description of what occurred.

## Objective Assessment

Comparison between expected and actual results.

## Evidence

Evidence supporting the recorded outcome.

Examples:

- reports
- contracts
- inspections
- confirmations
- measurements
- photographs
- financial records

## Deviations

Material differences between plan and reality.

Each deviation may include:

- description
- cause
- impact
- corrective action

## Benefits Realised

Expected and unexpected positive results.

## Negative Side Effects

Material adverse consequences observed after execution.

## Residual Risks

Risks that remain after execution.

Each risk should include:

- description
- severity
- owner
- monitoring requirement

## Continuing Obligations

Responsibilities that continue after execution.

## Lessons Learned

Lessons extracted from the case.

Each lesson should include:

- observation
- root cause
- recommendation
- applicability
- confidence

Lessons should be reusable beyond the originating case.

## Follow-up Actions

Recommended actions arising from the Outcome.

Each action may:

- create a new OperationalBrief;
- extend the current Brief;
- require monitoring;
- require periodic review.

---

# Relationship to Execution

Outcome may be recorded only after sufficient execution evidence exists.

An Outcome evaluates execution.

It does not change historical execution records.

---

# Relationship to OperationalBrief

An OperationalBrief may accumulate multiple Outcomes over its lifecycle.

Where a new operational problem is identified, a new OperationalBrief should be created rather than rewriting the historical case.

---

# Organisational Learning

Only Verified Outcomes contribute to organisational knowledge.

Knowledge extraction must preserve:

- context;
- assumptions;
- constraints;
- evidence;
- confidence.

Lessons must never be detached from their supporting evidence.

---

# Verification

Verification should confirm:

- evidence is sufficient;
- classification is justified;
- lessons are supported;
- residual risks are identified;
- follow-up actions are appropriate.

Verification actor should be recorded.

---

# Domain Events

Typical events:

- OutcomeRecorded
- OutcomeVerified
- OutcomeSuperseded
- LessonsCaptured
- FollowUpCreated

Events should include:

- outcomeId
- briefId
- executionId
- actor
- timestamp
- correlationId
- aggregateVersion

---

# Validation Rules

A valid Outcome requires:

- existing Execution;
- existing Principal Decision;
- actual result;
- evidence;
- outcome classification;
- recorded actor;
- version consistency.

Verified Outcomes additionally require successful verification.

---

# Failure Behaviour

Suggested error codes:

- EXECUTION_NOT_FOUND
- OUTCOME_ALREADY_VERIFIED
- INSUFFICIENT_EVIDENCE
- INVALID_OUTCOME_CLASSIFICATION
- MISSING_LESSONS
- VERSION_CONFLICT

A failed command must emit no Domain Event.

---

# AI Boundary

The Decision Engine may:

- compare expected versus actual results;
- identify patterns;
- propose lessons;
- detect recurring failures;
- recommend follow-up actions.

The Decision Engine must not:

- fabricate evidence;
- verify an Outcome;
- claim objectives were achieved without evidence;
- rewrite historical records.

---

# Invariants

1. Outcome records verified reality, not intention.
2. Outcome is supported by evidence.
3. Verified Outcomes become organisational knowledge.
4. Lessons remain linked to evidence and context.
5. Historical Outcomes are immutable.
6. New facts require a superseding Outcome, not silent edits.
7. Residual risks remain visible after completion.
8. Follow-up actions may initiate new OperationalBriefs.
9. AI may analyse Outcomes but may not verify them.
10. Organisational learning must be traceable and auditable.
