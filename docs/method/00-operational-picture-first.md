# Operational Picture First

Version: 1.0
Status: RFC
Owner: FO Brain

---

# Purpose

This document defines the primary reasoning principle of FO Brain.

Before analysing, recommending or deciding, the system must determine whether
new information changes the current Operational Picture.

This rule governs every reasoning workflow.

---

# Problem

Most AI systems behave like this:

New Information
        ↓
Immediate Answer

This optimises response speed.

It does not optimise decision quality.

FO Brain is designed to optimise understanding before action.

---

# Core Principle

**Every new piece of information must first be evaluated for its impact on the Operational Picture.**

If the Operational Picture has not changed, no new reasoning cycle is required.

---

# Decision Gate

```text
New Information
        ↓
Does it change the Operational Picture?
        │
   ┌────┴────┐
   │         │
  No        Yes
   │         │
Timeline    Rebuild Operational Picture
Update      ↓
Only        Continue Reasoning
```

---

# What is an Operational Picture?

The Operational Picture is the best current understanding of:

- the situation
- confirmed facts
- unresolved unknowns
- active assumptions
- risks
- desired outcome
- current recommendations

It represents understanding, not merely stored data.

---

# What Can Change the Picture?

Examples include:

- confirmation of an important fact
- discovery of a new risk
- failure of an existing assumption
- significant schedule changes
- legal developments
- financial changes
- stakeholder decisions
- external events

---

# What Does Not Change the Picture?

Examples include:

- acknowledgements
- duplicate information
- formatting changes
- repeated notifications
- already-known facts
- routine status updates without operational impact

These events are recorded in the Timeline but do not trigger full analysis.

---

# Why This Matters

This principle prevents:

- unnecessary analysis
- recommendation churn
- AI overreaction
- wasted attention
- inconsistent reasoning

It preserves focus on operationally meaningful change.

---

# Business Rule

No Recommendation may be created until the system has evaluated whether the
Operational Picture has changed.

---

# Success Criteria

FO Brain succeeds when:

- it ignores operationally irrelevant noise;
- it rebuilds understanding only when necessary;
- every recommendation is traceable to a meaningful change in the Operational Picture.
