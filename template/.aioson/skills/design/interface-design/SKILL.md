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
2. Load `references/intent-and-domain.md` and `references/design-directions.md`. This is the cold start — the moment a generative system reverts to the average — so also load `references/aesthetic-registers.md` and commit to one register before any token decision, including its **Premium bar**: the register names its posture and the level it must be executed at; the cheap failure named under each register is never an acceptable reading of it. Register sets posture, direction sets the token math; one of each, never two of either.
3. Draw the starting material: with no identity record, run `aioson design:seed . --register=<register> --slug=<feature> --json` and build FROM one candidate. The draw decides where the work starts — hue family, ground pole, scheme, typeface pairing, hero posture — because that is exactly the decision a model prior otherwise makes the same way in every project; it is diversified against the operator's recent measured projects, and quietly reverting to a familiar favorite palette re-creates the cross-project sameness it exists to break. Refining roles, scales, and composition stays your judgment, and an extracted identity outranks any draw. The candidate's `finishing` line is a floor, not a suggestion: the drawn material is the signature ON TOP of a tokened finish system — shadow vocabulary on floating surfaces, tinted washes per accent role — that every route inherits. A legitimate palette applied without its finish is exactly how a fresh draw ships looking like generic output.
4. Name the surface type, domain cues, primary user decision, and one signature move — and name what the visitor came to do on each screen: **decide, operate, read, or inhabit**. The premium bar flips with the answer: persuade/experience surfaces argue with the expressive repertoire, while operate/read surfaces (dashboards, admin, editors, settings) earn **familiarity** — fixed rem scale, tighter ratio, restrained accent, 150–250ms feedback motion, teaching empty states — with the craft floor spent on precision and density instead of ornament. The mode is per surface, never per project. When the owner supplied anti-references (what this must NOT look like), they bind here as hard avoid-list entries alongside the register's anti-goals.
5. Load only the additional references needed below. When composing the surface's atmosphere, material, or entrance motion, load `.aioson/docs/design/visual-effects.md` — choosing the one earned atmosphere is part of the cold start, not a later option. The modern-effects repertoire belongs in every build at the dosage the register sets — restrained or theatrical — and an effect only exists when a real surface applies it: a token or `@keyframes` nothing references decorates the stylesheet while the user sees flat, and telemetry names both (`shallow material system`, `declared finish never applied`).
6. Establish tokens and responsive constraints before component styling. Typography is delivered, not just named: one real typeface (webfont link or embedded `@font-face`) with a credible fallback stack, and a display scale where the surface argues. Theme the browser's own chrome from the palette — `::selection`, `caret-color`, scrollbars, `:focus-visible`, underline tuning, tabular numerals — stock chrome is the cheapest tell that a page was assembled rather than built, and the telemetry counts it (`browser_surfaces N/6`).
7. Implement in the active stack, then inspect mobile and desktop before handoff.

## Reference routing

| Need | Load |
|---|---|
| Tokens, typography, palette, depth | `references/tokens-and-depth.md` |
| Component anatomy and states | `references/components-and-states.md` |
| Final inspection and handoff | `references/handoff-and-quality.md` |

## Quality gates

- Deliver one real typeface (webfont link or embedded `@font-face`) with a credible fallback that preserves hierarchy when the face is unavailable. A family named with no delivery mechanism silently renders the OS fallback; typography that never leaves the OS default stacks on a premium-intent surface is a finding, not a style choice.
- Use tokenized colors, type, spacing, radii, depth, motion, breakpoints, and component states.
- For marketing surfaces, show the product/place/person/object or literal offer in the first viewport; use meaningful assets when inspection matters.
- Use the existing icon library or a consistent production icon set, not emoji.
- Define grid limits, aspect ratios, control heights, wrapping, and overflow explicitly.
- Use discrete type tokens and stable line height; avoid viewport-only font scaling and negative tracking.
- Avoid cards inside cards; use rows, dividers, inset sections, or dialogs.
- Use motion for state feedback and continuity; honor `prefers-reduced-motion`.
- Preserve semantics, keyboard access, visible focus, contrast, and loading/empty/error/disabled states.

## Done gate

Reject overlap, clipped text, missing states/assets, raw palette drift, generic template composition, isolated blurred-circle decoration, responsive behavior that only shrinks desktop, OS-default typography standing where the chosen face should render, an unaddressed `craft floor` telemetry warning, an unaddressed `cross-project palette repetition` warning (diversify, or record the named brand reason the family is shared), an unaddressed `shallow material system` warning (token the finish so every route inherits it — depth is measured, one wash is not a system), an unaddressed `declared finish never applied` warning (wire each named effect to a surface or delete it), an unaddressed `generation tell` or `copy tell` warning (apply the named counter-move or record the brief/register reason — the kicker alone has no earning-back), a violated owner anti-reference, any mismatch with an active identity file, or — in conformance mode — any drift from the approved prototype that the PRD does not record as an approved deviation.
