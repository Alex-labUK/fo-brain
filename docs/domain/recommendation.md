# Recommendation

Status: Draft v1

## Purpose

A Recommendation is the Case Aggregate's current advised course of action.

Only one Recommendation may be active at a time.

## Structure

- id
- status
- selectedOptionId
- statement
- rationale
- intendedOutcome
- supportingFactIds
- supportingAssumptionIds
- materialUnknownIds
- materialRiskIds
- dependencies
- confidence
- createdAt
- createdBy
- supersedesRecommendationId

## Status

- `draft`
- `active`
- `superseded`
- `withdrawn`
- `accepted`
- `rejected`

## Rules

1. Only one Recommendation may have status `active`.
2. An active Recommendation must state the intended Outcome.
3. Material Risks and Unknowns must remain visible.
4. AI may propose a Recommendation.
5. Only a validated Command may activate, revise, withdraw, accept, or reject it.
6. Revising an active Recommendation creates a new version and supersedes the previous one.
7. Recommendation history is immutable.

## Minimum Activation Requirements

- selected Option or explicit action;
- rationale;
- intended Outcome;
- supporting evidence;
- material Risks;
- material Unknowns;
- confidence.
