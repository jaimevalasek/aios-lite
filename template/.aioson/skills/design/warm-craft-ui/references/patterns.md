# Page Patterns — Warm Craft UI

Layout patterns for common page types. Each pattern is a composition guide, not a rigid template. Use tokens from `design-tokens.md` and components from `components.md`.

---

## App Shell

The main layout container for all app pages.

```
+----------------------------------------------------------+
|  TOP BAR (64px)                                           |
+----------+-----------------------------------------------+
|          |                                                |
| SIDEBAR  |  CONTENT AREA                                  |
| 240px    |  padding: var(--space-8)                       |
|          |  max-width: var(--content-xl) or fluid         |
|          |                                                |
+----------+-----------------------------------------------+
```

Rules:
- Sidebar background: `var(--bg-void)` — one level deeper than content
- Content background: `var(--bg-base)`
- Sidebar collapses to bottom tab bar on mobile (< 768px)
- Content area scrolls independently; sidebar and topbar are fixed
- Sidebar width: 240px default. Can collapse to 64px icon-only with toggle

### Compact Shell (no sidebar)
```
+----------------------------------------------------------+
|  TOP BAR (64px)                                           |
+----------------------------------------------------------+
|                                                           |
|  CONTENT AREA                                             |
|  max-width: var(--content-lg)                             |
|  margin: 0 auto                                           |
|  padding: var(--space-8) var(--space-6)                   |
|                                                           |
+----------------------------------------------------------+
```

Use when: simple apps with fewer than 5 navigation items, single-purpose tools.

---

## Dashboard Page

```
PAGE HEADER
  font: var(--font-display), var(--text-3xl), var(--weight-bold)
  color: var(--text-heading)
  subtitle: var(--font-body), var(--text-base), var(--text-secondary)
  margin-bottom: var(--space-8)

STAT ROW (optional — do NOT always start with this)
  display: grid
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr))
  gap: var(--space-5)
  margin-bottom: var(--space-8)
  uses: Stat Card component

SECTION
  title:
    font: var(--font-display), var(--text-xl), var(--weight-semibold)
    color: var(--text-heading)
    margin-bottom: var(--space-5)
  content:
    Card grid, Table, Chart, or Activity Feed
  margin-bottom: var(--space-10)
```

Variation rules:
- Do NOT always use 4 stat cards as the first element
- Prefer one hero insight or greeting above stats
- Charts use warm palette (see `design-tokens.md` palette rules)
- Tables should feel native to the warm system, not pasted from a data library

---

## Detail / Profile Page

```
BACK NAVIGATION
  Ghost Button with arrow icon + "Back to {list}"
  margin-bottom: var(--space-4)

HEADER ZONE
  display: flex; gap: var(--space-6); align-items: flex-start
  avatar: var(--space-20) (80px)
  title: var(--font-display), var(--text-3xl), var(--weight-bold)
  subtitle: var(--text-secondary)
  badges: inline-flex after subtitle
  actions: flex-end (Edit, Delete, etc.)

TAB NAVIGATION (optional)
  border-bottom: 1px solid var(--border-subtle)
  margin: var(--space-6) 0
  tab:
    padding: var(--space-3) var(--space-4)
    font: var(--text-sm), var(--weight-medium)
    color: var(--text-secondary)
    active:
      color: var(--text-heading)
      border-bottom: 2px solid var(--accent)

CONTENT SECTIONS
  Two-column layout on desktop (content 2/3 + sidebar 1/3)
  Single column on mobile
  gap: var(--space-8)
```

---

## Settings Page

```
PAGE HEADER
  title: "Settings"
  no subtitle needed

SETTINGS NAVIGATION (left column or tabs)
  vertical list: General, Profile, Notifications, Security, Billing...
  uses: Sidebar Navigation item style

SETTINGS CONTENT (right column)
  sections:
    SECTION TITLE
      font: var(--font-display), var(--text-lg), var(--weight-semibold)
      border-bottom: 1px solid var(--border-subtle)
      padding-bottom: var(--space-3)
      margin-bottom: var(--space-6)

    SETTING ROW
      display: flex; justify-content: space-between; align-items: center
      padding: var(--space-4) 0
      border-bottom: 1px solid var(--border-subtle)

      label + description (left):
        label: var(--text-sm), var(--weight-medium), var(--text-heading)
        description: var(--text-sm), var(--text-secondary)

      control (right):
        Toggle, Select, or Button
```

---

## List / Browse Page

```
PAGE HEADER + ACTIONS
  title + description (left)
  Primary Button "Create New" (right)
  margin-bottom: var(--space-6)

FILTERS / SEARCH BAR
  display: flex; gap: var(--space-3); align-items: center
  Search Input (pill-shaped, flexible width)
  Filter badges or dropdown buttons
  margin-bottom: var(--space-6)

CONTENT
  Option A — Card Grid:
    display: grid
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr))
    gap: var(--space-5)
    uses: Base Card or Media Card

  Option B — Table:
    uses: Table component
    with rounded outer corners and warm hover

  Option C — List:
    vertical stack with Base Card items
    gap: var(--space-3)

PAGINATION
  display: flex; justify-content: center; gap: var(--space-2)
  margin-top: var(--space-8)
  pill-shaped page buttons
```

---

## Onboarding / Setup Flow

```
LAYOUT
  centered, max-width: 560px
  padding: var(--space-16) var(--space-6)
  no sidebar, minimal topbar (logo only)

PROGRESS
  Step indicator above content
  Numbered or dot-based, horizontal
  Current step: accent color
  Completed: accent-dim with checkmark
  Future: var(--border-medium)

STEP CONTENT
  title:
    font: var(--font-display), var(--text-2xl), var(--weight-bold)
    text-align: center
    margin-bottom: var(--space-2)

  description:
    font: var(--text-base), var(--text-secondary)
    text-align: center
    max-width: 440px
    margin: 0 auto var(--space-8)

  form or content:
    text-align: left
    uses standard form components

ACTIONS
  display: flex; justify-content: space-between
  margin-top: var(--space-8)
  "Back" (Ghost Button) + "Continue" (Primary Button)
```

---

## Auth Pages (Login / Register)

```
LAYOUT
  Option A — Centered card:
    max-width: 420px
    margin: auto
    min-height: 100vh
    display: flex; align-items: center; justify-content: center
    background: var(--bg-void)

  Option B — Split screen:
    left 50%: illustration or brand panel (warm gradient or warm photography)
    right 50%: auth form centered

CARD
  background: var(--bg-surface)
  border-radius: var(--radius-2xl)
  padding: var(--space-10)
  shadow: var(--shadow-lg)

  logo:
    centered, margin-bottom: var(--space-8)

  title:
    font: var(--font-display), var(--text-2xl), var(--weight-bold)
    text-align: center

  form:
    margin-top: var(--space-6)
    fields stacked with var(--space-4) gap
    "Remember me" checkbox + "Forgot password?" link row

  submit:
    Primary Button, full width
    margin-top: var(--space-6)

  footer:
    "Don't have an account? Sign up" — centered link
    margin-top: var(--space-6)
    font: var(--text-sm), var(--text-secondary)
```

---

## Responsive Breakpoints

```css
/* Mobile first */
@media (min-width: 640px)  { /* sm — phone landscape */ }
@media (min-width: 768px)  { /* md — tablet */ }
@media (min-width: 1024px) { /* lg — desktop */ }
@media (min-width: 1280px) { /* xl — wide desktop */ }
@media (min-width: 1440px) { /* 2xl — ultra-wide */ }
```

Rules:
- Sidebar → bottom tab bar below 768px
- Card grids → single column below 640px
- Split layouts (detail page, auth) → stacked below 768px
- Content max-width respects `var(--content-*)` tokens
- Touch targets: minimum 44px on mobile
- Spacing reduces by one step on mobile (e.g., `--space-8` → `--space-6`)
