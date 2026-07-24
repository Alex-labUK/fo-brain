# Decision Engine Contract

Status: Draft v1

## Purpose

The Decision Engine transforms a validated Case state into a structured Analysis Result.

It does not mutate the Case Aggregate and does not make Principal Decisions.

## Input

The engine receives:

- Case identifier;
- Case version;
- current lifecycle state;
- Objective;
- Facts;
- Assumptions;
- Unknowns;
- Risks;
- Options;
- active Recommendation, if any;
- relevant Decision history.

## Output

The engine returns one `AnalysisResult`.

The result may contain:

- Operational Picture;
- material findings;
- detected contradictions;
- missing information;
- prioritised Risks;
- proposed Options;
- proposed Recommendation;
- Principal Decision request proposal;
- confidence;
- traceability references.

## Rules

1. Facts must remain distinguishable from Assumptions.
2. Unknowns must not be silently resolved.
3. Every material conclusion must reference supporting inputs.
4. The engine may propose but never persist domain changes.
5. The engine may request a Principal Decision but never record one.
6. The engine must return a structured failure when analysis cannot be completed safely.

## Interface

```text
analyse(DecisionEngineInput) -> AnalysisResult
```

## Failure Codes

- `INSUFFICIENT_CONTEXT`
- `CONTRADICTORY_FACTS`
- `UNSUPPORTED_RECOMMENDATION`
- `INVALID_CASE_STATE`
- `ENGINE_UNAVAILABLE`
