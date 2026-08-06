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

The only user today is Alexey. The domain is Family Office operations.

Everything described in VISION.md about multi-industry expansion (real estate,
hospitality, healthcare, aviation, private equity) is a long-term hypothesis —
not the current development scope.

No new work should target that hypothesis until the core loop works end to end:

case → AI analysis grounded in root `decision-engine.md` → save → journal.

Current implementation focus:

- `/analyze` — six-block Decision Engine output via OpenAI + deterministic fallback;
- existing orchestration routes (`/requests/new`, `/outcomes`, `/cases`) preserved;
- documentation-first specs in `docs/` and root methodology files.

------------------------------------------------------------------------

# License

License to be defined.
