---
name: visual-implementation
description: Visual authority resolution and anti-slop implementation criteria for user-facing interfaces, prototypes, and visual states
agents: [dev, deyvin]
priority: 10
version: 1.0.0
modes: [executing]
task_types: [implementation, ui, layout, prototype, visual-state, responsive, accessibility]
load_tier: trigger
triggers: [UI, interface, layout, screen, component, prototype, visual, responsive, mobile, styling, design skill, identity]
paths: [app/**, src/**, resources/**, components/**, pages/**, styles/**]
---

# Visual Implementation

Load when the active phase touches a user-facing interface, prototype, or visual state. Skip entirely for non-visual work — that is the point of routing it here instead of carrying it in the kernel.

## 1. Query the visual-quality brain

```bash
aioson brain:query . --agent=dev --tags=visual-quality,layout --min-quality=4 --format=compact 2>/dev/null || true
```

Apply matched nodes with `q >= 4`; never implement a node marked `AVOID`.

**Precedence** is node `vq-000`: a project rule under `.aioson/rules/` outranks every node here. Create one with `aioson rule:new`.

## 2. Resolve visual authority before styling

Resolve from the PRD binding, in this order:

1. the `identity` / `identity_status` record — load the record itself, it is the extracted token and component-structure system, not a summary
2. the approved prototype (`prototype_status: current`) and its manifest `## Visual direction`
3. the project's selected `design_skill`
4. existing repository component language

Do not replace missing visual direction with a generic layout. A genuinely unresolved visual decision is a product question for `@product`, or a prototype gap for `@briefing-refiner`; never invent a second visual system to fill it.

When an approved prototype exists, the design skill runs in **conformance mode**: transfer the approved direction, do not re-decide it. A deviation must already be recorded in the PRD as an approved deviation — never introduced silently as an improvement.

## 3. Run the replaceability test

If the screen still looks complete after removing its domain nouns, it needs a stronger product-specific signature. Reconsider centered hero + gradient/blob + equal cards, card multiplication, style soup, or decorative effects without a functional reason.

Common patterns remain valid when the approved identity and evidence justify them. The test is about whether the composition is *specific*, not whether it is *unusual*.

## 4. Prove the states, not just the happy path

Inspect real content at desktop and mobile widths, plus the material loading, empty, error, focus, disabled, success, and reduced-motion states before marking visual work complete. Short placeholder copy hides layout failures — use realistic domain data.

Mobile is a recomposition, not a shrunken desktop: re-evaluate order, density, controls, wrapping, and interaction priority.

## 5. Measure what you built

Before declaring visual work complete, run the telemetry over the front-end you touched:

```bash
aioson verify:artifact . --kind=visual --dir=<front-end root> --advisory 2>/dev/null || true
```

It returns arithmetic, not opinion: token adherence, spacing off the 4px grid, active depth strategies, font families, reduced-motion coverage, state coverage, card nesting. Repair the blocking findings — decorative blob, animation with no `prefers-reduced-motion`, cards three deep. Treat the threshold warnings as evidence for the decision you already owe: either fix the drift or name why this surface is the exception.

A utility-class codebase returns `applicable: false`; that is a scope statement, not a pass.

## 6. Reuse before adding

Map each region to a real component in this project's library. A new component needs a named reason. Off-grid spacing, hardcoded colors, mixed radii, and mixed depth strategies are drift — fix them rather than adding another variant.
