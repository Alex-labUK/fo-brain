# Domain Events

Version: 1.0  
Status: Approved Draft  
Owner: FO Brain

---

# Purpose

This document defines the domain events produced by the FO Brain domain model.

A domain event records that a meaningful business change has already occurred.

Domain events are facts about the past. They are:

- immutable
- named in past tense
- traceable
- produced by domain behavior
- safe to publish after aggregate consistency is preserved

Domain events are not commands, tasks or requests.

---

# Event Naming

Event names must:

- use past tense
- describe a business fact
- avoid technical implementation language
- remain stable across UI, API and database changes

Correct:

- `OperationalBriefCreated`
- `FactConfirmed`
- `PrincipalDecisionRecorded`

Incorrect:

- `CreateOperationalBrief`
- `UpdateDatabase`
- `SendNotification`

---

# Standard Event Metadata

Every domain event must contain:

```text
eventId
eventType
occurredAt
aggregateId
aggregateType
aggregateVersion
actor
source
correlationId
causationId
```

## Metadata Rules

- `eventId` must be globally unique.
- `occurredAt` records when the business change occurred.
- `aggregateId` identifies the affected aggregate.
- `aggregateVersion` identifies the aggregate version after the change.
- `actor` identifies the user, system or integration responsible.
- `source` identifies the evidence or input that caused the change.
- `correlationId` groups events belonging to the same operational flow.
- `causationId` identifies the command or event that directly caused this event.

---

# Operational Brief Events

## EVT-001 — OperationalBriefCreated

Produced when a new Operational Brief is created from a valid Operational Change.

Minimum payload:

```text
operationalBriefId
operationalChangeId
initialStatus
title
whatChanged
source
```

---

## EVT-002 — InformationAdded

Produced when new source material is attached to an existing Operational Brief.

Minimum payload:

```text
operationalBriefId
informationId
informationType
sourceReference
receivedAt
```

This event does not confirm extracted information as fact.

---

## EVT-003 — BriefTitleUpdated

Produced when the working title of the Operational Brief changes.

Minimum payload:

```text
operationalBriefId
previousTitle
newTitle
reason
```

---

## EVT-004 — WhatChangedUpdated

Produced when the description of the Operational Change is clarified.

Minimum payload:

```text
operationalBriefId
previousValue
newValue
reason
```

This event may occur only before execution starts.

---

# Fact Events

## EVT-100 — DraftFactProposed

Produced when a user, system or AI proposes a possible fact.

Minimum payload:

```text
operationalBriefId
factId
statement
proposedBy
sourceReference
confidence
```

A proposed fact is not business truth.

---

## EVT-101 — FactConfirmed

Produced when evidence or an authorised user confirms a fact.

Minimum payload:

```text
operationalBriefId
factId
statement
confirmedBy
sourceReference
confirmedAt
```

---

## EVT-102 — FactRejected

Produced when a Draft Fact is rejected.

Minimum payload:

```text
operationalBriefId
factId
reason
rejectedBy
```

---

## EVT-103 — FactSuperseded

Produced when a newer Confirmed Fact replaces an earlier Confirmed Fact.

Minimum payload:

```text
operationalBriefId
supersededFactId
replacementFactId
reason
```

The previous fact remains in history.

---

# Unknown Events

## EVT-200 — UnknownRecorded

Produced when missing information is explicitly added to the operational picture.

Minimum payload:

```text
operationalBriefId
unknownId
question
importance
recordedBy
```

---

## EVT-201 — UnknownResolved

Produced when an Unknown is answered with sufficient evidence.

Minimum payload:

```text
operationalBriefId
unknownId
resolution
sourceReference
resolvedBy
```

---

## EVT-202 — UnknownCancelled

Produced when an Unknown is no longer relevant.

Minimum payload:

```text
operationalBriefId
unknownId
reason
cancelledBy
```

---

# Assumption Events

## EVT-300 — AssumptionRecorded

Produced when an assumption is explicitly introduced.

Minimum payload:

```text
operationalBriefId
assumptionId
statement
basis
recordedBy
```

---

## EVT-301 — AssumptionValidated

Produced when evidence supports an assumption and it is converted into a Confirmed Fact.

Minimum payload:

```text
operationalBriefId
assumptionId
confirmedFactId
sourceReference
```

---

## EVT-302 — AssumptionRejected

Produced when evidence disproves an assumption.

Minimum payload:

```text
operationalBriefId
assumptionId
reason
sourceReference
```

---

# Outcome Events

## EVT-400 — OutcomeDefined

Produced when the desired operational result is first defined.

Minimum payload:

```text
operationalBriefId
outcomeId
statement
definedBy
```

---

## EVT-401 — OutcomeUpdated

Produced when the desired operational result changes before execution.

Minimum payload:

```text
operationalBriefId
outcomeId
previousStatement
newStatement
reason
updatedBy
```

---

## EVT-402 — OutcomeLocked

Produced when execution starts and the Outcome becomes immutable.

Minimum payload:

```text
operationalBriefId
outcomeId
lockedAt
```

---

## EVT-403 — OutcomeAchieved

Produced when evidence confirms that the desired operational result has been reached.

Minimum payload:

```text
operationalBriefId
outcomeId
evidence
confirmedBy
```

---

# Subsystem Events

## EVT-500 — SubsystemActivated

Produced when a subsystem becomes relevant to the Operational Brief.

Examples:

- Legal
- Finance
- Property Operations
- Security
- Travel
- Household Staff

Minimum payload:

```text
operationalBriefId
subsystemId
subsystemType
reason
activatedBy
```

---

## EVT-501 — SubsystemAssessmentAdded

Produced when a subsystem submits its first assessment.

Minimum payload:

```text
operationalBriefId
subsystemId
assessmentId
summary
consequences
recommendation
author
```

---

## EVT-502 — SubsystemAssessmentRevised

Produced when a subsystem assessment is updated.

Minimum payload:

```text
operationalBriefId
subsystemId
previousAssessmentId
newAssessmentId
reason
author
```

Previous versions remain available.

---

## EVT-503 — SubsystemDeactivated

Produced when a subsystem is no longer active.

Minimum payload:

```text
operationalBriefId
subsystemId
reason
deactivatedBy
```

---

# Recommendation Events

## EVT-600 — RecommendationCreated

Produced when a recommendation is added to the Operational Brief.

Minimum payload:

```text
operationalBriefId
recommendationId
statement
rationale
createdBy
```

---

## EVT-601 — RecommendationUpdated

Produced when a recommendation changes before a Principal Decision is recorded.

Minimum payload:

```text
operationalBriefId
recommendationId
previousStatement
newStatement
reason
updatedBy
```

---

## EVT-602 — RecommendationWithdrawn

Produced when a recommendation is no longer valid.

Minimum payload:

```text
operationalBriefId
recommendationId
reason
withdrawnBy
```

---

# Principal Decision Events

## EVT-700 — PrincipalDecisionRequested

Produced when Principal input is required.

Minimum payload:

```text
operationalBriefId
decisionRequestId
question
options
recommendation
requestedBy
requestedAt
```

---

## EVT-701 — PrincipalDecisionRecorded

Produced when the Principal's decision is captured.

Minimum payload:

```text
operationalBriefId
decisionRequestId
decisionId
selectedOption
decisionText
decidedAt
recordedBy
```

---

## EVT-702 — PrincipalDecisionRequestClosed

Produced when a decision request is closed without a recorded decision.

Minimum payload:

```text
operationalBriefId
decisionRequestId
reason
closedBy
```

---

## EVT-703 — PrincipalDecisionSuperseded

Produced when a recorded Principal Decision is replaced because circumstances materially changed.

Minimum payload:

```text
operationalBriefId
supersededDecisionId
replacementDecisionId
reason
```

The original decision remains in history.

---

# Execution Events

## EVT-800 — ExecutionStarted

Produced when implementation of the chosen course of action begins.

Minimum payload:

```text
operationalBriefId
executionId
startedAt
responsibleParties
```

---

## EVT-801 — ExecutionUpdateRecorded

Produced when a material execution update occurs.

Minimum payload:

```text
operationalBriefId
executionId
update
status
recordedBy
```

---

## EVT-802 — ExecutionBlocked

Produced when execution cannot continue.

Minimum payload:

```text
operationalBriefId
executionId
blocker
impact
requiredAction
recordedBy
```

---

## EVT-803 — ExecutionResumed

Produced when a previously blocked execution continues.

Minimum payload:

```text
operationalBriefId
executionId
resolution
resumedAt
```

---

## EVT-804 — ExecutionCompleted

Produced when planned execution is complete.

Minimum payload:

```text
operationalBriefId
executionId
completedAt
result
confirmedBy
```

Execution completion does not automatically mean that the Outcome was achieved.

---

# Lifecycle Events

## EVT-900 — OperationalBriefStatusChanged

Produced whenever the lifecycle status changes.

Minimum payload:

```text
operationalBriefId
previousStatus
newStatus
reason
changedBy
```

---

## EVT-901 — OperationalBriefResolved

Produced when the Operational Brief reaches the `Resolved` state.

Minimum payload:

```text
operationalBriefId
resolutionSummary
resolvedAt
resolvedBy
outcomeAchieved
```

---

## EVT-902 — AdministrativeCorrectionRecorded

Produced when an administrative correction is made after resolution.

Minimum payload:

```text
operationalBriefId
correctionId
field
previousValue
correctedValue
reason
correctedBy
```

Administrative corrections must not rewrite business history.

---

# Timeline Projection

Every domain event must be projected into the Operational Brief Timeline.

The Timeline is a read model derived from domain events.

The Timeline is:

- append-only
- chronological
- human-readable
- traceable to the original event
- not the authoritative source of aggregate state

---

# Event Publication Rules

1. Domain events are created only after aggregate validation succeeds.
2. Events must not be published if the transaction fails.
3. Events must be published at least once.
4. Consumers must be idempotent.
5. Event ordering must be preserved per aggregate.
6. Event payloads must not contain unredacted secrets or unnecessary personal data.
7. Published events are immutable.
8. Schema changes must remain backward-compatible within version 1.x.

---

# Out of Scope for Version 1.0

The following are not defined in this document:

- external integration events
- notification events
- analytics events
- AI model telemetry
- task management events
- cross-Brief dependency events
- event sourcing implementation

These may be added later without changing the core domain event model.

---

# Success Criteria

The event model is correct when:

- every meaningful aggregate change produces a domain event
- no event represents an uncompleted intention
- event names express business facts
- event history can explain how the current Operational Brief state was reached
- consumers can process repeated events safely
