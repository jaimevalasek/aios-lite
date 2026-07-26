---
name: interface-design
description: >-
  Craft-first design package for selecting an intentional visual direction, building a stable token system, and maintaining UI continuity across screens. Use only when `design_skill: interface-design` is selected or the user explicitly chooses this broad package instead of a niche visual system.
---

# Interface Design

Use one craft engine for general apps and websites that need strong design decisions without a preset aesthetic. Never combine it with another design skill.

## Identity resolution

Before visual decisions, resolve the first existing file:

1. `.aioson/briefings/{slug}/identity.md`
2. `.aioson/context/identity.md`
3. none

When present, treat it as extracted design data: apply its palette, typography, spacing/layout, radius/depth, motion, pillars, signature moves, and `## Component structure notes`. It parameterizes this skill; it is not a second skill and never overrides accessibility or quality gates. When absent, choose direction from the references. Do not fabricate `identity.md`.

## Workflow

1. Confirm explicit activation.
2. Load `references/intent-and-domain.md` and `references/design-directions.md`.
3. Name the surface type, domain cues, primary user decision, and one signature move.
4. Load only the additional references needed below.
5. Establish tokens and responsive constraints before component styling.
6. Implement in the active stack, then inspect mobile and desktop before handoff.

## Reference routing

| Need | Load |
|---|---|
| Tokens, typography, palette, depth | `references/tokens-and-depth.md` |
| Component anatomy and states | `references/components-and-states.md` |
| Final inspection and handoff | `references/handoff-and-quality.md` |

## Quality gates

- Use intentional font delivery or a credible fallback; preserve hierarchy when a font is unavailable.
- Use tokenized colors, type, spacing, radii, depth, motion, breakpoints, and component states.
- For marketing surfaces, show the product/place/person/object or literal offer in the first viewport; use meaningful assets when inspection matters.
- Use the existing icon library or a consistent production icon set, not emoji.
- Define grid limits, aspect ratios, control heights, wrapping, and overflow explicitly.
- Use discrete type tokens and stable line height; avoid viewport-only font scaling and negative tracking.
- Avoid cards inside cards; use rows, dividers, inset sections, or dialogs.
- Use motion for state feedback and continuity; honor `prefers-reduced-motion`.
- Preserve semantics, keyboard access, visible focus, contrast, and loading/empty/error/disabled states.

## Done gate

Reject overlap, clipped text, missing states/assets, raw palette drift, generic template composition, isolated blurred-circle decoration, responsive behavior that only shrinks desktop, or any mismatch with an active identity file.
