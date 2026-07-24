# Domain Events

**Status:** Draft
**Owner:** Architecture
**Applies to:** Operational Brief Aggregate

---

# Purpose

A Domain Event represents something that has already happened inside the Operational Brief domain.

Events are immutable historical records.

Events describe business reality.

Events never express intention.

Commands ask.
Events record.

---

# Principles

Domain Events MUST:

- describe completed business facts;
- be immutable;
- contain all information required for historical reconstruction;
- preserve complete auditability;
- belong to exactly one aggregate;
- be append-only.

Domain Events MUST NOT:

- be edited;
- be deleted;
- contain future intentions;
- contain executable logic.

---

# Event Envelope

Every Domain Event SHALL contain:

- eventId
- eventType
- aggregateId
- aggregateVersion
- occurredAt
- actorId
- actorRole
- correlationId
- causationId
- payload

---

# Event Categories

## Brief Lifecycle

- BriefCreated
- BriefMetadataUpdated
- BriefClosed
- BriefReopened
- BriefArchived

## Objectives

- ObjectiveRecorded
- ObjectiveUpdated

## Constraints

- ConstraintRecorded
- ConstraintUpdated
- ConstraintRemoved

## Facts

- FactRecorded
- FactCorrected
- FactDisputed

Facts never disappear. Corrections create new events.

## Unknowns

- UnknownRecorded
- UnknownResolved

## Assumptions

- AssumptionRecorded
- AssumptionConfirmed
- AssumptionRejected

Confirmation never changes history.

## Questions

- QuestionAdded
- QuestionAnswered
- QuestionWithdrawn

## Evidence

- EvidenceAttached
- EvidenceDetached

## Operational Picture

- OperationalPictureRequested
- OperationalPictureGenerated
- OperationalPictureAccepted
- OperationalPictureRejected
- OperationalPictureSuperseded

## Analysis

- RiskAnalysisRequested
- DependencyAnalysisRequested
- MissingInformationAnalysisRequested
- AnalysisFindingRecorded
- AnalysisFindingRejected

## Recommendations

- RecommendationRequested
- RecommendationRecorded
- RecommendationRevised
- RecommendationCompared
- RecommendationWithdrawn

## Decisions

- RecommendationApproved
- RecommendationRejected
- ManualDecisionRecorded
- DecisionRecorded
- DecisionSuperseded
- DecisionCancelled

Only authorised humans may produce decision events.

## Execution

- DecisionExecutionStarted
- DecisionExecutionUpdated
- DecisionExecutionCompleted

## Outcomes

- OutcomeRecorded
- LessonRecorded

Lessons never modify historical decisions.

---

# Event Ordering

Events are ordered by Aggregate Version.

Version numbers SHALL increase monotonically.

No event may be inserted into history.

---

# Event Immutability

Once persisted:

- payload MUST NOT change;
- timestamps MUST NOT change;
- actor identity MUST NOT change;
- ordering MUST NOT change.

Corrections are represented by new events.

---

# Aggregate Reconstruction

The current state of an Operational Brief is reconstructed by replaying its Domain Events in order.

---

# Read Models

Read Models SHALL be projections.

Read Models MAY be rebuilt at any time.

Read Models are disposable.

Domain Events are authoritative.

---

# AI Boundary

AI MAY:

- consume Domain Events;
- analyse Domain Events;
- identify patterns;
- generate Operational Pictures;
- generate Recommendations.

AI MUST NOT:

- create historical events directly;
- modify existing events;
- delete events;
- reorder events.

All AI-generated information enters the system through validated Commands.

---

# Event Naming Rules

Events SHALL:

- use past tense;
- describe completed business facts;
- avoid technical terminology;
- remain understandable by business users.

---

# Out of Scope

Domain Events do not represent:

- UI interactions;
- API requests;
- database operations;
- notification delivery;
- infrastructure events.

They represent only business history.
