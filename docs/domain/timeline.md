# Timeline

Version: 1.0
Status: Approved Draft
Owner: FO Brain

---

# Purpose

The Timeline provides a chronological, human-readable history of an Operational Brief.

It explains not only what happened, but how understanding of the situation evolved.

Timeline is a read model derived from Domain Events.

It is not the source of truth.

---

# Definition

Every meaningful business event generates a Timeline entry.

The Timeline allows any user to reconstruct:

- what happened
- when it happened
- why it happened
- who initiated it
- what changed afterwards

---

# Characteristics

The Timeline is:

- chronological
- append-only
- traceable
- human-readable
- immutable

Entries are never edited or deleted.

---

# Timeline Entry

Each entry contains:

- Entry ID
- Timestamp
- Event Type
- Summary
- Actor
- Source
- Related Objects
- Correlation ID

---

# Typical Entries

Examples include:

- Operational Brief created
- New information received
- Draft Fact proposed
- Fact confirmed
- Unknown recorded
- Unknown resolved
- Assumption validated
- Outcome defined
- Recommendation created
- Principal decision recorded
- Execution started
- Execution completed
- Brief resolved

---

# Business Rules

- Every significant Domain Event creates exactly one Timeline entry.
- Timeline entries are generated automatically.
- Timeline entries never modify business state.
- Timeline ordering is preserved for each Operational Brief.
- Administrative corrections create new Timeline entries rather than editing existing ones.

---

# Relationship to Other Objects

Timeline != Domain Events

Timeline != Audit Log

Timeline is a projection optimised for people.

Domain Events remain the authoritative business history.

---

# Display Principles

Timeline should help users answer:

- What happened?
- What changed?
- Why did it change?
- What was known at that moment?
- What decision followed?

The Timeline should minimise cognitive effort.

---

# Success Criteria

A high-quality Timeline is:

- complete
- easy to read
- chronologically correct
- fully traceable
- useful for operational review and learning
