---
name: aioson-context-boundary
description: .aioson/context/ accepts only .md files — no JSON, YAML, JS, or other formats
priority: 10
version: 1.0.0
agents: [product, analyst, architect, ux-ui, pm, dev, qa, sheldon]
---

# Context Boundary: .aioson/context/

`.aioson/context/` is exclusively for Markdown artifacts. No agent may create non-Markdown files inside it.

Prohibited: `.json`, `.yaml`/`.yml` (except conformance), `.js`, `.ts`, `.py`, any non-Markdown format.

## Correct location by artifact type

| Artifact type | Correct location |
|---|---|
| Project configuration | `.aioson/config.md` |
| Conformance schema | `.aioson/context/conformance-{slug}.yaml` ← EXCEPTION: only `.yaml` allowed |
| Squad definitions | `.aioson/squads/{slug}/` |
| Skill manifests | `.aioson/skills/{category}/{slug}/SKILL.md` |
| Feature artifacts | `.aioson/context/{artifact}-{slug}.md` |
| Project artifacts | `.aioson/context/{artifact}.md` |

## Valid artifacts in .aioson/context/

```
project.context.md            ← setup
discovery.md                  ← analyst
requirements-{slug}.md        ← analyst
architecture.md               ← architect
ui-spec-{slug}.md             ← ux-ui
prd.md / prd-{slug}.md        ← product
spec-{slug}.md                ← dev
implementation-plan-{slug}.md ← pm
features.md                   ← product / pm
project-pulse.md              ← all agents (update at session end)
conformance-{slug}.yaml       ← sole exception to .md rule
```

## On violation detected

1. Do not create the file.
2. Identify correct format and location.
3. Inform user: "`.aioson/context/` accepts only `.md` (exception: `conformance-{slug}.yaml`). Creating `{artifact}` in `{correct-location}` instead."
