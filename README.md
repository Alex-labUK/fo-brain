# FO Brain

**FO Brain** is the first implementation of a **Decision Operating
System (DOS)**.

It is designed to support operational decision-making in complex
organisations by maintaining a continuously evolving Operational
Picture.

The platform augments human judgement.

It never replaces it.

------------------------------------------------------------------------

# Start Here

Read the documents in this order:

1.  VISION.md
2.  PLATFORM.md
3.  PRINCIPLES.md
4.  GLOSSARY.md

After that, continue into the `docs/` directory for detailed
specifications.

------------------------------------------------------------------------

# Repository Structure

``` text
README.md        Project entry point
VISION.md        Why the platform exists
PLATFORM.md      High-level platform architecture
PRINCIPLES.md    Architectural rules
GLOSSARY.md      Common terminology
ROADMAP.md       Future evolution

docs/
    architecture/
    domain/
    method/
```

------------------------------------------------------------------------

# Core Idea

The platform follows a simple reasoning model:

``` text
Information
      ↓
Operational Picture
      ↓
Recommendations
      ↓
Human Decision
      ↓
Execution
      ↓
Learning
```

Recommendations are always generated from the Operational Picture---not
directly from incoming information.

------------------------------------------------------------------------

# Principles

-   Understanding before recommendation.
-   AI supports; humans decide.
-   Facts and assumptions remain distinct.
-   Recommendations must be explainable.
-   Learning improves future decisions.
-   The reasoning model is domain-independent.

------------------------------------------------------------------------

# Current Status

The repository currently focuses on:

-   domain modelling;
-   reasoning methodology;
-   platform architecture;
-   documentation-first design.

Implementation follows the specifications in this repository.

------------------------------------------------------------------------

# License

License to be defined.
