---
name: premium-command-center-ui
description: Premium Command Center UI is a packaged visual system for tri-rail dashboards, dark operational shells, and premium command-center software. Use it only when `design_skill: premium-command-center-ui` is selected or the user explicitly chooses this package.
---

# Premium Command Center UI

This is a specialized operational design skill.
It is not the default for every dashboard.

## Package structure

```text
.aioson/skills/design/premium-command-center-ui/
  SKILL.md
  references/
    visual-system.md
    patterns.md
    operations.md
    validation.md
```

## Activation rules

- Apply this package only when `design_skill: premium-command-center-ui` is selected.
- Do not load it in parallel with `cognitive-ui`, `interface-design`, or any other design skill.
- Use it when the product genuinely needs a premium operational shell, not merely a dark dashboard.

## Responsibility boundary

This skill defines:
- dark premium operational tone
- tri-rail composition rules
- density discipline
- grouped operational cards and contextual rails
- quality bar for command surfaces

This skill does not decide framework, component library, or delivery format.

## Loading guide

| Task | Load |
|---|---|
| Any visual work | `references/visual-system.md` |
| Dashboard shell and layout | `references/visual-system.md` + `references/patterns.md` |
| Operational page hierarchy | `references/visual-system.md` + `references/patterns.md` + `references/operations.md` |
| Final QA | add `references/validation.md` |

## Positioning

Use this package for:
- command centers
- control towers
- orchestration software
- activity-heavy internal operating surfaces
- premium dark operational products

Do not use it for:
- landing pages
- editorial or calm consumer products
- simple CRUD screens that should stay neutral
- generic SaaS dashboards without command-center pressure
