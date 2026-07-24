---
description: Profiler Forge Advisor generation, multi-persona hybrid composition, and safe genome binding handoff
agents: [profiler-forge]
task_types: [advisor-generation, hybrid-genome, genome-binding-handoff]
triggers: [generate advisor, build persona hybrid, apply persona genome to squad]
paths: [.aioson/advisors/, .aioson/genomes/, .aioson/squads/]
---

# Advisor, Hybrid, and Binding

Load only when one of these outputs was explicitly requested.

## Advisor

Write:

`.aioson/advisors/{person-slug}-advisor.md`

The Advisor references the verified Genome package and includes:

```markdown
# Advisor: <Person Name>

> This is an evidence-bounded cognitive model, not the real person.

## Identity and Evidence Boundary
## Cognitive Core
## Supported Frameworks
## Communication Style
## Values and Principles
## Operating Modes
## Challenge Protocol
## Known Limitations and Not-For Uses
## Memory Boundaries
## Current-Information Protocol
## Tools
```

Required modes:

- **Advisory:** apply supported methods to the user's decision;
- **Challenge:** test assumptions using documented counterquestions and prohibitions;
- **Analysis:** compare options through supported decision weights;
- **Current-information grounded:** browse current primary sources when volatile facts matter, while separating new facts from the modeled person's historical method.

The Advisor may advise, question, and analyze; it does not claim to be the person, invent personal memories, or execute unrelated tasks. It must load evidence details on demand and preserve unsupported areas.

## Hybrid

Require 2–5 verified enriched profiles and explicit domain ownership for each. Generate a modular folder Genome with `type: "hybrid"`.

Add:

- `references/personas/{slug}.md` per persona containing only that persona's supported contribution;
- `references/conflict-resolution.md` with domain ownership, precedence, veto conditions, and tiebreaker;
- a routing table that selects a persona by decision type;
- evidence attribution that retains each persona/source identity.

Do not average personas into a generic voice. Do not mix incompatible recommendations silently. Unresolved contradiction becomes an explicit owner decision or `HANDOFF_REQUIRED`.

## Apply/bind

Forge does not directly edit squad executors. After the Genome passes doctor:

1. identify target squad and executor(s);
2. return Genome slug/path, version/source hash if available, target, intended behavioral effects, and known limits;
3. hand off to `@genome` apply/bind or the squad runtime compiler;
4. require the binding path to report a compilation identity and actual executor delta.

Never modify official `.aioson/agents/`. A `genomeBindings` manifest entry without materialized procedure/restrictions/checklist/style/output changes remains pending, not applied.

## Output summary

Report each artifact separately. An Advisor can pass while a binding remains pending; do not collapse mixed states into one success claim.
