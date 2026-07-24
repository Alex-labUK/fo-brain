# Event Store

Status: Draft v1

## Purpose

The Event Store persists immutable Domain Events in order.

It supports Aggregate reconstruction, auditability, and traceability.

## Event Envelope

- eventId
- eventType
- eventVersion
- aggregateId
- aggregateVersion
- occurredAt
- actor
- correlationId
- causationId
- payload

## Interface

```text
append(aggregateId, expectedVersion, events) -> AppendResult
read(aggregateId, fromVersion?) -> EventStream
```

## Rules

1. Events are append-only.
2. Existing Events cannot be changed or deleted.
3. Aggregate versions must be sequential.
4. Append must be atomic.
5. Duplicate Event identifiers must be rejected.
6. Event payloads must be versioned.
7. Sensitive data must follow the platform's access and retention policy.

## Errors

- `EVENT_VERSION_CONFLICT`
- `DUPLICATE_EVENT_ID`
- `EVENT_SERIALISATION_FAILURE`
- `EVENT_STORE_UNAVAILABLE`
