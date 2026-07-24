# Decision Engine Contract

Version: 1.0  
Status: Approved Draft  
Owner: FO Brain

---

# Purpose

This document defines the contract between the FO Brain application layer and the Decision Engine.

The Decision Engine analyses the current state of one `OperationalBrief` and returns a structured analytical result.

It does not mutate the `OperationalBrief`, confirm business truth, make a Principal Decision, or execute external actions.

---

# Core Rule

```text
OperationalBrief state
        ↓
Decision Engine
        ↓
Analysis Result
        ↓
Authorised review
        ↓
Validated Commands
        ↓
OperationalBrief state change
```

AI output is advisory until accepted through the domain command model.

---

# Interface

```text
analyse(DecisionEngineInput) -> AnalysisResult
```

The operation must be deterministic with respect to the supplied input and declared engine configuration as far as the underlying model allows.

Every run must be independently traceable.

---

# Decision Engine Input

## Metadata

Each request contains:

- `analysisRequestId`
- `briefId`
- `briefVersion`
- `requestedAt`
- `requestedBy`
- `correlationId`
- `engineConfigurationVersion`
- requested analysis scope

## Operational Context

The engine may receive:

- title;
- request;
- urgency;
- Objective;
- Constraints;
- current workflow phase;
- aggregate status;
- current owner;
- relevant dates;
- active Subsystems.

## Knowledge Set

The engine may receive:

- confirmed Facts;
- disputed Facts;
- unresolved Unknowns;
- resolved Unknowns;
- active Assumptions;
- rejected Assumptions;
- attached Evidence references;
- answered and unanswered Questions.

## Existing Analytical State

The engine may receive:

- current Operational Picture;
- previous Operational Picture versions;
- accepted and rejected Analysis Findings;
- current and previous Recommendations;
- relevant Principal Decision history;
- execution state;
- recorded Outcomes;
- relevant Lessons.

## Scope

The request must identify one or more permitted analytical operations:

- build or refresh Operational Picture;
- identify material Risks;
- identify Dependencies;
- identify missing information;
- detect contradictions;
- generate Questions;
- generate Analysis Findings;
- propose Recommendations;
- compare Recommendations;
- explain rationale.

The engine must not perform work outside the requested scope unless the result explicitly marks it as supplementary.

---

# Analysis Result

Every successful or partially successful run returns one immutable `AnalysisResult`.

## Metadata

- `analysisId`
- `analysisRequestId`
- `briefId`
- `briefVersion`
- `engineVersion`
- `engineConfigurationVersion`
- `createdAt`
- `status`
- `scopeCompleted`

## Status

Allowed values:

- `completed`
- `incomplete`
- `blocked`
- `failed`

## Result Sections

The result may contain:

- proposed Operational Picture;
- proposed Analysis Findings;
- identified contradictions;
- proposed Unknowns;
- proposed Questions;
- proposed Assumptions;
- Risk assessment;
- Dependency assessment;
- missing information assessment;
- proposed Recommendations;
- Recommendation comparison;
- Principal Decision context;
- confidence;
- warnings;
- traceability references.

---

# Traceability

Every material analytical statement must identify its basis.

A result item should reference, where applicable:

- supporting Fact IDs;
- relevant Assumption IDs;
- relevant Unknown IDs;
- Evidence references;
- prior Finding IDs;
- Recommendation IDs;
- Decision IDs;
- model-generated inference marker.

The engine must distinguish:

```text
Confirmed source
Assumption
Inference
Unknown
Conflict
```

An inference must never be presented as a confirmed Fact.

---

# Operational Picture Rules

A proposed Operational Picture must:

- explain what is happening;
- identify what matters now;
- distinguish Facts, Unknowns, and Assumptions;
- identify material Constraints;
- identify active Subsystems;
- surface contradictions and missing information;
- state the limits of the current understanding.

The engine may draft an Operational Picture.

Only `AcceptOperationalPicture` may record authorised acceptance.

---

# Analysis Finding Rules

A proposed Analysis Finding must include:

- statement;
- significance;
- rationale;
- supporting references;
- uncertainty;
- confidence;
- potential consequence.

A Finding is not automatically:

- a Fact;
- a Recommendation;
- a Decision;
- an Outcome.

Only `RecordAnalysisFinding` may add an accepted Finding to the Operational Brief.

---

# Recommendation Rules

A proposed Recommendation must include:

- statement;
- intended Outcome;
- rationale;
- supporting Facts;
- material Unknowns;
- material Assumptions;
- Constraints;
- Risks;
- Dependencies;
- trade-offs;
- expected consequences;
- confidence.

The engine must not hide residual uncertainty to make a Recommendation appear stronger.

The engine may propose one or more Recommendations.

Only a validated Recommendation command may record, revise, or withdraw them.

A Recommendation is never a Principal Decision.

---

# Principal Decision Boundary

The Decision Engine may:

- identify that a Principal Decision is required;
- prepare a concise decision context;
- compare available Recommendations;
- explain consequences;
- surface unresolved uncertainty;
- draft questions for the decision-maker.

The Decision Engine must not:

- approve or reject a Recommendation;
- record a Manual Decision;
- supersede or cancel a Decision;
- impersonate an authorised decision-maker;
- represent confidence as authority.

---

# Knowledge Integrity Rules

1. Facts, Unknowns, and Assumptions must remain separate.
2. Confirmed Facts must not be silently rewritten.
3. Disputed Facts must remain visibly disputed.
4. Unknowns must not be silently resolved.
5. Assumptions must not be silently promoted to Facts.
6. Contradictory sources must remain visible.
7. Missing evidence must be disclosed.
8. Confidence must not replace traceability.
9. Prior Decisions must be treated as immutable historical records.
10. Material changes since the analysed brief version must invalidate direct persistence of the result.

---

# Stale Result Rule

An `AnalysisResult` is based on one exact `briefVersion`.

Before any proposal is converted into a state-changing Command, the application service must verify that the current aggregate version still matches the analysed version or perform an explicit revalidation.

If material state changed after analysis:

- the result may remain available for reference;
- it must be marked stale;
- proposals must not be persisted without re-analysis or authorised reconciliation.

Suggested error code:

- `ANALYSIS_RESULT_STALE`

---

# Failure Behaviour

## `incomplete`

Use when part of the requested scope was completed but material sections remain unfinished.

The result must include:

- completed scope;
- incomplete scope;
- reasons;
- recommended next step.

## `blocked`

Use when safe analysis cannot continue because required information or authority is missing.

The result must include:

- blocking reasons;
- affected scope;
- required inputs or actions.

## `failed`

Use when the engine could not produce a usable result.

The result must include:

- structured error code;
- non-sensitive error message;
- retryability;
- affected scope.

Suggested error codes:

- `INSUFFICIENT_CONTEXT`
- `CONTRADICTORY_INPUT`
- `INVALID_BRIEF_STATUS`
- `INVALID_ANALYSIS_SCOPE`
- `UNSUPPORTED_ANALYSIS`
- `ENGINE_UNAVAILABLE`
- `ENGINE_TIMEOUT`
- `OUTPUT_VALIDATION_FAILED`
- `ANALYSIS_RESULT_STALE`

A failed run must not produce Domain Events or mutate aggregate state.

---

# Security and Access

The application layer must provide only information the requesting actor and engine are authorised to process.

The engine must not:

- retrieve undeclared external context;
- expose restricted Evidence;
- include secrets in analytical output;
- retain data outside approved infrastructure;
- execute tools without explicit permission.

Tool use, external retrieval, and data retention belong to separate infrastructure policies.

---

# Application Service Responsibilities

The application service must:

1. authenticate the actor;
2. authorise the requested scope;
3. load the Operational Brief;
4. build a versioned input snapshot;
5. invoke the Decision Engine;
6. validate the returned structure;
7. store the result separately from aggregate state;
8. present it for authorised review;
9. convert accepted proposals into Commands;
10. revalidate the aggregate version before persistence.

The application service must not directly write AI output into the aggregate.

---

# Idempotency

`analysisRequestId` must be unique.

Submitting the same valid request with the same:

- `analysisRequestId`;
- `briefVersion`;
- scope;
- engine configuration;

must return the existing result or an explicitly equivalent idempotent response.

It must not create duplicate accepted Findings, Operational Pictures, Recommendations, or Decisions.

---

# Implementation Invariants

1. The Decision Engine is outside the `OperationalBrief` aggregate.
2. The Decision Engine never mutates aggregate state.
3. Every run is tied to an exact brief version.
4. Every material conclusion is traceable.
5. AI proposals become domain state only through validated Commands.
6. Final business Decisions remain human-authorised.
7. A failed or stale result produces no domain state change.
8. Domain rules remain authoritative over engine output.
