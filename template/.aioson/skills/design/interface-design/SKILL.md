---
name: interface-design
description: >-
  Craft-first design package for selecting an intentional visual direction, building a stable token system, and maintaining UI continuity across screens. Use only when `design_skill: interface-design` is selected, the user explicitly chooses this broad package instead of a niche visual system, or a routed AIOSON module declares it as the recorded default for a blank `design_skill`.
---

# Interface Design

Use one craft engine for general apps and websites that need strong design decisions without a preset aesthetic. Never combine it with another design skill.

## Visual authority resolution

Before visual decisions, resolve authority in this order and stop at the first hit:

1. an approved prototype bound by the PRD (`prototype_status: current`) — **conformance mode**
2. the identity record the PRD binds through `identity`/`identity_status`
3. active `.aioson/explorations/{slug}/identity.md` (exploration mode only; never for canonical work)
4. active `.aioson/briefings/{slug}/identity.md`
5. `.aioson/context/identity.md`
6. an established repository component language
7. none — **origination mode**

An identity record is extracted design data: apply its palette, typography, spacing/layout, radius/depth, motion, pillars, signature moves, and `## Component structure notes`. It parameterizes this skill; it is not a second skill and never overrides accessibility or quality gates. Do not fabricate `identity.md`.

An identity record answers the token question, never the composition question. Unless conformance mode transfers an approved layout, laying out a new screen is still an origination act: load `references/aesthetic-registers.md`, commit to one register, and write the composition signature before layout — with the identity supplying the token math. Swapping identity tokens over the default generative composition is a re-skin, and a re-skin fails the replaceability test no matter how good the tokens are.

## Conformance mode

When an approved prototype or an established component language already answers the visual question, this skill does not re-decide direction — it transfers one. Re-deciding is how an approved surface silently becomes a different product.

1. Read the prototype and its manifest `## Visual direction` (thesis, anti-goals, signature move). Those are now your inputs, not candidates.
2. Extract the real tokens, component anatomy, states, and responsive behavior already expressed there.
3. Map each prototype region to the project's actual component library. Reuse the existing component before adding one; a new component needs a named reason.
4. Preserve the approved layout, states, and interactions. A deviation must be recorded in the PRD as an approved deviation before you implement it — never introduced silently as an improvement.
5. Apply the quality checks below to what you transferred, not to a fresh direction.

Skip to origination mode only when no prototype, no identity, and no established convention exists.

## Origination mode

1. Confirm explicit activation or a recorded module default.
2. Load `references/intent-and-domain.md` and `references/design-directions.md`. This is the cold start — the moment a generative system reverts to the average — so also load `references/aesthetic-registers.md` and commit to one register before any token decision. Register sets posture, direction sets the token math; one of each, never two of either.
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

Reject overlap, clipped text, missing states/assets, raw palette drift, generic template composition, isolated blurred-circle decoration, responsive behavior that only shrinks desktop, any mismatch with an active identity file, or — in conformance mode — any drift from the approved prototype that the PRD does not record as an approved deviation.
