# Family Office Brain — Decision Engine Specification

Version: 1.1  
Status: Normative  
Path: `docs/architecture/decision-engine-spec.md`

Changelog from v1.0 (external draft): reconciled with the shipped product. Route Change is now an internal-only reasoning step, never rendered to the user. The public output contract now matches what is actually implemented (5 sections + Priority + Reply), not a hypothetical 6-section contract. Authority Model cross-references the calibration findings already validated in `decision-engine.md` instead of re-deriving them. Learning Contract is marked explicitly as a manual process, not an automated one.

---

## 1. Purpose

Family Office Brain is a decision-support system.

Its purpose is not to produce generic recommendations or imitate a consultant. Its purpose is to identify the single confirmed fact required to choose the correct next route.

The system must preserve the judgement model of a specific Head of Family Office while clearly separating:

- confirmed facts;
- unknowns;
- assumptions;
- the determining fact;
- decision routes;
- authority boundaries.

This specification defines how the Decision Engine must think and what it is allowed to show the user.

The knowledge base — historical cases, validated principles, decision questions, personal calibration — is maintained separately in `decision-engine.md` and `seed-data.json`. **Those two files are edited exclusively by the project owner (with Claude as knowledge-elicitation partner), outside the application code and outside any automated write path. No engineering change may write to them.** This specification has priority over the knowledge base for *mechanics* (how the engine reasons and what it outputs); the knowledge base has priority for *content* (what has actually been learned, validated, and calibrated).

---

## 2. Core Invariants

### 2.1. One case — one main decision fork

Every analysis must identify one main fork. If several forks appear equally important, the engine has not yet found the real decision point.

### 2.2. One fork — one determining fact

Every main fork must be resolved by one determining fact — the first confirmed fact after which at least one decision route becomes impossible.

### 2.3. Questions exist only to obtain the determining fact

A question is valid only if its answer helps confirm or disprove the determining fact. Questions that do not affect the route must not be asked.

### 2.4. Fact owner follows the fact

The engine must first identify the determining fact and only then identify who can confirm it — never the reverse.

### 2.5. No unconfirmed causal claims

The engine must not present a suspected cause as a fact. (Already enforced in the current prompt — keep and reinforce, do not relax.)

### 2.6. One level of analysis at a time

The engine must not build second-level decision trees in advance. After a determining fact is confirmed (via a new user message in the case dialogue), the previous analysis cycle ends and a new cycle begins.

### 2.7. Outcome governs the analysis

Every analysis must be tied to the desired outcome.

### 2.8. Human authority remains explicit

The engine must not make irreversible, value-based, or high-authority decisions on behalf of the Principal. See §6 for the full authority model.

---

## 3. Decision Flow

```text
Input
  ↓
1. Normalize the case (internal)
  ↓
2. Define the desired outcome            → public: Outcome
  ↓
3. Identify the main decision fork       → public: Main Decision Fork
  ↓
4. Identify the determining fact         → public: Determining Fact
  ↓
5. Identify the fact owner               → public: Who can confirm this fact?
  ↓
6. Define the minimum actions            → public: How do we obtain this fact?
  ↓
7. Check how the route would change      → INTERNAL ONLY, not rendered (see §4.7)
  ↓
8. Compute Priority + Reply              → public: Priority, Reply
  ↓
9. Stop and wait for new evidence
```

Steps 2–6 and 8 map directly onto the current `AnalysisResult` shape (`sections[0..4]`, `priority`, `reply`). Step 7 is new discipline, not a new visible field.

---

## 4. Stage Contracts

### 4.1. Normalize the Case (internal)

Input: user narrative, current case facts, prior case dialogue history.

The model must internally distinguish confirmed facts, unknowns, and assumptions before reasoning further — but this scratch distinction is **not** a new rendered field. It is prompt discipline, enforced by instruction, not by a new UI surface. (Do not add a "confirmed facts / unknowns / assumptions" list to the UI — this is exactly the kind of extra field the product has been deliberately stripped of. See PRINCIPLES.md / product feedback history: minimize forms and fields, maximize conversational simplicity.)

Rules:

- Do not rewrite assumptions as facts.
- Do not infer causation from chronology alone.
- Do not add facts from other cases.
- Preserve the user's wording where it affects meaning.

### 4.2. Define the Desired Outcome

Output: one desired outcome — a state to be achieved, not an action.

Renders as section "🎯 Outcome".

### 4.3. Identify the Main Decision Fork

Output: one concrete, case-specific fork that creates materially different routes.

Renders as section "🌳 Main Decision Fork".

### 4.4. Identify the Determining Fact

Output: one determining fact — confirmable or disprovable, not a recommendation, not a list, not a document name.

Renders as section "🔑 Determining Fact".

### 4.5. Identify the Fact Owner

Output: one primary fact owner, and only if essential, one supporting owner.

Renders as section "👤 Who can confirm this fact?".

Rules:

- Do not assign a role merely because it is usually involved.
- Do not activate Legal unless a legal fact is actually required.

### 4.6. Define Minimum Actions

Output: the minimum actions required to obtain the fact.

Renders as section "📋 How do we obtain this fact?".

Rules:

- **Maximum four actions.** Enforce as a soft prompt constraint; if the model returns more than four, the UI may truncate to four and log a warning (do not silently drop — see honesty discipline in §7).
- Every action must contribute directly to confirming or disproving the determining fact.
- No general due diligence, no "nice to know" questions.

This constraint exists specifically to fight the vague, unfocused output the team hit in production (the "England estate" incident, where fallback output masqueraded as analysis and — separately — even real AI output sometimes rambled without a clear determining fact). A hard cap forces sharper output.

### 4.7. Internal Route-Change Check — reasoning only, never rendered

This stage exists **for the model's own reasoning quality, not for the user.** Before finalizing the Determining Fact, the model should internally check: if this fact is confirmed, what becomes impossible? If disproved? If it cannot be established in time? A determining fact that doesn't cleanly split into at least two of these is probably not sharp enough, and the model should revise steps 4.4–4.6 before responding.

**This must not be exposed as a rendered section, a UI element, or explanatory text in the chat reply.** The user explicitly rejected this ("факт-подтверждён, факт-опровергнут — не нужен этот блок") when it was a visible six-section block, and that decision stands for anything user-facing.

Implementation: may optionally be persisted as an internal field on the stored `AnalysisResult` (e.g. `routeChange: { ifConfirmed, ifDisproved, ifUnclear }`) purely for future debugging/observability — but no current UI component may read or display it. If persisting adds meaningful complexity, it is equally acceptable to treat this purely as a prompting instruction with no stored output at all. Either is compliant; a new visible section is not.

### 4.8. Stop and Wait

After presenting the current cycle (Outcome, Fork, Determining Fact, Fact Owner, Actions, Priority, Reply), the engine stops. When the user sends a new message in the case dialogue, the analysis cycle restarts from §4.1 with the new message as fresh evidence — this already matches how `continueAnalysisWithAI` works today.

---

## 5. Output Contract (public — what the user actually sees)

```text
1. Outcome
2. Main Decision Fork
3. Determining Fact
4. Who can confirm this fact?
5. How do we obtain this fact?
6. Priority (urgency / stake / note → traffic-light color)
7. Reply (short, 1–3 sentence natural-language message for the case chat)
```

This is the real, shipped contract — 5 analysis sections plus Priority and Reply. It differs from a hypothetical "6-section" contract that includes a visible Route Change block: that block is internal only (§4.7), never public.

Required limits:

- one outcome; one fork; one determining fact; one primary fact owner; maximum four actions.

Forbidden output (unchanged from the general discipline already in place):

- generic recommendations; long consulting commentary; repeated case summaries; unsupported causal conclusions; broad risk lists unrelated to the determining fact; multiple simultaneous forks; task-management plans; copied language from unrelated historical cases.

---

## 6. Authority Model

### 6.1. Operational

The action is reversible, already delegated, and within an approved boundary. The Family Office may act and report.

### 6.2. Escalate Before Action

The Principal must decide before execution when the action:

- creates significant legal or financial exposure;
- is difficult to reverse;
- changes an approved outcome;
- affects a sensitive family matter;
- exceeds delegated authority;
- requires a value judgement — **including low-stake, fully reversible decisions, if the subject matter itself is personal/relational rather than economic** (validated in `decision-engine.md`, Case 20: a cheap, reversible vendor swap still belongs to the principal when it touches his personal relationships).
- involves money beyond an explicitly approved amount — **this boundary is hard and not calibrated by urgency, stake size, or how "obviously right" the spend is** (validated in `decision-engine.md`, Case 21: even an objectively necessary, time-pressured budget overrun on an already-approved project requires the principal's direct approval before spending).

### 6.3. Protective Operational Action

Where a dependent person without effective decision authority faces immediate harm, the Family Office may take a reversible protective action within delegated authority while escalating the wider issue. This exception does not permit overriding a competent adult's or Principal's irreversible value-based decision.

The boundary of this exception is not the third party's legal capacity but **whose mandate the Family Office is acting under** (validated in `decision-engine.md`, Cases 16–18): the FO protects the principal's own dependents because that serves the principal's will, not because the dependent has an independent claim on the FO. A person who operationally receives instructions like a second principal (e.g. a spouse) does not thereby become an independent source of mandate — that operational parity holds only while her instructions don't require concealment from the principal himself.

### 6.4. Urgency vs. hasty action (calibration note)

When escalation is required (§6.2) but the principal is not immediately reachable, the engine's guidance should reflect what has actually been validated: **the deciding factor is not stake size but whether delay itself is the greater danger.** When acting hastily risks creating new exposure (financial/reputational disputes), wait for the principal. When delay itself increases risk (a live physical-safety threat), pursue reaching the principal and taking reversible protective measures **in parallel, not sequentially** (validated in `decision-engine.md`, Cases 9, 10, 19 — "parallel tracks", promoted to a confirmed principle).

---

## 7. Evidence Rules

Every material conclusion must be traceable to evidence. The engine must distinguish, in its own reasoning (not necessarily in separate rendered UI fields): confirmed fact, reported fact, unknown, assumption, inference, expert opinion. This is the same discipline already partially enforced in the current system prompt ("forbid unconfirmed causal claims") — this section formalizes and extends it, it does not introduce a new behavior.

---

## 8. Interaction with the Knowledge Base

`decision-engine.md` and `seed-data.json` contain: historical cases, validated principles, decision questions, personal calibration, exceptions, learning notes. They are maintained by hand, outside this codebase's write paths.

This specification governs mechanics (how the engine reasons, what it may output). The knowledge base governs content (what has actually been learned). Where §6 of this document references a case or principle, that is a pointer, not a duplicate — the authoritative text lives in `decision-engine.md`.

---

## 9. Learning Contract (currently manual, not automated)

For every closed case, the ideal capture is:

1. the original main decision fork;
2. the original determining fact;
3. the fact that actually changed the route;
4. useful vs. unnecessary questions;
5. the final decision and outcome;
6. whether an existing principle was confirmed, narrowed, or contradicted;
7. whether a new candidate principle emerged.

**This process is currently performed manually** by the project owner working through hypothetical and real cases, with Claude acting as knowledge-elicitation partner and sole editor of `decision-engine.md`/`seed-data.json`. No automated pipeline should write to those files or auto-promote a single case to a universal principle — that requires 3–5 confirmed domains by the project's own stated methodology. If an in-app "learning note" feature is ever built (e.g., the AI drafting a candidate note for a closed case, for the owner to review), that is a distinct, larger feature requiring its own scoping — not implied or required by this document.

---

## 10. Quality Criteria

An analysis passes only if:

- there is one outcome, one main fork, one determining fact;
- the fact removes at least one route when confirmed;
- the fact owner can actually confirm it;
- every action contributes directly to obtaining the fact (max 4);
- no causal statement is presented without evidence;
- the internal route-change check (§4.7) was performed, even though it is never rendered;
- authority boundaries (§6) are respected in the Reply text — the engine must not casually recommend an action that §6 would require escalating.

---

## 11. Test Set

The engine should be periodically checked against materially different case types. Already validated through hypothetical or real cases in `decision-engine.md`: repeat defect/warranty, regulatory/compliance requirement, liability dispute with client vulnerability, employment/contractor allegation, asset transaction readiness, dependent-person safety, competent-adult high-risk instruction, structural change affecting multiple records, physical security threat, routine expense with a personal/relational dimension, project budget overrun.

**Not yet covered — worth keeping in mind for future test cases:** a medical event affecting travel; a bank-initiated payment restriction.

---

## 12. Non-Goals

The Decision Engine is not:

- a CRM;
- a task manager;
- a generic chatbot;
- an autonomous Principal;
- a substitute for legal, medical, financial, or technical expertise;
- a mechanism for turning AI output directly into business truth;
- a library of rigid domain templates;
- **a forms-and-buttons interface.** The product's UX direction, established directly by the project owner, is conversational and minimal — one intake field, a chat thread per case, a traffic-light dashboard. Any future engineering work implied by this spec (structured fact-tracking, route-change persistence, etc.) must stay internal/backend and must not resurface as new visible fields, dropdowns, or forms.

---

## 13. Definition of Done for v1.1

- This specification is checked into `docs/architecture/decision-engine-spec.md`.
- The output contract in §5 matches the actual `AnalysisResult` shape (5 sections + priority + reply) — no code changes required for this alone, since it already matches.
- The max-four-actions constraint (§4.6) is reflected in the system prompt, with a truncate-and-warn fallback in code if violated.
- The internal route-change check (§4.7) is reflected in the system prompt as a reasoning instruction; persisting it as a field is optional and, if done, is never read by any UI component.
- `decision-engine.md` and `seed-data.json` are untouched by this change.
