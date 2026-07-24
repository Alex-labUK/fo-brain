# Execution

Version: 1.0
Status: Approved Draft
Owner: FO Brain

---

# Purpose

`Execution` represents the controlled implementation of an authorised `PrincipalDecision`.

It records how an approved course of action is planned, started, monitored, paused, completed, failed, or cancelled.

Execution is operational state. It does not alter the historical Principal Decision that authorised it.

---

# Definition

An Execution records:

- which Principal Decision is being implemented;
- who is responsible;
- what actions are required;
- what dependencies and conditions exist;
- what progress has been made;
- what blockers or failures occurred;
- whether the authorised outcome was achieved.

---

# Identity

Each Execution contains:

- executionId
- briefId
- decisionId
- version
- createdAt
- createdBy
- status

---

# Status

Allowed values:

- Planned
- InProgress
- Paused
- Completed
- Failed
- Cancelled

## Planned

Execution has been defined but has not started.

## InProgress

Authorised work is actively being performed.

## Paused

Execution has temporarily stopped but remains valid.

## Completed

All required execution work has finished.

Completion does not by itself prove that the intended Outcome was achieved.

## Failed

Execution could not be completed under the current plan or authority.

## Cancelled

Execution authority was withdrawn or the underlying Principal Decision was cancelled or superseded.

---

# Structure

## Scope

Defines what the Execution is authorised to do.

The scope must not exceed the underlying Principal Decision.

## Owner

The person or role accountable for coordination and delivery.

## Participants

People, teams, vendors, or systems involved in execution.

## Actions

The authorised actions required to implement the Decision.

Each action may contain:

- actionId
- description
- owner
- dueDate
- status
- dependencies
- evidence of completion

## Milestones

Significant checkpoints used to assess progress.

Each milestone may contain:

- milestoneId
- description
- targetDate
- completion criteria
- status
- completedAt

## Preconditions

Conditions that must be satisfied before execution starts.

## Dependencies

Approvals, people, systems, vendors, funding, timing, or external events required for execution.

## Blockers

Issues preventing progress.

Each blocker contains:

- blockerId
- description
- impact
- owner
- identifiedAt
- proposed resolution
- status

## Risks

Execution-specific risks and mitigations.

## Budget and Resource Constraints

Optional financial, staffing, time, or capacity limits.

## Updates

Chronological operational updates.

Each update contains:

- updateId
- timestamp
- actor
- summary
- progress
- issues
- next step

---

# Relationship to PrincipalDecision

Execution may begin only when:

- an Active Principal Decision exists;
- execution is required;
- the Execution scope is within the Decision authority;
- mandatory conditions are satisfied;
- the actor is authorised.

If the Principal Decision is superseded or cancelled, the Execution must be reviewed immediately.

The Execution may be:

- continued under a superseding Decision;
- paused;
- cancelled;
- replaced by a new Execution.

The historical Execution record must remain intact.

---

# Relationship to OperationalBrief

An Operational Brief may contain zero, one, or multiple Executions over time.

Multiple Executions may exist when:

- a Decision is implemented in separate workstreams;
- an earlier Execution failed;
- a revised Decision requires a new execution plan;
- parallel authorised actions are required.

Only validated Commands may change Execution state.

---

# Starting Execution

`StartExecution` is valid only when:

- status is Planned;
- the linked Principal Decision is Active;
- required preconditions are satisfied;
- the actor has execution authority.

Successful start changes status to InProgress and emits `ExecutionStarted`.

---

# Pausing Execution

Execution may be paused when:

- a blocker prevents safe progress;
- required authority or information is missing;
- a dependency is unavailable;
- risk exceeds the authorised tolerance;
- the Principal or delegate requests a pause.

A pause must record:

- reason;
- actor;
- timestamp;
- impact;
- required condition for resumption.

Pausing must not erase progress already recorded.

---

# Resuming Execution

`ResumeExecution` is valid only when:

- status is Paused;
- the pause condition has been addressed or explicitly accepted;
- the linked Decision remains Active;
- the actor is authorised.

---

# Completing Execution

Execution may be completed when:

- all mandatory actions are complete;
- required milestones are satisfied;
- completion evidence exists;
- unresolved blockers are closed or explicitly accepted;
- continuing obligations are recorded.

Completion records operational delivery only.

The actual result is recorded separately as an `Outcome`.

---

# Failing Execution

Execution may be marked Failed when:

- the authorised objective cannot be delivered under the current plan;
- a critical dependency fails;
- required resources are unavailable;
- the execution plan is no longer valid;
- risk becomes unacceptable;
- legal or operational constraints prevent completion.

Failure must record:

- failure reason;
- point of failure;
- completed work;
- remaining obligations;
- recoverable assets or information;
- recommended next step;
- whether a new Decision is required.

A failed Execution must never be presented as Completed.

---

# Cancelling Execution

Execution may be cancelled when:

- the Principal Decision is cancelled;
- the Principal Decision is superseded and no longer authorises the work;
- authority is withdrawn;
- the work is no longer required.

Cancellation must record:

- cancelledBy
- cancelledAt
- reason
- completed work
- financial or contractual consequences
- continuing obligations
- required close-out actions

Cancellation does not delete prior progress.

---

# Retry Rules

A failed or cancelled Execution must not be silently restarted.

Further work requires either:

- a new Execution linked to the same still-active Decision; or
- a new or superseding Principal Decision.

Retries must preserve the history of previous attempts.

---

# Progress Rules

Progress must be based on recorded actions, milestones, and evidence.

A percentage may be displayed as a projection, but it must not replace the underlying operational record.

The system must distinguish:

- work started;
- work reported;
- work verified;
- work completed.

---

# Domain Events

Typical events:

- ExecutionPlanned
- ExecutionStarted
- ExecutionUpdated
- ExecutionPaused
- ExecutionResumed
- ExecutionCompleted
- ExecutionFailed
- ExecutionCancelled
- ExecutionBlockerRecorded
- ExecutionBlockerResolved
- ExecutionMilestoneCompleted

Events should include:

- executionId
- briefId
- decisionId
- actor
- timestamp
- correlationId
- aggregateVersion

---

# Validation Rules

A valid Execution requires:

- existing OperationalBrief;
- existing Active Principal Decision;
- authorised scope;
- accountable owner;
- valid status;
- required preconditions;
- version consistency.

Completion additionally requires:

- completion evidence;
- mandatory actions resolved;
- continuing obligations recorded.

---

# Failure Behaviour

Suggested error codes:

- DECISION_NOT_FOUND
- DECISION_NOT_ACTIVE
- EXECUTION_NOT_FOUND
- INVALID_EXECUTION_STATUS
- EXECUTION_SCOPE_EXCEEDS_AUTHORITY
- PRECONDITIONS_NOT_MET
- UNAUTHORISED_EXECUTION_ACTOR
- BLOCKER_PREVENTS_PROGRESS
- COMPLETION_CONDITIONS_NOT_MET
- EXECUTION_ALREADY_COMPLETED
- EXECUTION_ALREADY_CANCELLED
- VERSION_CONFLICT

A failed command must emit no Domain Event.

---

# AI Boundary

The Decision Engine may:

- propose an execution plan;
- identify dependencies and risks;
- suggest milestones;
- summarise progress;
- detect blockers;
- recommend escalation or review.

The Decision Engine must not:

- start execution;
- claim that work was completed without evidence;
- authorise spending or commitments;
- cancel execution;
- override the Principal Decision;
- perform external actions without explicit authority.

---

# Invariants

1. Execution requires an authorised Principal Decision.
2. Execution scope cannot exceed Decision authority.
3. Historical Decisions are never rewritten by execution updates.
4. Execution status changes only through validated Commands.
5. Completed does not automatically mean successful Outcome.
6. Failed and Cancelled Executions remain auditable.
7. Progress must be traceable to actions, milestones, or evidence.
8. Retries require an explicit new execution record or new authority.
9. AI may advise but may not authorise or falsely confirm execution.
10. Continuing obligations and residual risks remain visible after closure.
