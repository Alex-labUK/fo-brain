# Decision Engine

Version: 1.0  
Status: RFC  
Owner: FO Brain

---

# Purpose

The Decision Engine is the orchestration layer that turns new information into
an updated Operational Picture, a justified Recommendation, and—where required—
a Principal Decision.

It does not replace domain rules.

It coordinates the application of those rules in a consistent sequence.

---

# Core Responsibility

The Decision Engine answers five questions:

1. Does the new information matter?
2. What changed in the Operational Picture?
3. What are the operational consequences?
4. Is a Recommendation required?
5. Is human authority required before execution?

---

# Inputs

The engine may receive:

- email
- message
- document
- note
- system event
- contractor update
- legal or financial opinion
- Principal instruction
- execution update
- external event

Every input must retain provenance.

---

# Outputs

The engine may produce:

- Timeline entry
- Draft Fact
- Confirmed Fact proposal
- Unknown
- Assumption
- Risk
- Constraint
- Subsystem request
- updated Operational Picture
- Option set
- Recommendation
- Principal Decision request
- execution instruction
- learning candidate

Not every run produces every output.

---

# Processing Pipeline

```text
Input
  ↓
1. Intake
  ↓
2. Relevance Gate
  ↓
3. Knowledge Classification
  ↓
4. Operational Picture Update
  ↓
5. Consequence Analysis
  ↓
6. Outcome Check
  ↓
7. Option Generation
  ↓
8. Recommendation
  ↓
9. Authority Gate
  ↓
10. Execution Handoff
  ↓
11. Learning Capture
```

---

# Stage 1 — Intake

The engine records:

- source
- actor
- timestamp
- related Operational Brief
- original content
- correlation metadata

The original input is never silently rewritten.

If the input cannot be linked to an existing Brief, the system may:

- propose a new Operational Brief;
- attach it to an existing Brief with human confirmation;
- retain it as unclassified information.

---

# Stage 2 — Relevance Gate

The engine determines whether the input changes the Operational Picture.

Possible outcomes:

## No Material Change

The input:

- is recorded in the Timeline;
- does not trigger full reasoning;
- does not create a new Recommendation.

## Material Change

The engine continues through the full pipeline.

## Unclear Impact

The engine records uncertainty and requests clarification or human review.

The engine must not invent operational significance where evidence is insufficient.

---

# Stage 3 — Knowledge Classification

Relevant information is classified into distinct categories:

- Fact
- Unknown
- Assumption
- Risk
- Constraint
- Decision
- Execution Update

Classification must preserve uncertainty.

AI may propose classification.

Only evidence or an authorised user may confirm business truth.

---

# Stage 4 — Operational Picture Update

The engine calculates the proposed change to the current Operational Picture.

It must identify:

- what was added;
- what was superseded;
- what became uncertain;
- what was resolved;
- what remains unchanged.

The update must preserve all Operational Brief invariants.

No partial update may be committed.

---

# Stage 5 — Consequence Analysis

The engine evaluates the likely operational consequences of the change.

Analysis should cover only relevant dimensions, including:

- legal
- financial
- operational
- security
- timing
- reputational
- stakeholder
- service quality
- reversibility

The engine must distinguish:

- consequence;
- probability;
- severity;
- confidence.

A specialist Subsystem should be activated when general reasoning is insufficient.

---

# Stage 6 — Outcome Check

Before generating options, the engine verifies that the current Outcome remains:

- relevant;
- achievable;
- sufficiently clear;
- consistent with Principal priorities.

Possible results:

- Outcome unchanged;
- Outcome requires clarification;
- Outcome should be revised;
- Outcome is no longer achievable.

The engine must not optimise actions against an obsolete Outcome.

---

# Stage 7 — Option Generation

The engine generates only viable options.

Each option should state:

- intended result;
- required actions;
- expected consequences;
- dependencies;
- cost;
- timing;
- reversibility;
- principal risks.

The engine should minimise unnecessary choice.

Default presentation should contain no more than two recommended options unless
additional options are materially distinct.

---

# Stage 8 — Recommendation

A Recommendation may be created only when:

- the Operational Picture is sufficiently complete;
- key Unknowns are either resolved or explicitly accepted;
- the Outcome is clear;
- material consequences are understood;
- viable options have been compared.

The Recommendation must include:

- recommended option;
- rationale;
- supporting Facts;
- active Assumptions;
- unresolved Unknowns;
- risks;
- confidence;
- conditions that would change the recommendation.

The engine may explicitly conclude:

`Insufficient information to recommend.`

That is a valid output.

---

# Stage 9 — Authority Gate

The engine determines whether execution requires human authority.

Human approval is mandatory when the action:

- requires a Principal Decision;
- commits significant funds;
- creates legal obligations;
- materially changes risk;
- affects sensitive personal matters;
- changes an approved Outcome;
- exceeds delegated authority;
- is difficult or impossible to reverse.

Where authority is already delegated and rules are satisfied, the engine may
proceed to execution handoff without a new Principal Decision.

The authority basis must be recorded.

---

# Stage 10 — Execution Handoff

The Decision Engine does not become a task manager.

It creates a clear execution handoff containing:

- approved Outcome;
- selected option;
- responsible owner;
- key dependencies;
- constraints;
- decision conditions;
- escalation triggers;
- success criteria.

Execution updates return to the Operational Brief as new information.

---

# Stage 11 — Learning Capture

After execution or resolution, the engine identifies possible lessons:

- which assumptions were correct;
- which signals were missed;
- which Unknowns mattered;
- whether the Recommendation produced the intended result;
- whether the process was too slow or too complex;
- what reusable rule may be extracted.

Learning candidates are proposals.

They do not automatically become universal rules.

---

# Human Intervention Points

Human review is required when:

- classification is materially ambiguous;
- evidence conflicts;
- confidence is below the accepted threshold;
- Principal intent is unclear;
- delegated authority is uncertain;
- the consequences are severe;
- the system proposes changing a Confirmed Fact;
- the system detects conflicting Recommendations;
- ethical or personal judgement is central.

---

# Skippable Stages

Not every input requires the complete pipeline.

Examples:

## Administrative Update

```text
Intake
  ↓
Relevance Gate
  ↓
Timeline Only
```

## Confirmed Execution Update

```text
Intake
  ↓
Knowledge Classification
  ↓
Operational Picture Update
  ↓
Execution Monitoring
```

## New Material Risk

```text
Intake
  ↓
Relevance Gate
  ↓
Operational Picture Update
  ↓
Consequence Analysis
  ↓
Recommendation
  ↓
Authority Gate
```

Stages may be skipped only when the reason is explicit and traceable.

---

# State and Transaction Rules

A Decision Engine run must be:

- associated with one Operational Brief;
- idempotent;
- version-aware;
- traceable;
- atomic at aggregate commit;
- safe to retry.

If the aggregate version changed during processing, the engine must re-evaluate
against the latest Operational Picture before committing.

---

# Explainability

Every material output must answer:

- What changed?
- Which evidence supports this?
- What remains uncertain?
- Why does it matter?
- Why is this action recommended?
- What would cause the recommendation to change?

The engine must not provide unexplained conclusions.

---

# Failure Modes

The engine must safely handle:

- duplicate inputs;
- contradictory evidence;
- missing sources;
- low-confidence extraction;
- stale recommendations;
- outdated Outcomes;
- conflicting subsystem assessments;
- unavailable human authority;
- execution updates that invalidate the original plan.

Failure must not corrupt the Operational Brief.

---

# Non-Goals

The Decision Engine is not:

- a chatbot;
- a task manager;
- a generic workflow engine;
- an autonomous Principal;
- a substitute for legal, financial, medical or technical expertise;
- a mechanism for silently converting AI output into business truth.

---

# Success Criteria

The Decision Engine is successful when:

- noise does not trigger unnecessary reasoning;
- meaningful change updates the Operational Picture;
- uncertainty remains visible;
- recommendations are consequence-based and explainable;
- authority boundaries are respected;
- execution remains connected to the original Outcome;
- every important conclusion can be reconstructed from evidence and events.
