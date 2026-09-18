# Decision Authority / Escalation

Version: 1.0  
Status: Implementation note  
Path: `docs/architecture/decision-authority.md`

FO Brain distinguishes **who confirms a fact** from **who owns the judgment**.

This is advisory governance metadata. It is not RBAC, not a permission system, and not workflow automation. It does not send anything to the Principal, create a task, block execution, or write lifecycle.

## Fact owner ≠ decision owner

Example: a lawyer can confirm legal risk. The Principal may decide whether remaining risk is acceptable. The Family Office coordinates and executes once the boundary is clear.

`👤 Who can confirm this fact?` stays the fact-owner section. **Кто принимает решение** is the decision-owner layer.

## Authority after the decision is understood

The existing Decision Engine §6 model is reused, not replaced:

- operational / delegated / reversible → Family Office
- personal, relational, residual-risk, explicit money-boundary, irreversible strategic, or protective value judgment → Principal
- narrow procedural matter inside a specialist mandate → function owner

Classification happens **after** current facts, outcome, fork, determining fact, calibration, and Decision Challenge. Authority must not invent the fork.

## Escalation discipline

- Do not escalate merely because the eventual decision might be important.
- If the current gap is a determining **fact**, obtain the fact first.
- Do not re-ask a Principal judgment already recorded in current facts / caseMemory.
- Do not treat “expensive” or “important” as Principal by itself.
- Do not invent a spending threshold. Use only an explicit current-case boundary.
- Urgent protective action for dependents must not be delayed by discretionary Principal wait where §6.3 already allows FO to act.

## Shape

Optional field on the current `AnalysisResult`:

```ts
decisionAuthority?: {
  owner: "family_office" | "principal" | "function_owner" | "unclear"
  escalationRequired: boolean
  reason?: string
  principalQuestion?: string
  functionOwner?: string
}
```

Same analysis call. Zero extra AI calls. Fallback omits the field. Malformed or insufficient output is dropped. Recalculated every cycle; not copied forward.

Normalization: `escalationRequired === true` only with `owner === "principal"` and a valid `principalQuestion`. `family_office` and `function_owner` always normalize to `escalationRequired === false`. Owner is not upgraded to Principal merely because the model also set the escalation flag.

## Surfaces

Active workspace, after **Проверка решения** and before **Следующий шаг**. Neutral zinc. Hidden on a normally closed case.
