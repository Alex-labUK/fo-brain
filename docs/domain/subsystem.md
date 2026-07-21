# Subsystem

Version: 1.0
Status: Approved Draft
Owner: FO Brain

---

# Purpose

A Subsystem represents a specialised business domain that contributes expertise
to an Operational Brief.

Subsystems do not own the Operational Brief.

They provide assessments, risks and recommendations within their area of responsibility.

---

# Definition

Examples of subsystems include:

- Legal
- Finance
- Property Operations
- Travel
- Security
- Household Staff
- IT
- HR

A single Operational Brief may involve multiple active subsystems.

---

# Responsibilities

Each Subsystem may:

- review Facts
- identify Unknowns
- record Assumptions
- produce Assessments
- identify Risks
- create Recommendations

Subsystems never make Principal Decisions.

---

# Lifecycle

Inactive
    ↓
Activated
    ↓
Assessing
    ↓
Monitoring
    ↓
Completed

or

Monitoring
    ↓
Deactivated

---

# Required Fields

Every Subsystem contains:

- Subsystem ID
- Type
- Status
- Activated At
- Activated By
- Current Assessment

---

# Assessment

Each assessment should include:

- Summary
- Current Situation
- Risks
- Consequences
- Recommendation
- Confidence
- Author
- Created At

Assessment history must be preserved.

---

# Business Rules

- A Subsystem belongs to exactly one Operational Brief.
- Multiple Subsystems may be active simultaneously.
- A Subsystem may revise its assessment.
- Assessments do not overwrite history.
- A Subsystem cannot resolve an Operational Brief on its own.

---

# Relationship to Other Objects

Subsystem != Operational Brief

Subsystem != Recommendation

Subsystem != Decision

Subsystem assessments contribute to the overall Operational Picture.

---

# Success Criteria

A high-quality Subsystem:

- provides specialist expertise
- explains consequences
- identifies risks
- supports evidence-based recommendations
- maintains traceable assessment history
