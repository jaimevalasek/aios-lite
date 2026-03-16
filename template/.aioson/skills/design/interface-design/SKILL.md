---
name: interface-design
description: Interface Design is a craft-first packaged design skill for choosing an intentional visual direction, building a stable token system, and maintaining UI continuity across screens. Use it when `design_skill: interface-design` is selected or when the user explicitly chooses this broad craft package.
---

# Interface Design

This is a general design-craft package.
It helps the agent make strong decisions when the user wants a deliberate, high-quality UI but has not chosen a niche visual language such as `cognitive-ui` or `premium-command-center-ui`.

## Package structure

```text
.aioson/skills/design/interface-design/
  SKILL.md
  references/
    intent-and-domain.md
    design-directions.md
    tokens-and-depth.md
    components-and-states.md
    handoff-and-quality.md
```

## Activation rules

- Apply this package only when `design_skill: interface-design` is selected.
- Do not combine it with any other design skill.
- Use it when the user wants strong design craft but has not asked for a very specific visual system.

## Loading guide

| Task | Load |
|---|---|
| Any visual work | `references/intent-and-domain.md` + `references/design-directions.md` |
| Tokens and system decisions | add `references/tokens-and-depth.md` |
| Component behavior | add `references/components-and-states.md` |
| Final delivery quality | add `references/handoff-and-quality.md` |

## Positioning

Use this package for:
- general web apps
- websites that need strong craft but not a preset style language
- redesigns that need a clearer system
- multi-screen work where continuity matters

Do not use it when a more explicit visual package was selected.
