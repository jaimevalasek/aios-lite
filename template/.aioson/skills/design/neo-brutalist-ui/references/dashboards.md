# Dashboards — Neo-Brutalist UI

Rules and presets for data-heavy interfaces. The dashboard punk expression mode applied in practice.

---

## General Rules

### Stat numbers
- Always `font-family: var(--font-mono)` — the primary differentiator is mono, not serif or display
- Large: `var(--text-3xl)` minimum for hero stats, `var(--text-xl)` for secondary
- No decoration — the number is the visual

### Charts
- No gradient fills — flat colors at fixed opacity (`opacity: 0.3` for area fills)
- Bar charts: `border: var(--border-subtle)` on each bar, `border-radius: var(--radius-none)`
- Line charts: `stroke-width: 2.5px` minimum, solid dots (not hollow)
- Grid lines: `var(--border-subtle)`, full grid visible
- Axis labels: `font-family: var(--font-mono)`, `font-size: var(--text-xs)`
- No fancy tooltips — simple border box, mono text

### Tables
- Full grid borders (every cell) — not minimal. This is non-negotiable for brutalist dashboards
- Header: `bg-elevated`, font-mono uppercase
- Data cells: mono font for numbers, dates, IDs, statuses

### General
- Background: `bg-base` (cream off-white in light) — dashboards are "printed", not dark by default
- All cards: `border-thicker`, `shadow-md`, hover → `shadow-lg`
- Empty states: `[NO DATA]` in mono — no illustrations, no cheerful messages
- Status indicators: saturated green/amber/red at full strength — never muted

---

## Chart Color Palette

```css
--chart-1: var(--accent);          /* #FACC15 — yellow — primary series */
--chart-2: var(--accent-red);      /* red — negative / error series */
--chart-3: var(--accent-blue);     /* blue — secondary series */
--chart-4: var(--accent-green);    /* green — positive / success */
--chart-5: var(--accent-orange);   /* orange — warning / tertiary */
--chart-6: var(--border-color);    /* black/white — neutral baseline */
```

Usage:
- Single series: `--chart-1` (yellow)
- Two series: `--chart-1` + `--chart-3` (yellow + blue)
- Success/failure: `--chart-4` + `--chart-2` (green + red)
- Do not use more than 4 colors in a single chart

---

## Preset 1 — DevOps Dashboard

For: CI/CD pipelines, deployment tracking, service health, infrastructure monitoring.
Expression mode: Dashboard Punk.

### Layout
```
[STATUS GRID: colored cells (green/amber/red), border-thick each, 4-8 cols]

[DEPLOY TIMELINE: horizontal, mono timestamps, status badges]

┌────────────────────┐  ┌────────────────────┐  ┌────────────────────┐
│ ERROR RATE         │  │ P95 LATENCY        │  │ DEPLOY FREQUENCY   │
│ [line chart, red]  │  │ [line chart, blue] │  │ [bar chart, green] │
│ border-thicker     │  │                    │  │                    │
└────────────────────┘  └────────────────────┘  └────────────────────┘

[SERVICE HEALTH TABLE: full grid, service name | status badge | uptime mono | p99 mono | last incident mono]

[UPTIME COUNTERS: 3-4 stats in a strip — mono text-3xl, "99.97%"]
```

### Status grid pattern
```css
.status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 0;
}

.status-cell {
  border: var(--border-subtle);
  padding: var(--space-3);
  text-align: center;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: var(--weight-bold);
}

.status-cell--healthy { background: var(--semantic-green-dim); color: var(--semantic-green); }
.status-cell--warning { background: var(--semantic-amber-dim); color: var(--semantic-amber); }
.status-cell--down    { background: var(--semantic-red-dim); color: var(--semantic-red); }
```

### CLI-style status badges
```
[PASS]   → bg: semantic-green-dim, text: semantic-green, border: semantic-green
[FAIL]   → bg: semantic-red-dim, text: semantic-red, border: semantic-red
[RUNNING] → bg: semantic-amber-dim, text: semantic-amber, border: semantic-amber
[SKIP]   → bg: bg-elevated, text: text-muted
```

---

## Preset 2 — Indie SaaS Dashboard

For: bootstrapped SaaS, side projects, small products. Revenue and growth metrics.
Expression mode: Indie Product.

### Layout
```
[MRR HERO CARD: text-4xl mono bold, hard shadow-lg, sticker badge "[THIS MONTH]"]

┌────────────────────┐  ┌────────────────────┐  ┌────────────────────┐
│ NEW SIGNUPS        │  │ CHURN RATE         │  │ TRIAL → PAID       │
│ mono text-2xl      │  │ mono text-2xl      │  │ mono text-2xl      │
│ trend badge        │  │ trend badge        │  │ progress bar thick │
└────────────────────┘  └────────────────────┘  └────────────────────┘

┌───────────────────────────────────────────────────┐
│ SUBSCRIBER CHART                                  │
│ Area chart, accent fill 0.3 opacity, no gradient  │
│ brutalist card, border-thicker                    │
└───────────────────────────────────────────────────┘

[RECENT SIGNUPS TABLE: full grid | avatar (square) | name | email mono | plan badge | date mono]

[FUNNEL: horizontal bar chart — trial/active/churned with thick bars]
```

### MRR hero card
```css
.mrr-hero {
  background: var(--bg-surface);
  border: var(--border-thickest);
  box-shadow: var(--shadow-lg);
  padding: var(--space-8) var(--space-10);
  position: relative;
}

.mrr-hero__label {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: var(--tracking-wider);
  color: var(--text-secondary);
  margin-bottom: var(--space-2);
}

.mrr-hero__value {
  font-family: var(--font-mono);
  font-size: var(--text-4xl);
  font-weight: var(--weight-extrabold);
  color: var(--text-heading);
  letter-spacing: var(--tracking-tight);
}

/* Position sticker badge top-right */
.mrr-hero__sticker {
  position: absolute;
  top: var(--space-4);
  right: var(--space-4);
}
```

---

## Preset 3 — Project Tracker Dashboard

For: task management, sprint tracking, team workload, project status.
Expression mode: Indie Product or Dashboard Punk.

### Layout
```
[STATUS BADGES STRIP: "[12 TODO]" "[5 IN PROGRESS]" "[28 DONE]" — mono, bordered, full saturation]

┌──────────────────────────┐  ┌────────────────────────────────┐
│ BURNDOWN CHART           │  │ TEAM WORKLOAD                  │
│ line chart               │  │ horizontal bar per member      │
│ ideal vs actual          │  │ thick bars, mono name labels   │
└──────────────────────────┘  └────────────────────────────────┘

[TASK TABLE: full grid | priority dot | title | assignee avatar square | due date mono | status badge]

[DEADLINE COUNTDOWN: mono bold text-xl "3 DAYS REMAINING" in accent card]
```

### Status count strip
```css
.status-strip {
  display: flex;
  gap: 0;
  border: var(--border-thick);
  overflow: hidden;
}

.status-strip__item {
  flex: 1;
  padding: var(--space-3) var(--space-4);
  border-right: var(--border-thick);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  font-weight: var(--weight-bold);
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.status-strip__item:last-child { border-right: none; }
.status-strip__item--todo     { background: var(--bg-elevated); }
.status-strip__item--progress { background: var(--semantic-amber-dim); }
.status-strip__item--done     { background: var(--semantic-green-dim); }
```

---

## Preset 4 — Content Dashboard

For: blogs, newsletters, media products, content teams tracking performance.
Expression mode: Indie Product.

### Layout
```
[CONTENT STATUS STRIP: sticker badges — "[12 PUBLISHED]" "[4 DRAFT]" "[2 SCHEDULED]"]

┌───────────────────────────────────────────────────────────────┐
│ CONTENT CALENDAR                                              │
│ Grid: 7 cols (days), multiple rows (weeks), border all cells  │
│ Status: colored bg fills (published=green, draft=amber, etc.) │
└───────────────────────────────────────────────────────────────┘

┌────────────────────┐  ┌───────────────────────────────────────┐
│ TOP POSTS (7d)     │  │ PERFORMANCE TABLE                     │
│ rank | title |     │  │ full grid | title mono | views | CTR  │
│ views mono         │  │ mono numbers throughout               │
└────────────────────┘  └───────────────────────────────────────┘
```

### Content calendar cell
```css
.cal-cell {
  border: var(--border-subtle);
  min-height: 80px;
  padding: var(--space-2);
  vertical-align: top;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
}

.cal-cell__date {
  font-weight: var(--weight-bold);
  color: var(--text-muted);
  margin-bottom: var(--space-1);
}

.cal-item {
  background: var(--accent-dim);
  border: var(--border-subtle);
  padding: 2px var(--space-2);
  font-size: 11px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cal-item--published { background: var(--semantic-green-dim); }
.cal-item--draft     { background: var(--semantic-amber-dim); }
.cal-item--scheduled { background: var(--semantic-blue-dim); }
```

---

## Preset 5 — Monitoring Dashboard

For: system uptime, infrastructure health, alert management, ops tooling.
Expression mode: Dashboard Punk.

### Layout
```
[TOP BAR: last updated "UPDATED 2m AGO" mono | incident count badge | ack button]

[HEALTH BOARD: NxM grid of colored status squares — one per service]
 → green = healthy, yellow = degraded, red = down
 → each cell: service name mono text-xs, status dot, p99 mono

┌────────────────────┐  ┌────────────────────┐
│ LATENCY CHART      │  │ ERROR RATE CHART   │
│ line, blue         │  │ line, red          │
│ threshold line:    │  │ thick bars, border │
│ dashed, red        │  │                    │
└────────────────────┘  └────────────────────┘

[RESOURCE USAGE: thick progress bars per service — cpu / memory / disk]

[ALERT LOG: mono, timestamped, severity badge, scrollable with border]
```

### Alert log
```css
.alert-log {
  background: var(--bg-surface);
  border: var(--border-thicker);
  max-height: 320px;
  overflow-y: auto;
}

.alert-item {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-bottom: var(--border-subtle);
  align-items: start;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
}

.alert-item__time {
  color: var(--text-muted);
  white-space: nowrap;
}

.alert-item__message {
  color: var(--text-primary);
  line-height: 1.4;
}

.alert-item--critical { border-left: 4px solid var(--semantic-red); }
.alert-item--warning  { border-left: 4px solid var(--semantic-amber); }
.alert-item--info     { border-left: 4px solid var(--semantic-blue); }
```
