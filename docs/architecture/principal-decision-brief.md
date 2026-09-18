# Principal Decision Brief

Version: 1.0  
Status: Implementation note  
Path: `docs/architecture/principal-decision-brief.md`

**Решение для Principal** is a derived presentation of the current analysis. It appears only when the current normalized `decisionAuthority.owner` is `principal` and `principalQuestion` is valid.

It is not a second Decision Engine. It does not call the model. It does not persist a brief. It does not record a Principal decision, send a message, or start an approval workflow.

## When it appears

Show only on an **active** Principal-owned judgment:

- `decisionAuthority.owner === "principal"`
- normalized authority still has `principalQuestion`
- case is not in the normal closed workspace

Hide for `family_office`, `function_owner`, missing authority, invalid Principal authority (no question), and after Principal already decided so owner is no longer `principal`.

Do not show a generic Principal brief because the case is expensive, important, urgent, or strategic.

Closed cases keep **Decision Record** primary. Closed + reopen stays conservative: no active brief until the case is actually reopened.

## Source of truth

Deterministic compression of the **current** analysis only:

| Brief field | Source |
| --- | --- |
| `question` | `decisionAuthority.principalQuestion` verbatim |
| `reason` | `decisionAuthority.reason` if concise and not generic |
| `knownFacts` | omitted unless a reliable current-case fact exists that is not already another brief line; never caseMemory, precedent, or principles |
| `remainingUncertainty` | current Determining Fact when `decisionStatus === "unresolved"` |
| `routes` | current Main Decision Fork as one block when unresolved; no A/B parser |
| `currentRoute` | current resolved decision / fork when `decisionStatus === "resolved"` |
| `evidenceNote` | Decision Support `supported` evidence, or a non-fabricated `support_not_recorded` note |
| `reconsiderIf` | Decision Challenge `invalidationCondition`, else `reviewTrigger` — one line |

No raw dialogue extraction. No new facts, risks, options, or recommendation.

## Safety

- Historical precedent is not current fact.
- Family Office principles are not current fact. Reasoning Context already shows them.
- `missing_evidence` stays in remaining uncertainty; it is not duplicated as basis.
- Next Step stays outside the brief.
- Copy uses `formatPrincipalDecisionBriefText` on the same model the UI renders.
- Copy is client clipboard only: no server write, no AI call.

## Human authority

Informational only. It does not change `decisionStatus`, lifecycle, execution, priority, caseMemory, or authority owner.
