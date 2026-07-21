# Operational Brief Behaviors

Version: 1.0
Status: Approved Draft
Owner: FO Brain

---

# Purpose

This document defines how the Operational Brief aggregate behaves in response to
business events.

While Invariants describe what must always be true, Behaviors describe what the
aggregate does.

---

# Behavioral Principles

1. Every behavior starts with a business event.
2. Every successful behavior changes aggregate state.
3. Every meaningful state change produces one or more Domain Events.
4. Every Domain Event creates a Timeline entry.
5. Aggregate consistency is preserved before events are published.

---

# Behavior 1 — Create Brief

Trigger:
- Operational Change detected.

Behavior:
- Create Operational Brief.
- Set Status = Created.
- Record initial source.
- Publish OperationalBriefCreated.

---

# Behavior 2 — Add Information

Trigger:
- New email, message, document or note.

Behavior:
- Attach source material.
- Extract Draft Facts.
- Detect Unknowns.
- Detect Assumptions.
- Never modify Confirmed Facts.

---

# Behavior 3 — Confirm Fact

Trigger:
- Evidence received.

Behavior:
- Confirm Draft Fact.
- Preserve provenance.
- Supersede previous Fact if necessary.

---

# Behavior 4 — Update Operational Picture

Trigger:
- Facts, Unknowns or Assumptions change.

Behavior:
- Recalculate current operational picture.
- Update completeness.
- Keep history intact.

---

# Behavior 5 — Receive Subsystem Assessment

Trigger:
- Legal, Finance, Operations or another subsystem submits an assessment.

Behavior:
- Store assessment.
- Preserve previous versions.
- Update operational picture.

---

# Behavior 6 — Define Outcome

Trigger:
- Desired operational result becomes clear.

Behavior:
- Create or update Outcome.
- Lock Outcome when execution starts.

---

# Behavior 7 — Produce Recommendation

Trigger:
- Sufficient information exists.

Behavior:
- Generate one or more Recommendations.
- Explain supporting rationale.
- Mark one Recommendation as Primary if appropriate.

---

# Behavior 8 — Request Principal Decision

Trigger:
- Principal input is required.

Behavior:
- Create decision request.
- Freeze decision context.
- Publish PrincipalDecisionRequested.

---

# Behavior 9 — Record Principal Decision

Trigger:
- Principal responds.

Behavior:
- Record decision.
- Update Brief status.
- Publish PrincipalDecisionRecorded.

---

# Behavior 10 — Execute

Trigger:
- Execution begins.

Behavior:
- Set status to Executing.
- Track execution progress.
- Record blockers and updates.

---

# Behavior 11 — Resolve Brief

Trigger:
- Outcome achieved or Operational Change completed.

Behavior:
- Set status to Resolved.
- Publish OperationalBriefResolved.
- Close active workflow.

---

# Success Criteria

The aggregate behaves correctly when:

- every behavior starts from a valid business trigger
- invariants are preserved
- domain events are emitted after successful changes
- history remains fully traceable
