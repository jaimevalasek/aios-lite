---
name: cognitive-core-ui
description: >-
  Cognitive Core UI defines premium command-center interfaces with dense operational data, mono rails, structured zones, and dark/light themes. Use only when `design_skill: cognitive-core-ui` is set or the user explicitly requests cognitive core, Synthetic Minds styling, a dark command-center dashboard, or a similarly authoritative data interface.
---

# Cognitive Core UI

Use one disciplined system: command-center structure, precise information density, mono metadata rails, prominent numeric readouts, and restrained accents. Never mix it with another design skill.

## Workflow

1. Confirm explicit selection.
2. Load `references/art-direction.md` to choose the expression and anti-generic signature.
3. Load `references/design-tokens.md` for all UI work.
4. Load only the task-specific references below.
5. Adapt the system to the active stack; preserve semantics, keyboard access, responsive collapse, visible focus, and theme contrast.
6. Validate data hierarchy and interaction states before handoff.

## Reference routing

| Scope | Additional references |
|---|---|
| Components, tables, forms | `references/components.md` |
| App shell, profile, detail, settings, auth | `references/components.md` + `references/patterns.md` |
| Dashboard or operations | `references/components.md` + `references/patterns.md` + `references/dashboards.md` |
| Landing page or institutional site | `references/components.md` + `references/websites.md` |
| Material motion | `references/motion.md` |

Load all seven references only when the task spans the complete system.

## Non-negotiable signature

- Use compact, labeled zones and one clear focal block per viewport.
- Reserve monospace uppercase text for rails, IDs, statuses, and metadata—not prose.
- Use tabular numerals and explicit units for operational metrics.
- Keep accents sparse and semantic; authority comes from structure, not glow.
- Support dark and light themes from the same token model.
- Make dense views scan-friendly with grouping, alignment, and responsive priorities.

## Quality gate

Reject the result if it looks like a generic card grid, every panel has equal emphasis, mono typography dominates body content, charts or metrics lack labels/units, dark mode hides boundaries, mobile simply shrinks the desktop layout, or interaction states are missing.
