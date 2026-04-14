---
description: "Squad genome binding rules — when to route to @genome, how to persist bindings, and how to preserve legacy compatibility."
---

# Squad Genome Bindings

Use this module when the request mentions genomes, when the squad already has genome bindings, or when repairing binding compatibility.

## Responsibility boundary

- `@squad` owns the squad package and its metadata
- `@genome` owns genome generation and application logic

If the user asks for a genome during a squad session:

- finish or confirm the squad package first
- then route explicitly to `@genome`

## Binding persistence

When a genome is applied to an existing squad:

- update `.aioson/squads/{slug}/squad.md`
- if normalized bindings are present or being normalized, update `.aioson/squads/{slug}/squad.manifest.json`
- record whether the binding is squad-wide or agent-specific
- rewrite affected executor prompts in `.aioson/squads/{squad-slug}/agents/` so they include `## Active genomes`

## Compatibility rules

When inspecting or modifying an existing squad:

- accept legacy `genomes`
- accept normalized `genomeBindings`
- if only `genomes` exists, interpret it as squad-level bindings
- if `genomeBindings` exists, treat it as the primary structure
- do not automatically delete legacy `genomes` during the migration phase

If the user asks for repair or normalize:

- materialize `genomeBindings`
- preserve old data
- keep reads compatible with both formats

## Non-negotiable boundary

Do not modify official files in `.aioson/agents/` with user-specific genomes.
Bindings must affect only squad package files under `.aioson/squads/{slug}/`.
