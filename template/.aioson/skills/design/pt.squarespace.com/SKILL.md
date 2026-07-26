---
name: pt-squarespace-com
description: >-
  Squarespace-inspired system for sharp minimal SaaS websites with black/white contrast, teal accent, Clarkson-style typography, CSS-first motion, local asset guidance, and pt.squarespace.com layout patterns. Use when `design_skill: pt.squarespace.com` or `design_skill: pt-squarespace-com` is selected, or the user explicitly requests a Squarespace-inspired rebuild.
---

# Squarespace-Inspired Design

Apply sharp minimalism, strong typography, black/white contrast, sparse teal accents, zero-radius geometry, and CSS-first motion. Treat extracted assets and class names as references to adapt, not content to republish unchanged.

## Workflow

1. Confirm explicit activation.
2. Load `references/design-tokens.md` before any component.
3. Load `references/patterns.md` and `references/websites.md` for page structure.
4. Load `references/components.md` for component anatomy and interaction mechanics.
5. Load `references/motion.md` only when implementing motion.
6. Replace extracted media with owned assets before publishing.
7. Inspect mobile/desktop, motion preferences, font fallback, contrast, and overflow.

## Signature

- Sharp corners and geometric alignment; do not soften the system with generic rounded cards.
- Large, light-weight display type with disciplined body hierarchy.
- Predominantly black/white palette with one bounded teal accent.
- No gradients or ornamental shadows.
- Dark hero/footer zones may contrast a light body.
- CSS transitions/keyframes plus `IntersectionObserver`; no animation library unless the project already requires one.
- Signature interactions may use blend-mode CTA fills, dual-gradient link underlines, and clip-path mobile navigation.

## Asset guidance

The package may reference Clarkson-family fonts and captured videos under `public/`. Verify they exist and that the project has rights to ship them. Otherwise use a credible geometric sans fallback and owned product media. Always provide video poster/fallback, muted autoplay constraints, and reduced-motion behavior.

## Quality gates

- Establish tokens before layout code; avoid raw colors, arbitrary type sizes, shadows, and radii.
- Show the product or literal offer in the first viewport rather than a gradient/icon/card-only hero.
- Use a consistent icon library, semantic markup, keyboard navigation, visible focus, and accessible contrast.
- Define grid min/max, media aspect ratios, control heights, wrapping, and overflow.
- Use discrete type tokens and stable line height; avoid viewport-only scaling and negative tracking.
- Avoid card-in-card composition and isolated blurred-circle decoration.
- Keep motion as feedback or narrative sequencing and honor `prefers-reduced-motion`.
- Replace cloned copy, trademarks, and captured assets unless their reuse is authorized.

## Done gate

Reject rounded-template drift, unlicensed assets, font failure without fallback, motion-only disclosure, weak mobile navigation, clipped media/text, missing interaction states, excessive teal, gradients/shadows that contradict the signature, or a literal clone presented as original work.
