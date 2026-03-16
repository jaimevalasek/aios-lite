# Foundations - Tokens, Typography, and Rhythm

This module defines the base visual contract for `cognitive-ui`.

## Core intent

Cognitive UI should read as precise, premium, and controlled.
It should not feel like a generic neon dashboard, and it should not feel like a marketing site wearing admin chrome.

The system has two valid modes:
- `dashboard/admin`: dense, operational, and signal-driven
- `site/commercial`: spacious, narrative, and conversion-oriented

Choose the mode first. Then apply the same token family with a different layout rhythm.

## Typography strategy

Default to system fonts first.
Only add external webfonts when the active agent decides that the chosen stack, product, and delivery constraints justify it.

Recommended system stacks:

```css
--font-display: -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", system-ui, sans-serif;
--font-body: -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", system-ui, sans-serif;
--font-mono: ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace;
```

Notes:
- `dashboard/admin` may use mono labels for small metadata.
- `site/commercial` should rely mostly on display + body fonts, with mono used sparingly.
- Never force Google Fonts by default.

## Shared CSS variables

```css
:root {
  --font-display: -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", system-ui, sans-serif;
  --font-body: -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", system-ui, sans-serif;
  --font-mono: ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace;

  --text-xs: 0.72rem;
  --text-sm: 0.82rem;
  --text-base: 0.95rem;
  --text-lg: 1rem;
  --text-xl: 1.25rem;
  --text-2xl: 1.6rem;
  --text-3xl: 2.2rem;
  --text-4xl: 3rem;
  --text-5xl: 4rem;

  --weight-normal: 400;
  --weight-medium: 500;
  --weight-semibold: 600;
  --weight-bold: 700;
  --weight-black: 800;

  --tracking-tight: -0.025em;
  --tracking-normal: 0;
  --tracking-wide: 0.04em;
  --tracking-wider: 0.08em;
  --tracking-widest: 0.12em;

  --leading-none: 1;
  --leading-tight: 1.08;
  --leading-snug: 1.24;
  --leading-normal: 1.5;
  --leading-relaxed: 1.68;

  --space-0: 0;
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-5: 1.25rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-10: 2.5rem;
  --space-12: 3rem;
  --space-16: 4rem;
  --space-20: 5rem;
  --space-24: 6rem;

  --radius-sm: 0.375rem;
  --radius-md: 0.625rem;
  --radius-lg: 0.875rem;
  --radius-xl: 1.125rem;
  --radius-2xl: 1.5rem;
  --radius-full: 9999px;

  --control-xs: 1.75rem;
  --control-sm: 2rem;
  --control-md: 2.5rem;
  --control-lg: 3rem;

  --transition-fast: 140ms ease;
  --transition-base: 200ms ease;
  --transition-slow: 300ms ease;
  --transition-theme: background 240ms ease, color 240ms ease, border-color 240ms ease, box-shadow 240ms ease;
}

[data-theme="dark"] {
  --bg-void: #060910;
  --bg-base: #0b0f15;
  --bg-surface: #111827;
  --bg-elevated: #172133;
  --bg-overlay: #223148;

  --border-subtle: rgba(255, 255, 255, 0.06);
  --border-medium: rgba(255, 255, 255, 0.10);
  --border-strong: rgba(255, 255, 255, 0.16);
  --border-accent: rgba(34, 211, 238, 0.26);
  --border-accent-strong: rgba(34, 211, 238, 0.5);

  --text-heading: #f7fafc;
  --text-primary: #dbe4ee;
  --text-secondary: #95a3b8;
  --text-muted: #6b778c;
  --text-accent: #34d8ff;
  --text-inverse: #081018;

  --accent: #22d3ee;
  --accent-strong: #09bfe0;
  --accent-dim: rgba(34, 211, 238, 0.16);
  --accent-glow: rgba(34, 211, 238, 0.12);
  --accent-subtle: rgba(34, 211, 238, 0.08);

  --semantic-green: #16c784;
  --semantic-green-dim: rgba(22, 199, 132, 0.18);
  --semantic-amber: #f4a91d;
  --semantic-amber-dim: rgba(244, 169, 29, 0.18);
  --semantic-red: #ff5a67;
  --semantic-red-dim: rgba(255, 90, 103, 0.18);
  --semantic-blue: #59a7ff;
  --semantic-blue-dim: rgba(89, 167, 255, 0.18);

  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.22);
  --shadow-md: 0 8px 24px rgba(0, 0, 0, 0.32);
  --shadow-glow: 0 0 0 1px rgba(34, 211, 238, 0.05), 0 10px 28px rgba(3, 12, 22, 0.42);
}

[data-theme="light"] {
  --bg-void: #edf3f9;
  --bg-base: #f5f8fc;
  --bg-surface: #ffffff;
  --bg-elevated: #eaf0f6;
  --bg-overlay: #dde8f1;

  --border-subtle: rgba(12, 23, 40, 0.07);
  --border-medium: rgba(12, 23, 40, 0.12);
  --border-strong: rgba(12, 23, 40, 0.18);
  --border-accent: rgba(14, 165, 233, 0.22);
  --border-accent-strong: rgba(14, 165, 233, 0.42);

  --text-heading: #0f172a;
  --text-primary: #334155;
  --text-secondary: #61748a;
  --text-muted: #8b9aae;
  --text-accent: #0f8cc7;
  --text-inverse: #f8fbff;

  --accent: #0ea5e9;
  --accent-strong: #0284c7;
  --accent-dim: rgba(14, 165, 233, 0.10);
  --accent-glow: rgba(14, 165, 233, 0.08);
  --accent-subtle: rgba(14, 165, 233, 0.05);

  --semantic-green: #059669;
  --semantic-green-dim: rgba(5, 150, 105, 0.10);
  --semantic-amber: #d97706;
  --semantic-amber-dim: rgba(217, 119, 6, 0.10);
  --semantic-red: #dc2626;
  --semantic-red-dim: rgba(220, 38, 38, 0.10);
  --semantic-blue: #2563eb;
  --semantic-blue-dim: rgba(37, 99, 235, 0.10);

  --shadow-sm: 0 1px 2px rgba(15, 23, 42, 0.04);
  --shadow-md: 0 12px 30px rgba(15, 23, 42, 0.08);
  --shadow-glow: 0 0 0 1px rgba(14, 165, 233, 0.04), 0 14px 28px rgba(15, 23, 42, 0.06);
}

body {
  font-family: var(--font-body);
}

[data-theme] {
  color: var(--text-primary);
  background: var(--bg-base);
}
```

## Token scope guardrails

This is the most important implementation rule in the package.

1. Put typography, spacing, radius, and transition tokens in `:root` unless you have a strong reason not to.
2. Put theme-specific colors and surface values on the theme owner, usually `[data-theme]`.
3. If `body` or another ancestor consumes `var(--font-body)`, the variable must exist in that scope.
4. If the theme lives on a shell container instead of `body`, either:
   - keep typography tokens in `:root`, or
   - apply `font-family: var(--font-body)` on that same shell container
5. Never define `--font-body` only inside a child theme container and then consume it on `body`.

Safe patterns:

```css
:root {
  --font-body: -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", system-ui, sans-serif;
}

body {
  font-family: var(--font-body);
}
```

```css
.app-shell[data-theme="dark"] {
  --bg-base: #0b0f15;
  --text-primary: #dbe4ee;
  font-family: var(--font-body);
}
```

Unsafe pattern:

```css
.app-shell[data-theme="dark"] {
  --font-body: ...;
}

body {
  font-family: var(--font-body);
}
```

## Type hierarchy

### Section label

Use for supporting metadata, not for every line of text.

```css
font-family: var(--font-mono);
font-size: var(--text-xs);
font-weight: var(--weight-semibold);
letter-spacing: var(--tracking-widest);
text-transform: uppercase;
color: var(--text-secondary);
```

Best for:
- stat labels
- compact navigation metadata
- timestamps
- pill/badge text
- dashboard rail headings

Do not overuse on commercial pages.

### Display heading

```css
font-family: var(--font-display);
font-weight: var(--weight-bold);
letter-spacing: var(--tracking-tight);
line-height: var(--leading-tight);
color: var(--text-heading);
```

Sizes:
- `--text-5xl`: hero heading
- `--text-3xl`: page title
- `--text-2xl`: section heading
- `--text-xl`: card or block title

### Body text

```css
font-family: var(--font-body);
font-size: var(--text-base);
font-weight: var(--weight-normal);
line-height: var(--leading-relaxed);
color: var(--text-primary);
```

### Stat number

```css
font-family: var(--font-display);
font-size: var(--text-4xl);
font-weight: var(--weight-bold);
line-height: var(--leading-none);
color: var(--text-heading);
font-variant-numeric: tabular-nums;
```

### Supporting number / numeric row

```css
font-family: var(--font-body);
font-variant-numeric: tabular-nums;
font-feature-settings: "tnum" 1;
```

## Alignment rules

These rules matter more than ornament.

1. Keep text on a shared rhythm. Headings, helpers, and numbers should align to the same left edge inside a card.
2. Avoid micro-copy smaller than `--text-xs` unless it is true metadata.
3. In dashboards, one card = one dominant metric or one dominant action. Do not stack equal-priority text blocks.
4. Above the fold, prefer 1 primary content block + 1 support block + 1 contextual rail, not a wall of cards.
5. Mono labels are separators, not decoration. If everything is uppercase mono, nothing is important.
6. In brownfield work, fix cascade and token-scope errors before changing colors, layout, or density.

## Mode guidance

### Dashboard / admin
- Dark theme is often the best default.
- Use tighter spacing and stronger structural borders.
- Use mono labels selectively for status, timestamps, identifiers, and section rails.
- Keep helpers short.
- Favor grouped blocks over large card matrices above the fold.

### Site / commercial
- Use much more vertical breathing room.
- Prefer display + body pairings over mono-heavy layouts.
- Use accent glow sparingly; trust typography and section rhythm.
- Focus on one message per section.
- Avoid dashboard chrome such as persistent side rails, live-feed panels, and dense status badges unless the brand explicitly needs them.

## Non-negotiable rules

1. Use the token system; do not freestyle random hex values.
2. Keep at most three surface levels visible in the same viewport.
3. Use blue/cyan/teal as the accent family, but choose a restrained shade per product.
4. Do not default to external fonts when system stacks already deliver the right tone.
5. Do not use mono labels as the main reading experience.
6. Keep one obvious focal block per viewport.
