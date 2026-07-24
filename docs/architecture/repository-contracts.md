# Repository Contracts

Version: 1.0
Status: Approved Draft
Owner: FO Brain

---

# Purpose

Repository Contracts define how Application Services load and persist domain objects without depending on a specific database or infrastructure technology.

Repositories isolate the domain and application layers from PostgreSQL, document stores, event stores, caches, files, or external systems.

---

# Principles

Repositories:

- expose domain-oriented interfaces;
- persist and retrieve aggregates;
- preserve aggregate consistency;
- support optimistic concurrency;
- do not contain business rules;
- do not expose infrastructure-specific models;
- do not bypass aggregate behaviour.

---

# General Repository Contract

Each aggregate repository should support the minimum operations required by application use cases.

Typical operations:

- `getById(id)`
- `save(aggregate, expectedVersion)`
- `exists(id)`

Additional queries may be provided through read models or dedicated query services.

Repositories should not become generic data-access layers.

---

# Aggregate Repositories

## OperationalBriefRepository

Responsibilities:

- retrieve an OperationalBrief by identity;
- persist a new or changed OperationalBrief;
- enforce version consistency;
- detect duplicate identity.

Suggested interface:

```text
OperationalBriefRepository

getById(briefId) -> OperationalBrief | NotFound
exists(briefId) -> boolean
save(brief, expectedVersion) -> SaveResult
```

---

## RecommendationRepository

Responsibilities:

- retrieve Recommendations by identity;
- retrieve Recommendations linked to an OperationalBrief;
- persist recommendation versions;
- preserve supersession history.

Suggested interface:

```text
RecommendationRepository

getById(recommendationId) -> Recommendation | NotFound
findByBriefId(briefId) -> Recommendation[]
save(recommendation, expectedVersion) -> SaveResult
```

---

## PrincipalDecisionRepository

Responsibilities:

- retrieve Principal Decisions;
- identify the current Active Decision for an OperationalBrief;
- preserve historical and superseded Decisions;
- enforce version consistency.

Suggested interface:

```text
PrincipalDecisionRepository

getById(decisionId) -> PrincipalDecision | NotFound
findByBriefId(briefId) -> PrincipalDecision[]
findActiveByBriefId(briefId) -> PrincipalDecision | None
save(decision, expectedVersion) -> SaveResult
```

---

## ExecutionRepository

Responsibilities:

- retrieve Executions;
- retrieve executions linked to a Decision or OperationalBrief;
- preserve execution history;
- enforce version consistency.

Suggested interface:

```text
ExecutionRepository

getById(executionId) -> Execution | NotFound
findByDecisionId(decisionId) -> Execution[]
findByBriefId(briefId) -> Execution[]
save(execution, expectedVersion) -> SaveResult
```

---

## OutcomeRepository

Responsibilities:

- retrieve Outcomes;
- retrieve Outcomes linked to an Execution or OperationalBrief;
- preserve superseded Outcomes;
- support verified-outcome queries.

Suggested interface:

```text
OutcomeRepository

getById(outcomeId) -> Outcome | NotFound
findByExecutionId(executionId) -> Outcome[]
findByBriefId(briefId) -> Outcome[]
findVerifiedByBriefId(briefId) -> Outcome[]
save(outcome, expectedVersion) -> SaveResult
```

---

## SubsystemAssessmentRepository

Responsibilities:

- retrieve assessments by identity;
- retrieve assessments for an OperationalBrief;
- filter by subsystem and status;
- preserve version history.

Suggested interface:

```text
SubsystemAssessmentRepository

getById(assessmentId) -> SubsystemAssessment | NotFound
findByBriefId(briefId) -> SubsystemAssessment[]
findFinalByBriefId(briefId) -> SubsystemAssessment[]
findByBriefAndSubsystem(briefId, subsystem) -> SubsystemAssessment[]
save(assessment, expectedVersion) -> SaveResult
```

---

## AnalysisResultRepository

Responsibilities:

- retrieve immutable AnalysisResults;
- retrieve analyses by OperationalBrief;
- retrieve the latest valid analysis for a Brief version;
- prevent mutation after persistence.

Suggested interface:

```text
AnalysisResultRepository

getById(analysisId) -> AnalysisResult | NotFound
findByBriefId(briefId) -> AnalysisResult[]
findLatestForBriefVersion(briefId, briefVersion) -> AnalysisResult | None
append(analysisResult) -> AppendResult
```

`AnalysisResult` is immutable and should use append semantics rather than update semantics.

---

# Save Contract

A repository save operation should receive:

- aggregate;
- expectedVersion.

Possible results:

- Saved
- VersionConflict
- AlreadyExists
- NotFound
- PersistenceFailure

On success, the repository must persist:

- aggregate state;
- new aggregate version;
- uncommitted Domain Events, where transactional persistence is supported.

---

# Optimistic Concurrency

Repositories must protect aggregates from lost updates.

The caller supplies the version it originally loaded.

A save succeeds only when the stored version matches `expectedVersion`.

On mismatch, the repository returns `VersionConflict`.

The repository must not silently overwrite newer state.

---

# Transactional Consistency

State persistence and Domain Event persistence should occur in the same transaction when possible.

The system must not publish an event for state that was not successfully committed.

For external event publication, use an outbox or equivalent reliable-delivery mechanism.

---

# Aggregate Boundaries

A repository persists one aggregate boundary at a time.

It must not:

- modify another aggregate as a side effect;
- directly update nested domain state outside aggregate behaviour;
- return partially constructed aggregates;
- expose mutable persistence entities to callers.

Cross-aggregate workflows belong in Application Services or process managers.

---

# Query Separation

Repositories serve aggregate reconstruction and persistence.

Complex reporting, search, dashboards, and analytics should use dedicated read models or query services.

Examples:

- open Briefs by Principal;
- unresolved high-severity risks;
- active Executions by owner;
- decisions awaiting execution;
- verified lessons by subsystem.

These queries should not force aggregate repositories into generic search APIs.

---

# Identity

Repository methods use domain identity types, not raw infrastructure identifiers.

Examples:

- `BriefId`
- `RecommendationId`
- `DecisionId`
- `ExecutionId`
- `OutcomeId`
- `AssessmentId`
- `AnalysisId`

Identity generation may occur in the domain or application layer, but must remain independent of database implementation.

---

# Serialization

Infrastructure may serialize domain objects for persistence.

Serialization must preserve:

- identity;
- aggregate version;
- domain state;
- value-object meaning;
- timestamps;
- actor references;
- traceability references.

Infrastructure-specific fields must not leak into the domain model.

---

# Deletion

Domain aggregates should not normally be physically deleted.

Lifecycle transitions such as Closed, Archived, Cancelled, Superseded, or Withdrawn preserve history.

Physical deletion is limited to exceptional administrative, privacy, or legal requirements and must be separately authorised and audited.

---

# Caching

Caching is an infrastructure concern.

A cache must not:

- become the source of truth;
- bypass version checks;
- return stale state for command processing;
- hide persistence failures.

Command handling should use authoritative aggregate state.

---

# Failure Behaviour

Suggested repository errors:

- AGGREGATE_NOT_FOUND
- AGGREGATE_ALREADY_EXISTS
- VERSION_CONFLICT
- SERIALIZATION_FAILURE
- PERSISTENCE_UNAVAILABLE
- TRANSACTION_FAILED
- INVALID_AGGREGATE_STATE

Repository errors should be translated into stable application errors.

Sensitive infrastructure details must not be exposed to end users.

---

# Security

Repositories must enforce infrastructure-level access controls required by the application architecture.

They must support:

- tenant or principal isolation;
- least-privilege access;
- encrypted transport;
- encryption at rest where required;
- audited administrative access.

Domain authorisation remains the responsibility of the application and domain layers.

---

# Observability

Repository implementations should record:

- operation type;
- aggregate type;
- duration;
- success or failure;
- conflict count;
- correlationId.

Logs must not expose confidential Brief content unless explicitly authorised.

---

# Testing Contract

Every repository implementation should pass a shared contract test suite covering:

- save and retrieve;
- identity preservation;
- version increments;
- version conflicts;
- duplicate creation;
- not-found behaviour;
- immutable-object append behaviour;
- transaction rollback;
- event persistence consistency.

In-memory repositories used for testing must follow the same behavioural contract as production repositories.

---

# Invariants

1. Repositories expose domain-oriented contracts.
2. Repositories do not contain business decision logic.
3. Aggregate state is changed only through aggregate behaviour.
4. Optimistic concurrency prevents silent lost updates.
5. Persisted state and Domain Events remain consistent.
6. Aggregate repositories do not become generic reporting APIs.
7. Historical domain records are preserved by default.
8. Infrastructure-specific models do not leak into the domain.
9. Immutable analytical records use append semantics.
10. All implementations satisfy the same repository contract tests.
