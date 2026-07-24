# Application Services

Version: 1.0
Status: Approved Draft
Owner: FO Brain

---

# Purpose

Application Services coordinate use cases across the domain model.

They orchestrate aggregates, repositories, domain events, the Decision Engine, and external integrations.

Application Services contain workflow orchestration, not business rules.

---

# Responsibilities

Application Services:

- receive commands;
- validate permissions and prerequisites;
- load aggregates;
- invoke domain behaviour;
- coordinate the Decision Engine;
- persist aggregate changes;
- publish Domain Events;
- return results.

They must not contain domain decision logic.

---

# Core Use Cases

## OperationalBrief

- CreateOperationalBrief
- UpdateOperationalBrief
- CloseOperationalBrief
- ReopenOperationalBrief
- ArchiveOperationalBrief

## Analysis

- RunAnalysis
- RefreshAnalysis
- RecordSubsystemAssessment
- PublishOperationalPicture

## Recommendation

- CreateRecommendation
- SupersedeRecommendation
- WithdrawRecommendation

## Principal Decision

- RecordPrincipalDecision
- SupersedePrincipalDecision
- CancelPrincipalDecision

## Execution

- PlanExecution
- StartExecution
- PauseExecution
- ResumeExecution
- CompleteExecution
- FailExecution
- CancelExecution

## Outcome

- RecordOutcome
- VerifyOutcome
- CaptureLessons
- CreateFollowUpBrief

---

# Standard Flow

1. Receive command.
2. Validate actor and permissions.
3. Load aggregate(s).
4. Execute domain behaviour.
5. Persist changes.
6. Publish Domain Events.
7. Return result.

If validation fails, no aggregate is modified and no Domain Event is emitted.

---

# Transaction Boundary

Each Application Service invocation is a single application transaction.

Aggregate consistency must be preserved.

Long-running activities should use asynchronous workflows rather than a single transaction.

---

# Decision Engine Integration

Application Services may invoke the Decision Engine to:

- analyse a Brief;
- generate an AnalysisResult;
- draft Recommendations;
- compare Outcomes.

AI output is advisory until accepted through domain commands.

---

# Repository Dependencies

Typical repositories:

- OperationalBriefRepository
- RecommendationRepository
- PrincipalDecisionRepository
- ExecutionRepository
- OutcomeRepository

Repositories expose aggregate persistence only.

---

# Event Publishing

Successful state changes publish Domain Events after persistence.

Application Services never publish events when commands fail.

---

# Error Handling

Typical errors:

- AggregateNotFound
- PermissionDenied
- ValidationFailed
- VersionConflict
- InvalidStateTransition

Errors must be deterministic and auditable.

---

# AI Boundary

Application Services may request AI analysis.

They must never allow AI to bypass domain validation or authorisation.

---

# Invariants

1. Business rules belong to the domain model.
2. Application Services orchestrate but do not decide.
3. Each use case has a clear transaction boundary.
4. Persistence occurs before Domain Event publication.
5. Failed commands produce no state change and no Domain Events.
6. AI output is advisory until accepted through domain behaviour.
