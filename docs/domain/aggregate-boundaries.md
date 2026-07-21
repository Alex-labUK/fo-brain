# Aggregate Boundaries

Version: 1.0
Status: Approved Draft
Owner: FO Brain

---

# Purpose

This document defines the transactional boundary of the Operational Brief aggregate.

The aggregate guarantees business consistency for everything it owns.

Objects outside the boundary are referenced but not controlled.

---

# Aggregate Root

OperationalBrief is the Aggregate Root.

All modifications to the aggregate must occur through the OperationalBrief.

Direct modification of owned objects is forbidden.

---

# Aggregate Owns

OperationalBrief owns:

- Situation
- Facts
- Unknowns
- Assumptions
- Outcome
- Recommendations
- Timeline projection metadata
- Active Subsystems
- Lifecycle Status

Changes to these objects must be transactionally consistent.

---

# Aggregate References

OperationalBrief references but does not own:

- Raw source documents
- Users
- Principal
- External systems
- Attachments
- AI models
- Notifications

Referenced objects have independent lifecycles.

---

# Transaction Boundary

The following changes must be atomic:

- Confirm Fact
- Resolve Unknown
- Validate Assumption
- Update Outcome
- Create Recommendation
- Record Principal Decision
- Change Lifecycle Status

If validation fails, no partial changes are committed.

---

# Consistency Rules

The aggregate guarantees:

- valid lifecycle state
- invariant preservation
- consistent relationships
- complete event generation
- version integrity

---

# Communication

Other aggregates communicate only through Domain Events.

No aggregate may directly modify another aggregate's internal state.

---

# Versioning

Every successful aggregate change increments the aggregate version.

Published Domain Events include the new version.

---

# Success Criteria

The aggregate boundary is correct when:

- business invariants cannot be bypassed
- all owned data remains consistent
- cross-aggregate communication occurs only through events
- transactional responsibilities are unambiguous
