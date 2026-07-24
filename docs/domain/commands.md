# Domain Commands

**Status:** Draft  
**Owner:** Architecture  
**Applies to:** Operational Brief Aggregate

## Purpose

A command represents an explicit intention to change the state of an Operational Brief.

Commands are requests. They are not facts and do not describe what happened. They describe what an authorised actor wants the system to do.

Only a successfully validated command may produce one or more domain events.

## Principles

Commands MUST:

- express a single business intention;
- target exactly one aggregate;
- be validated before execution;
- preserve historical traceability;
- respect aggregate invariants;
- include the actor and correlation metadata required for audit.

Commands MUST NOT:

- contain a final business decision unless the command explicitly records an authorised human decision;
- rewrite historical facts, events, recommendations, or decisions;
- silently convert assumptions into facts;
- bypass aggregate lifecycle rules;
- combine unrelated intentions.

## Command Envelope

Every command SHOULD contain:

- `commandId`
- `commandType`
- `briefId`
- `actorId`
- `actorRole`
- `issuedAt`
- `correlationId`
- `causationId` when applicable
- `expectedVersion`
- command-specific payload

`expectedVersion` is used for optimistic concurrency control.

## Command Categories

### 1. Brief Lifecycle

#### CreateBrief

Creates a new Operational Brief.

Required payload:

- title
- request
- principal or authorised requester
- owner
- urgency
- initial context

Produces:

- `BriefCreated`

#### UpdateBriefMetadata

Updates non-substantive brief metadata such as title, owner, urgency, tags, or due date.

Produces:

- `BriefMetadataUpdated`

#### CloseBrief

Closes a brief after the authorised decision has been recorded and the required completion conditions have been met.

Produces:

- `BriefClosed`

#### ReopenBrief

Reopens a previously closed brief when new material information or a new authorised request requires further work.

Produces:

- `BriefReopened`

#### ArchiveBrief

Archives a brief without deleting its history.

Produces:

- `BriefArchived`

### 2. Objectives and Constraints

#### RecordObjective

Records the outcome the brief is intended to achieve.

Produces:

- `ObjectiveRecorded`

#### UpdateObjective

Creates a new version of an existing objective while preserving prior versions.

Produces:

- `ObjectiveUpdated`

#### RecordConstraint

Records a legal, financial, operational, personal, time, security, reputational, or other relevant constraint.

Produces:

- `ConstraintRecorded`

#### UpdateConstraint

Creates a new version of a constraint.

Produces:

- `ConstraintUpdated`

#### RemoveConstraint

Marks a constraint as no longer applicable. It does not erase historical records.

Produces:

- `ConstraintRemoved`

### 3. Facts, Unknowns, and Assumptions

#### RecordFact

Records information accepted as confirmed at the time of entry.

Required payload:

- statement
- source
- sourceType
- observedAt or effectiveAt
- confidence
- verificationStatus

Produces:

- `FactRecorded`

A fact MUST NOT be created solely from an unverified AI inference.

#### CorrectFact

Supersedes an existing fact with a corrected version while preserving the original record.

Produces:

- `FactCorrected`

#### MarkFactDisputed

Marks a fact as disputed without deleting it.

Produces:

- `FactDisputed`

#### RecordUnknown

Records material information that is currently missing or unresolved.

Produces:

- `UnknownRecorded`

#### ResolveUnknown

Links an unknown to the fact, decision, or explanation that resolved it.

Produces:

- `UnknownResolved`

#### RecordAssumption

Records an assumption separately from facts.

Produces:

- `AssumptionRecorded`

#### ConfirmAssumption

Confirms an assumption by linking it to supporting evidence. Confirmation creates a fact and preserves the original assumption.

Produces:

- `AssumptionConfirmed`
- `FactRecorded`

#### RejectAssumption

Marks an assumption as unsupported or false.

Produces:

- `AssumptionRejected`

### 4. Questions and Evidence

#### AddQuestion

Adds a question that must be answered before or during analysis.

Produces:

- `QuestionAdded`

#### AnswerQuestion

Records an answer and its supporting source.

Produces:

- `QuestionAnswered`

#### WithdrawQuestion

Marks a question as no longer relevant.

Produces:

- `QuestionWithdrawn`

#### AttachEvidence

Attaches or references a document, message, image, report, system record, or other evidence.

Produces:

- `EvidenceAttached`

#### DetachEvidence

Removes an active association without deleting the evidence record or audit history.

Produces:

- `EvidenceDetached`

### 5. Operational Picture

#### RequestOperationalPicture

Requests generation or refresh of the Operational Picture.

Preconditions:

- the brief exists;
- minimum required objective and context are present;
- the brief is not archived.

Produces:

- `OperationalPictureRequested`

#### AcceptOperationalPicture

Records authorised acceptance of an Operational Picture version as sufficient for recommendation work.

Produces:

- `OperationalPictureAccepted`

#### RejectOperationalPicture

Rejects an Operational Picture version and records the reasons.

Produces:

- `OperationalPictureRejected`

#### SupersedeOperationalPicture

Marks a previous Operational Picture as superseded after material information changes.

Produces:

- `OperationalPictureSuperseded`

### 6. Analysis

#### RequestRiskAnalysis

Requests identification of material risks.

Produces:

- `RiskAnalysisRequested`

#### RequestDependencyAnalysis

Requests identification of dependencies, sequencing constraints, and external actors.

Produces:

- `DependencyAnalysisRequested`

#### RequestMissingInformationAnalysis

Requests identification of material gaps in the current information set.

Produces:

- `MissingInformationAnalysisRequested`

#### RecordAnalysisFinding

Records a finding produced by an authorised analyst or accepted AI-assisted analysis.

Produces:

- `AnalysisFindingRecorded`

A finding remains separate from facts, recommendations, and decisions.

#### RejectAnalysisFinding

Marks a finding as invalid, irrelevant, or unsupported.

Produces:

- `AnalysisFindingRejected`

### 7. Recommendations

#### RequestRecommendation

Requests one or more courses of action based on an accepted Operational Picture.

Preconditions:

- an accepted Operational Picture exists;
- unresolved critical unknowns are either resolved or explicitly accepted as residual uncertainty.

Produces:

- `RecommendationRequested`

#### RecordRecommendation

Records a recommendation and its rationale, assumptions, risks, dependencies, trade-offs, and expected outcome.

Produces:

- `RecommendationRecorded`

AI may propose this command, but an authorised application service or human actor must submit it.

#### ReviseRecommendation

Creates a new recommendation version while preserving prior versions.

Produces:

- `RecommendationRevised`

#### CompareRecommendations

Requests structured comparison of two or more recommendations.

Produces:

- `RecommendationComparisonRequested`

#### WithdrawRecommendation

Marks a recommendation as no longer active.

Produces:

- `RecommendationWithdrawn`

### 8. Decisions

#### ApproveRecommendation

Records an authorised human decision to approve a recommendation.

Required payload:

- recommendationId
- decisionMakerId
- authorityBasis
- decisionAt
- conditions
- rationale when required

Produces:

- `RecommendationApproved`
- `DecisionRecorded`

AI MUST NOT execute this command.

#### RejectRecommendation

Records an authorised human decision to reject a recommendation.

Produces:

- `RecommendationRejected`
- `DecisionRecorded`

AI MUST NOT execute this command.

#### RecordManualDecision

Records an authorised decision that was not based on a system recommendation.

Produces:

- `ManualDecisionRecorded`

AI MUST NOT execute this command.

#### SupersedeDecision

Records a new authorised decision that supersedes an earlier decision. The previous decision remains immutable.

Produces:

- `DecisionSuperseded`
- `DecisionRecorded`

#### CancelDecision

Records authorised cancellation of a decision that has not been fully executed.

Produces:

- `DecisionCancelled`

### 9. Execution and Outcomes

#### StartDecisionExecution

Marks the start of execution of an authorised decision.

Produces:

- `DecisionExecutionStarted`

#### RecordExecutionUpdate

Records progress, issues, dependencies, or changes during execution.

Produces:

- `DecisionExecutionUpdated`

#### CompleteDecisionExecution

Records completion of execution.

Produces:

- `DecisionExecutionCompleted`

#### RecordOutcome

Records the observed result of the decision.

Produces:

- `OutcomeRecorded`

#### RecordLesson

Records a reusable lesson derived from the case.

Produces:

- `LessonRecorded`

A lesson does not automatically become a universal rule.

## Validation Rules

Every command SHALL be validated against:

- actor authority;
- aggregate existence;
- aggregate lifecycle state;
- required fields;
- expected aggregate version;
- command idempotency;
- domain invariants;
- evidence and source requirements where applicable.

An invalid command MUST NOT modify aggregate state.

## Idempotency

Every command MUST have a unique `commandId`.

If the same `commandId` is submitted more than once, the system MUST return the original result and MUST NOT duplicate business effects.

## Concurrency

Commands that modify an existing Operational Brief SHOULD include `expectedVersion`.

If the actual aggregate version differs from `expectedVersion`, the command MUST fail with a concurrency conflict and no events may be appended.

## Aggregate Ownership

Every command targets exactly one Operational Brief aggregate.

Cross-aggregate coordination belongs to application services, process managers, or sagas and MUST NOT be implemented inside the aggregate.

## AI Boundary

AI may:

- draft command payloads;
- propose facts for human verification;
- identify unknowns;
- propose assumptions;
- request analytical operations;
- draft Operational Pictures;
- draft recommendations;
- explain rationale.

AI may not:

- approve or reject recommendations;
- record final decisions on behalf of a human;
- confirm facts without evidence or authorised verification;
- overwrite historical records;
- bypass command validation;
- execute actions outside explicitly granted tool permissions.

## Command Processing Flow

1. Receive command.
2. Authenticate actor.
3. Check authorisation.
4. Check idempotency.
5. Load aggregate at expected version.
6. Validate command.
7. Execute aggregate behaviour.
8. Produce domain events.
9. Persist events atomically.
10. Update projections and downstream processes.
11. Return command result.

## Out of Scope

The following are outside the core Operational Brief command model:

- notification delivery;
- user interface actions;
- external system transport details;
- database-specific operations;
- generic task management;
- autonomous final decision-making by AI.
