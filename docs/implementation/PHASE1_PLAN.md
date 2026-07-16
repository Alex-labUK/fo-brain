# Phase 1 — Implementation Plan (Approved, Corrected)

**Scope:** Outcome-first orchestration intake → draft subsystem suggestions → human confirm/exclude/edit → optional Decision Engine case.

**Out of scope:** Event, Feedback, Stability, `markOutcomeStable`, `OutcomeStage.stable`, Family Constitution, AI, integrations, DE module-folder move.

---

## Architecture corrections (approved 2026-07-16)

1. **Decision Engine files stay in place** — no move to `src/modules/decision-engine/` in Phase 1.
   - Keep: `src/components/wizard/CaseWizard.tsx`, `WizardStepper.tsx`, `src/app/cases/new/actions.ts`
   - Modify only: `Case.outcome` → `recordedResult`, optional `outcomeId`, prefill from Outcome.

2. **No Stability in Phase 1** — `OutcomeStage`: `draft | active | cancelled` only. No `markOutcomeStable`.

3. **Draft subsystem proposals only** — `src/core/orchestration/draft-subsystem-proposals.ts` (keyword rules are temporary, not Reference Method). User can confirm, exclude, edit context/feedback, or manually add subsystems.

4. **`Outcome.headFocus`** — optional manual field; not auto-calculated in Phase 1.

5. **Routes:** `/requests/new`, `/outcomes/[id]`, `/cases/new?outcomeId=...`

6. **`src/app/cases/new/actions.ts`** stays in place — no re-export layer.

7. **New folder:** `src/core/orchestration/` only.

---

## Primary user flow

```text
/requests/new
  Step 1: Request facts + Desired Outcome + headFocus (optional)
  Step 2: Draft subsystem suggestions (confirm / exclude / edit / add manual)
  Step 3: Save → /outcomes/[id]
/outcomes/[id]
  View Outcome + activations + headFocus
  Optional: «Open Decision Engine» → /cases/new?outcomeId=…
/cases/new, /cases/[id], dashboard
  Unchanged paths; recordedResult rename + optional outcomeId link
```

---

## Implementation order

| # | Area | Files |
|---|------|-------|
| 1 | Prisma schema + migration | `prisma/schema.prisma`, `prisma/migrations/.../migration.sql` |
| 2 | Subsystem seed catalogue | `data/subsystems.json`, `src/lib/seed-database.ts` |
| 3 | Orchestration core | `src/core/orchestration/types.ts`, `draft-subsystem-proposals.ts`, `outcome-id.ts`, `actions.ts` |
| 4 | Orchestration wizard | `src/app/requests/new/page.tsx`, `OrchestrationWizard.tsx` |
| 5 | Outcome page | `src/app/outcomes/[id]/page.tsx`, `OutcomeList.tsx`, `ActivationCard.tsx` |
| 6 | DE compatibility | `CaseWizard.tsx`, `cases/new/actions.ts`, `cases/new/page.tsx`, `cases/[id]/page.tsx` |
| 7 | Dashboard + header | `src/app/page.tsx`, `AppHeader.tsx`, `labels.ts`, `StatusBadge.tsx` |
| 8 | Build + regression | `npm run build`, migration deploy, manual checklist |

---

## File-by-file summary

### Database
- **MODIFY** `prisma/schema.prisma` — Outcome, Subsystem, Activation; `Case.recordedResult`, `Case.outcomeId`
- **ADD** migration preserving existing `outcome` column data as `recordedResult`

### Seed
- **ADD** `data/subsystems.json` — 10 subsystem catalogue entries
- **MODIFY** `src/lib/seed-database.ts` — `seedSubsystems()` always runs

### Orchestration (`src/core/orchestration/`)
- **ADD** `types.ts`, `draft-subsystem-proposals.ts`, `outcome-id.ts`, `actions.ts` (`createOutcomeWithActivations`)

### Routes
- **ADD** `src/app/requests/new/page.tsx`, `OrchestrationWizard.tsx`
- **ADD** `src/app/outcomes/[id]/page.tsx`

### Components
- **ADD** `OutcomeList.tsx`, `ActivationCard.tsx`
- **MODIFY** `AppHeader.tsx`, `StatusBadge.tsx`, `labels.ts`
- **MODIFY** `CaseWizard.tsx` — recordedResult, outcomeId, prefill props (location unchanged)

### DE actions (in place)
- **MODIFY** `src/app/cases/new/actions.ts` — recordedResult, outcomeId, revalidate outcome path

### Dashboard
- **MODIFY** `src/app/page.tsx` — active outcomes section

### Explicitly NOT changed in Phase 1
- `WizardStepper.tsx` (no logic changes)
- DE file locations
- `src/modules/decision-engine/`
- Event, Feedback, Stability APIs
