# Case Aggregate

Status: Draft v1

## Purpose

The Case Aggregate is the transactional consistency boundary of the domain.

It owns the complete lifecycle of a Case and is the only component permitted to
modify its state.

All Commands are handled by the Aggregate.
All Domain Events originate from the Aggregate.

## Responsibilities

The Aggregate is responsible for:

- enforcing domain invariants;
- validating Commands;
- applying state transitions;
- maintaining the Operational Brief;
- managing Recommendations;
- recording Principal Decisions;
- emitting Domain Events.

The Aggregate is NOT responsible for:

- AI reasoning;
- persistence;
- user interface;
- authentication;
- external integrations.

## Aggregate Structure

CaseAggregate

- Metadata
- Lifecycle State
- Objective
- Operational Brief
- Facts
- Assumptions
- Unknowns
- Risks
- Options
- Recommendation
- Principal Decisions
- Event History

## Public Commands

The Aggregate accepts:

- CreateCase
- ActivateCase
- AddFact
- ConfirmFact
- RejectFact
- AddAssumption
- ResolveAssumption
- AddUnknown
- ResolveUnknown
- AddRisk
- ResolveRisk
- AddOption
- RemoveOption
- SelectRecommendation
- ReviseRecommendation
- RequestPrincipalDecision
- RecordPrincipalDecision
- PauseCase
- ResumeCase
- CloseCase
- ReopenCase

Commands never modify state directly.

Each Command follows:

Validate
→ Apply
→ Emit Event

## Domain Events

Examples:

- CaseCreated
- CaseActivated
- FactAdded
- FactConfirmed
- AssumptionAdded
- UnknownResolved
- RiskAdded
- RecommendationSelected
- RecommendationRevised
- PrincipalDecisionRequested
- PrincipalDecisionRecorded
- CasePaused
- CaseClosed
- CaseReopened

## Aggregate Invariants

The Aggregate guarantees:

1. Exactly one lifecycle state.
2. One active Recommendation.
3. Immutable Facts once confirmed.
4. Principal Decisions are human-authored only.
5. Historical Events are immutable.
6. Every state change is event-backed.
7. Invalid Commands never modify state.
8. Closed Cases are read-only until reopened.

## Consistency Boundary

Everything inside the Aggregate is strongly consistent.

External systems communicate only through Commands and Events.

No external service may mutate internal state.

## Transaction Rule

One Command produces:

- zero or one state transition;
- zero or more internal updates;
- zero or more validation errors;
- one or more Domain Events.

The Aggregate either succeeds completely or fails completely.

Partial updates are forbidden.

## AI Boundary

AI never changes Aggregate state.

AI may:

- analyse;
- classify;
- propose;
- recommend.

Only validated Commands can modify the Aggregate.

## Persistence

Repositories persist the Aggregate as a single consistency boundary.

Persistence implementation is outside the Aggregate.

## Implementation Contract

The Aggregate exposes:

- handle(Command)
- apply(Event)
- currentState()

All mutations occur through handle().

apply() is used only while rebuilding state from Event History.
