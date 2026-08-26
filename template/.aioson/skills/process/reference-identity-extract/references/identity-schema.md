---
description: Exact canonical identity.md structure and token families
agents: [refiner, setup]
task_types: [identity-record]
triggers: [write identity.md]
---

# Identity Record Schema

Write exactly these top-level headers:

```markdown
---
kind: identity
scope: briefing
slug: {slug}
source: references
generated_by: reference-identity-extract
generated_at: {YYYY-MM-DD}
confidence: high
theme: light-dark
base_unit: 4px
---

## Design pillars
## Palette
## Typography
## Spacing & layout
## Radius & depth
## Motion
## Signature moves
## Anti-goals
## Component structure notes
## Provenance
```

Use `scope: exploration|briefing|brand`, brand slug `project`, source `references|intent`, confidence `high|medium|low`, and theme `light|dark|light-dark`. `theme` is read by `aioson design:seed`: its first token fixes the ground pole of every candidate (the draw never flips the pole the references showed). An optional `register: technical|quiet|editorial|material|constructed|cinematic` fixes the register the same way — write it when the references clearly belong to one.

Minimum content:

- 2–3 specific design pillars
- foreground/background/border/brand/semantic palette roles
- display/body/mono stacks and page/section/body/meta scale
- numeric spacing scale, breakpoints, grid, gutter
- radius ladder and exactly one depth strategy
- duration/easing, entrance posture, reduced-motion behavior
- 1–3 product-specific signature moves
- three generic defaults explicitly rejected
- one `### {component}` block per structure image with regions, anatomy, states, interactions—or `None — identity-only`
- generic source counts in provenance

The artifact must contain no `{hex}`, `#RRGGBB`, `{token}`, TODO, Lorem, or other placeholder.
