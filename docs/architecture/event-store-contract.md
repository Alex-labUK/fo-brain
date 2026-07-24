# Event Store Contract

Version: 1.0
Status: Approved Draft
Owner: FO Brain

---

# Purpose

The Event Store Contract defines how FO Brain records, reads, publishes, and replays Domain Events.

It provides an auditable history of meaningful domain changes while preserving consistency between aggregate state and emitted events.

The Event Store is an infrastructure capability. Domain meaning remains defined by the domain model.

---

# Scope

This contract covers:

- Domain Event structure;
- append semantics;
- aggregate versioning;
- optimistic concurrency;
- event ordering;
- event replay;
- correlation and causation;
- publication through an outbox;
- delivery guarantees;
- idempotency;
- retention and audit;
- schema evolution;
- failure handling.

---

# Domain Event Definition

A Domain Event records a fact that has already occurred in the domain.

Examples:

- BriefCreated
- BriefClosed
- SubsystemAssessmentFinalised
- RecommendationCreated
- PrincipalDecisionRecorded
- ExecutionStarted
- ExecutionCompleted
- OutcomeVerified

Domain Events are immutable.

They are named in the past tense and must describe domain meaning rather than infrastructure activity.

---

# Event Envelope

Each stored event must include:

- eventId
- eventType
- aggregateType
- aggregateId
- aggregateVersion
- occurredAt
- recordedAt
- actor
- correlationId
- causationId
- schemaVersion
- payload
- metadata

Optional metadata may include:

- tenantId
- principalId
- commandId
- sourceSystem
- traceId
- confidentialityClassification

---

# Identity

## eventId

Globally unique identifier for the event.

The same eventId must never represent different event content.

## aggregateId

Identity of the aggregate that emitted the event.

## aggregateVersion

The version of the aggregate after the event was applied.

Versions must be strictly sequential within one aggregate stream.

---

# Event Stream

Each aggregate has a logical event stream.

A stream is identified by:

```text
aggregateType + aggregateId
```

Events within a stream are ordered by aggregateVersion.

Example:

```text
OperationalBrief / BRIEF-123

1 BriefCreated
2 BriefUpdated
3 BriefClosed
4 BriefReopened
```

The Event Store must reject duplicate or skipped aggregate versions unless an explicitly supported migration process is being used.

---

# Append Contract

The primary operation is append-only.

Suggested interface:

```text
EventStore

append(
  streamId,
  expectedVersion,
  events[]
) -> AppendResult

readStream(
  streamId,
  fromVersion?,
  limit?
) -> EventStream

readAll(
  checkpoint?,
  limit?
) -> GlobalEventPage
```

Possible append results:

- Appended
- VersionConflict
- DuplicateEvent
- InvalidEvent
- StorageFailure

Stored events must never be updated in place.

---

# Optimistic Concurrency

The caller provides the aggregate version it originally loaded.

Append succeeds only when the current stream version equals `expectedVersion`.

If another transaction has already appended events, the Event Store returns `VersionConflict`.

The system must not silently merge concurrent writes.

Conflict resolution belongs to the Application Service or domain workflow.

---

# Transactional Consistency

Where aggregate state is persisted separately from the Event Store, state changes and event persistence must occur atomically or through an equivalent reliable pattern.

Preferred approaches:

- same database transaction;
- transactional outbox;
- event-sourced aggregate persistence.

The system must never publish a Domain Event for state that was not committed.

---

# Outbox Contract

External publication should use an Outbox.

The same transaction that commits state changes should persist an outbox record containing the event to publish.

An outbox publisher then delivers the event to the message transport.

Outbox records should include:

- outboxId
- eventId
- eventType
- payload
- metadata
- createdAt
- publishedAt
- attemptCount
- lastError

The publisher must be restart-safe and idempotent.

---

# Delivery Guarantees

FO Brain should assume at-least-once delivery for external event consumers.

Exactly-once end-to-end delivery must not be assumed.

Consumers must handle duplicate delivery safely.

Ordering is guaranteed only within the same aggregate stream unless a stronger guarantee is explicitly provided.

---

# Idempotency

Producers and consumers must support idempotent processing.

A consumer should record processed eventIds or use an equivalent deduplication mechanism.

Reprocessing the same event must not create duplicate domain effects.

Command handlers may also use commandId to prevent duplicate command execution.

---

# Correlation and Causation

## correlationId

Groups all commands, events, and external calls belonging to one business workflow.

Example:

```text
User request
  -> RunAnalysis
  -> AnalysisCompleted
  -> RecommendationCreated
```

All records share the same correlationId.

## causationId

Identifies the command or event that directly caused the current event.

Example:

```text
RunAnalysis command
  causes AnalysisCompleted event
```

Causation creates a traceable chain of responsibility.

---

# Actor

Every event caused by a human or system action should record the actor.

Actor information may include:

- actorId
- actorType
- role
- authorityBasis

Possible actor types:

- Human
- System
- AI
- ExternalSystem

An AI actor must never be recorded as the authorised decision-maker for a PrincipalDecision.

---

# Event Ordering

Within an aggregate stream:

- aggregateVersion defines authoritative order;
- versions are contiguous;
- one version maps to one event unless the implementation explicitly supports multiple events per version.

Across streams:

- global ordering may be approximate;
- consumers must not infer cross-aggregate causality from timestamps alone;
- correlationId and causationId should be used for workflow reconstruction.

---

# Replay

The Event Store must support replay for:

- rebuilding projections;
- auditing history;
- recovering derived state;
- testing new consumers;
- migrating read models.

Replay must not automatically trigger external side effects.

Consumers must distinguish:

- live event processing;
- replay processing.

During replay, email, payments, vendor instructions, notifications, and other external effects must remain disabled unless explicitly authorised.

---

# Aggregate Reconstruction

Where event sourcing is used, an aggregate may be reconstructed by replaying its stream.

Reconstruction must:

1. load events in aggregateVersion order;
2. apply each event through deterministic event handlers;
3. verify version continuity;
4. reject unknown or invalid event schemas;
5. produce the same aggregate state for the same event stream.

Event application must not perform external calls.

---

# Snapshots

Snapshots may be used to improve reconstruction performance.

A snapshot should include:

- aggregateId
- aggregateType
- aggregateVersion
- state
- createdAt
- schemaVersion

Snapshots are optimisation only.

The event stream remains the source of historical truth.

A corrupted or missing snapshot must not make the aggregate unrecoverable.

---

# Schema Versioning

Every event includes `schemaVersion`.

Published event schemas must be backward-compatible where possible.

Allowed evolution techniques include:

- adding optional fields;
- upcasting older events during reads;
- introducing a new event type;
- versioned payload transformation.

Existing stored events must not be rewritten merely to match a new schema.

Breaking changes require an explicit migration or new event type.

---

# Event Upcasting

Upcasters may transform older event payloads into the current in-memory representation.

Upcasting must be:

- deterministic;
- side-effect free;
- version-aware;
- testable;
- auditable.

The original stored event must remain unchanged.

---

# Read Models and Projections

Consumers may build read models from Domain Events.

Examples:

- open OperationalBrief dashboard;
- active Decisions awaiting execution;
- unresolved blockers;
- verified lessons by subsystem;
- case timeline.

Read models are derived and may be rebuilt.

They must not become the authoritative source for command decisions unless explicitly designed for that purpose.

---

# Event Consumers

Each consumer should define:

- consumerName
- subscribed event types
- checkpoint strategy
- idempotency strategy
- retry policy
- dead-letter policy
- replay behaviour

Consumers must not silently discard events.

---

# Checkpoints

Global consumers should maintain checkpoints.

A checkpoint identifies the last successfully processed event position.

Checkpoint advancement must occur only after successful processing.

On restart, the consumer resumes from the last committed checkpoint.

---

# Retry Policy

Transient processing failures should be retried with bounded backoff.

Retries should record:

- eventId
- consumerName
- attemptCount
- firstAttemptAt
- lastAttemptAt
- lastError

Permanent failures should move to a dead-letter mechanism for review.

Infinite silent retries are not acceptable.

---

# Dead-Letter Handling

Dead-letter records should contain:

- event envelope;
- consumer name;
- failure reason;
- attempt history;
- first failure time;
- latest failure time;
- resolution status.

Dead-letter events must remain visible to operators.

Reprocessing requires explicit operator or automated policy approval.

---

# Failure Behaviour

Suggested errors:

- STREAM_NOT_FOUND
- VERSION_CONFLICT
- DUPLICATE_EVENT
- INVALID_EVENT_ENVELOPE
- INVALID_EVENT_VERSION
- UNKNOWN_EVENT_TYPE
- EVENT_SERIALIZATION_FAILURE
- EVENT_STORE_UNAVAILABLE
- OUTBOX_PUBLISH_FAILED
- CHECKPOINT_FAILURE
- REPLAY_FAILURE

A failed append must persist no partial event batch.

---

# Batch Append

When one command emits multiple events for the same aggregate, the Event Store should append the batch atomically.

Either all events are stored or none are stored.

Aggregate versions in the batch must be sequential.

---

# Multi-Aggregate Workflows

The Event Store does not provide a distributed transaction across aggregates.

Cross-aggregate workflows should use:

- Application Services;
- process managers;
- sagas;
- compensating actions.

Each aggregate remains independently consistent.

---

# Security and Confidentiality

The Event Store may contain highly sensitive operational history.

It must support:

- tenant and principal isolation;
- encryption in transit;
- encryption at rest where required;
- least-privilege access;
- audited administrative access;
- confidentiality classification;
- restricted payload visibility;
- secure backup and restoration.

Sensitive values should be minimised in event payloads.

Secrets, access tokens, and raw credentials must never be stored in Domain Events.

---

# Personal Data

Events containing personal data require explicit retention and access policies.

Because Domain Events are immutable, privacy-sensitive fields should be designed carefully.

Where erasure is legally required, the architecture may use:

- tokenisation;
- encrypted fields with key destruction;
- external personal-data references;
- authorised redaction events;
- legally controlled physical deletion.

Any such mechanism must preserve the audit meaning of the event history as far as legally permitted.

---

# Retention

Domain Event retention should normally match the audit and legal needs of the organisation.

Retention rules must define:

- retention period;
- archival strategy;
- backup period;
- deletion authority;
- legal hold behaviour.

Events must not be deleted solely because an OperationalBrief is Closed or Archived.

---

# Audit

The Event Store provides an authoritative audit trail of domain changes.

Audit views should show:

- what happened;
- when it happened;
- who caused it;
- under what authority;
- what caused the action;
- which workflow it belonged to;
- which aggregate version resulted.

Audit tools must not modify the event stream.

---

# Observability

The Event Store implementation should expose:

- append latency;
- append failure rate;
- version conflict rate;
- outbox backlog;
- publication delay;
- consumer lag;
- retry count;
- dead-letter count;
- replay duration.

Operational logs should include correlationId and eventId without unnecessarily exposing confidential payloads.

---

# Backup and Recovery

Backups must preserve:

- event order;
- stream identity;
- aggregate version;
- event envelope;
- schema version;
- checkpoints where appropriate.

Recovery procedures must be tested.

A restored Event Store must not create duplicate external side effects.

---

# Testing Contract

The Event Store implementation should pass contract tests covering:

- append to empty stream;
- append with correct expectedVersion;
- version conflict;
- atomic batch append;
- duplicate event rejection;
- stream ordering;
- global read checkpoints;
- replay safety;
- idempotent consumer behaviour;
- outbox recovery;
- schema upcasting;
- dead-letter handling;
- backup restoration.

---

# AI Boundary

AI may analyse the event history and propose conclusions.

AI must not:

- rewrite stored events;
- fabricate missing events;
- alter audit history;
- infer authority that is not recorded;
- trigger replay side effects;
- publish events outside validated Application Services.

---

# Invariants

1. Domain Events are immutable facts.
2. Events are appended, never updated in place.
3. Aggregate stream versions are sequential.
4. Optimistic concurrency prevents silent lost updates.
5. Failed appends persist no partial event batch.
6. State changes and event persistence remain consistent.
7. External delivery is treated as at-least-once.
8. Consumers are idempotent.
9. Replay does not trigger unauthorised external side effects.
10. Correlation and causation remain traceable.
11. Stored event history is auditable.
12. AI cannot rewrite or authorise event history.
