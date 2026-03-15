# Visual System And Component Patterns

> This reference captures the actual visual language implemented in the AIOS Dashboard.
> Use it when you need the concrete token system, density rules, shell proportions, and component patterns.

---

## 1. Visual direction

**Direction name:** Premium Dark Platform

**Core feel:** an operating surface, not a gallery of cards.

The premium effect comes from combining:

- deep graphite base instead of pure black
- aurora radial fields in orange, magenta, cyan
- strong but disciplined borders
- blurred glass surfaces with inset highlight
- compact density
- semantic accents with restrained hue count

---

## 2. Extracted token system

### Dark foundation

- `background`: `#060818`
- `panel`: `#0b1230`
- `panel-elevated`: `#121c46`
- `panel-soft`: `rgba(10, 16, 42, 0.8)`
- `panel-contrast`: `rgba(7, 12, 33, 0.92)`
- `panel-contrast-hover`: `rgba(18, 31, 72, 0.96)`
- `foreground`: `#f4f7ff`
- `muted`: `#a5b3d9`
- `border`: `rgba(104, 144, 238, 0.34)`
- `accent`: `#28a5ff`
- `accent-soft`: `rgba(40, 165, 255, 0.26)`
- `surface-soft`: `rgba(82, 122, 232, 0.18)`
- `surface-fill`: `rgba(82, 122, 232, 0.24)`
- `surface-fill-strong`: `rgba(110, 148, 255, 0.34)`
- `success`: `#46d5a7`
- `warning`: `#f2bb59`
- `danger`: `#ff7d8d`
- `violet`: `#b18cff`
- `shadow`: `0 20px 64px rgba(3, 8, 30, 0.55)`

### Light foundation

The light theme is not a plain white inversion. It uses cool mist surfaces:

- `background`: `#edf3ff`
- `panel`: `#f8faff`
- `panel-elevated`: `#ffffff`
- `panel-soft`: `rgba(248, 251, 255, 0.95)`
- `panel-contrast`: `rgba(225, 236, 255, 0.88)`
- `panel-contrast-hover`: `rgba(209, 224, 252, 0.94)`
- `foreground`: `#112041`
- `muted`: `#3f5b89`
- `border`: `rgba(41, 86, 170, 0.22)`
- `accent`: `#166fff`
- `shadow`: `0 18px 44px rgba(20, 50, 108, 0.18)`

---

## 3. Background and depth rules

### Page background

The page background uses 4 radial aurora spots over a deep cool gradient.

Rules:

- use orange, magenta, cyan, and soft violet as atmospheric fields
- keep them diffused and large
- apply them to the page and shell backdrop, not every card
- avoid neon glow and avoid rainbow clutter inside content panels

### Depth strategy

This system is **borders-first** with blur and one shadow family.

Use:

- visible border on every major surface
- inset highlight on premium surfaces
- one shared shadow family only
- blurred panels for shell and premium overlays

Do not mix:

- flat cards, heavy shadows, and shadowless cards in the same route
- multiple shadow families

---

## 4. Typography extracted from implementation

### UI font stack

Use the actual shipped stack, not a generic default:

- `"Segoe UI", "SF Pro Text", "Helvetica Neue", Arial, sans-serif`

### Monospace stack

- `"SFMono-Regular", "JetBrains Mono", "Cascadia Code", "Fira Code", monospace`

### Hierarchy

- micro eyebrow: `0.68rem`, uppercase, wide tracking (`0.22em` to `0.32em`)
- page heading: large, semibold, negative tracking (`-0.03em` to `-0.04em`)
- section titles: `text-2xl` or `text-lg`, semibold
- helper/body text: `text-sm`, generous line-height (`1.6` to `1.8`)
- paths and runtime metadata: monospace, small size, safe wrapping

The premium feel depends on **micro-label + strong title + muted helper** repeating consistently.

---

## 5. Density and spacing

Base grid is `8px`, but the dashboard uses a compact mode layer that compresses common Tailwind spacing values:

- `p-6 -> 18px`
- `p-5 -> 15px`
- `p-8 -> 22px`
- `gap-6 -> 14px`
- `space-y-6 -> 14px`

Rounded values are also compressed:

- `28px -> 16px`
- `24px -> 14px`
- `22px -> 13px`
- `20px -> 12px`
- `30px -> 18px`

Use this to avoid the "too expanded" feeling that often makes dashboards look amateur.

---

## 6. Shell composition

### Desktop shell

On wide screens the shell is:

- left rail: `248px`
- center workspace: fluid
- right activity rail: `320px`

The top search bar sits above the main workspace content, not inside the left rail.

### Main page pattern

Most premium routes follow this order:

1. metric row
2. primary operational split section
3. secondary support section

This is what makes the interface feel curated rather than randomly assembled.

---

## 7. Extracted component patterns

### SurfacePanel

Use for major containers.

- `panel-soft`
- visible border
- blur
- shared shadow
- generous but compact padding

### MetricTile

Use for top-row metrics.

Structure:

- eyebrow label
- large number
- one short helper sentence
- semantic tone gradient in the panel background

### StatusBadge

Use for semantic pills, counts, and momentum labels.

Rules:

- rounded full pill
- semantic tint only
- small uppercase tracking
- never the main source of meaning by color alone

### SignalBar

Use for compact ratio visualization inside operational cards.

Rules:

- thin track
- semantic gradient fill
- numeric label on the right
- useful only when it answers a decision question quickly

### Empty state panel

Use dashed border + premium surface, never plain text floating on the page.

### Grouped operational card

Used in tasks, workflows, agents, memories.

Structure:

- eyebrow / source / scope
- title
- one helper line or summary
- status or count pills
- direct action link when available

---

## 8. Semantic tone map

Keep tones disciplined:

- `accent` = primary runtime / navigation / live importance
- `success` = running / healthy / available
- `warning` = queued / caution / capability volume
- `danger` = failed / broken / urgent
- `violet` = knowledge / memory / warming / secondary momentum
- `neutral` = contextual or inactive information

This limited palette is a big part of the premium feel.

---

## 9. Hover, active, and premium polish

The actual implementation uses:

- stronger border on hover
- slightly brighter surface on hover
- active nav items with gradient fill + inset highlight
- top shell glow and shell backdrop aura
- blurred modal overlay for command palette

Do not add gratuitous motion. The premium feel here comes more from shell behavior and disciplined layering than from animation.

---

## 10. Responsive behavior

Responsive strategy is desktop-first but not desktop-only:

- right activity rail hides below `xl`
- shell collapses to one content column below `xl`
- metric grids move through `md` and `xl` column counts
- action clusters use `flex-wrap`
- page sections become stacked rather than replaced

Preserve the same hierarchy when stacking. Do not invent a separate mobile composition unless the product truly requires it.
