# Page Patterns — Bold Editorial UI

Composition guides for app shells and page types. Uses tokens from `design-tokens.md` and components from `components.md`.

---

## App Shell

### Full Shell (Sidebar + Topbar + Content)

```
+----------------------------------------------------------+
|  TOPBAR (sticky, 64px, dark glass)                       |
|  [Logo mark]    [Nav — slim, mono labels]    [CTA btn]   |
+----------------------------------------------------------+
|          |                                               |
| SIDEBAR  |  CONTENT AREA                                 |
|  200px   |  padding: var(--space-8) var(--space-10)      |
|  fixed   |                                               |
|  slim    |  PAGE HEADER                                  |
|  mono    |  [mono overline]                              |
|  nav     |  [display heading]                            |
|          |  [subtitle + actions right]                   |
|          |                                               |
|  [items  |  CONTENT SECTIONS                             |
|   mono   |  cards / tables / charts                     |
|   labels]|                                               |
|          |                                               |
+----------+-----------------------------------------------+
```

```css
.app-shell {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: var(--bg-base);
}

.app-shell__topbar {
  position: sticky;
  top: 0;
  z-index: var(--z-sticky);
  height: 64px;
  /* see Navigation: Top Bar in components.md */
}

.app-shell__body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.app-shell__sidebar {
  width: 200px;
  flex-shrink: 0;
  height: calc(100vh - 64px);
  position: sticky;
  top: 64px;
  overflow-y: auto;
  /* see Sidebar in components.md */
}

.app-shell__content {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
  padding: var(--space-8) var(--space-10);
}
```

### Minimal Shell (no sidebar — marketing or focused apps)

```
+----------------------------------------------------------+
|  TOPBAR (sticky, 64px)                                   |
+----------------------------------------------------------+
|                                                          |
|  CONTENT — full width, max-width: var(--content-xl)     |
|  margin: 0 auto                                          |
|  padding: var(--space-12) var(--space-8)                 |
|                                                          |
+----------------------------------------------------------+
```

---

## Page Header

Used at the top of every app page inside the content area.

```
[MONO OVERLINE] — category, section name in mono uppercase
[DISPLAY HEADING] — page title in font-display
[SUBTITLE] — optional, body font, text-secondary        [ACTION BUTTONS]
[DIVIDER] — 1px border-subtle
```

```css
.page-header {
  margin-bottom: var(--space-8);
}

.page-header__overline {
  /* .mono-caption */
  margin-bottom: var(--space-2);
}

.page-header__title {
  font-family: var(--font-display);
  font-size: var(--text-3xl);
  font-weight: var(--weight-bold);
  letter-spacing: var(--tracking-tight);
  line-height: var(--leading-snug);
  color: var(--text-heading);
}

.page-header__row {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-4);
  margin-top: var(--space-2);
}

.page-header__subtitle {
  font-family: var(--font-body);
  font-size: var(--text-sm);
  color: var(--text-secondary);
  max-width: 560px;
}

.page-header__divider {
  margin-top: var(--space-6);
  height: 1px;
  background: var(--border-subtle);
}
```

---

## Dashboard Page

```
PAGE HEADER
  overline: "OVERVIEW" (mono)
  title: Project / Dashboard name (display, text-3xl)
  actions: date range selector + export button

HERO INSIGHT (full width or 2/3 width)
  Stat card: ONE large display-font number + trend + context
  background: var(--bg-surface), shadow-md

SECONDARY STATS (3-4 columns)
  Stat cards, smaller, shadow-sm

CHART SECTION
  Section header (mono overline + display title text-xl)
  One or two chart containers (Base Card, padding var(--space-6))

RECENT ACTIVITY or TABLE
  Section header + table or activity feed
```

Rules:
- Never start with four equal stat cards.
- Hero insight gets `shadow-md`, secondary cards get `shadow-sm`.
- Charts use only the editorial chart palette (see `dashboards.md`).
- Section titles use `font-display`.

---

## Detail / Profile Page

```
DETAIL HEADER (full width card or flush section)
  Media (image / avatar) + Name / Title + Meta badges
  Tabs below header

TAB BAR
  border-bottom: var(--border-medium)
  active tab: accent bottom border (2px)
  font-body, weight-medium

CONTENT SECTIONS (inside active tab)
  Cards organized by priority
  Sidebar panel (1/3) for quick actions and summary
```

---

## Settings Page

```
SETTINGS SHELL
  Left nav (1/4): section list — mono labels, active with accent border-left
  Right content (3/4): form sections

FORM SECTION
  Section card with:
    header: display font title + mono subtitle
    divider
    form groups (label above input)
    section save bar (sticky bottom, accent CTA)
```

---

## List / Browse Page

```
PAGE HEADER
  title + "[+ New Item]" button

FILTER BAR (horizontal, bg-surface, border-bottom)
  search input + dropdowns + active filter badges + clear

TABLE AREA
  table component (full width)
  row click → opens detail panel or navigates

PAGINATION BAR
  bottom of table, flex between: count info + page controls
```

---

## Onboarding Flow

```
PROGRESS BAR (top, full-width, accent fill)
STEP INDICATOR (mono — "STEP 02 / 05")

CENTERED CONTENT (max-width: var(--content-sm))
  Display heading for step title (font-display, text-3xl)
  Description (body, text-secondary, generous line-height)
  Form or interactive elements

ACTIONS (full-width button stack at bottom)
  [Continue →] (primary, full-width)
  [Back] (ghost, smaller)
```

---

## Auth Pages

### Login / Sign Up

```
LAYOUT: full-viewport
  Left (1/2, dark): branding panel
    logo + tagline large (display font)
    optional: testimonial or feature list
    background: var(--bg-void) with subtle grain

  Right (1/2, surface): form panel
    centered card (max-width: 400px)
    form: email, password
    CTA button (primary, full-width)
    social auth options
    link to other auth action
```

Alternative — Centered single card:
```
  Full-viewport background: var(--bg-base)
  Centered card (max-width: 400px, shadow-xl, radius-xl)
  Logo above, form inside, footer links below
```

---

## Responsive Breakpoints

```css
/* Mobile first */
@media (min-width: 640px)  { /* sm — sidebar starts appearing */ }
@media (min-width: 768px)  { /* md — two-column layouts */ }
@media (min-width: 1024px) { /* lg — full sidebar + content */ }
@media (min-width: 1280px) { /* xl — wide content, max readable */ }
@media (min-width: 1536px) { /* 2xl — max layout width */ }
```

Rules:
- Below 1024px: sidebar collapses to top hamburger nav.
- Below 768px: two-column card grids become single column.
- Tables: always horizontal scroll on mobile — never stack into cards (tabular data must remain a table).
- Display type (`text-5xl`, `text-6xl`) scales down on mobile:
  - `text-6xl` → `text-4xl` on mobile
  - `text-5xl` → `text-3xl` on mobile
  - `text-4xl` → `text-2xl` on mobile
- Touch targets: minimum 44x44px for all interactive elements.
