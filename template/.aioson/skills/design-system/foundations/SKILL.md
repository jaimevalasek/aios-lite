---
name: design-foundations
description: >-
  Core tokens for the Cognitive Core visual identity: typography, color, spacing, radius, shadows, and one dark/light theme model. Load before any other design-system module.
---

# Foundations

Define the shared token layer before building components. Do not hardcode component-level colors, spacing, or transitions that bypass it.

## Required foundations

- Body/headings: Inter. Metadata, IDs, code, and compact labels: JetBrains Mono.
- Use a type scale from `--text-xs` through `--text-4xl`; reserve the largest size for one focal metric or heading.
- Use a 4px spacing base with named tokens `--space-1` through `--space-12`.
- Use four radius levels plus `--radius-full`; keep cards moderate and controls consistent.
- Define background, surface, elevated, border, text, accent, semantic, shadow, and transition tokens.
- Keep semantic success/warning/danger/info colors independent from the brand accent.

## Theme contract

Apply `data-theme="dark|light"` to `<html>`. Both themes must share token names, type, spacing, radii, and component anatomy. Only token values change.

```css
:root {
  --font-body: Inter, system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;
  --space-1: .25rem; --space-2: .5rem; --space-3: .75rem;
  --space-4: 1rem; --space-6: 1.5rem; --space-8: 2rem;
  --radius-sm: .375rem; --radius-md: .625rem;
  --radius-lg: .875rem; --radius-full: 999px;
  --transition-fast: 150ms ease;
  --transition-theme: background 250ms ease, color 250ms ease,
    border-color 250ms ease, box-shadow 250ms ease;
}
```

Define at minimum:

- `--bg-base`, `--bg-surface`, `--bg-elevated`
- `--text-heading`, `--text-primary`, `--text-secondary`, `--text-muted`
- `--border-subtle`, `--border-medium`, `--border-accent`
- `--accent`, `--accent-hover`, `--accent-dim`
- `--semantic-green|amber|red|blue` and their dim variants
- `--shadow-sm|md|lg|glow`

## Rules

- Meet WCAG AA contrast for normal text and interactive states.
- Keep accent usage sparse; never use it as ordinary paragraph color.
- Use tabular numerals for metrics.
- Use shadows to communicate hierarchy, not decorate every surface.
- Make focus styles explicit and at least as visible as hover.
- Respect `prefers-reduced-motion`.
- Test both themes and browser zoom before handoff.

## Done gate

The foundation passes when components use only shared tokens, both themes preserve the same visual identity, semantic colors remain distinguishable without relying on color alone, and no text, border, or focus state disappears in either theme.
