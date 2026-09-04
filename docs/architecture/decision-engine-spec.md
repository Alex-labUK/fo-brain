# Family Office Brain — Decision Engine Specification

Version: 1.5  
Status: Normative  
Path: `docs/architecture/decision-engine-spec.md`

Changelog from v1.4: Previous Decision Cycle as hard historical context. The most recent completed `decisionCycleHistory` record is injected into analysis (and fork self-repair) as structured evidence. Free-text caseMemory / Past-Fact wording remains secondary. No extra model call. Reopen/lifecycle/execution mechanics unchanged. v1.4 also added one-shot action-shaped fork self-repair (max two model calls; monotonic Past-Fact acceptance).

Changelog from v1.3: Past-Fact / Route Consistency Guard. Confirmed historical facts constrain the live route space. A completed or irreversible event cannot appear as a future branch of Main Decision Fork unless the current user message explicitly corrects or supersedes that fact. A completed decision plus a new downstream problem is a new decision cycle, not a reconstruction of the old one. Resolved analyses keep resolution-statement behavior and skip this guard.

Changelog from v1.2: Fork–Fact–Actions Separation. For unresolved analyses, Main Decision Fork is two materially different decision routes/outcomes, Determining Fact selects between those routes, and Actions are only methods to obtain or confirm the fact. Method-vs-method forks (expertise vs waiting, request vs lawyer) are invalid. Resolved analyses keep the resolution-statement behavior and skip this validation.

Changelog from v1.1: added `decisionStatus` (`unresolved` | `resolved`). An analysis may now terminate the decision fork when the relevant uncertainty is gone, without inventing a new Determining Fact to preserve the five-section shape. Resolved is not case closure: execution may continue after the decision is determined.

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

Every **unresolved** analysis must identify one main fork. If several forks appear equally important, the engine has not yet found the real decision point. The fork is a choice between decision routes/outcomes, not between investigation methods.

When the decision is **resolved**, do not fabricate a new binary fork. Keep the Main Decision Fork section, but fill it with a concise resolution statement (for example: «Решение определено: завершить сделку в согласованный срок.»). Do not run Fork–Fact–Actions pair validation against a resolution statement.

### 2.2. One fork — one determining fact

Every **unresolved** main fork must be resolved by one determining fact — the first confirmed fact after which at least one decision route becomes impossible.

A determining fact is required **only while a genuine decision fork remains**. When the relevant uncertainty is gone, do not invent a new fact, and do not treat “no new circumstances” as a Determining Fact.

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

### 2.9. Decision resolution is not case closure

`decisionStatus` answers whether a genuine choice still needs a determining fact. It does **not** answer whether the case is operationally finished.

- `unresolved` — a real decision fork still exists and at least one determining fact is still needed.
- `resolved` — the relevant uncertainty has been sufficiently resolved, the route is clear, and no additional determining fact is required before acting.

A decision can be resolved while the case is still executing. Example: the Principal has decided to buy, all risk questions are resolved, but legal completion has not yet occurred. Decision = resolved. Lifecycle may still be `executing`.

The engine must not invent new uncertainty merely to preserve the five-section output structure. It must not ask to reconfirm facts already recorded in case memory unless the user explicitly says circumstances changed. If case memory says the Principal already approved the route, the engine must not pretend a Principal decision is still pending.

### 2.10. Confirmed historical facts constrain the route space

A completed or irreversible event cannot appear as a future branch of Main Decision Fork unless the current user message explicitly corrects or supersedes that fact, or the event is shown to be reversible.

**Old decision ≠ new downstream decision.** When a completed decision creates a new problem further down the chain, analyse that new uncertainty as a new decision cycle. Do not reconstruct the already-completed decision.

Confirmed: “The purchase completed.”

- Bad: “Complete or delay completion.”
- Good: “New municipal review creates owner obligations or no additional obligations.”

### 2.11. Previous Decision Cycle Context

`decisionCycleHistory` is structured historical decision evidence. The most recent completed cycle — not the full 20-cycle archive — is passed to analysis as a dedicated **PREVIOUS COMPLETED DECISION CYCLE** block.

Rules:

- the most recent completed cycle constrains the current route space;
- completed execution is not a live route;
- a new downstream uncertainty starts a new decision cycle;
- old decision ≠ new decision;
- explicit correction or reversal in the current user message may supersede historical context.

This constrains Outcome, Main Decision Fork, Determining Fact, Priority, and Reply. Reopen suggestion remains deterministic from the analysis; if the analysis is about the new cycle, the suggestion is too. Lifecycle stays human-controlled.

Previous cycle: purchase resolved, execution completed.

- Bad Outcome: “Complete the purchase without legal risk.”
- Good Outcome: “Minimise post-completion legal and financial exposure arising from the municipal reconsideration.”

---

## 3. Decision Flow

```text
Input
  ↓
1. Normalize the case (internal)
     confirmed / unresolved / assumptions / irreversible completed events
  ↓
1b. Remove routes that confirmed facts have already made impossible (internal; unresolved only)
  ↓
2. Define the desired outcome            → public: Outcome
  ↓
2a. Resolution check (internal)          → public: decisionStatus
  ↓
3. Identify the main decision fork       → public: Main Decision Fork
     (live routes only; or a resolution statement if resolved)
  ↓
4. Identify the determining fact         → public: Determining Fact
     (or the terminal “no further fact required” value if resolved)
  ↓
5. Identify the fact owner               → public: Who can confirm this fact?
     (omitted / empty if resolved)
  ↓
6. Define the minimum actions            → public: How do we obtain this fact?
     (unresolved: fact-gathering; resolved: execution steps only)
  ↓
7. Check how the route would change      → INTERNAL ONLY, not rendered (see §4.7)
     plus Fork–Fact–Actions and Past-Fact consistency (skip when resolved)
  ↓
8. Compute Priority + Reply              → public: Priority, Reply
  ↓
9. Stop and wait for new evidence
```

Steps 2–6 and 8 map directly onto the current `AnalysisResult` shape (`decisionStatus`, `sections[0..4]`, `priority`, `reply`). Step 2a is prompt discipline plus a stored field; it is not a new card. Steps 1b and 7 are reasoning discipline, not new visible fields. Fork–Fact–Actions validation happens only after impossible historical routes have been eliminated.

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
- Identify irreversible / already completed events. Confirmed caseMemory facts actively constrain later routes; they are not background colour.

### 4.2. Define the Desired Outcome

Output: one desired outcome — a state to be achieved, not an action.

Renders as section "🎯 Outcome". Keep the current outcome when the analysis becomes resolved.

### 4.2a. Resolution check (internal, then `decisionStatus`)

Before forcing a new Main Decision Fork / Determining Fact, the model must ask internally:

- Is there still a genuine unresolved choice?
- Is there still a fact whose confirmation would change the route?
- Has the Principal decision already been made (facts + caseMemory)?
- Are the requested facts already confirmed in caseMemory / current facts?
- Is the case now simply executing an already-determined route?

If no genuine unresolved decision remains, set `decisionStatus = resolved`. Missing or invalid `decisionStatus` in stored JSON defaults to `unresolved`, so older analyses keep the previous five-section rules.

Do not confuse resolved decision with closed case. Lifecycle suggestion may receive `decisionStatus` as advisory context; the engine must not auto-apply lifecycle.

### 4.3. Identify the Main Decision Fork

**Main Decision Fork is not “what should we do to find out?” It is “which decision route applies once the determining fact is known?”**

| Piece | Meaning |
| --- | --- |
| Fork | two materially different decision routes, consequences, or outcomes |
| Fact | the one fact that selects between those routes |
| Actions | methods to obtain or confirm that fact |

A valid unresolved fork answers: if the determining fact is X, which route becomes appropriate? If it is not X, which different route becomes appropriate?

The fork must **not** primarily describe actions, investigations, information-gathering methods, people to contact, requests to send, waiting versus asking, or expert review versus authority confirmation. Those belong in Actions unless they are genuinely alternative strategic routes.

**Invalid (methods, not routes):** «Провести экспертизу или ждать ответа.»

**Valid (routes selected by a fact):** «Повторное рассмотрение создаёт для нового собственника существенные обязательства / риск либо не требует дополнительных действий.» — selected by whether the authority requires additional expertise, works, or other obligatory steps.

**Confirmed historical facts constrain the route space.** A completed or irreversible event cannot appear as a future branch of Main Decision Fork unless explicitly corrected or shown to be reversible.

Confirmed: “The purchase completed.”

- Bad: “Complete or delay completion.”
- Good: “New municipal review creates owner obligations or no additional obligations.”

Old decision ≠ new downstream decision. Do not propose a route that contradicts a confirmed caseMemory fact unless the current user message explicitly corrects or supersedes that fact.

Output:

- unresolved — one concrete, case-specific fork that creates materially different **decision routes / consequences / outcomes**, not a pair of fact-finding methods;
- resolved — a concise resolution statement, not a fabricated binary fork. Do **not** apply Fork–Fact–Actions or Past-Fact validation as if the analysis were unresolved.

Renders as section "🌳 Main Decision Fork". The section stays even when resolved, because the existing UI expects it. The A–D Fork–Fact–Actions check is internal only and must not appear in UI or reply.

If an **unresolved** AI result is otherwise usable but Main Decision Fork is flagged by `unresolvedForkLooksLikeActionMethods` (action/method-shaped, including wait vs act), the engine may make **one** additional model call to rewrite the fork as the two states selected by the Determining Fact. Normal analysis is one model call; this path is at most two total. There is no loop.

A repair may improve an analysis but must not invalidate an already-satisfied Decision Engine invariant. The repaired result replaces the original only if it is still unresolved, not action-shaped, **and** does not contradict confirmed completed facts (`unresolvedForkContradictsCompletedFacts`, using caseMemory plus the current user message). An explicit correction in the current message may supersede old memory; without it, reconstructing a completed decision (for example complete vs delay after «Сделка завершена») is rejected and the original usable result is kept. No second repair call. If the repair fails, returns invalid JSON, is still action-shaped, or breaks Past-Fact consistency, keep the first usable result and log why. Resolved analyses never enter this repair path. Do not repair merely stylistic wording. Lifecycle suggestion remains a separate, unchanged call.

### 4.4. Identify the Determining Fact

The Determining Fact is the **route selector**. Internally (unresolved only), the model must verify:

- Does this fact actually decide between the two fork routes?
- If confirmed, does at least one route become inappropriate or impossible?
- If disproved, does a materially different route become appropriate?

If not, the fork/fact pair is invalid and must be rewritten before JSON output. This strengthens the existing internal route-change check (§4.7). Skip this pair-validation when `decisionStatus = resolved`.

Output:

- unresolved — one determining fact — confirmable or disprovable, not a recommendation, not a list, not a document name;
- resolved — a terminal value such as «Определяющий факт больше не требуется — ключевая неопределённость устранена.»

Renders as section "🔑 Determining Fact".

### 4.5. Identify the Fact Owner

Output:

- unresolved — one primary fact owner, and only if essential, one supporting owner;
- resolved — empty. Do not invent a fact owner.

Renders as section "👤 Who can confirm this fact?". The UI may omit the section when it has no role assignments.

Rules:

- Do not assign a role merely because it is usually involved.
- Do not activate Legal unless a legal fact is actually required.
- Do not ask a lawyer or expert to reconfirm a fact already recorded in caseMemory unless the user explicitly says circumstances changed.

### 4.6. Define Minimum Actions

Actions answer: **how do we obtain or confirm the Determining Fact?** They stay operational: contact an authority, request a document, obtain an expert report, inspect an asset, get a legal opinion. Do not promote these methods into the Main Decision Fork unless they are genuinely alternative strategic routes rather than fact-finding methods.

Output:

- unresolved — the minimum actions required to obtain the fact;
- resolved — only real next execution step(s), not information-gathering. Example: «Завершить сделку в согласованный срок.» If nothing material remains to execute, the list may be empty.

Renders as section "📋 How do we obtain this fact?". The UI may omit the section when the list is empty.

Rules:

- **Maximum four actions.** Enforce as a soft prompt constraint; if the model returns more than four, the UI may truncate to four and log a warning (do not silently drop — see honesty discipline in §7).
- Unresolved: every action must contribute directly to confirming or disproving the determining fact.
- Resolved: actions must not re-collect already confirmed facts.
- No general due diligence, no "nice to know" questions.

This constraint exists specifically to fight the vague, unfocused output the team hit in production (the "England estate" incident, where fallback output masqueraded as analysis and — separately — even real AI output sometimes rambled without a clear determining fact). A hard cap forces sharper output.

### 4.7. Internal Route-Change Check — reasoning only, never rendered

This stage exists **for the model's own reasoning quality, not for the user.** It applies only while `decisionStatus = unresolved`. Before finalizing the Determining Fact, the model should internally check: if this fact is confirmed, what becomes impossible? If disproved? If it cannot be established in time? A determining fact that doesn't cleanly split into at least two of these is probably not sharp enough, and the model should revise the Fork, Determining Fact, and Actions before responding.

The same internal pass includes Fork–Fact–Actions Separation (unresolved only, never shown in UI):

- **A. Fork test** — both sides are actual decision routes/outcomes, not methods.
- **B. Fact test** — one factual answer selects between those routes.
- **C. Action test** — actions are only methods to obtain or confirm that fact.
- **D. Leakage test** — no action accidentally appears inside Main Decision Fork. If D = yes, rewrite the fork.

Do not apply A–D when `decisionStatus = resolved`.

The same internal pass includes Past-Fact Consistency (unresolved only, never shown in UI). For each side of Main Decision Fork:

1. Is this route still physically, legally, or operationally available?
2. Does it contradict any confirmed fact?
3. Does it assume an already completed event is still pending?
4. Is this actually an old decision rather than the current new uncertainty?

If any answer indicates inconsistency, rewrite the fork before output. Skip this guard for resolution statements (`decisionStatus = resolved`).

**This must not be exposed as a rendered section, a UI element, or explanatory text in the chat reply.** The user explicitly rejected this ("факт-подтверждён, факт-опровергнут — не нужен этот блок") when it was a visible six-section block, and that decision stands for anything user-facing.

Implementation: may optionally be persisted as an internal field on the stored `AnalysisResult` (e.g. `routeChange: { ifConfirmed, ifDisproved, ifUnclear }`) purely for future debugging/observability — but no current UI component may read or display it. If persisting adds meaningful complexity, it is equally acceptable to treat this purely as a prompting instruction with no stored output at all. Either is compliant; a new visible section is not.

### 4.8. Stop and Wait

After presenting the current cycle (decisionStatus, Outcome, Fork, Determining Fact, Fact Owner, Actions, Priority, Reply), the engine stops. When the user sends a new message in the case dialogue, the analysis cycle restarts from §4.1 with the new message as fresh evidence — this already matches how `continueAnalysisWithAI` works today.

If the new message answers the current Determining Fact **and** a genuine next fork remains, move to that next fact. If no genuine next fork remains, set `decisionStatus = resolved` instead of inventing the next fact.

---

## 5. Output Contract (public — what the user actually sees)

```text
0. decisionStatus (unresolved | resolved) — compact label only, not a new card
1. Outcome
2. Main Decision Fork   (fork while unresolved; resolution statement while resolved)
3. Determining Fact     (missing fact while unresolved; terminal value while resolved)
4. Who can confirm this fact?  (required while unresolved; omitted while resolved)
5. How do we obtain this fact? (fact-gathering while unresolved; execution steps or empty while resolved)
6. Priority (urgency / stake / note → traffic-light color)
7. Reply (short, 1–3 sentence natural-language message for the case chat)
```

This is the real, shipped contract — 5 analysis sections plus Priority, Reply, and an additive `decisionStatus` on `AnalysisResult`. It differs from a hypothetical "6-section" contract that includes a visible Route Change block: that block is internal only (§4.7), never public. Older stored JSON without `decisionStatus` is treated as `unresolved`.

Required limits:

- unresolved: one outcome; one fork; one determining fact; one primary fact owner; maximum four actions;
- resolved: one outcome; resolution statement instead of a fork; no invented determining fact; no fact owner; execution actions only (may be empty).

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

- `decisionStatus` is `unresolved` or `resolved`, and matches whether a genuine fork remains;
- unresolved: there is one outcome, one main fork, one determining fact;
- unresolved: the fact removes at least one route when confirmed;
- unresolved: Fork is decision routes, Fact is the route selector, Actions are fact-acquisition methods — not a method-vs-method fork;
- unresolved: both fork routes are still possible given confirmed facts; a completed event is not treated as a live future branch;
- unresolved: the fact owner can actually confirm it;
- unresolved: every action contributes directly to obtaining the fact (max 4);
- resolved: the engine did not invent a new uncertainty, a fake Principal wait, or a reconfirmation of an already-known fact;
- resolved: Fork–Fact–Actions validation was not applied as if the analysis were still unresolved;
- no causal statement is presented without evidence;
- the internal route-change check (§4.7) was performed when unresolved, even though it is never rendered;
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

## 13. Definition of Done for v1.2 / v1.3 / v1.4 / v1.5

v1.5:

- Most recent completed `decisionCycleHistory` cycle is compact historical context for analysis and one-shot fork repair. Not the full archive.
- Outcome, Fork, Priority, and Reply must not reconstruct a completed historical action unless the current message explicitly corrects or reverses it.
- Reopen suggestion stays deterministic from analysis. Lifecycle remains human-controlled. No extra AI call.

v1.4 amendment — action-shaped fork self-repair:

- Unresolved analyses whose Main Decision Fork is flagged as action/method-shaped may receive **one** repair model call. Maximum 2 model calls total. No recursive repair.
- Repair is accepted only if it restores Fork shape **without** breaking Past-Fact consistency. Otherwise keep the first usable result.
- Repair output is normalized the same way as any other analysis. Failure keeps the first usable result.
- Resolved analyses skip repair. Lifecycle / reopen / execution are unchanged.

v1.4:

- Confirmed historical facts constrain unresolved Main Decision Fork. Completed/irreversible events cannot be future branches unless explicitly corrected or shown to be reversible.
- Prompt includes an internal Past-Fact Consistency Test, not shown in UI. Fork–Fact–Actions runs only after impossible historical routes are removed.
- Soft advisory helper may warn when an unresolved fork still treats a confirmed completed event as pending; it must not hard-fail.
- Reopen / lifecycle / execution mechanics are unchanged. A closed case may receive a new unresolved analysis about the downstream issue; the engine must not auto-reopen or reconstruct the completed decision.
- Resolved analyses keep the resolution-statement behavior and skip this guard.

v1.3:

- Unresolved Main Decision Fork is decision routes/outcomes, not fact-finding methods. Determining Fact selects the route. Actions obtain/confirm the fact.
- Prompt includes an internal A–D Fork–Fact–Actions check, not shown in UI.
- Soft advisory helper may warn on obviously action-shaped unresolved forks; it must not hard-fail valid analyses.
- Resolved analyses keep the v1.2 resolution-statement behavior and skip Fork–Fact pair validation.

v1.2:

- `AnalysisResult` stores additive `decisionStatus`: `unresolved` | `resolved`. Missing values default to `unresolved`.
- Unresolved analyses keep the previous five-section rules (fork + determining fact + sources + fact-gathering actions).
- Resolved analyses keep Outcome, use a resolution statement in Main Decision Fork, do not invent a Determining Fact, omit fact owners, and allow execution-only (or empty) actions.
- Continue-analysis must not force a “next determining fact” when no genuine fork remains.
- Lifecycle suggestion may read `decisionStatus` as guidance only. AI still must not write lifecycle fields.
- Compact UI may show «Решение определено» / «Решение ещё не определено». No new analysis card.
- `decision-engine.md` and `seed-data.json` are untouched by this change.
