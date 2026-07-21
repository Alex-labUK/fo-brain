# FO Brain Domain Model

Version: 1.0  
Status: Approved Draft  
Owner: FO Brain

---

# Purpose

This folder contains the domain specification for FO Brain.

It defines the business language, rules, behaviors and event model of the
Operational Brief domain.

These documents are the source of truth for implementation.

Code, APIs, AI workflows and user interfaces must conform to this domain model.

---

# Core Concept

The central domain object is the `OperationalBrief`.

An Operational Brief represents the current understanding of one Operational Change.

It answers three questions:

1. What is happening?
2. What matters now?
3. What should happen next?

The Operational Brief is not a task, ticket, chat or generic case.

---

# Reading Order

Read the documents in this order:

1. [`operational-brief.md`](./operational-brief.md)  
   Defines the central aggregate and its purpose.

2. [`operational-brief-invariants.md`](./operational-brief-invariants.md)  
   Defines the rules that must always remain true.

3. [`aggregate-boundaries.md`](./aggregate-boundaries.md)  
   Defines ownership, references and transactional consistency.

4. [`facts.md`](./facts.md)  
   Defines information accepted as true.

5. [`unknowns.md`](./unknowns.md)  
   Defines missing information that still matters.

6. [`assumptions.md`](./assumptions.md)  
   Defines unconfirmed beliefs used during analysis.

7. [`outcome.md`](./outcome.md)  
   Defines the desired operational result.

8. [`recommendation.md`](./recommendation.md)  
   Defines proposed courses of action.

9. [`subsystem.md`](./subsystem.md)  
   Defines specialist domain contributions.

10. [`operational-brief-behaviors.md`](./operational-brief-behaviors.md)  
    Defines how the aggregate reacts to business triggers.

11. [`domain-events.md`](./domain-events.md)  
    Defines the events emitted by domain behavior.

12. [`timeline.md`](./timeline.md)  
    Defines the human-readable projection of domain history.

---

# Domain Structure

```text
OperationalBrief
├── Situation
├── Facts
├── Unknowns
├── Assumptions
├── Outcome
├── Recommendations
├── Active Subsystems
├── Principal Decision Context
├── Execution State
└── Timeline Metadata
```

---

# Knowledge Model

FO Brain separates knowledge into three distinct categories:

```text
Facts
    What is accepted as true.

Unknowns
    What is still missing.

Assumptions
    What is believed but not yet confirmed.
```

These categories must never be merged.

AI may propose any of them, but only evidence or an authorised user may confirm business truth.

---

# Decision Flow

The domain model supports the following reasoning flow:

```text
Operational Change
        ↓
Facts / Unknowns / Assumptions
        ↓
Subsystem Assessments
        ↓
Outcome
        ↓
Recommendation
        ↓
Principal Decision
        ↓
Execution
        ↓
Resolution
```

Not every Operational Brief requires a Principal Decision.

Some Briefs move directly from assessment or monitoring into execution and resolution.

---

# Domain Principles

## Outcome Before Tasks

The system focuses on the desired result before implementation actions.

## Consequences Over Expertise

Expert input must explain what happens under each relevant scenario.

## Traceability

Every meaningful change must be attributable to an actor, source and time.

## Historical Integrity

Confirmed information is never silently rewritten.

Changes are recorded through supersession and append-only history.

## Explicit Uncertainty

Unknowns and Assumptions are first-class domain objects.

## AI Proposes, Humans Confirm

AI confidence never becomes business truth.

## Principal Authority

Recommendations support the Principal.

They do not replace the Principal's decision.

---

# Implementation Rules

Developers must:

- modify aggregate state only through `OperationalBrief`
- preserve all invariants
- emit domain events after successful state changes
- keep event consumers idempotent
- preserve per-aggregate event ordering
- avoid direct cross-aggregate mutation
- keep UI and persistence concerns outside domain logic

---

# Versioning

The current domain specification is Version 1.0.

Changes that clarify wording without changing behavior may remain within Version 1.x.

Changes that alter aggregate boundaries, invariants or lifecycle behavior require a new major version.

---

# Out of Scope

This folder does not define:

- database schema
- API contracts
- UI design
- infrastructure
- external integrations
- notification delivery
- AI model implementation
- task management

Those layers must depend on the domain model, not redefine it.

---

# Completion Criteria

The Domain Pack is considered implementation-ready when:

- all core entities are defined
- invariants are unambiguous
- aggregate boundaries are explicit
- behaviors map to domain events
- the lifecycle is internally consistent
- no implementation layer needs to invent business rules

---

# Source of Truth

When documentation and code disagree, one of them must be corrected immediately.

Until formally superseded, the documents in this folder define the intended domain behavior of FO Brain.
