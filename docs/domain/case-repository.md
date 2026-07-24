# Case Repository

Status: Draft v1

## Purpose

The Case Repository loads and saves Case Aggregates.

It is an infrastructure abstraction and contains no domain policy.

## Interface

```text
get(caseId) -> CaseAggregate | NotFound
save(aggregate, expectedVersion) -> SaveResult
exists(caseId) -> boolean
```

## Rules

1. `save` must use optimistic concurrency.
2. The expected version must match the persisted version.
3. A successful save must be atomic.
4. Partial Aggregate persistence is forbidden.
5. Infrastructure failures must not be represented as domain Events.
6. The Repository must not bypass Aggregate Commands or invariants.

## Save Result

- persisted Case version;
- persisted Event identifiers;
- timestamp.

## Errors

- `CASE_NOT_FOUND`
- `VERSION_CONFLICT`
- `PERSISTENCE_FAILURE`
- `DUPLICATE_CASE_ID`
