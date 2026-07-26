---
description: "Guide to AIOSON project knowledge and delivery memory without duplicating the feature specification."
task_types: [framework-structure]
triggers: [framework layers, docs structure, project knowledge]
agents: []
---

# AIOSON Project Memory Layers

Project intelligence is available to every classification. The layers differ by authority and lifetime; they do not add workflow stages.

## Stable project knowledge

### `.aioson/rules/`

Enforce project-specific behavior and constraints. Rules override generic agent defaults and are selected for the concrete task and paths being touched.

### `.aioson/docs/`

Store reusable domain, integration, operational, and technical reference. Load only the documents whose scope matches the task.

### `.aioson/design-docs/`

Store stable structural governance such as folder conventions, reuse rules, naming, and component boundaries. These are repository guidance, not feature design stages.

### `.aioson/learnings/`

Store proven project gotchas and recipes. Read the index first and lazy-load matching entries.

## Feature delivery memory

Only three feature artifacts are canonical and blocking:

| Authority | Artifact | Owner |
|---|---|---|
| Product promise and acceptance behavior | `prd-{slug}.md` | Product; mandatory Sheldon review/enrichment in place |
| Executable vertical delivery sequence | `implementation-plan-{slug}.md` | Planner |
| Independent delivery verdict | `qa-report-{slug}.md` | QA |

Raw files under `plans/{slug}/`, the briefing/refinement, and an approved feature-owned prototype are cumulative source evidence. `.aioson/context/features/{slug}/dossier.md` and `mappings/{slug}/continuity.md` are lightweight, best-effort context memory. They may record pointers, decisions, code paths, specialist advice, and evidence, but never become a gate or a substitute for canonical authorities.

## Decision guide

| Situation | Destination |
|---|---|
| Product behavior, scope, exclusions, acceptance criteria | PRD |
| Exact implementation paths, vertical phases, verification commands | implementation plan |
| Delivery evidence and PASS/FAIL | QA report |
| Reusable project rule or constraint | `rules/` |
| Reusable domain/integration knowledge | `docs/` |
| Stable structural convention | `design-docs/` |
| Proven gotcha or recipe | `learnings/` |
| Temporary cross-compaction continuity | `mappings/{slug}/continuity.md` |
| Long-lived best-effort feature context, specialist conclusion, code map | dossier |

Do not create requirements, spec, architecture, discovery, design-doc, readiness, conformance, validation, or harness artifacts merely to make a feature appear thorough. A specialist answers one named question and returns the conclusion to Product, Planner, Dev, QA, or the dossier. A harness is valid only when the approved implementation plan deliberately chooses one.
