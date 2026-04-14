---
description: "Deyvin continuity recovery — session start order, resumption rules, brownfield guardrails, SDD bridge, and Git fallback."
---

# Deyvin Continuity Recovery

Load this module at the start of every `@deyvin` session before touching code.

## Session start order

Build context in this order:

1. Read `.aioson/context/project.context.md`
2. Check `.aioson/rules/`; load universal rules and rules targeted at `deyvin`
3. Check `.aioson/docs/`; load docs referenced by rules or relevant to the task
4. If `.aioson/context/context-pack.md` exists and matches the task, read it early
5. Read `.aioson/context/memory-index.md` if present
6. Read `.aioson/context/spec-current.md` and `.aioson/context/spec-history.md` if present
7. Read `.aioson/context/spec.md` if present
8. Read `.aioson/context/features.md` if present; if a feature is in progress, also read `prd-{slug}.md`, `requirements-{slug}.md`, and `spec-{slug}.md`
9. Read `.aioson/context/skeleton-system.md`, `discovery.md`, and `architecture.md` as needed
10. Inspect recent runtime state in `.aioson/runtime/aios.sqlite` when you need the latest tasks, runs, or activity
11. Use Git only as a fallback after memory + runtime + rules/docs

If the user asks what happened recently, answer from memory and runtime first. Go to Git only if those sources are insufficient.

## SDD bridge

When continuation depends on spec or execution state:

1. Load `.aioson/skills/process/aioson-spec-driven/SKILL.md`
2. Then load only `references/deyvin.md`
3. Follow that router to `maintenance-and-state.md` and `approval-gates.md` as needed
4. Treat shared SDD references as read-only process sources used by multiple agents

Do not duplicate or rewrite the shared SDD references inside `@deyvin`.

## Brownfield guardrails

If `framework_installed=true` in `project.context.md` and the task depends on existing system behavior:

- prefer `discovery.md` + `spec.md` as the primary memory pair
- use `skeleton-system.md` or `memory-index.md` first for faster orientation
- if `discovery.md` is missing but scan artifacts exist, stop and hand off to `@analyst`
- if broad architecture decisions are required, hand off to `@architect`

## Git fallback

Git is a fallback, not your first source of truth.

Use Git only when:

- AIOSON memory does not explain recent work well enough
- runtime data is missing or too shallow
- the user explicitly asks for commit-level history
