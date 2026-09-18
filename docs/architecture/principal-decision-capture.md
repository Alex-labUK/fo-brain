# Principal Decision Capture

Version: 1.0  
Status: Implementation note  
Path: `docs/architecture/principal-decision-capture.md`

**Зафиксировать решение Principal** records a human Principal judgment into the current case. It is not an approval workflow, not authentication, not messaging to Principal, and not a second Decision Engine.

The user receives the Principal's decision outside FO Brain and types it back. FO Brain does not infer, auto-approve, or select an option.

## When it appears

Show the capture action only with the Principal Decision Brief:

- current `decisionAuthority.owner === "principal"`
- valid `principalQuestion`
- active (not closed) workspace
- no structured capture already stored for this `analysisKey`

Hide for Family Office, function owner, missing authority, closed cases, and after Principal already decided so current authority is no longer Principal.

## Persisted shape

`Case.principalDecision` (nullable JSON, current cycle only):

```ts
{
  decision: string
  question: string
  decidedAt: string
  analysisKey: string
  cycleNumber?: number
}
```

`question` is the snapshot of `decisionAuthority.principalQuestion` at capture time. `analysisKey` binds the answer to the analysis that asked it.

No user identity. No approvals table. Correction after submit is not editable in v1; a later new Principal question can be captured separately.

## Authoritative path

Dedicated server action `capturePrincipalDecision`:

1. Validate current Principal authority / question / analysis ownership.
2. Atomically persist the human capture (`Case.principalDecision`, one `caseMemory` line, one user history line) in a Prisma transaction.
3. Then run existing `continueAnalysis` once through `continueCaseAnalysis({ createUserMessage: false })`.

Structured `principalDecision` is authoritative. Dialogue text `Решение Principal: …` is history. FO Brain does not detect Principal decisions by prefix later.

Human persistence does **not** wait for AI success. If continue-analysis fails, `principalDecision`, memory, and the user history line stay stored. The UI says the decision was saved and offers analysis retry. It does not ask the user to type the Principal decision again.

Continue analysis also receives `currentPrincipalDecision` as structured context. `caseMemory` keeps the 15-line cap and does not duplicate the same Principal line.

## Same judgment vs new judgment

The model is told, via CURRENT PRINCIPAL DECISION:

- do not re-ask the same Principal question
- a materially different later judgment may require Principal again
- a conditional decision is not “proceed now”
- Principal opinion does not confirm an external fact

Capture does **not** force `decisionStatus = resolved`.

## What capture does not do

- does not write `lifecycleState`
- does not mark execution completed
- does not close the case
- does not add an extra interpretation AI call

Lifecycle may later *suggest* a new state. Humans still apply it.

## Archive / reopen / Decision Record

On resolved → unresolved cycle archive, `principalDecision` is stored on the archived cycle and cleared from the active case.

On close, a historical `{ decision, question, decidedAt }` may be copied into Decision Record JSON, then the active field is cleared.

Reopen starts a new active cycle with no active `principalDecision`. The old capture remains historical.

## Duplicate capture / retry

Same `case` + `analysisKey` + question + decision:

- does not write a second `principalDecision`
- does not duplicate the `caseMemory` line
- does not duplicate the Principal user-history line
- may retry **only** the analysis, reusing the stored history line (`createUserMessage: false`)

Same `analysisKey` with a different decision is a no-op in v1 (no edit after submit). Client submit is locked while pending.

Until re-analysis succeeds, the old analysis may still say `owner=principal`. Capture UI stays hidden for that stored capture; the page can show **Решение Principal зафиксировано** and **Обновить разбор**.

## Copy brief

`Скопировать brief` is unchanged. The brief is a request for judgment, not a historical response record.
