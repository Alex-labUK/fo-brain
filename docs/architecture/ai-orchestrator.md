# AI Orchestrator

Version: 1.0
Status: Approved Draft
Owner: FO Brain

---

# Purpose

The AI Orchestrator coordinates all AI capabilities within FO Brain.

It is the single application component responsible for selecting AI services,
executing analytical workflows, enforcing guardrails, collecting evidence,
and returning advisory outputs to Application Services.

The AI Orchestrator never modifies domain aggregates directly.

---

# Goals

- Coordinate multiple AI capabilities.
- Produce consistent analytical outputs.
- Separate orchestration from business rules.
- Keep AI advisory rather than authoritative.
- Ensure every AI result is traceable.

---

# Position in Architecture

```text
Presentation
      │
      ▼
Application Services
      │
      ▼
AI Orchestrator
 ├──────────────┐
 │              │
 ▼              ▼
LLM        Retrieval
 │              │
 ▼              ▼
Risk       Knowledge
Engine      Base
 │              │
 └──────┬───────┘
        ▼
AnalysisResult
```

---

# Responsibilities

The Orchestrator:

- receives analytical requests;
- selects the workflow;
- invokes AI components;
- gathers retrieved context;
- validates responses;
- applies guardrails;
- assembles a structured result;
- returns advisory output.

It never:

- approves decisions;
- changes aggregates;
- records Principal Decisions;
- starts Execution.

---

# Inputs

Typical inputs:

- OperationalBrief
- Operational Picture
- Subsystem Assessments
- Prior Outcomes
- Verified Lessons
- User Question
- Policy Context
- Constraints

---

# Outputs

The Orchestrator may produce:

- AnalysisResult
- Recommendation draft
- Risk summary
- Missing information
- Clarifying questions
- Confidence estimate

Outputs remain advisory until accepted through domain commands.

---

# Internal Components

## Workflow Manager

Chooses the analysis pipeline.

## Retrieval Coordinator

Obtains relevant internal knowledge.

## Prompt Builder

Constructs structured prompts from domain objects.

## LLM Adapter

Provides a model-independent interface.

## Response Validator

Checks structure, schema and completeness.

## Guardrail Engine

Detects unsafe or unauthorised output.

## Trace Recorder

Captures model, prompt version, latency, references and correlation identifiers.

---

# Workflow

1. Receive request.
2. Validate permissions.
3. Build context.
4. Retrieve knowledge.
5. Select AI model.
6. Execute analysis.
7. Validate response.
8. Apply guardrails.
9. Build AnalysisResult.
10. Return advisory output.

---

# Model Abstraction

The Orchestrator must support multiple providers.

Examples:

- OpenAI
- Azure OpenAI
- Local models
- Future specialised models

Application Services must never depend on provider-specific APIs.

---

# Retrieval

Retrieval may use:

- verified Outcomes;
- Lessons;
- policies;
- procedures;
- previous OperationalBriefs;
- structured knowledge.

Retrieved material should be ranked by relevance and traceability.

---

# Guardrails

Guardrails should detect:

- fabricated facts;
- unsupported recommendations;
- policy violations;
- authority violations;
- missing evidence;
- unsafe instructions.

Unsafe responses must be rejected or downgraded.

---

# Confidence

Confidence should consider:

- evidence quality;
- retrieval coverage;
- contradiction level;
- model certainty;
- missing information.

Confidence must never replace human judgement.

---

# Observability

Record:

- correlationId
- workflowId
- model
- latency
- token usage
- retrieval sources
- validation failures

---

# Failure Handling

Possible errors:

- MODEL_UNAVAILABLE
- RETRIEVAL_FAILED
- VALIDATION_FAILED
- GUARDRAIL_BLOCKED
- TIMEOUT
- INVALID_RESPONSE

Failures must never modify domain state.

---

# AI Boundary

The AI Orchestrator may:

- analyse;
- compare;
- summarise;
- explain;
- propose;
- prioritise.

The AI Orchestrator must not:

- approve Recommendations;
- create Principal Decisions;
- authorise Execution;
- rewrite history;
- fabricate evidence;
- bypass domain validation.

---

# Security

The Orchestrator should support:

- tenant isolation;
- prompt versioning;
- audit logging;
- confidential context handling;
- least-privilege retrieval.

---

# Invariants

1. AI is advisory.
2. Domain authority remains outside AI.
3. Every result is traceable.
4. Every workflow is auditable.
5. Guardrails execute before results are returned.
6. Domain changes occur only through validated commands.
7. Retrieval uses authorised sources only.
8. AI outputs are reproducible as far as practical through prompt/version traceability.
