# Reasoning Model

Version: 1.0

------------------------------------------------------------------------

# Purpose

This document defines how the Decision Operating System reasons.

It specifies behaviour, not implementation.

------------------------------------------------------------------------

# Goal

Transform incoming information into an updated Operational Picture and,
when appropriate, an explainable recommendation.

------------------------------------------------------------------------

# Inputs

The reasoning process may receive:

-   new information;
-   user questions;
-   completed actions;
-   external events;
-   corrections.

Every input is processed using the same reasoning cycle.

------------------------------------------------------------------------

# Reasoning Cycle

## Step 1 --- Receive

Accept new information.

Record its source.

------------------------------------------------------------------------

## Step 2 --- Classify

Determine what the information represents.

Possible categories include:

-   Fact
-   Unknown
-   Assumption
-   Constraint
-   Risk
-   Outcome
-   Timeline Event

------------------------------------------------------------------------

## Step 3 --- Relevance

Ask:

> Does this information change the Operational Picture?

If **No**:

-   record it;
-   update the Timeline if required;
-   stop.

If **Yes**:

continue.

------------------------------------------------------------------------

## Step 4 --- Update

Update the Operational Picture.

Only the minimum required changes should be applied.

------------------------------------------------------------------------

## Step 5 --- Analyse

Evaluate:

-   consequences;
-   conflicts;
-   dependencies;
-   missing information;
-   risks.

------------------------------------------------------------------------

## Step 6 --- Decide Whether Reasoning Can Continue

If critical information is missing:

-   expose Unknowns;
-   request clarification;
-   stop.

Otherwise continue.

------------------------------------------------------------------------

## Step 7 --- Generate Options

Generate one or more operational options.

Every option must be consistent with the current Operational Picture.

------------------------------------------------------------------------

## Step 8 --- Evaluate

Evaluate each option against:

-   desired Outcome;
-   Constraints;
-   Risks;
-   known Facts.

------------------------------------------------------------------------

## Step 9 --- Recommend

Produce a recommendation.

The recommendation must explain:

-   why;
-   supporting facts;
-   assumptions;
-   remaining uncertainty.

------------------------------------------------------------------------

# Outputs

A reasoning cycle may produce:

-   no change;
-   an updated Operational Picture;
-   questions for the user;
-   operational options;
-   a recommendation.

------------------------------------------------------------------------

# Stopping Conditions

The cycle stops when:

-   nothing operationally changed;
-   critical information is missing;
-   a recommendation has been produced;
-   human input is required.

------------------------------------------------------------------------

# Human Authority

The reasoning model never executes decisions.

Execution begins only after human approval.

------------------------------------------------------------------------

# Learning

After execution:

-   capture outcome;
-   compare expected and actual results;
-   identify reusable knowledge;
-   preserve historical reasoning.
