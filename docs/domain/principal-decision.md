# Principal Decision

Status: Draft v1

## Purpose

A Principal Decision records an authorised human decision made in relation to a Case.

The Decision Engine may prepare a request but cannot create the Decision.

## Structure

- id
- caseId
- recommendationId
- decision
- status
- decisionMaker
- authorityReference
- rationale
- conditions
- constraints
- effectiveAt
- recordedAt
- recordedBy

## Status

- `approved`
- `approved_with_conditions`
- `rejected`
- `deferred`
- `returned_for_revision`

## Rules

1. A Principal Decision must be human-authored.
2. The decision-maker must be authorised.
3. The Decision must reference the active Recommendation or explicitly state why it does not.
4. Conditions and constraints must be preserved verbatim.
5. Recording a Decision never rewrites the Recommendation.
6. Decision history is immutable.
7. A later Decision may supersede an earlier Decision only through a new record.

## Resulting Behaviour

- `approved` or `approved_with_conditions` returns the Case to `active`;
- `rejected` returns the Case to `active`;
- `deferred` may keep the Case in `awaiting_decision`;
- `returned_for_revision` returns the Case to `active`.
