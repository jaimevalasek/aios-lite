# Tokens and Depth — Interface Design

Lock these decisions before implementation. If you cannot state the checkpoint clearly, the system is not ready to build.

---

## Decision checkpoint (write this before any component)

Before building any screen or component family, write a short checkpoint that locks:

- **Depth strategy**
- **Surface levels**
- **Border recipe** (including alpha)
- **Spacing base**
- **Radius ladder**
- **Control height**
- **Typography anchor**
- **Motion posture**

The faces, hues, and surface values in a checkpoint come from the drawn candidate or the identity record — never from this file. The examples below are shapes, not values to copy.

Example (Sophistication & Trust):
> Depth: borders-only • Surfaces: base / surface / elevated (tonal steps from the drawn ground) • Borders: ink at 8% alpha • Spacing: 8px • Radius: 10/12 • Controls: 38px • Type: the drawn UI face 14/16/24 • Motion: 120ms ease-out

Example (Premium Dark Platform):
> Depth: borders-first • Surfaces: drawn dark ground / +0.035 L / +0.07 L • Borders: light ink at 8% alpha • Spacing: 8px • Radius: 12/14 • Controls: 40px • Type: the drawn UI face 14/16/28 • Motion: 140ms ease-out

---

## Token architecture (define all levels)

### Color token families

```
foreground/primary     ← body text, labels, high-emphasis
foreground/secondary   ← supporting text, placeholders
foreground/muted       ← captions, disabled labels
foreground/faint       ← decorative only, never critical

background/base        ← page background
background/surface     ← cards, panels
background/elevated    ← modals, dropdowns (shadow system) or third surface level
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

Common bases:
- 4px base for dense/operational: 4, 8, 12, 16, 24, 32
- 4px base for generous/consumer: 8, 12, 16, 24, 32, 48

### Depth — pick ONE and commit

| Strategy | When | Implementation |
|---|---|---|
| **Borders only** | Maximum density, zero visual noise | `border: 1px solid border/faint` |
| **Subtle shadows** | Gentle, approachable feel | `box-shadow: 0 1px 3px rgba(0,0,0,0.08)` |
| **Layered surfaces** | Modern minimal, dark platforms | Background elevation without shadows or borders |

**Never mix depth strategies on the same surface.**

### Radius ladder

Define three values and use only them:
- Sharp (small controls, tags, badges)
- Medium (cards, inputs, buttons)
- Large (panels, modals, sheets)

### Typography anchor

Define one font family and its full scale before touching components:

```
Page title    : largest size, 600-weight, tight tracking
Section title : medium-large, 500-weight, normal tracking
Body          : base size, 400-weight, line-height 1.5–1.6
Helper / meta : small, 400-weight, muted color
Data / mono   : monospace for numbers in tables, code, metrics
```

Size alone is never enough. Use weight + tracking + opacity to create layers.

### Motion posture

- Fast & utilitarian: 100–150ms ease-out
- Comfortable & polished: 140–200ms ease-out
- Expressive & refined: 200–300ms ease-out with spring for entrances

Never animate layout properties (width, height, padding). Animate `transform` and `opacity` only.
Always provide `prefers-reduced-motion: reduce` fallback.

### Premium motion choreography (expressive surfaces)

For landings, cinematic surfaces, and premium reveals — on top of the posture above, never instead of it:

- **Easing tokens** — define two curves and reuse them everywhere (`--ease-out: cubic-bezier(.22,.61,.36,1)`, `--ease-emphasis: cubic-bezier(.83,0,.17,1)`); mixed ad-hoc easings read as jitter.
- **Entrance choreography** — stagger sibling reveals 40–80ms apart, one direction per scene, at most ~5 staggered items before switching to grouped reveals.
- **Scroll reveals** — IntersectionObserver + class toggle at threshold ~0.2; reveal once and never re-hide on scroll-up.
- **Hover physics** — transform-only (scale ≤ 1.03, translate ≤ 4px) on the fast curve; shadow or glow changes ride the same duration.
- **Parallax / pinned scenes** — subtle (≤ 10% travel), one pinned scene at a time, never hijack native scroll speed.
- **Reduced motion** — every choreography degrades to opacity or a meaningful static frame; the page must argue equally well without motion.

---

## Operational density — admin / config / settings pages

Settings pages, admin panels, config screens, and entity managers use a **compact scale** that overrides the default generous consumer spacing. Apply this whenever the user is operating a tool, not reading content.

### Decision checkpoint for operational density

> Depth: borders-first • Surfaces: 3-level (page / card / elevated) • Spacing base: 4px • Controls: 32px • Card padding: 16px outer / 12px nested • Type: 11px floor to 16px, card headings capped at 16px • Radius: the system's three-step ladder, each nested level one step tighter

The radius ladder, the faces, and the hues are the product's own (drawn or extracted); a fixed set of values printed here would make every admin panel the same admin panel.

### Card padding — 3-level scale

| Level | Context | Padding | Radius |
|---|---|---|---|
| L1 | top-level section card | `16px` | `--radius-lg` |
| L2 | card nested inside L1 | `12px` | `--radius-md` |
| L3 | inset block, disclosure body | `10px` | `--radius-sm` |

Section gap: `12px` — not 16px or 24px.

### Card headings

- Section title: 15–16px, `font-weight: 600` — **never a display size inside a card**
- No kicker or eyebrow label above the title — the title carries its own weight; `kicker above heading` is a measured generation tell with no earning-back, delete the label
- Sub-info (path, ID, count): one truncated mono line at the 11px floor **below** the title — no card for it; text under 11px is another measured tell
- **No verbose description paragraphs** in admin cards — remove them or collapse to `<details>`

### Form controls

```
Label  : 11px text · margin-bottom 2px
Input  : ~32px tall · 12px/8px padding · 13px text · radius --radius-sm
Select : same
Button : 12px/8px padding · 13px text · radius --radius-sm
```

The default 40px `min-height` rule in `## Forms` applies to consumer/public-facing forms. Admin/operational forms use 32px controls. Reduce only in authenticated tool contexts — never on public-facing login or onboarding.

### List rows

```
Row     : 8px vertical padding · divider between rows
Gap     : 10px
Name    : 13px text · weight 500 — not 14px
Meta    : mono 11px text · truncated
Badges  : 8px/2px padding · 11px text — not 12px/4px
Edit btn: 10px/4px padding · 11px text
```

### Entity grids (same-type objects: projects, agents, providers)

Never stack same-type entities full-width. Use:
```css
grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
gap: 12px;
/* Entity card: radius --radius-md, padding 12px */
```

### Add/Edit → Modal, not accordion

Inline form expansion (accordion, RevealPanel) inside entity cards creates visual clutter and unpredictable layout shifts. Use a modal:
- `max-width: 448px`, centered, backdrop = ink at 50% with a light blur
- Single "+ Add" button outside the grid → opens modal
- "Edit" button on each card → same modal pre-filled

### Disclosure for secondary tools

Sync assistants, cloud connect, advanced config, and other secondary actions go behind `<details>`:
- Summary row: a flex row, 12px/10px padding — label + status badge on left, action button on right
- Never show secondary tools open by default in an already-dense panel
