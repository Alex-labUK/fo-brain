# Operational Brief Schema

Status: Draft v1

## Purpose

Operational Brief is the canonical working representation of a case.
It is the only mutable domain object used during reasoning.

## Structure

### Metadata
- id
- version
- createdAt
- updatedAt
- source

### Objective
The intended Outcome for this case.

### Facts
Confirmed observations only.

Each Fact contains:
- id
- statement
- source
- confidence
- timestamp

### Assumptions
Working hypotheses that are not yet confirmed.

### Unknowns
Questions that materially affect the recommendation.

### Risks
Potential consequences if no action is taken or if an option fails.

### Options
Candidate courses of action.

Each Option contains:
- description
- advantages
- disadvantages
- dependencies
- residual risks

### Recommendation
Contains:
- selected option
- rationale
- expected Outcome
- confidence

## Invariants

The Operational Brief must never:
- modify historical Facts;
- convert Assumptions into Facts without evidence;
- contain more than one active Recommendation;
- contain implementation details.

## Lifecycle

Operational Brief evolves incrementally.

Evidence → Facts → Analysis → Options → Recommendation.

No Principal Decision is stored inside the Operational Brief.
