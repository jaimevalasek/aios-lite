# Dashboard Presets — Warm Craft UI

Composition guides for common dashboard types. Every preset uses the App Shell from `patterns.md`, tokens from `design-tokens.md`, and components from `components.md`.

---

## General Dashboard Rules

1. **Never start with four equal stat cards.** Find the hero insight first.
2. **Charts use warm palette only:** terracotta, sage, amber, slate-blue, muted purple. Never default library colors.
3. **Serif stat numbers:** all prominent numbers use `var(--font-display)` — this is the visual signature in data-heavy pages.
4. **Card depth hierarchy:** hero insight gets `var(--shadow-md)`, secondary cards get `var(--shadow-sm)`, tables get `var(--shadow-xs)`.
5. **Breathing room:** dashboards in Warm Craft are NOT dense. Keep `var(--space-5)` or `var(--space-6)` gap between cards.
6. **Section headers use serif:** `var(--font-display)`, `var(--text-lg)`, `var(--weight-semibold)`.

---

## Preset 1: Overview Dashboard

Use for: general-purpose analytics, admin home, project overview.

```
GREETING HEADER (optional but encouraged)
  "Good morning, {name}" or "Dashboard Overview"
  font: var(--font-display), var(--text-2xl), var(--weight-bold)
  subtitle: date or summary context
  margin-bottom: var(--space-6)

HERO INSIGHT (one card, full width or 2/3 width)
  Large serif number + trend + context sentence
  "Revenue this month: $48,250 — 12% above target"
  background: var(--bg-surface)
  border-radius: var(--radius-2xl)
  padding: var(--space-8)
  shadow: var(--shadow-md)

SECONDARY STATS (grid, 3-4 columns)
  Stat Card components
  Smaller than hero, var(--shadow-sm)

CHART SECTION
  Section header + one or two charts side by side
  Chart container: Base Card with padding var(--space-6)
  Colors: var(--accent), var(--accent-secondary), var(--accent-tertiary), var(--semantic-blue)

RECENT ACTIVITY or TABLE
  Section header + Table component or Activity Feed
```

---

## Preset 2: Analytics Dashboard

Use for: marketing analytics, traffic analysis, conversion tracking, growth metrics.

```
DATE RANGE SELECTOR (top right, next to page title)
  Pill-shaped select or date picker
  background: var(--bg-elevated)
  border-radius: var(--radius-full)

METRIC STRIP (3-5 metrics, horizontal scroll on mobile)
  Each: serif number + label + trend badge
  NOT cards — just a clean horizontal row with dividers
  background: var(--bg-surface)
  border-radius: var(--radius-xl)
  padding: var(--space-4) var(--space-6)

PRIMARY CHART (full width)
  Area chart or line chart — main KPI over time
  Warm gradient fill under the line
  background: var(--bg-surface) card
  border-radius: var(--radius-xl)
  height: 320px

BREAKDOWN SECTION (two columns)
  Left: Donut chart or horizontal bar chart (top sources, categories)
  Right: Table with sortable columns (detailed breakdown)

COMPARISON TABLE (full width)
  Table with trend sparklines in cells
  Warm-colored inline mini charts
```

---

## Preset 3: Activity Feed Dashboard

Use for: social, CRM activity, team updates, notification center, audit log.

```
LAYOUT: Two columns on desktop, single column on mobile
  Left (2/3): Activity Feed
  Right (1/3): Summary + Quick Actions

ACTIVITY FEED
  Vertical timeline with warm connecting line
  line: 2px solid var(--border-subtle), left side

  Each item:
    avatar: var(--space-10) (40px)
    content: user action description
    timestamp: var(--text-xs), var(--text-muted)
    padding: var(--space-4) 0
    border-bottom: 1px solid var(--border-subtle)

    action types have different icons/colors:
      create: var(--semantic-green) icon
      update: var(--semantic-blue) icon
      delete: var(--semantic-red) icon
      comment: var(--accent) icon

SUMMARY SIDEBAR
  Quick stats: Stat Cards (compact variant)
  Quick actions: Stack of Ghost Buttons
  Filters: Badge chips for filtering activity type
```

---

## Preset 4: Project Board Dashboard

Use for: project management, kanban overview, sprint planning, task tracking.

```
PROJECT HEADER
  Project name (serif, large) + status badge + team avatars (overlapping)
  Progress bar: overall project completion
  margin-bottom: var(--space-6)

BOARD VIEW (default)
  Horizontal columns: "To Do" | "In Progress" | "Review" | "Done"
  Column header:
    title + count badge
    font: var(--font-body), var(--text-sm), var(--weight-semibold)
    color: var(--text-heading)

  Column:
    background: var(--bg-void)
    border-radius: var(--radius-xl)
    padding: var(--space-3)
    min-width: 280px

  Task card:
    Base Card, compact padding var(--space-4)
    title: var(--text-sm), var(--weight-medium)
    assignee avatar: 24px, bottom-right
    priority badge: colored dot or badge
    due date: var(--text-xs), var(--text-muted)

TABLE VIEW (alternative)
  Table component with:
    task name, assignee (avatar + name), status (badge), priority, due date
    row click opens detail panel

FOOTER STATS
  Horizontal strip: tasks completed / total, team velocity, overdue count
```

---

## Preset 5: Admin Panel Dashboard

Use for: system admin, user management, configuration, moderation.

```
SYSTEM STATUS BANNER (conditional — only when issues)
  full width, above content
  background: var(--semantic-amber-dim) or var(--semantic-red-dim)
  border-radius: var(--radius-xl)
  padding: var(--space-4) var(--space-6)
  icon + message + action button
  margin-bottom: var(--space-6)

QUICK STATS ROW
  4 Stat Cards: Total Users, Active Today, Pending Reviews, Open Issues
  Compact variant, var(--shadow-sm)

USER MANAGEMENT SECTION
  Section header: "Recent Users" + "View All" link
  Table: avatar + name + email + role (badge) + status + last active + actions
  Warm hover, rounded corners

SYSTEM HEALTH (two columns)
  Left: simple bar chart (API response times, warm colored)
  Right: recent error log (compact list, severity badges)

QUICK ACTIONS
  Grid of action cards (2-3 columns):
    "Manage Users", "Review Queue", "System Settings", "Export Data"
    Feature Card style (icon + title + description)
    Click navigates to section
```

---

## Chart Color Palette

For all dashboards, use these colors in order. Never use library defaults.

```css
/* Primary data series */
--chart-1: var(--accent);            /* #E07A5F — terracotta */
--chart-2: var(--accent-secondary);  /* #7C9A82 — sage */
--chart-3: var(--accent-tertiary);   /* #D4A76A — amber */
--chart-4: var(--semantic-blue);     /* #5B8DB8 — slate blue */
--chart-5: var(--semantic-purple);   /* #9B8EC4 — muted purple */
--chart-6: #8B7355;                  /* warm brown */

/* Background fills (use with 0.15 opacity) */
--chart-fill-1: rgba(224, 122, 95, 0.15);
--chart-fill-2: rgba(124, 154, 130, 0.15);
--chart-fill-3: rgba(212, 167, 106, 0.15);
```

Rules:
- Area charts: use gradient fill from `--chart-fill-*` to transparent
- Bar charts: solid `--chart-*` colors, rounded top corners (`border-radius: 4px 4px 0 0`)
- Donut charts: `--chart-*` colors, warm gray for remaining (`var(--bg-elevated)`)
- Line charts: 2px stroke, dot markers on hover only
- Grid lines: `var(--border-subtle)`, never dark
- Axis labels: `var(--text-muted)`, `var(--text-xs)`
- Tooltips: uses Tooltip component from `components.md`
