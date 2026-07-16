# FO Brain Operating System Specification v0.2


# 1. Vision, Mission and Product Boundary

## 1.1 Vision
FO Brain is the operating methodology of a Head of Family Office transformed into software and configured for a specific family.
The platform exists so that the family does not lose its operating principles when employees, leaders, generations, technologies or circumstances change.

## 1.2 Mission
Preserve, apply and evidence the operating principles of a specific family while helping the Family Office achieve the Principal's desired outcomes without losing system stability.

## 1.3 Product promise
- Preserve the family's operating principles without requiring the platform to store the family's identity.
- Help the Head of Family Office focus on what requires personal attention.
- Activate only the processes and subsystems that influence the current desired outcome.
- Route only the minimum necessary context to each role.
- Capture whether a case confirmed, changed or challenged an operating principle.
- Maintain continuity when people change.

## 1.4 Explicit non-goals
- FO Brain is not a CRM.
- FO Brain is not a task manager or project-management suite.
- FO Brain is not a document repository.
- FO Brain is not an ERP, accounting system, calendar, email client or identity vault.
- FO Brain is not a psychologist, advisor on how a family should live, or autonomous decision-maker.
- FO Brain does not observe the Principal and infer hidden intentions, emotions or preferences.
- FO Brain does not replace the Principal, the Head of Family Office or subsystem owners.

## 1.5 The One Question Rule for scope
Every proposed feature must answer: Does this feature preserve, apply or develop the operating principles of this specific family? If the answer is no, the feature is not part of the core product.

# 2. Foundational Operating Method

## 2.1 Outcome first
Every case begins with one question: What does the Principal want to obtain from this?
No meaningful orchestration begins until the desired outcome is sufficiently clear. The system may ask only the questions necessary to distinguish materially different paths. It must not interrogate the user or create analysis for its own sake.

## 2.2 Do not decide for the Principal
The Principal retains decisions that belong to the Principal. FO Brain may prepare choices, consequences, dependencies and professional input. It must never convert uncertainty into an assumed decision.

## 2.3 Work from confirmed facts
FO Brain must distinguish confirmed facts, user decisions, system suggestions and unresolved assumptions. If a missing fact changes the route, the platform asks. If it does not change the route, the platform does not create unnecessary friction.

## 2.4 Activate systems, do not perform all work
The Head of Family Office does not execute every action personally. The Head activates the correct subsystems and retains attention for the matters that cannot be delegated: Principal decisions, family impact, conflicts between subsystems, critical exceptions and restoration of stability.

## 2.5 Activate only what matters now
The platform must not activate every subsystem related to an event. It activates only the subsystems that influence the desired outcome at the current stage. The ability not to launch unnecessary processes is part of the Method.

## 2.6 Preserve stability
The purpose of activation is not activity. It is movement toward the desired outcome while preserving the stability of the whole system.

## 2.7 Localize consequences
Errors and failures are not always preventable. Strong private operations prevent a local failure from becoming a system-wide crisis.

## 2.8 Confirm before improving
After a case, FO Brain does not assume that something must improve. The case may confirm that the existing system and principle worked correctly. Improvement is justified only when evidence supports a change.

# 3. Privacy and Confidentiality Architecture

## 3.1 Privacy by data minimization
The product's primary security advantage is not that it stores highly sensitive data more securely. Its primary advantage is that the core Method does not require most sensitive data at all.

## 3.2 Separation of operating knowledge and identity
```text
Operating Principle Layer
  - Principle
  - Family-specific configuration
  - Case pattern
  - Outcome
  - Subsystem activation
  - Evidence

Execution / Identity Layer (external or inside family perimeter)
  - Names
  - Addresses
  - Passports
  - Contracts
  - Bank details
  - Medical records
  - Documents
```
The core platform should work with role labels and functional facts whenever possible: Principal, spouse, child, dependent family member, residence, insurer, travel provider and so on.

## 3.3 Minimum necessary context
Each role receives only the context necessary to perform its function. A travel manager does not need medical detail beyond the confirmed effect on travel. A house manager does not need the reasons behind a family decision unless those reasons change the operational response.

## 3.4 Prohibited inference
- Do not infer emotions from behaviour.
- Do not infer intentions from indirect signals.
- Do not infer family preferences from a single case unless a user explicitly confirms a principle.
- Do not automatically promote patterns to family principles.
- Do not store sensitive detail merely because it was present in a source message.

## 3.5 Deployment principle
The architecture must support deployment inside the security perimeter of a specific Family Office. Integrations with identity, documents and execution systems must be separable from the Method core.

# 4. High-Level Architecture

## 4.1 Logical layers

|Layer|Purpose|Core responsibility|
|---|---|---|
|Reference Method|Best-practice operating model|Defines default principles and orchestration logic|
|Family Constitution|Family-specific configuration|Defines principles, delegation boundaries, preferences and explicit exceptions|
|Method Engine|Runtime orchestration|Determines outcome, relevant subsystems, activation and focus|
|Decision Engine|Complex case analysis|Structures facts, questions, options and principle evidence|
|Evidence & Learning|Method validation|Records confirmation, modification, challenge or no-change result|
|Integration Layer|External execution|Connects to CRM, email, calendar, document, finance and operational systems|

## 4.2 Runtime flow
```text
Confirmed Event / Request
        ↓
Desired Outcome
        ↓
Reference Method + Family Constitution
        ↓
Relevant Subsystems
        ↓
Activate Only What Matters Now
        ↓
Minimum Necessary Context to Owners
        ↓
Feedback / Exceptions / Results
        ↓
Head of FO Focus and Decisions
        ↓
Stable Outcome
        ↓
Evidence: Confirmed / Changed / Challenged / No Principle Impact
```

## 4.3 Existing codebase mapping
The current Cursor project should be evolved rather than rewritten. Existing objects remain useful and are repositioned as follows:

|Existing object|Future role|
|---|---|
|Case|Operational or research episode linked to an outcome, subsystem and evidence|
|Question|Clarification or decision-routing question inside Method or Decision Engine|
|Principle|Reference Method principle or family-specific principle|
|Pattern|Candidate repeatable behaviour that may support a principle|
|DecisionEngineBranch|Structured analysis branch used when a case requires judgment|
|Seed data|Initial Reference Method and examples, separated from family-specific configuration|

# 5. Domain Model

## 5.1 Core aggregates

|Aggregate|Definition|Must own|
|---|---|---|
|FamilyWorkspace|Boundary for one family configuration|Constitution, principles, roles, system map|
|Outcome|What the Principal wants to obtain|Statement, status, stage, success condition|
|Event|Confirmed trigger or request|Facts, source, time, linked outcome|
|Case|Episode requiring orchestration or analysis|Facts, decisions, evidence, links|
|Subsystem|Operational capability|Owner role, activation rules, inputs, outputs|
|Activation|Runtime instruction to a subsystem owner|Context, expected result, urgency, status|
|Feedback|Result returned by a subsystem|Facts, exception, result, decision need|
|Principle|General operating rule|Scope, status, evidence, source|
|FamilyConstitution|Family-specific configuration|Overrides, delegation, communication, privacy|
|StabilityAssessment|Assessment of outcome/system condition|Threats, dependencies, focus, status|

## 5.2 Event
An Event is a confirmed trigger, request or change in conditions. It does not contain tasks. It provides the factual starting context.
- Event must record its source.
- Event must distinguish confirmed fact from unverified information.
- Event may link to an existing Outcome or create the need to define one.
- Event may activate zero, one or many subsystems.

## 5.3 Outcome
Outcome is the anchor for orchestration. It answers what the Principal wants to obtain, not merely what action was requested.
Examples: "purchase a suitable investment property", "ensure the child receives appropriate care", "complete the relocation without loss of service", "cancel the trip while minimizing financial loss".

## 5.4 Subsystem
A Subsystem is a stable operational capability, not a department name and not a task list. Examples include Travel, Residence, Family Support, Banking Operations, Legal, Security, Staff, Education, Insurance and Investment Property.

## 5.5 Activation
Activation is the deliberate start of subsystem work for a specific Outcome at a specific stage. Activation must include only the minimum context necessary for the owner to act autonomously.

## 5.6 Feedback
Feedback is not progress narration. It is a result, confirmed fact, exception, changed condition or decision request returned by a subsystem.

## 5.7 Principle and policy
A Principle is abstract enough to apply across domains and concrete enough to change decisions. "Always have a backup option" is a principle. "Keep a second car" is a domain implementation or policy.

## 5.8 Family Constitution
The Family Constitution is the family-specific operating configuration. It may include principles that conflict with the Reference Method, provided the conflict is explicit, authorized and visible as an override rather than silently rewriting the Method.

# 6. Reference Method and Family Constitution

## 6.1 Reference Method
The Reference Method is the product's default best-practice operating model. It is derived from validated professional experience. A family acquires access to the Method because it wants stronger practice, not because it wants the Method to passively mirror existing habits.

## 6.2 Family configuration
Family-specific behaviour is represented as configuration: principles, delegation boundaries, preferences, restrictions and explicit exceptions.

## 6.3 Principle taxonomy

|Class|Examples|
|---|---|
|Core operating principles|Outcome first; never decide for the Principal; do not assume|
|Resilience principles|Always have a backup option; localize consequences|
|Delegation principles|Head of FO may decide personnel matters; Principal approval required above threshold|
|Privacy principles|Minimum necessary context; no sensitive data in core Method|
|Provider principles|Use verified contractors; maintain approved alternatives|
|Insurance principles|Always insure / insure only above defined exposure / no insurance for specified categories|
|Communication principles|What reaches the Principal; preferred channel; escalation rules|
|Service principles|Non-negotiable service level and family-specific standards|

## 6.4 Principle lifecycle
```text
Draft → Confirmed → Family Active → Superseded / Retired

Evidence outcomes:
- Confirmed by case
- Modified by case
- Challenged by case
- No principle impact
```
AI may suggest candidate wording. Only an authorized human may create, modify, confirm, override or retire a family principle.

## 6.5 Method override
Overrides must be explicit and scoped. An override must state: the Reference Method principle, the family-specific rule, its scope, authorization and reason. Overrides are not errors; hidden overrides are architectural failures.

# 7. Method Engine

## 7.1 Responsibilities
1. Resolve or request the Desired Outcome.
1. Select the Reference Method principles relevant to the Outcome.
1. Apply Family Constitution configuration and explicit overrides.
1. Identify candidate subsystems.
1. Activate only the subsystems necessary at the current stage.
1. Generate minimum-context activation messages.
1. Collect feedback and surface only exceptions or decisions that require attention.
1. Maintain an explicit focus for the Head of Family Office.
1. Assess whether the Outcome and surrounding system remain stable.
1. Create a Decision Engine case when structured judgment is required.

## 7.2 Prohibited responsibilities
- Do not create detailed task plans for subsystem owners.
- Do not perform the work of Travel, Legal, Finance, House, Security or other subsystems.
- Do not infer the Principal's decision.
- Do not activate subsystems merely because they could be related.
- Do not force a user to review every possible risk.
- Do not automatically update the Family Constitution.

## 7.3 Activation algorithm
```text
Input: Event + known facts + current family configuration

1. Determine desired outcome.
2. Determine current stage.
3. Identify subsystems that can materially influence the outcome now.
4. Exclude subsystems with no current material influence.
5. For each selected subsystem, identify owner and minimum context.
6. Create activation requests.
7. Define expected feedback, not step-by-step tasks.
8. Identify Head of FO personal focus.
9. Re-evaluate when feedback or stage changes.
```

## 7.4 Head of FO focus
Focus is the matter that requires the Head of Family Office's personal attention now. It is not necessarily the largest workstream. It is the issue that cannot safely be delegated or that most directly affects the Principal, family, system stability or a critical decision.

## 7.5 Example: cancelled family trip

|Element|Architecture representation|
|---|---|
|Event|Confirmed cancellation after child injury|
|Outcome|Provide care and safely unwind the trip while minimizing loss|
|Personal focus|Child and family support|
|Activated subsystems|Travel, Residence/House, Executive Schedule|
|Feedback|Medical appointment confirmed; hotel cancellation outcomes; staff availability|
|Decision Engine need|Negotiate deposits; assess insurance claim|
|Evidence|Flexible-booking principle modified/confirmed|

# 8. Decision Engine Integration

## 8.1 Purpose
The Decision Engine remains a distinct module. It is invoked when the Method Engine encounters ambiguity, conflict, a non-obvious route, a need to compare options or a potential principle change.

## 8.2 Invocation criteria
- The desired outcome is clear but the route is not.
- Subsystem feedback conflicts.
- Responsibility is disputed.
- A decision belongs to the Principal.
- A local decision may have system-wide consequences.
- A case may confirm, modify or challenge a principle.

## 8.3 Output contract
- Confirmed facts.
- Open questions that change the route.
- Options and consequences.
- Recommendation when appropriate, never a Principal decision.
- Required Principal decision.
- Operational constraints.
- Evidence impact on principles.

# 9. Stability Model

## 9.1 Working definition
A system is operationally stable when it can continue to deliver the intended family outcome under current conditions without requiring avoidable intervention by the Principal and without a local failure spreading into a wider system crisis.

## 9.2 Stability is contextual
Stability is assessed relative to the desired outcome and current stage. A subsystem can be generally healthy yet irrelevant to the current outcome, or temporarily critical because a deadline or dependency has changed.

## 9.3 Stability dimensions

|Dimension|Question|
|---|---|
|Outcome continuity|Can the desired outcome still be achieved?|
|Dependency resilience|Will a single unavailable person or provider stop the route?|
|Information flow|Will the right information reach the right owner?|
|Decision clarity|Is it clear who decides and who executes?|
|Family impact|Is quality of life or safety being materially affected?|
|Principal attention|Does the system require avoidable operational intervention?|
|Consequence containment|Can a local failure remain local?|

## 9.4 Status model

|Status|Meaning|
|---|---|
|Unknown|Insufficient information to assess|
|Stable|Outcome remains achievable; no material intervention required|
|Attention|A gap or dependency may affect the outcome|
|Critical|Outcome, family impact, safety, legality or system continuity is threatened|
|Recovered|Previously unstable condition has returned to an acceptable state|

## 9.5 No false precision
Do not display arbitrary percentage scores such as 82% stability unless a validated scoring model exists. Early versions should use explainable status and reasons.

# 10. Information Flow and Role Boundaries

## 10.1 Information flow over org chart
Discovery of a Family Office must map how information and decisions actually move, not merely who reports to whom.

## 10.2 Flow record

|Field|Purpose|
|---|---|
|Initiator|Who creates or first receives the information|
|Context|What is known and confirmed|
|Recipient role|Who needs the information|
|Decision owner|Who may decide|
|Execution owner|Who performs work|
|Expected feedback|What result should return|
|Escalation condition|When the Head of FO or Principal must be involved|

## 10.3 Role-based context
The same event produces different context for different roles. Context is derived from role need, not from a desire to share the full story.

## 10.4 Authority and consequence
Authority depends not only on role but also on consequence. A routine technical decision may become system-critical when it affects family arrival, security, legal exposure, confidentiality or another subsystem's ability to function.

# 11. Evidence, Cases and Method Evolution

## 11.1 Case outcomes
Every completed case is evaluated for what it proved. The default is not forced improvement.

|Outcome|Meaning|
|---|---|
|Confirmed|Existing principle and operating response worked correctly|
|Modified|Evidence supports changing the wording, scope or implementation|
|Challenged|Evidence conflicts with a principle and requires review|
|New candidate|A repeatable rule may exist but is not yet confirmed|
|No principle impact|Case was executed correctly but adds no Method knowledge|

## 11.2 Evidence model
Evidence links a case to a principle with a typed relationship and explanation. Evidence must never automatically promote a candidate to a confirmed family principle.

## 11.3 Example: flexible hotel bookings
The Normandy cancellation case produced two levels of knowledge: a domain policy to prefer flexible or loyalty-friendly hotel bookings, and a broader resilience principle to preserve optionality and backup routes where a change of plan is plausible.

# 12. State Machines

## 12.1 Outcome lifecycle
```text
Draft → Clarifying → Active → Waiting for Feedback → Decision Required → Executing → Stable / Cancelled
```

## 12.2 Activation lifecycle
```text
Proposed → Confirmed → Sent → Acknowledged → Working → Result Returned → Closed / Escalated
```

## 12.3 Case lifecycle
```text
Captured → Facts Confirmed → Routed → Analysis → Decision / Recommendation → Outcome Recorded → Evidence Review → Closed
```

## 12.4 Principle lifecycle
```text
Candidate → Review → Confirmed Reference / Confirmed Family → Superseded / Retired
```

# 13. Technical Architecture

## 13.1 Recommended modular structure
```text
src/
  core/
    method/
    constitution/
    outcomes/
    events/
    subsystems/
    activations/
    feedback/
    stability/
    evidence/
  modules/
    decision-engine/
    case-management/
    principle-library/
  integrations/
    email/
    calendar/
    documents/
    crm/
  app/
    api/
    ui/
  infrastructure/
    persistence/
    auth/
    logging/
```

## 13.2 Architecture style
Use a modular monolith for the MVP. Preserve clear domain boundaries so modules can be extracted later if scale or deployment requirements justify it. Do not create microservices prematurely.

## 13.3 AI boundary
The core architecture must remain operable without an LLM. AI may classify natural-language input, suggest candidate subsystems, draft minimum-context messages, summarize feedback and suggest principle evidence. Deterministic domain rules and human authorization remain authoritative.

## 13.4 Persistence
Use relational persistence for auditable domain state. JSON fields are acceptable for early configuration when schema is evolving, but core relationships must remain queryable and explicit.

## 13.5 Auditability
- Record who created or confirmed an outcome.
- Record who authorized family principles and overrides.
- Record when AI proposed content versus when a human approved it.
- Record principle version history.
- Record activation and feedback timestamps.
- Do not log sensitive execution payloads by default.

# 14. Minimum Data Contracts

## 14.1 TypeScript contracts
```text
export interface DesiredOutcome {
  id: string;
  familyWorkspaceId: string;
  statement: string;
  successCondition?: string;
  stage: 'draft' | 'clarifying' | 'active' | 'waiting' | 'decision_required' | 'executing' | 'stable' | 'cancelled';
}

export interface OperationalEvent {
  id: string;
  familyWorkspaceId: string;
  outcomeId?: string;
  sourceRole: string;
  facts: string[];
  confirmed: boolean;
  occurredAt: Date;
}

export interface Subsystem {
  id: string;
  key: string;
  name: string;
  ownerRoleKey?: string;
  activationRules: ActivationRule[];
}

export interface ActivationRequest {
  id: string;
  outcomeId: string;
  subsystemId: string;
  ownerRoleKey: string;
  context: string;
  expectedFeedback: string;
  status: 'proposed' | 'confirmed' | 'sent' | 'acknowledged' | 'working' | 'returned' | 'closed' | 'escalated';
}

export interface FamilyPrinciple {
  id: string;
  class: string;
  statement: string;
  source: 'reference_method' | 'family';
  scope?: string;
  status: 'candidate' | 'confirmed' | 'superseded' | 'retired';
}
```

## 14.2 Method Engine service contract
```text
export interface MethodEngine {
  resolveOutcome(input: ResolveOutcomeInput): Promise<DesiredOutcomeResult>;
  proposeActivations(input: ActivationInput): Promise<ActivationProposal[]>;
  identifyFocus(input: FocusInput): Promise<FocusRecommendation>;
  evaluateStability(input: StabilityInput): Promise<StabilityAssessment>;
  routeFeedback(input: FeedbackInput): Promise<FeedbackRoute>;
}
```

# 15. API and UI Principles

## 15.1 API principles
- Domain commands must express intent: confirmOutcome, activateSubsystem, recordFeedback, confirmPrincipleEvidence.
- Do not expose database tables directly as product APIs.
- Every command that changes a family principle or delegation boundary requires authorization and audit.
- AI suggestions are separate resources from approved domain state.

## 15.2 UI principles
- Show the current desired outcome prominently.
- Show Head of FO focus separately from subsystem work.
- Show active subsystems and expected feedback, not low-level task detail.
- Show assumptions and unknowns clearly.
- Show why a subsystem was activated.
- Show principle evidence and family overrides with provenance.
- Avoid dashboards full of static metrics.

## 15.3 Primary workspace
```text
Outcome
  - What the Principal wants
  - Current stage
  - Head of FO focus

Active Subsystems
  - Owner
  - Context sent
  - Expected feedback
  - Exception / decision needed

Stability
  - Stable / Attention / Critical / Unknown
  - Explainable reasons

Method
  - Relevant Reference principles
  - Family principles / overrides

Evidence Review
  - Confirmed / Modified / Challenged / No impact
```

# 16. Architecture Decision Records

|ID|Decision|Status|Rationale|
|---|---|---|---|
|ADR-001|The product core is not CRM|Accepted|Confidential identity and execution data are not required to preserve operating principles.|
|ADR-002|Outcome precedes activation|Accepted|The same event produces different routes depending on what the Principal wants to obtain.|
|ADR-003|Events do not create tasks|Accepted|Events trigger subsystem activation; owners determine execution.|
|ADR-004|Activate only required subsystems|Accepted|Unnecessary activation increases cognitive load and can destabilize the system.|
|ADR-005|Family Constitution configures Reference Method|Accepted|Families receive best practice while retaining explicit family-specific rules and exceptions.|
|ADR-006|AI cannot change principles automatically|Accepted|Operating principles are high-impact family configuration and require human authorization.|
|ADR-007|Core must work without LLM|Accepted|The Method is domain logic; AI is an assistive interface, not the source of truth.|
|ADR-008|Use modular monolith for MVP|Accepted|The domain is still evolving and benefits from simple deployment and strong internal boundaries.|
|ADR-009|No arbitrary stability percentage|Accepted|Explainable status is superior to false precision before a validated scoring model exists.|
|ADR-010|Case review may confirm no change|Accepted|The system must not force improvement when evidence confirms the existing model works.|

# 17. Cursor Implementation Contract

## 17.1 Mandatory prompt
```text
Read FO_Brain_Operating_System_Specification_v0.2.docx or the equivalent Markdown export before making architectural changes. Treat it as the source of truth. Do not rewrite the project. Reuse existing entities and modules wherever possible. Before editing code, map the current codebase to the target domain model, identify conflicts, and propose the minimum evolutionary refactor. Do not add CRM, task-management or document-storage scope. Do not allow AI to write approved family principles directly. Explain every new core entity in terms of Outcome, Method, Family Constitution, Subsystem Activation, Feedback, Stability or Evidence.
```

## 17.2 Required first implementation step
1. Create a codebase mapping document: existing models, routes and components versus target architecture.
1. Identify which current Case, Principle, Pattern, Question and Decision Engine structures are reusable.
1. Add DesiredOutcome and FamilyWorkspace concepts with the smallest possible migration.
1. Add subsystem catalogue and activation proposal as domain concepts.
1. Do not implement integrations, marketplace or CRM features in this phase.

## 17.3 Definition of done for architectural refactor
- A user can capture an event or request.
- The system requires or confirms a desired outcome.
- The system proposes only relevant subsystems.
- The user can confirm subsystem activations.
- Each activation has an owner, minimum context and expected feedback.
- Returned feedback can create an exception or Decision Engine case.
- The outcome can be marked stable with reasons.
- A closed case can be reviewed for principle evidence.
- No sensitive identity data is required for the flow.

# 18. MVP Roadmap

## Phase 0 - Architecture mapping
- Map existing codebase.
- Preserve current Decision Engine.
- Create migration plan and ADR log.

## Phase 1 - Outcome and activation
- Desired Outcome entity and UI.
- Subsystem catalogue.
- Activation proposals and human confirmation.
- Head of FO focus.
- Feedback result capture.

## Phase 2 - Family Constitution
- Reference Method principle library.
- Family principles and overrides.
- Delegation and communication rules.
- Versioning and audit.

## Phase 3 - Stability and evidence
- Explainable stability status.
- Consequence and dependency flags.
- Case-to-principle evidence review.
- Confirmed / modified / challenged / no-impact workflow.

## Phase 4 - Safe integrations
- Email/calendar summaries without storing unnecessary payloads.
- Links to external document/CRM systems.
- Perimeter deployment options.
- Marketplace only for services that reinforce the Method.

# 19. Risks and Guardrails

|Risk|Guardrail|
|---|---|
|Product becomes a generic management suite|Apply One Question Rule; integrations remain outside core|
|AI invents family preferences|Require confirmation and provenance|
|Too many questions|Ask only questions that change the route|
|Too many activated subsystems|Require material influence at current stage|
|Micromanagement of specialists|Activation contains context and expected feedback, not detailed tasks|
|Sensitive data accumulation|Use role labels, minimization, external execution layer|
|False confidence in stability|Use explainable statuses and unknown state|
|Method diluted by existing habits|Represent deviations as explicit Family Constitution overrides|
|Architecture rewrite damages existing MVP|Use evolutionary mapping and modular refactor|

# 20. Acceptance Principles for Every New Feature
1. Identify the operating principle supported.
1. Identify the family-specific configuration affected, if any.
1. State the desired outcome the feature helps achieve.
1. State which subsystem or orchestration step it supports.
1. Show how it reduces cognitive load or preserves stability.
1. Show why it does not require unnecessary sensitive data.
1. Show why it belongs in core rather than an integration.
1. Define human approval points.

# Appendix A - Canonical Example

## Normandy trip cancellation
A planned ten-day road trip is cancelled after a child is injured. The Head of Family Office simultaneously informs the house manager, travel manager and secretary, while retaining personal focus on the child and family support. Subsystem owners return results rather than progress narration. Hotel losses are minimized through deposit retention and insurance recovery. The post-case review changes the travel policy toward flexible or loyalty-friendly booking conditions and confirms the broader principles of role-based activation, focus and optionality.
```text
Event: Trip cancelled after child injury
Outcome: Support family and unwind trip with minimum loss
Focus: Child / family support
Activations:
  Travel → cancel flights and hotels; return financial exposure
  House → family remains; reconfigure staff plan
  Secretary → change schedule
Feedback:
  Flights refunded
  Two hotels free cancellation
  Two non-refundable
  One 50% penalty
Decision Engine:
  Preserve deposits for later stay
  Claim insurance based on medical cancellation
Evidence:
  Flexible booking policy updated
  Backup / optionality principle confirmed
```

# Appendix B - Canonical Product Statement
We do not sell CRM. We do not sell AI. We do not train employees. We preserve the operating principles of your family - specifically your family.
FO Brain preserves the Reference Method, configures it through the Family Constitution, applies it through subsystem activation and records evidence from real cases, without requiring the core platform to store the family's identity or confidential execution documents.

# Appendix C - Document Navigation
