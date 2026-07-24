# Analysis Result

Status: Draft v1

## Purpose

`AnalysisResult` is the immutable output of one Decision Engine run.

It is not part of the Case Aggregate until accepted through validated Commands.

## Structure

### Metadata

- analysisId
- caseId
- caseVersion
- engineVersion
- createdAt
- status

### Operational Picture

A concise synthesis of the current situation.

### Findings

Each Finding contains:

- id
- statement
- significance
- supportingFactIds
- supportingAssumptionIds
- relatedUnknownIds
- confidence

### Contradictions

Each Contradiction contains:

- conflicting references
- explanation
- materiality
- proposed resolution path

### Risk Assessment

Each assessed Risk contains:

- riskId or proposedRiskId
- probability
- impact
- urgency
- mitigation options
- residual risk

### Proposed Options

Zero or more proposed courses of action.

### Proposed Recommendation

Optional.

### Proposed Principal Decision Request

Optional.

### Traceability

Every material output must reference the relevant input records.

## Status

Allowed values:

- `completed`
- `incomplete`
- `blocked`
- `failed`

## Invariants

1. The result is immutable.
2. The result never changes Aggregate state directly.
3. A Recommendation cannot be marked supported without traceability.
4. `blocked` must include blocking reasons.
5. `failed` must include a structured error.
