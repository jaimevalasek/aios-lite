---
name: glassmorphism-ui
description: >-
  Glassmorphism UI defines layered interfaces with frosted surfaces, controlled transparency, gradients, and real depth. Use only when `design_skill: glassmorphism-ui` is set or the user explicitly requests glassmorphism, glass UI, frosted cards, translucent layers, aurora gradients, modern fintech, or an iOS-like visual treatment.
---

# Glassmorphism UI

Build depth through translucent surfaces over a visible substrate. Glass is structural, not a decorative blur applied to every element. Never combine this package with another design skill.

## Workflow

1. Confirm explicit selection; do not trigger from “modern” alone.
2. Load `references/art-direction.md` and choose one expression mode.
3. Load `references/design-tokens.md` for every task.
4. Load only the relevant task reference from the routing table.
5. Implement with semantic structure, accessible contrast, keyboard behavior, responsive layouts, and a no-blur fallback.
6. Check performance and the visual depth hierarchy before handoff.

## Reference routing

| Scope | Additional references |
|---|---|
| Components and forms | `references/components.md` |
| App, detail, settings, auth, list/detail | `references/components.md` + `references/patterns.md` |
| Dashboard | `references/components.md` + `references/patterns.md` + `references/dashboards.md` |
| Marketing or portfolio | `references/components.md` + `references/websites.md` |
| Meaningful transitions | `references/motion.md` |

Load all references only for a full cross-surface build.

## Non-negotiable signature

- Place glass over a gradient, image, or color field with enough variation to reveal translucency.
- Keep a clear hierarchy between shell, surface, and elevated glass; limit nesting to three levels.
- Use subtle luminous borders and reflections. Do not outline every child.
- Treat blur and alpha as tokens. Avoid arbitrary per-component values.
- Provide `@supports (backdrop-filter: blur(1px))` fallback styles.
- Preserve readable contrast in both themes and in browsers without blur.

## Quality gate

Reject the result if glass sits on a flat background, layers are indistinguishable, transparency damages readability, blur is excessive, performance suffers from many composite layers, shadows become muddy, focus states disappear, or the fallback is unusable.
