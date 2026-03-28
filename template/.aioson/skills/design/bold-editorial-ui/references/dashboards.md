# Dashboard Presets — Bold Editorial UI

Composition guides for common dashboard types. Every preset uses the App Shell from `patterns.md`, tokens from `design-tokens.md`, and components from `components.md`.

---

## General Dashboard Rules

1. **Stats use display font, not body.** Key numbers must be in `var(--font-display)` at `text-3xl` minimum. The number IS the content.
2. **One hero metric.** Never open a dashboard with four equal KPI cards. Find the single number that tells the story and give it dominant space.
3. **Charts use editorial palette only.** See chart colors below. Never use library defaults.
4. **Background is dark.** Bold Editorial dashboards default to `var(--bg-base)` (near-black). Light mode is the exception.
5. **Mono everywhere for data labels.** Axis labels, timestamps, category labels, column headers — all `var(--font-mono)`.
6. **Card depth hierarchy:** hero insight gets `var(--shadow-md)`, secondary cards get `var(--shadow-sm)`, tables get border only.
7. **Breathing room:** `var(--space-5)` or `var(--space-6)` minimum gap between cards.
8. **Section headers use display font:** `var(--font-display)`, `var(--text-lg)`, `var(--weight-bold)`, preceded by a mono overline.

---

## Preset 1: Marketing Dashboard

Use for: conversion tracking, campaign performance, paid media, growth metrics.

```
HEADER
  overline: "MARKETING / OVERVIEW" (mono)
  title: dashboard name (display, text-3xl)
  right: date range selector + export button

HERO METRIC (full width or 2/3 width)
  Primary KPI: "Total Conversions — 4,218"
  font-display, text-5xl, text-heading
  trend badge (mono, semantic color) + context sentence below
  background: bg-surface, shadow-md, radius-lg

SECONDARY STATS (3 columns)
  Stat cards: spend, CPL, ROAS
  Smaller numbers (text-3xl), shadow-sm

PRIMARY CHART (full width)
  Area chart: conversions over time
  Warm gradient fill under line
  bg-surface card, radius-lg

BREAKDOWN (two columns)
  Left: Donut chart — channel attribution
  Right: Campaign table (sortable, mono labels)

COMPARISON TABLE (full width)
  Channel | Spend | Conversions | CPA | ROAS | Trend sparkline
  Mono column headers, text-sm data
```

---

## Preset 2: Developer Dashboard

Use for: API monitoring, build pipelines, deployment status, error tracking.

```
HEADER
  overline: "SYSTEM / STATUS" (mono)
  title: service name
  right: environment badge ([PRODUCTION]) + refresh button

STATUS ROW (horizontal strip)
  3-5 services: service name (mono) + status badge ([UP] / [DEGRADED] / [DOWN])
  green/amber/red semantic colors
  background: bg-surface, border-medium, radius-md

HERO METRIC
  "API Latency — 42ms"
  comparison: "↓ from 380ms" (semantic-green)
  shadow-md card

SECONDARY STATS (3-4 columns)
  Error rate, requests/min, uptime %, active deployments

LATENCY CHART (full width)
  Line chart: p50 / p95 / p99 latency over 24h
  accent for p50, secondary for p99
  Threshold line with dashed style and mono label

RECENT EVENTS (two columns)
  Left: Error log — mono timestamps, severity badges, message truncated
  Right: Deploy feed — mono commit hash, author, status badge, time
```

---

## Preset 3: Analytics Overview

Use for: product analytics, traffic analysis, funnel tracking, user behavior.

```
HEADER
  overline: "ANALYTICS / OVERVIEW" (mono)
  title: product/site name
  right: date range selector (prominent — most used action)

METRIC STRIP (horizontal, bg-surface card)
  4-5 metrics inline with dividers:
  Users | Sessions | Bounce Rate | Avg Duration | Conversions
  Each: mono label + display number (text-2xl) + trend badge
  No individual card frames — one strip card

PRIMARY CHART (full width)
  Area chart: main KPI (sessions/users) over time
  accent gradient fill
  Interactive tooltip: values + date (mono)

BREAKDOWN SECTION (two columns)
  Left: Horizontal bar chart — top pages/sources
  Right: Sortable table — page | views | bounce | duration

FUNNEL CHART (full width)
  Horizontal stages: Visit → Sign Up → Activate → Retain
  Bar per stage, accent fill, mono labels, conversion % between stages

COMPARISON TABLE (full width)
  With trend sparklines in cells
  Mono font for all data
```

---

## Preset 4: Content Dashboard

Use for: CMS dashboards, editorial tools, content calendar, publication tracking.

```
HEADER
  overline: "CONTENT / PUBLISHING" (mono)
  title: publication or site name
  right: "[+ New Article]" button (primary, medium)

STATUS CARDS (3 columns)
  Published | Drafts | Scheduled
  Count in text-4xl display font
  Trend vs last period

CONTENT CALENDAR (full width card)
  Grid: rows = weeks, columns = days
  Each day: dot(s) for published content (accent) / drafts (muted)
  Click → day view expands

PERFORMANCE CHART (full width)
  Area chart: pageviews by article over time
  Multi-series: top 3-5 articles, each with distinct editorial palette color

TOP CONTENT TABLE (full width)
  Rank | Title (truncated, clickable) | Published | Views | Avg Time | Shares
  Mono for numbers and dates, body font for titles
```

---

## Preset 5: Executive Summary

Use for: C-suite reports, investor dashboards, company-wide KPIs, board-level views.

```
HEADER
  overline: "EXECUTIVE / SUMMARY — Q1 2025" (mono)
  title: company name (display, large)
  right: period label + export PDF

HERO INSIGHT (full width)
  "Revenue — $2.4M" in text-5xl display font
  "124% of Q1 target" — semantic green
  Bar: actual vs target visual
  shadow-md, generous padding

QUARTERLY COMPARISON (full width)
  Grouped bar chart: Q1 vs Q2 vs Q3 vs Q4
  Accent for current quarter, muted for past
  Mono x-axis labels, display values above bars

DEPARTMENT CARDS (3-4 columns)
  Each: department name (mono overline) + primary KPI (display, text-3xl) + trend
  Cards with radius-lg, shadow-sm

ALERTS & HIGHLIGHTS (full width)
  3-column card grid or horizontal list:
  Flag type badge + metric + context sentence
  Green for above target, amber for at risk, red for missed
```

---

## Chart Color Palette

For all dashboards, use these colors in order. Never use library default colors.

```css
/* Primary data series */
--chart-1: var(--accent);          /* #FF4D2A — red-orange (primary) */
--chart-2: #B8B8B8;                /* light gray — secondary series */
--chart-3: var(--semantic-blue);   /* #60A5FA — for comparison data */
--chart-4: var(--semantic-green);  /* #22C55E — positive/growth */
--chart-5: var(--semantic-amber);  /* #F59E0B — warning/attention */
--chart-6: var(--text-muted);      /* #484848 — background/reference series */

/* Background fills (for area charts) */
--chart-fill-1: rgba(255, 77, 42,  0.15);  /* accent */
--chart-fill-2: rgba(184, 184, 184, 0.10);
--chart-fill-3: rgba(96, 165, 250, 0.12);
```

Rules:
- Area charts: gradient fill from `--chart-fill-*` color to transparent (top to bottom).
- Bar charts: solid `--chart-*` color, no gradient, `border-radius: 3px 3px 0 0` (slight top curve).
- Donut charts: `--chart-*` colors, center transparent (shows background).
- Line charts: 2px stroke, dot markers on hover only; no fill unless area chart.
- Grid lines: `var(--border-subtle)` — never dark, never prominent.
- Axis labels: `var(--font-mono)`, `var(--text-xs)`, `var(--text-muted)`.
- Tooltips: use the Tooltip component from `components.md`, mono font for values.
- Zero decorative backgrounds on chart area — bg-surface only.
