# Decision Support / Missing Evidence

Version: 1.0  
Status: Implementation note  
Path: `docs/architecture/decision-support.md`

FO Brain does not estimate how likely a decision is to be correct. It shows whether the **current** decision analysis has preserved evidentiary support.

User-facing name: **Устойчивость решения**. There is no numeric confidence, no “высокая уверенность ИИ”, and no `confidenceScore` on `AnalysisResult`.

## `decisionStatus` ≠ evidence support

These are separate dimensions.

| `decisionStatus` | Evidence support | Meaning |
| --- | --- | --- |
| `unresolved` | `missing_evidence` | A genuine fork remains. The current Determining Fact is what must become known. |
| `resolved` | `supported` | The route is resolved **and** the confirming fact was preserved for this analysis/cycle. |
| `resolved` | `support_not_recorded` | The Decision Engine currently says resolved, but FO Brain cannot verify that from structured evidence. |

Never auto-downgrade `resolved` → `unresolved` because support is missing. Show the limitation. Support state never writes lifecycle, execution, or priority.

## Deterministic states

`DecisionSupportState` is a presentation model derived at read time. It is not persisted.

- **missing_evidence** — unresolved analysis with a usable Determining Fact. That fact **is** the missing evidence. If the fact is missing or is the terminal resolved placeholder, hide the layer (do not invent one).
- **supported** — resolved analysis whose **current** `resolutionContext` matches `analysisCycleKey(analysis)` and contains non-empty `resolvingEvidence`.
- **support_not_recorded** — any other resolved analysis: no context, context without evidence, or context from a previous cycle.

Zero additional AI calls. The Decision Engine prompt is unchanged.

## What counts as reliable supporting evidence

Only `resolutionContext.resolvingEvidence` captured from the explicit Next Step Result flow, and only when `resolutionContext.analysisKey` equals the current analysis cycle key.

That evidence belongs to the **current** decision cycle. After resolved → unresolved, the new Determining Fact is the missing evidence; old resolving evidence stays in Decision Cycle History / Decision Record.

## What does not count

Not current evidence, even if present on the case:

- historical precedent / `precedentContextRefs`
- Family Office principles
- generic `caseMemory` lines
- closure `factualOutcome`
- model reply or resolution prose
- arbitrary dialogue
- Decision Records from other cases
- pending or completed execution

A supported decision may still have incomplete execution.

## Surfaces

Active Decision Workspace (and closed + visible reopen suggestion): compact block under Determining Fact, above Next Step.

Normally closed case: no second active card. The Decision Record already shows stored `resolvingEvidence` as **Подтверждение**. If a resolved record has none, it may say the basis was not fully recorded — it does not invent evidence.
