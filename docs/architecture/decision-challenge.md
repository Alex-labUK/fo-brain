# Decision Challenge

Version: 1.0  
Status: Implementation note  
Path: `docs/architecture/decision-challenge.md`

FO Brain already shows the current decision, its determining fact, whether supporting evidence is recorded, and the next operational step. **Проверка решения** is a compact quality-control layer for **resolved** decisions only.

It answers, when genuinely knowable:

- what would invalidate or materially change the current route
- whether one material assumption remains
- what concrete new fact/event should trigger re-analysis

It is not a recommendation, not a confidence score, not a veto on execution, and not a second analysis pipeline.

## Reuse of the route-change concept

The Decision Engine already has an **internal Route-Change Check** for **unresolved** analyses: if the Determining Fact is confirmed / disproved / cannot be established in time, which route becomes impossible? That check remains internal reasoning. It is not a JSON field, not reply text, and not the old sixth “How the route changes afterwards” section (still discarded).

Decision Challenge reuses that *idea* for the **resolved** side of the same analysis call: after current facts, outcome, fork/resolution, and calibration, the model may return compact structured conclusions. It does not resurrect the rejected three-outcome block.

## Shape

Optional field on the current `AnalysisResult`:

```ts
decisionChallenge?: {
  invalidationCondition?: string
  openAssumption?: string
  reviewTrigger?: string
}
```

Old analyses without the field remain valid. There is no Prisma column and no second copy. Fallback analysis omits it. Unresolved analyses strip it even if the model sent one.

## Rules

- Structured conclusions only. No chain-of-thought.
- Zero additional AI calls. The existing generate / continue call returns the object.
- Current confirmed facts stay authoritative. Challenge may test the route; it may not rewrite it.
- Challenge never changes `decisionStatus`, lifecycle, priority, execution, Next Step, or caseMemory.
- Historical precedent and Family Office principles calibrate judgment. They are not current evidence and must not become invented current assumptions.
- Recalculated every analysis cycle. Not copied forward when the new response omits it.
- Informational only in v1: no «Пересмотреть решение» button. The user reports a real event through existing dialogue / Add circumstance / Add result.

## Surfaces

Active resolved workspace, after **Устойчивость решения** and before **Следующий шаг**. Neutral zinc. Hidden when unresolved, when no grounded fields remain, and on a normally closed case (Decision Record stays primary).

Visible during pending execution so the user can see what should make them stop and reconsider. Execution is not blocked.
