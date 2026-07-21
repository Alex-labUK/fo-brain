# Operational Picture

Version: 1.0
Status: RFC
Owner: FO Brain

---

# Purpose

The Operational Picture represents the current understanding of an Operational Change.

It is the authoritative view of the situation at a specific moment in time.

An Operational Picture is continuously refined as new information becomes available.

---

# Relationship to Operational Brief

Operational Brief and Operational Picture are different concepts.

Operational Brief
- owns the lifecycle
- owns business state
- coordinates reasoning
- emits domain events

Operational Picture
- represents understanding
- changes as knowledge evolves
- supports reasoning
- is used to generate recommendations

One Operational Brief always has one current Operational Picture.

Historical pictures are reconstructed through the Timeline and Domain Events rather than stored as independent copies.

---

# Composition

An Operational Picture consists of:

- Confirmed Facts
- Active Unknowns
- Active Assumptions
- Risks
- Constraints
- Stakeholders
- Current Outcome
- Active Recommendations
- Subsystem Assessments

Together these form the current operational understanding.

---

# How the Picture Changes

The Operational Picture changes only when operational understanding changes.

Typical triggers include:

- Fact confirmed
- Unknown resolved
- New Unknown discovered
- Assumption validated or rejected
- Significant external event
- Principal Decision
- Subsystem Assessment
- Outcome updated

Routine administrative updates do not change the picture.

---

# Invariants

The Operational Picture must always:

- reflect the latest confirmed knowledge
- distinguish facts from assumptions
- expose unresolved uncertainty
- remain explainable
- remain traceable to supporting evidence

---

# Business Rules

Every change to the Operational Picture must:

1. preserve aggregate invariants;
2. emit appropriate Domain Events;
3. create Timeline entries;
4. allow previous understanding to be reconstructed.

The picture is never edited without traceability.

---

# Why It Exists

Recommendations are produced from the Operational Picture—not directly from raw information.

This ensures that reasoning is based on understanding rather than individual messages or documents.

---

# Success Criteria

A high-quality Operational Picture:

- is complete enough for decision-making;
- highlights uncertainty explicitly;
- evolves incrementally;
- explains why recommendations changed;
- provides a shared understanding for humans and AI.
