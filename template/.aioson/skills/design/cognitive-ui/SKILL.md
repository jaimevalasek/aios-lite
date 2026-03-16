---
name: cognitive-ui
description: Cognitive UI is a packaged visual system for premium dashboards, admin panels, landing pages, and commercial product sites with a precise command-center aesthetic. Use it only when the project selects `design_skill: cognitive-ui` in `project.context.md` or when the user explicitly asks for this visual language. Read this file first, then load only the references needed for the current task.
---

# Cognitive UI

`cognitive-ui` is one visual system package. It is not a framework preset and not a delivery format.

## Package structure

```text
.aioson/skills/design/cognitive-ui/
  SKILL.md
  references/
    foundations.md
    components.md
    patterns.md
    motion.md
    dashboards.md
    websites.md
  assets/
    cognitive-demo.jsx
```

## Activation rules

- Apply this package when `project.context.md` contains `design_skill: "cognitive-ui"` or the user explicitly chooses `cognitive-ui`.
- If another design skill is selected, do not load this package.
- If no design skill was selected yet, the agent must ask or confirm before applying it. Never auto-pick it silently.

## Responsibility boundary

This skill defines:
- visual direction
- design tokens
- component vocabulary
- page composition patterns
- motion principles

This skill does **not** decide:
- React, Vue, Blade, HTML, or another stack
- single-file vs multi-file output
- inline styles vs CSS modules vs Tailwind vs stylesheet files
- icon library choice
- whether a theme toggle should exist in the product

Those choices belong to the active agent and must follow the project stack, existing conventions, and the scope of the task.

## Loading guide

Always load only what the current task needs:

| Task | Load |
|---|---|
| Any UI work | `references/foundations.md` |
| Reusable components | `references/foundations.md` + `references/components.md` |
| Full page or screen layout | `references/foundations.md` + `references/components.md` + `references/patterns.md` |
| Dashboard or admin surface | `references/foundations.md` + `references/components.md` + `references/patterns.md` + `references/dashboards.md` |
| Landing page, marketing page, or commercial website | `references/foundations.md` + `references/components.md` + `references/patterns.md` + `references/websites.md` |
| Motion or interaction polish | add `references/motion.md` only when motion materially improves the result |

## Visual signature

The system is built around three pillars:

1. Command-center authority: dense information when the product is operational, never generic card spam
2. Premium refinement: layered surfaces, strong alignment, restrained accents, controlled glow
3. Structured rhythm: one focal block per viewport, deliberate rail usage, and typography that stays elegant under load

The result should feel intentional and high-end, not generic SaaS boilerplate.

## Application rules

- Treat `references/foundations.md` as the source of truth for tokens and typography intent.
- Resolve the page variant before composing: `dashboard/admin` uses denser operational rhythm; `site/commercial` uses more whitespace, fewer mono labels, and stronger narrative hierarchy.
- Never combine this package with another visual skill in the same task. If another `design_skill` is selected, this package must stay out of context.
- Reuse the project's component library when one already exists; map the Cognitive UI language onto that library instead of rebuilding primitives unnecessarily.
- Adapt examples to the active stack. If a reference shows React-style snippets, treat them as implementation examples, not as a framework requirement.
- Theme behavior is contextual: dashboards often suit dark defaults, but the agent decides whether dark, light, or dual-theme support is appropriate.
- Default to local/system typography first. Only add external webfonts when the active agent decides they materially improve the chosen page variant and the project supports them cleanly.
- Keep accessibility, responsiveness, and production semantics under the responsibility of the active agent.

## Delivery modes

This package is valid for both greenfield and brownfield work.

### Greenfield

Use Cognitive UI to define the visual system from the start:
- choose the right page variant first
- establish token scope correctly before styling components
- compose the screen from the references instead of copying the demo literally

### Brownfield

Use Cognitive UI as a controlled adaptation layer:
- audit the existing UI before rewriting anything
- preserve working semantics, data flow, and component contracts
- map the skill tokens onto the existing component library incrementally
- fix cascade mistakes first, especially font/token scope and theme-container ownership
- fix operational table/list density issues early when they distort the visual language more than the chrome does
- prefer targeted upgrades over full rewrites unless the user explicitly asks for a redesign

Brownfield work should feel like an intentional uplift, not like a second design system pasted on top of the first.

## Demo asset

- `assets/cognitive-demo.jsx` is a reference artifact for the **dashboard/admin** variant of the system.
- Do not copy it blindly as the final implementation. Use it to understand hierarchy, surface treatment, and component rhythm for operational surfaces only.
- For landing pages and commercial sites, prefer `references/websites.md` over the demo asset.
