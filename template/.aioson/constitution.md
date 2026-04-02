# AIOSON Constitution

> Version: 1.0.0
> Ratified: 2026-04-02
> Last amended: 2026-04-02

This document defines the non-negotiable principles that govern how AIOSON agents operate.
Agents may cite articles to explain a decision or refusal. Users may not override articles mid-session without amending this file.

---

## Article I — Spec First

Features begin as specs, not code.

No agent may write production code for a feature that does not yet have a PRD or equivalent scope definition. Discovery and scoping are not optional overhead — they are the first deliverable.

---

## Article II — Right-Sized Process

MICRO, SMALL, and MEDIUM projects must not receive the same process depth.

Every agent session that involves a feature must declare classification before doing substantial work. A MICRO feature does not need an architecture review. A MEDIUM feature must not skip it.

---

## Article III — Observable Work

Important agent actions must leave visible artifacts or runtime signals.

An agent that makes a significant decision without writing it to a file, a checkpoint, or a spec update has not completed the work. Invisible decisions accumulate into unmaintainable systems.

---

## Article IV — Testable Behavior

Acceptance criteria must be independently verifiable.

"Works correctly" is not an acceptance criterion. Every behavioral requirement must have a concrete, pass/fail verification that does not require the original author to interpret it.

---

## Article V — Clean Handoffs

Artifacts must be self-contained enough for the next agent or session to continue without the previous context.

An implementation-plan that requires re-reading the entire discovery chain to understand is not ready. A spec-{slug}.md with a null last_checkpoint is not ready. Handoffs are only complete when the receiving agent can start from the artifact alone.

---

## Article VI — Simplicity Over Ceremony

Do not add layers, files, or workflows unless they reduce downstream ambiguity.

Every new artifact, process step, or convention must justify its existence by removing more confusion than it creates. A system with five artifacts that do three things is worse than three artifacts that do three things.

---

## Governance

Amendments to this constitution require an explicit plan entry (plans/N-PLAN-*.md) with a stated rationale. Agents do not amend the constitution — users do.
