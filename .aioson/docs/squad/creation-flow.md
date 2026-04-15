---
description: "Squad creation flow — entry message, project artifact detection, intake questions, autonomy, discovery mini-package, and executor classification."
---

# Squad Creation Flow

Use this module for new squad creation, blueprint derivation, and major extension work.

## Entry message

Do not begin with a Lite/Genome menu.
Start direct squad creation with:

> "I will assemble your specialized squad.
>
> Reply in a single block if you want:
> 1. domain or theme
> 2. main goal
> 3. expected output type
> 4. important constraints
> 5. roles you want in the squad, or I can choose"

If the user later wants genomes, route to `@genome`.

## Project artifact detection

Before asking follow-up questions, scan `.aioson/context/` for reusable upstream artifacts:

- `implementation-plan-*.md`
- `requirements-*.md`
- `architecture.md`
- `prd.md` or `prd-*.md`

If one or more files are clearly relevant to the squad request:

1. Read the implementation plan first when present.
2. Extract domain, goal, expected outputs, constraints, expected behaviors, and done signals.
3. Record the consumed file paths in blueprint `sourceDocs`.
4. Do not ask again for information that is already explicit in those artifacts.

If multiple artifacts exist but relevance is ambiguous, ask one short disambiguation question instead of ignoring them.

## Intake

Ask only for what is still missing after reading the project artifacts. Typical fields are:

1. domain or theme
2. main goal
3. output type
4. important constraints
5. optional role hints

The user may respond with text, large pasted context, images, or attachments.
If attachments exist, use them before defining executors.

## Autonomy rule

- default to high autonomy
- infer reasonable defaults before asking follow-up questions
- ask additional questions only when the answer would materially change the squad
- if the user says "keep going" or "just do it", reduce questions further and make assumptions explicit

## Parallel squad rule

- if the user asks for a new squad, create a new squad
- do not silently reuse or merge an existing squad just because the domain looks similar
- maintenance or refactor of an existing squad only happens when the user says so explicitly

If the slug collides and the user clearly wants a new squad:

- do not silently reuse the old one
- propose a derived slug or ask which slug they prefer

## Discovery mini-package

Before generating files, establish:

- current problem
- practical goal
- squad MVP boundary
- out of scope
- which docs and skills really need to be loaded now
- which risks or ambiguities could still change the squad composition

If readiness is low:

- ask 1 to 3 short questions, or
- proceed with explicit assumptions when the user requested autonomy

## Executor classification

Classify every executor with this tree:

```text
TASK / ROLE
  ├── Deterministic? → worker
  ├── Critical human judgment? → human-gate
  ├── Replicates a real person's methodology? → clone
  ├── Deep domain expertise? → assistant
  └── Otherwise → agent
```

Show the classification review to the user before the warm-up round.

## Assistant behavioral profiles

When a role becomes `type: assistant`, assign one of:

- `dominant-driver`
- `influential-expressive`
- `steady-amiable`
- `compliant-analytical`
- `dominant-influential`
- `influential-steady`
- `steady-compliant`
- `compliant-dominant`

The chosen profile must shape communication style and decision-making.

## Executor count

Prefer 3 to 5 specialized roles.
Do not create extra executors just to look comprehensive.

## Creation outcome

By the end of creation, you should know:

- the squad slug
- the source artifacts that informed the design
- the executor roster
- which roles are workers vs agents vs assistants vs clones vs human gates
- whether the squad is content-first, software-first, or mixed
- whether workflows, review loops, and content blueprints are needed
- whether the squad is universal or locale-specific
