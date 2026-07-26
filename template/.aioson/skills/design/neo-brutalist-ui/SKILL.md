---
name: neo-brutalist-ui
description: >-
  Neo-Brutalist UI defines bold interfaces with thick borders, hard shadows, saturated colors, raw structure, and deliberate tension. Use only when `design_skill: neo-brutalist-ui` is set or the user explicitly requests brutalist, neo-brutalist, chunky, punk, hacker, anti-corporate, bold-border, or playful indie styling.
---

# Neo-Brutalist UI

Make structure visible: strong borders, offset shadows, direct typography, and controlled chromatic energy. The result may be loud but must remain usable. Never combine it with another design skill.

## Workflow

1. Confirm explicit selection; do not infer from “bold” alone.
2. Load `references/art-direction.md` and select one expression mode.
3. Load `references/design-tokens.md` for every task.
4. Load only the task-specific references below.
5. Adapt examples to the active stack with semantic markup, keyboard behavior, responsive reflow, and visible focus.
6. Validate personality, hierarchy, and usability before handoff.

## Reference routing

| Scope | Additional references |
|---|---|
| Components and forms | `references/components.md` |
| App, detail, settings, auth, list/detail | `references/components.md` + `references/patterns.md` |
| Dashboard | `references/components.md` + `references/patterns.md` + `references/dashboards.md` |
| Website or landing page | `references/components.md` + `references/websites.md` |
| Purposeful motion | `references/motion.md` |

Load all seven references only for a complete product system.

## Non-negotiable signature

- Use thick, consistent borders and hard offset shadows; avoid soft SaaS elevation.
- Use saturated colors in a controlled palette with strong foreground contrast.
- Let typography and layout create deliberate tension without breaking reading order.
- Keep controls visibly interactive and focus states unmistakable.
- Preserve clear spacing rhythm; raw does not mean misaligned or accidental.
- Reduce decorative intensity where dense data or long-form reading demands it.

## Quality gate

Reject the result if it becomes a generic rounded SaaS UI, colors are random, borders vary arbitrarily, shadows obscure controls, every element competes equally, mobile order breaks, or “raw” styling excuses inaccessible contrast or missing states.
