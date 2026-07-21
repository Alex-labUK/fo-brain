# Operational Brief

**Version:** 1.0  
**Status:** Draft  
**Owner:** FO Brain Reference Method

## Purpose

`OperationalBrief` is the central domain entity of FO Brain.

It represents the current operational understanding of a single `OperationalChange` and consolidates the information required to manage that situation from initial detection through resolution.

An `OperationalBrief` is not a task, ticket, chat, email thread, or generic case record.

Its purpose is to help the Head of Family Office answer three questions:

1. What is happening?
2. What matters now?
3. What should happen next?

## Scope

An `OperationalBrief` is created when a new `OperationalChange` is confirmed.

The default relationship is:

```text
One Operational Change → One Operational Brief
```

The Brief evolves as new information is received, assessed, confirmed, corrected, and acted upon.

It remains active until the Operational Change has been resolved or formally closed.

## Lifecycle

The supported lifecycle states are:

```text
Created
  ↓
Understanding
  ↓
Assessing
  ↓
Monitoring
  ↓
Decision Ready        (optional)
  ↓
Awaiting Principal    (optional)
  ↓
Executing
  ↓
Resolved
```

Not every Brief must pass through every state.

A valid non-decision path may be:

```text
Created → Understanding → Monitoring → Resolved
```

A valid decision path may be:

```text
Created → Understanding → Assessing → Decision Ready
→ Awaiting Principal → Executing → Monitoring → Resolved
```

## Data Model

### 1. Identity

Identity data establishes what the Brief is and where it came from.

```yaml
id:
createdAt:
createdBy:
lastUpdatedAt:
source:
reference:
```

### 2. Situation

Situation data represents the current management view.

```yaml
status:
priority:
whatChanged:
outcome:
currentFocus:
```

### 3. Operational Picture

The Operational Picture evolves as information is collected.

```yaml
confirmedFacts:
assumptions:
unknowns:
activeSubsystems:
subsystemAssessments:
timeline:
```

### 4. Decision Layer

The Decision Layer is optional and appears only when management judgement or Principal input is required.

```yaml
recommendation:
principalInteraction:
decisionRequest:
principalDecision:
executionStatus:
```

## Core Responsibilities

The `OperationalBrief` is responsible for:

- maintaining the current operational picture;
- consolidating confirmed information, assumptions, and unknowns;
- identifying the current management focus;
- recording active subsystems and their assessments;
- preserving the history of meaningful changes;
- preparing information for management judgement;
- recording Principal interaction when required;
- tracking the situation through execution and resolution.

## Non-Responsibilities

The `OperationalBrief` does not itself:

- analyse documents;
- generate AI recommendations;
- manage tasks or calendars;
- send communications;
- store source files;
- replace expert judgement;
- decide on behalf of the Head of FO or Principal.

Those capabilities may support the Brief, but they remain outside the aggregate's core responsibility.

## Operational Brief Aggregate

For v1.0, `OperationalBrief` is the aggregate root.

```text
OperationalBrief
├── Situation
├── ConfirmedFacts
├── Assumptions
├── Unknowns
├── ActiveSubsystems
├── SubsystemAssessments
├── Timeline
├── Recommendation
├── DecisionRequest
└── PrincipalDecision
```

All business changes to these objects must pass through the `OperationalBrief` aggregate so that its invariants remain valid.

## Success Criteria

A useful Operational Brief must be:

### Current

It reflects the latest known operational position.

### Traceable

Every material change can be traced to an actor, source, and time.

### Understandable

It translates specialist information into management language.

### Actionable

After reading it, the Head of FO understands the current focus and next meaningful step.

### Proportionate

It contains enough information to manage the situation without reproducing the full underlying correspondence or specialist documentation.

## Product Boundary for v1.0

The first implementation must support:

- Brief creation from an Operational Change;
- draft and confirmed information;
- lifecycle status;
- confirmed facts, assumptions, and unknowns;
- active subsystems;
- outcome and current focus;
- timeline entries;
- user review and correction;
- persistence and retrieval.

The following remain outside v1.0:

- Scenario Engine;
- automated Principal recommendations;
- Authority Model;
- cross-Brief dependency analysis;
- automatic learning extraction;
- task management;
- email and messaging integrations.
