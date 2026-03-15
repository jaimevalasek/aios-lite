# Interface Design — Craft Guide

> Read this in full before producing any UI/UX output.
> Correct ships. Crafted impresses. This guide closes the gap.

---

## The mandate

If another AI, given the same prompt, would produce substantially the same output — you have failed.
Generic is the enemy. Defaults disguise themselves as infrastructure. Every spacing value, every typeface choice, every depth strategy is a decision. Own every one of them.

---

## AIOS rule — design memory and continuity

If `.interface-design/system.md` exists, treat it as the visual source of truth:
- Load it before changing direction, tokens, or component patterns.
- Respect it unless the user explicitly wants a redesign.
- Update it when you introduce a reusable pattern, token rule, or layout decision.

If the file does not exist and the task covers more than one screen or component family, create it with:
- Product context and UI intent
- Chosen design direction and anti-goals
- Token decisions (color, type, spacing, radius, depth, motion)
- Core component patterns (navigation, card, table, form, modal, empty state)
- Open constraints or decisions still pending

The point is simple: one product should not look like it was designed from scratch on every screen.

---

## If the UI already exists

When refining an existing product:
- Identify the current visual direction before proposing a new one.
- Diagnose token drift first: off-grid spacing, repeated hardcoded colors, mixed radii, mixed depth strategies, missing interactive states.
- Improve consistency before re-theming.
- Replace the direction only when the current system blocks the product intent or the user explicitly asked for a redesign.

---

## Phase 0 — Intent first (mandatory, cannot skip)

Before touching layout or tokens, answer three questions with specificity:

1. **Who is this human?** — Actual person, actual context.
   Bad: "a user." Good: "a finance manager reviewing budget reports at 8am before a board meeting."
2. **What must they accomplish?** — A specific verb, not a vague goal.
   Bad: "manage their projects." Good: "approve or reject 15 expense requests before end of day."
3. **What should this feel like?** — Concrete texture, not an adjective.
   Bad: "clean and modern." Good: "a Bloomberg terminal that doesn't exhaust you."

**If you cannot answer all three with specifics — stop. Ask. Do not guess. Do not default.**

---

## Phase 1 — Domain exploration (4 required outputs)

Before proposing any visual direction, produce:

1. **Domain concepts** — 5+ metaphors, patterns, or ideas from the product's world.
   Example (clinic scheduling): appointment slots, patient flow, triage priority, clinical notes, white coat.

2. **Color world** — 5+ colors that exist naturally in that domain.
   Example (clinic): antiseptic white, calm blue (trust, clinical), soft green (go/available), amber (warning/urgent), warm gray (neutral).

3. **Signature element** — One thing that could only belong to THIS product.
   Example: a subtle "pulse" animation on available time slots, echoing a heartbeat.

4. **Defaults to avoid** — 3 obvious, generic choices that must be replaced.
   Example: blue primary button → calm teal; card shadows → border-only depth; Inter font → IBM Plex Sans (clinical precision).

**The identity test:** Remove the product name. Could someone identify what this is for?

---

## Phase 2 — Pick a design direction

Choose ONE direction. Never mix. Mixing produces visual noise.

### Precision & Density
*For: dashboards, admin panels, developer tools, power-user interfaces.*

```
Foundation : Cool slate (borders-only depth)
Spacing    : 4px base — scale: 4, 8, 12, 16, 24, 32
Colors     : foreground=slate-900, secondary=slate-600, muted=slate-400,
             faint=slate-200, border=rgba(0,0,0,0.08), accent=blue-600
Radius     : 4px / 6px / 8px  (sharp, technical)
Typography : system-ui, 11–18px, weights 400/500/600
             monospace: SF Mono, Consolas (for data/code)
Components :
  Button   → 32px height, 8px/12px padding, 4px radius, 13px 500-weight
  Card     → 0.5px faint border, 12px padding, 6px radius, NO shadows
  Table    → 8px/12px cell padding, tabular-nums, 13px font, 1px bottom border
Rationale  : borders-only maximizes density; compact sizing serves power users;
             system fonts feel native and load instantly.
```

### Warmth & Approachability
*For: consumer apps, collaborative tools, onboarding flows, customer-facing products.*

```
Foundation : Warm stone (subtle shadows)
Spacing    : 4px base — scale: 8, 12, 16, 24, 32, 48 (generous)
Colors     : foreground=stone-900, secondary=stone-600, accent=orange-500,
             surface=white on stone-50
Radius     : 8px / 12px / 16px  (rounded, friendly)
Typography : Inter, 13–24px, weights 400/500/600
Components :
  Button   → 40px height, 12px/20px padding, 8px radius
  Card     → 20px padding, 12px radius, white on stone-50
  Input    → 44px height, 12px/16px padding, 1.5px faint border
Rationale  : subtle shadows add approachable depth; generous spacing enables
             focused tasks; warm tones feel human and inviting.
```

### Sophistication & Trust
*For: fintech, enterprise SaaS, operational products where clarity and trust matter more than novelty.*

```
Foundation : Cool mineral (restrained layers)
Spacing    : 4px base — scale: 4, 8, 12, 16, 24, 32
Colors     : foreground=slate-950, secondary=slate-700, muted=slate-500,
             surface=white, border=rgba(15,23,42,0.10), accent=blue-700
Radius     : 8px / 10px / 12px  (firm, not playful)
Typography : IBM Plex Sans or Public Sans, 12–20px, weights 400/500/600
Components :
  Button   → 38px height, 12px/18px padding, 10px radius
  Card     → 16px padding, 10px radius, subtle border, rare soft shadow
  Table    → 10px/14px cell padding, tabular-nums, quiet row dividers
Rationale  : trust comes from control, not decoration; a restrained palette and
             firm typography make the product feel expensive and dependable.
```

### Premium Dark Platform
*For: premium dashboards, media/catalog products, command surfaces, high-density apps with persistent navigation.*

```
Foundation : Graphite layers (borders-first)
Spacing    : 4px base — scale: 4, 8, 12, 16, 24, 32
Colors     : base=#0b1015, surface=#10161d, elevated=#151c24,
             foreground=#f3f7fb, secondary=#b7c2cf, muted=#7f8b99,
             border=rgba(255,255,255,0.08), accent=desaturated blue
Radius     : 12px / 14px / 16px  (premium, controlled)
Typography : Manrope, Geist, or IBM Plex Sans, 12–22px, weights 400/500/600
Components :
  Button   → 40px height, 12px/18px padding, 12px radius
  Card     → layered surfaces, 16px padding, 14px radius, no heavy glow
  Sidebar  → quiet active state, compact icon rhythm, clean section grouping
Rationale  : premium dark works when contrast is controlled, surfaces are few,
             and borders quietly separate the system without turning neon.
```

### Other directions (adapt token specs above)
- **Data & Analysis** — cool blue, high-density tables, monospace for numbers, minimal chrome
- **Editorial** — strong typographic hierarchy, generous white space, restrained color
- **Commerce** — aspirational photography support, high contrast CTAs, smooth transitions
- **Minimal & Calm** — near-monochrome, whitespace as design element, hairline borders only
- **Boldness & Clarity** — stronger accent, harder contrast, one dominant focal move
- **Utility & Function** — minimal decoration, maximum legibility, near-invisible chrome

---

## Phase 3 — Decision checkpoint before components

Before building any screen or component family, write a short checkpoint that locks:
- Depth strategy
- Surface levels
- Border recipe (including alpha)
- Spacing base
- Radius ladder
- Control height
- Typography anchor
- Motion posture

Example:

> Depth: borders-only • Surfaces: base / surface / elevated • Borders: rgba(15,23,42,0.08) • Spacing: 8px • Radius: 10/12 • Controls: 38px • Type: IBM Plex Sans 14/16/24 • Motion: 120ms ease-out

Premium dark example:

> Depth: borders-first • Surfaces: #0b1015 / #10161d / #151c24 • Borders: rgba(255,255,255,0.08) • Spacing: 8px • Radius: 12/14 • Controls: 40px • Type: Geist 14/16/28 • Motion: 140ms ease-out

If you cannot state the checkpoint clearly, the system is not ready to build.

---

## Token architecture (always define all levels)

### Color tokens
```
foreground/primary     ← body text, labels, high-emphasis
foreground/secondary   ← supporting text, placeholders
foreground/muted       ← captions, disabled labels
foreground/faint       ← decorative only, never critical

background/base        ← page background
background/surface     ← cards, panels
background/elevated    ← modals, dropdowns (if shadow system)
background/sunken      ← inputs, inset areas

border/default         ← standard separator
border/strong          ← focused inputs, active states
border/faint           ← ultra-subtle dividers

brand/primary          ← main CTA color
brand/secondary        ← supporting brand accent

semantic/success       ← green family
semantic/warning       ← amber family
semantic/danger        ← red family
semantic/info          ← blue family
```

### Spacing — base × multiples only
Never use arbitrary values (17px, 22px, 37px). Every value must be a multiple of your base.

### Depth — pick ONE and commit
- **Borders only** — `border: 1px solid border/faint` — maximum density, zero visual noise
- **Subtle shadows** — `box-shadow: 0 1px 3px rgba(0,0,0,0.08)` — gentle, approachable
- **Layered** — background elevation with no shadows or borders — modern, minimal

**Never mix depth strategies on the same surface.**

---

## Component quality (mandatory for every component)

Define all six states before handing off to @dev:

| State | What to specify |
|---|---|
| Default | baseline appearance |
| Hover | subtle shift (background, border, or opacity) |
| Focus | visible ring — `outline: 2px solid brand/primary; outline-offset: 2px` |
| Active / pressed | slight scale or brightness change |
| Disabled | reduced opacity (0.4–0.5), no cursor pointer, no hover effect |
| Loading | skeleton or spinner — never block critical flow |

Also define for container components:
- **Empty state** — illustration or message + primary action
- **Error state** — clear message + recovery action
- **Success confirmation** — when relevant, transient (not permanent)

---

## Forms

- Labels outside placeholders. Placeholders are hints, not labels.
- Validate on blur (not on keystroke, not on submit only).
- Inline field errors directly below the field. One global summary for multi-field failures.
- Disable the submit button and show progress during async operations.
- Input height minimum: 40px (desktop), 44px (mobile/touch).

---

## Typography hierarchy

Size alone is never enough. Use weight + tracking + opacity to create layers:

```
Page title   : largest size, 600-weight, tight tracking
Section title: medium-large, 500-weight, normal tracking
Body         : base size, 400-weight, comfortable line-height (1.5–1.6)
Helper/meta  : small, 400-weight, muted color
Data/mono    : monospace for numbers in tables, code, metrics
```

---

## Layout and composition

- **Rhythm** — interfaces breathe unevenly: dense tool areas give way to open content. Same card size, same gaps everywhere = flatness = no one decided.
- **Proportions declare intent** — a 280px sidebar says "navigation serves content." A 360px sidebar says "these are peers." Know what your proportions are saying.
- **One focal point per screen** — the primary action dominates through size, position, contrast, or surrounding space. When everything competes equally, nothing wins.
- **Reading order** — 1. Page intent → 2. Primary action → 3. Supporting data. Never invert.

---

## Accessibility baseline (non-negotiable)

- Semantic HTML and proper landmarks (`<main>`, `<nav>`, `<header>`, `<aside>`)
- Full keyboard navigation — Tab order must match visual reading order
- Visible focus rings on all interactive elements
- Color contrast: 4.5:1 for body text, 3:1 for large text and UI components
- Never convey meaning through color alone — add icon, pattern, or text
- `aria-label` on icon-only buttons, `aria-live` on dynamic status regions
- `prefers-reduced-motion` fallback for all animations

---

## Motion rules

- Motion clarifies transitions, it does not decorate them.
- Duration: micro-interactions 100–150ms, page transitions 200–300ms.
- Easing: ease-out for entrances, ease-in for exits.
- Never animate properties that affect layout (width, height, padding). Animate transform and opacity only.
- Always provide `prefers-reduced-motion: reduce` fallback.

---

## Quality checks (run before delivering)

### Swap test
Would swapping the typeface or layout make the design look like a different product?
If yes — good. If no — the design has no identity.

### Squint test
Blur your eyes (or the screenshot). Does the visual hierarchy still read clearly?
If not — the hierarchy is too weak.

### Signature test
Can you point to five specific decisions where your craft appears?
If you cannot name five — you defaulted somewhere.

### Token test
Do your CSS variable names sound like they belong to THIS product?
Generic: `--color-primary`. Specific: `--slot-available`, `--urgency-amber`.

---

## Self-critique before delivery

Walk through each section before handing off:

1. **Composition** — Does the layout have rhythm? Are proportions intentional? Is there one clear focal point?
2. **Craft** — Is every spacing value on-grid? Does typography use weight + tracking + size (not size alone)? Do surfaces whisper hierarchy without thick borders or dramatic shadows?
3. **Content** — Does the spec tell one coherent story? Could a real person at a real company act on this?
4. **Structure** — Are there any hacks? Negative-margin workarounds? Arbitrary pixel values? Fix them.

**Ask yourself: "If a design lead reviewed this, what would they call out?" Fix that thing. Then ask again.**

---

## Update design memory

When the work introduces or changes reusable design decisions, update `.interface-design/system.md` with:
- Final direction and anti-goals
- Token block
- Component pattern notes
- New exceptions or constraints

This file is the continuity layer between screens, agents, and future sessions.

---

## Stack-specific notes

| Stack | Priority |
|---|---|
| Laravel + TALL | Flux UI / Livewire primitives first; custom only for signature moves |
| Filament | Built-in Filament components before any override |
| Next.js + shadcn/ui | shadcn primitives + Tailwind tokens; keep component boundaries clean |
| React + Tailwind | Design token CSS vars → Tailwind config → components |
| Vue + Nuxt | Nuxt UI or PrimeVue first; avoid mixing component libraries |
| Vanilla HTML | Define CSS custom properties at `:root`, semantic class names only |

---

## Handoff to @dev

The ui-spec.md must include:
- Design token block (fonts, colors, spacing, radius, depth strategy, motion)
- Per-screen layout notes with component names mapped to real library components
- Full state matrix (default/hover/focus/active/disabled/loading/empty/error/success)
- Responsive rules (mobile breakpoints first)
- Accessibility checklist items
- Any signature visual moves with implementation notes

**Keep the spec concise enough to code from directly. Not a design document — a build contract.**
