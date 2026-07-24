# Application Services

Status: Draft v1

## Purpose

Application Services coordinate use cases around the Case Aggregate.

They contain orchestration, not domain rules.

## Responsibilities

- authenticate the actor;
- authorise the requested operation;
- load the Aggregate;
- construct a Command;
- invoke the Aggregate;
- persist resulting Events and state;
- publish integration notifications;
- return a use-case result.

## Command Flow

```text
Request
→ Authentication
→ Authorisation
→ Load Aggregate
→ Build Command
→ Aggregate.handle()
→ Persist atomically
→ Publish
→ Response
```

## Decision Engine Flow

```text
Load Case snapshot
→ Build DecisionEngineInput
→ Run Decision Engine
→ Return AnalysisResult
→ Human or policy review
→ Convert accepted proposals into Commands
→ Aggregate.handle()
→ Persist
```

## Rules

1. Application Services may not mutate Aggregate state directly.
2. AI output must pass through validated Commands.
3. Persistence must be atomic.
4. A failed transaction must publish no integration notification.
5. Domain errors must remain distinguishable from infrastructure errors.
6. Retries must not create duplicate Commands or Events.

## Suggested Services

- `CreateCaseService`
- `UpdateCaseService`
- `AnalyseCaseService`
- `RecordPrincipalDecisionService`
- `CloseCaseService`
- `ReopenCaseService`
