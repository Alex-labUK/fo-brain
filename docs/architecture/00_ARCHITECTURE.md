# FO Brain — Reference Method Operating Model

**Version:** 1.0  
**Status:** Primary architectural specification  
**Nature:** This document describes how a Family Office operates. It is not a software design document.

---

## Purpose of this document

FO Brain exists to preserve, apply and evidence the operating principles of a specific family while helping the Family Office achieve the Principal's desired outcomes without losing system stability.

This specification defines the **Reference Method** — the default best-practice operating model of a Head of Family Office. A family may configure it through a **Family Constitution** (family-specific principles, delegation boundaries and explicit exceptions). The Method is applied in practice; the Constitution adjusts it for a particular family without silently replacing it.

The document explains **how the system works** before any question of tools, interfaces or implementation. When software is built, it must serve this operating model — not define it.

---

## What FO Brain is not

The Reference Method is not:

- a CRM, task manager or project-management suite
- a document repository, ERP, accounting system, calendar or email client
- a psychologist, lifestyle advisor or autonomous decision-maker
- a system that observes the Principal and infers hidden intentions, emotions or preferences

FO Brain does not replace the Principal, the Head of Family Office or subsystem owners. It preserves operating principles without requiring the platform to store the family's identity or confidential execution documents.

---

## How the Family Office operates

Every situation begins with a change in operational reality — not with a case file, not with a task list.

```text
Operational Change
        ↓
Desired Outcome          ← what success looks like
        ↓
Head of FO Focus         ← what requires personal attention now
        ↓
Subsystem Activation     ← only what materially influences the Outcome
        ↓
Mandatory State Updates  ← every significant change reported to Head of FO
        ↓
Principal Interaction    ← only when Head of FO decides it is required
        ↓
Decision Engine          ← only when progress cannot continue without judgement
        ↓
Stable Outcome + Evidence ← what the case proved about the Method
```

The Family Office optimises for **Outcome**, not for activity. Subsystems execute autonomously within their domains. The Head of Family Office retains attention for matters that cannot safely be delegated. The Principal retains decisions that belong to the Principal.

---

## 1. Operational Change

### Definition

An **Operational Change** is any event that changes the state of the Family Office.

The system does not start with a Case. It starts with an Operational Change.

Operational Changes include:

- the Principal instructed Travel to organise a trip
- a child was injured
- a bank blocked a payment
- a tenant reported a leak
- a subsystem owner reported an exception
- external conditions changed (regulatory, market, provider failure)

### What an Operational Change is not

An Operational Change is not a task. It is not a project plan. It does not assign work steps to individuals.

It is the **confirmed starting context** — what changed, from whom, and with what factual basis.

### Requirements

- The source of the change must be identifiable (Principal, Head of FO, authorised staff, external party, subsystem owner).
- Confirmed facts must be distinguished from unverified information, assumptions and suggestions.
- One Operational Change may require zero, one or many Outcomes to be defined or updated.
- One Operational Change may activate zero, one or many subsystems — but activation follows Outcome, not the mere existence of the event.

### Relationship to other concepts

| Concept | Role |
|---|---|
| Operational Change | What changed — the entry point |
| Outcome | What the Principal wants to obtain from this change |
| Subsystem activation | Who must act, with what minimum context |
| State update | What each subsystem reports back as conditions evolve |
| Case (Decision Engine) | A structured analysis episode when judgement is required |

---

## 2. Outcome

### Definition

Every Operational Change must be translated into the desired **Outcome**.

The Outcome defines what success looks like. It answers: *What does the Principal want to obtain from this?*

Examples:

- purchase a suitable investment property
- ensure the child receives appropriate care
- complete the relocation without loss of service
- cancel the trip while minimising financial loss

The Outcome is the anchor for all orchestration. The same Operational Change produces different routes depending on what the Principal wants to obtain.

### Core rule

**The system never optimises for tasks. It optimises for Outcome.**

Subsystem owners receive context and expected feedback — not step-by-step task plans. Activity that does not materially advance the Outcome is unnecessary activation.

### Clarification before action

No meaningful orchestration begins until the desired Outcome is sufficiently clear. The Family Office may ask only the questions necessary to distinguish materially different paths. It must not interrogate for its own sake or create analysis where none is required.

If a missing fact changes the route, ask. If it does not change the route, do not create unnecessary friction.

### Outcome and stability

The purpose of orchestration is movement toward the Outcome while preserving the stability of the whole system. A subsystem may be healthy in general yet irrelevant to the current Outcome; conversely, a subsystem may become critical because a deadline or dependency has changed.

---

## 3. Head of FO Focus

### Definition

The system must always identify the current **Head of FO Focus** — the area requiring the personal attention of the Head of Family Office.

Focus is not the highest-priority task. It is not the largest workstream. It is the matter that:

- cannot safely be delegated at this stage
- most directly affects the Principal, the family or system stability
- involves a critical exception, conflict between subsystems or unresolved decision
- requires the Head of FO to hold the operational picture together

Focus **changes** as subsystem state changes. When feedback arrives, when an activation closes, when a new Operational Change arrives — focus is re-evaluated.

### Focus versus delegation

The Head of Family Office does not execute every action personally. The Head activates the correct subsystems and retains personal attention for what the Method assigns to that role.

Example: after a child injury and trip cancellation, focus may be *child and family support* while Travel, Household Operations and Executive Schedule execute in parallel.

### What focus is not

Focus is not a task assignment. It is not a substitute for subsystem ownership. It is the explicit answer to: *Where must the Head of FO personally direct attention right now?*

---

## 4. Operational Subsystems

### Definition

**Operational Subsystems** are stable operational capabilities — not department names and not task lists.

Examples include Travel, Residence, Family, Health, Household Operations, Banking Operations, Legal, Security, Staff, Education, Insurance, Investment Property and Executive Schedule.

Each subsystem:

- has a defined owner role
- operates autonomously within its domain once activated
- receives only the minimum context necessary for its function
- returns results, not progress narration

### Autonomy

Subsystems are **autonomous**. The Head of Family Office orchestrates; subsystem owners execute.

Residence covers property and infrastructure. Staff covers personnel and employment matters. Household Operations covers day-to-day household readiness and staffing schedules. These are distinct capabilities and must not be conflated.

### Sources of activation

A subsystem may be activated by:

- the Principal
- the Head of Family Office
- authorised staff
- external events (which enter as Operational Changes)

**The Head of FO is not the only source of activation.** A bank blocking a payment, a tenant reporting a leak or a travel provider cancelling a booking may create the need for subsystem response regardless of who first noticed it.

### Activation rules

Activation is deliberate: a subsystem is engaged for a specific Outcome at a specific stage.

The platform must **not** activate every subsystem that could be related to an event. It activates only subsystems that can **materially influence the desired Outcome at the current stage**.

The ability not to launch unnecessary processes is part of the Method.

Each activation includes:

- **reason for activation** — why this subsystem matters now
- **role-relevant context** — only what this owner needs to act
- **expected feedback** — what result should return, not how to perform the work

### Feedback

Feedback from a subsystem is not progress narration. It is a **result**, confirmed fact, exception, changed condition or request for decision — returned to the Head of FO through the mandatory state-update rule.

---

## 5. Mandatory State Updates

### The rule

**Every subsystem must report every significant state change to the Head of Family Office.**

This applies regardless of who activated the subsystem:

- changes activated by the Principal
- changes activated by the Head of FO
- changes activated by authorised staff
- changes triggered by external events

There are no silent subsystems. If operational reality changed, the Head of FO must know.

### Why this rule exists

The Head of FO must always hold a **complete operational picture**. Delegation does not mean disappearance. Autonomy does not mean isolation.

Without mandatory state updates, the Head of FO cannot:

- maintain accurate focus
- decide when the Principal must be involved
- detect conflicts between subsystems
- assess whether the Outcome remains achievable
- invoke the Decision Engine with sufficient facts

### What counts as a significant state change

Significant state changes include:

- a confirmed result or completion
- a material exception or blocker
- a changed condition that affects the Outcome or another subsystem
- a new risk, exposure or dependency
- a need for Principal decision (routed through Head of FO judgement)
- an escalation that the owner cannot resolve within their authority

Routine internal activity that does not change the operational picture does not require reporting. Results and exceptions do.

### Minimum necessary reporting

State updates follow the same privacy principle as activation: report what the Head of FO needs to hold the picture, not the full internal story of the subsystem.

---

## 6. Principal Interaction

### The rule

The **Head of FO decides** whether the Principal should be involved.

The system never decides instead of the Principal. FO Brain may prepare choices, consequences, dependencies and professional input. It must never convert uncertainty into an assumed Principal decision.

### Two interaction types only

There are only two types of Principal interaction:

| Type | When used |
|---|---|
| **Decision Required** | The Principal must choose between paths, approve an irreversible or high-stakes action, or resolve a values-based fork |
| **Executive Update** | The Principal should be informed of material progress, outcome or risk — no decision is required |

No other interaction type replaces these. Progress narration, subsystem detail and internal FO coordination stay below the Principal layer unless the Head of FO judges that an Executive Update is warranted.

### What belongs to the Principal

The Principal retains decisions that belong to the Principal — strategic, values-based and irreversible forks. Tactical execution within an already approved boundary, where steps are reversible, belongs to the Family Office without step-by-step approval.

The exact calibration of this boundary is family-specific and belongs in the Family Constitution. The Reference Method establishes the principle; the family configures its tolerance.

### What the system must not do

- infer the Principal's decision from behaviour or indirect signals
- present a recommendation as if it were already decided
- bypass the Head of FO's judgement on whether the Principal should be contacted
- flood the Principal with subsystem-level detail

---

## 7. Decision Engine

### Position in the operating model

The **Decision Engine is not part of orchestration**.

Orchestration translates Operational Changes into Outcomes, maintains focus, activates subsystems and collects state updates. It continues as long as operational progress can proceed without structured judgement.

The Decision Engine is invoked **only when operational progress cannot continue without judgement**.

### When to invoke

Invoke the Decision Engine when:

- the desired Outcome is clear but the route is not
- subsystem feedback conflicts
- responsibility is disputed
- a decision belongs to the Principal but requires structured preparation
- a local decision may have system-wide consequences
- a situation may confirm, modify or challenge an operating principle

If none of these apply, orchestration continues. Do not open a Decision Engine case merely because an Operational Change occurred.

### What the Decision Engine produces

The Decision Engine structures:

- confirmed facts
- open questions that change the route
- options and consequences
- a recommendation when appropriate — never a Principal decision
- the required Principal decision, if any
- operational constraints for subsystem owners
- evidence impact on principles

The Decision Engine does not replace subsystem execution. It resolves ambiguity so orchestration can resume or so the Head of FO can route a Decision Required interaction to the Principal.

### Relationship to Cases

A **Case** in the Decision Engine sense is an analysis episode — linked to an Outcome, not a substitute for it. The recorded result of a Case informs orchestration and evidence review; it does not become the primary unit of Family Office operation.

---

## 8. Operational Feed

### Definition

The main operational view of the platform is not a list of cases.

It is an **Operational Feed** — a chronological stream of:

- Operational Changes (what changed, from whom, when)
- Outcome updates (stage, focus, success condition)
- subsystem state updates (results, exceptions, changed conditions)
- Principal interactions (Decision Required, Executive Update)
- Decision Engine episodes when invoked

The feed answers: *What is happening in the Family Office right now, and what requires attention?*

### What the feed is not

The feed is not:

- a task board
- a case archive sorted by domain
- a dashboard of static metrics
- a dump of all subsystem internal activity

It is the **live operational picture** — ordered in time, filtered by significance, centred on Outcomes and focus.

### How the Head of FO uses the feed

From the feed, the Head of FO can:

- see the current focus and active Outcomes
- trace which Operational Changes are in play
- read subsystem state updates as they arrive
- identify exceptions and conflicts before they spread
- decide when to involve the Principal
- open the Decision Engine when judgement is blocked

Cases appear in the feed when they exist — as analysis episodes — not as the organising principle of the workspace.

---

## 9. Method Principles

The following principles are **already established** in the Reference Method. They are not new proposals. They govern every part of the operating model above.

### Outcome and orchestration

| Principle | Statement |
|---|---|
| **Outcome first** | Every Operational Change must be translated into what the Principal wants to obtain before meaningful orchestration begins. |
| **Optimise for Outcome, not tasks** | The system never optimises for activity. Subsystems receive expected feedback, not task plans. |
| **Activate only what matters now** | Activate only subsystems that materially influence the desired Outcome at the current stage. |
| **Activate systems, do not perform all work** | The Head of FO orchestrates; subsystem owners execute within their domains. |

### Principal and authority

| Principle | Statement |
|---|---|
| **Do not decide for the Principal** | The Principal retains decisions that belong to the Principal. The system prepares; it does not assume. |
| **Head of FO decides Principal involvement** | Only two interaction types: Decision Required and Executive Update. |
| **Work from confirmed facts** | Distinguish confirmed facts, user decisions, system suggestions and unresolved assumptions. |

### Information and context

| Principle | Statement |
|---|---|
| **Minimum necessary context** | Each role receives only the context necessary to perform its function. |
| **Role-relevant context** | The same Operational Change produces different context for different subsystem owners. |
| **Feedback is not progress narration** | Subsystems return results, exceptions and changed conditions — not activity reports. |
| **Mandatory state updates** | Every significant subsystem state change must reach the Head of FO, regardless of activation source. |

### Stability and consequences

| Principle | Statement |
|---|---|
| **Preserve stability** | Movement toward the Outcome must not destabilise the wider system. |
| **Localize consequences** | Strong private operations prevent a local failure from becoming a system-wide crisis. |
| **Authority depends on consequence** | A routine decision may become system-critical when it affects family arrival, security, legal exposure, confidentiality or another subsystem's ability to function. |

### Method evolution

| Principle | Statement |
|---|---|
| **Confirm before improving** | After a situation resolves, the default is not forced improvement. A case may confirm the existing Method worked correctly. |
| **Evidence, not assumption** | Improvement is justified only when evidence supports a change. Patterns do not automatically become principles. |
| **Explicit overrides** | Family-specific rules that differ from the Reference Method must be explicit, authorised and visible — not hidden habit. |

### Privacy and scope

| Principle | Statement |
|---|---|
| **Privacy by data minimization** | The Method does not require most sensitive identity or execution data. Use role labels and functional facts where possible. |
| **Separation of operating knowledge and identity** | Operating principles, Outcomes, activations and evidence live separately from names, documents, bank details and medical records. |
| **One Question Rule** | Every proposed capability must answer: Does this preserve, apply or develop the operating principles of this specific family? If not, it is not core. |

### Prohibited inference

The Method must not:

- infer emotions from behaviour
- infer intentions from indirect signals
- infer family preferences from a single situation unless explicitly confirmed
- automatically promote patterns to family principles
- store sensitive detail merely because it appeared in a source message

---

## Reference Method and Family Constitution

### Reference Method

The Reference Method is the product's default best-practice operating model — derived from validated professional experience. A family adopts it to strengthen practice, not to have the platform passively mirror existing habits.

### Family Constitution

The Family Constitution is the family-specific configuration:

- principles and explicit exceptions
- delegation boundaries (what the Head of FO may decide alone)
- communication rules (what reaches the Principal, through which channel)
- privacy and service standards
- calibration of the Principal-involvement boundary

Overrides must state: the Reference Method principle, the family-specific rule, its scope, authorization and reason. Overrides are not errors; hidden overrides are failures of the operating model.

### Principle lifecycle

Principles move through human authorization:

```text
Candidate → Review → Confirmed (Reference or Family) → Superseded / Retired
```

After a resolved situation, evidence may show:

| Evidence outcome | Meaning |
|---|---|
| **Confirmed** | Existing principle and response worked correctly |
| **Modified** | Evidence supports changing wording, scope or implementation |
| **Challenged** | Evidence conflicts with a principle; review required |
| **New candidate** | A repeatable rule may exist but is not yet confirmed |
| **No principle impact** | Situation handled correctly; no Method knowledge added |

AI may suggest candidate wording. Only an authorised human may confirm, modify, override or retire a family principle.

---

## Canonical example: Normandy trip cancellation

A planned ten-day road trip is cancelled after a child is injured. This example shows the operating model in sequence — not as a software workflow.

### Operational Change

Child injured during a family activity. Planned Normandy road trip must be cancelled. Family will remain at the residence. Hotel and flight bookings require unwinding.

### Outcome

Support the family through the injury and unwind the trip with minimum financial loss.

### Head of FO Focus

Child and family support — not travel logistics, not calendar detail.

### Subsystem activations

| Subsystem | Role-relevant context | Expected feedback |
|---|---|---|
| **Family** | Youngest child injured; family trip cancelled | Confirm immediate support needs; flag anything requiring Head of FO attention |
| **Health** | Youngest child has broken an arm | Confirm medical assessment, treatment status, additional assistance needed |
| **Travel** | Normandy trip and related travel cancelled | Report what was cancelled, retained deposits, unavoidable financial exposure |
| **Household Operations** | Family remains at residence instead of travelling | Confirm household staffing and operational readiness adjusted |
| **Executive Schedule** | Couple will not travel; schedule may change | Confirm affected calendar items updated |
| **Insurance** | Trip cancelled due to documented child injury | Confirm coverage, claim requirements, recoverable losses |

Residence and Staff are **not** activated unless a separate property or employment issue exists. Household Operations handles day-to-day readiness; Residence handles infrastructure; Staff handles HR and employment.

### Mandatory state updates (as they arrive)

- Medical appointment confirmed
- Flights refunded
- Two hotels: free cancellation; two non-refundable; one 50% penalty
- Household staffing plan adjusted
- Calendar updated

Each update reaches the Head of FO. Focus may shift as health stabilises and financial exposure becomes the remaining concern.

### Principal interaction

- **Executive Update** as material results arrive (medical status, financial exposure)
- **Decision Required** if insurance claim strategy or deposit retention requires Principal choice

The Head of FO decides when each applies — not the system.

### Decision Engine (when judgement is blocked)

Invoked for structured analysis when operational progress cannot continue without it:

- negotiate deposit retention for future stay
- assess insurance claim based on medical cancellation grounds

Orchestration pauses on these points; it does not start here.

### Evidence after resolution

- Travel booking policy updated toward flexible or loyalty-friendly conditions (**Modified**)
- Broader resilience principle of preserving optionality and backup routes (**Confirmed**)
- Role-based activation, focus and minimum context model (**Confirmed**)

---

## Product promise

FO Brain preserves the Reference Method, configures it through the Family Constitution, applies it through subsystem activation and records evidence from real situations — without requiring the core platform to store the family's identity or confidential execution documents.

We do not sell CRM. We do not sell AI. We do not train employees. We preserve the operating principles of your family — specifically your family.

---

## Document navigation

| Section | Content |
|---|---|
| §1 Operational Change | Entry point of the operating model |
| §2 Outcome | What success looks like |
| §3 Head of FO Focus | Personal attention, not highest-priority task |
| §4 Operational Subsystems | Autonomous capabilities and activation sources |
| §5 Mandatory State Updates | Complete operational picture for Head of FO |
| §6 Principal Interaction | Decision Required / Executive Update only |
| §7 Decision Engine | Invoked only when judgement blocks progress |
| §8 Operational Feed | Chronological operational view, not case list |
| §9 Method Principles | Established architectural principles |
| Reference Method & Constitution | Configuration layer |
| Normandy example | Canonical walkthrough |
