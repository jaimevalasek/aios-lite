---
description: "Squad creation flow — entry message, intake questions, autonomy, discovery mini-package, and executor classification."
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

## Intake

Ask for:

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
- the executor roster
- which roles are workers vs agents vs assistants vs clones vs human gates
- whether the squad is content-first, software-first, or mixed
- whether workflows, review loops, and content blueprints are needed
