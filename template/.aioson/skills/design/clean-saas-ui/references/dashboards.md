# Dashboards — Clean SaaS UI

Dashboard presets for the most common B2B SaaS contexts. Each preset defines the dominant story, focal element, and composition.

---

## General rules

- **Stats are sans-serif (Inter bold)** — never serif (that is warm-craft), never display (that is bold-editorial)
- **Charts use the system palette (blue-first)** — never the charting library's default colors
- **Background is light by default** — dashboards in Clean SaaS are light, professional, and functional
- **No chart uses more than 6 colors** — simplicity over variety
- **One dominant focal element per page** — resist the 4-equal-card opener every time
- **Date range selector always visible** in the page header — not hidden in a settings drawer

---

## Chart palette

```css
--chart-1: var(--accent);      /* #2563EB — primary blue */
--chart-2: #8B5CF6;            /* violet-500 */
--chart-3: #10B981;            /* emerald-500 */
--chart-4: #F59E0B;            /* amber-500 */
--chart-5: #EF4444;            /* red-500 */
--chart-6: #6B7280;            /* gray-500 — neutral/other */
```

Use `--chart-1` (blue) for the most important data series. Use gray for secondary or "other" categories.

---

## Preset 1 — SaaS Metrics Dashboard

**Domain:** B2B SaaS — founders, CEOs, VPs of Revenue, growth teams
**Dominant story:** Revenue health and growth trajectory
**Focal element:** MRR hero stat with trend sparkline

```
┌─────────────────────────────────────────────────────────┐
│ Business Overview         [This month ▾]   [Export]      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  MRR: $48,250  ↑ +12.3%                                 │  ← hero stat, dominant
│  New: $5,200  Expansion: $2,800  Churn: -$1,200          │  ← breakdown row below
│                                                          │
├────────────────────────────────┬────────────────────────┤
│  Revenue Over Time (12m)       │  Top Plans              │
│  [line chart, area fill]       │  [horizontal bar chart] │
├────────────────────────────────┴────────────────────────┤
│  [ARR: $580K]  [Subscribers: 1,240]  [Churn: 1.2%]  [NPS: 42] │
├─────────────────────────────────────────────────────────┤
│  Recent Signups                         [View all →]     │
│  [table: name, plan, trial start, value, status — 5 rows]│
└─────────────────────────────────────────────────────────┘
```

**Composition notes:**
- MRR hero is bigger than everything else — `text-4xl font-bold`
- Revenue chart (2/3 width) + plan breakdown (1/3 width)
- Stat cards row below charts, not above (inverted from generic pattern)
- Trial conversion funnel can replace plan breakdown in growth-focused contexts

---

## Preset 2 — CRM Dashboard

**Domain:** Sales teams, account executives, sales managers
**Dominant story:** Pipeline health and deal risk
**Focal element:** Pipeline stage overview (horizontal funnel)

```
┌─────────────────────────────────────────────────────────┐
│ Sales Pipeline             [This quarter ▾]  [+ New Deal]│
├─────────────────────────────────────────────────────────┤
│  Lead → Qualified → Proposal → Negotiation → Closed Won  │  ← pipeline stages
│  [42]      [28]       [15]        [8]          [12]      │
│  $280K     $540K      $420K       $380K        $195K     │
├────────────────────────────────┬────────────────────────┤
│  Win Rate: 38%  ↑ vs last Q    │  Activity Feed          │
│  [donut chart]                 │  [timeline list]        │
├────────────────────────────────┴────────────────────────┤
│  [Open: 247]  [At Risk: 18]  [Avg Close: 32d]  [Quota: 67%] │
├─────────────────────────────────────────────────────────┤
│  Deals At Risk                          [View all →]     │
│  [table: deal, account, stage, value, close date, owner] │
└─────────────────────────────────────────────────────────┘
```

**Composition notes:**
- Pipeline horizontal stage bar is the dominant element — no equal KPI grid opener
- Win rate donut (1/2) + activity feed (1/2) below
- "At Risk" table is the most actionable section — order it before general list

---

## Preset 3 — Project Management Dashboard

**Domain:** Project managers, team leads, operations
**Dominant story:** Team workload and upcoming deadlines
**Focal element:** Tasks by status (horizontal progress bars per status)

```
┌─────────────────────────────────────────────────────────┐
│ Team Overview                        [This week ▾]       │
├─────────────────────────────────────────────────────────┤
│  [Todo: 34]  [In Progress: 18]  [Review: 7]  [Done: 52] │  ← status summary cards
├────────────────────────────────┬────────────────────────┤
│  Workload by Member            │  Upcoming Deadlines     │
│  [horizontal bar — members]    │  [list: task + due]     │
├────────────────────────────────┴────────────────────────┤
│  Sprint Completion: 68%                                  │
│  [progress bar full-width with milestone markers]        │
├─────────────────────────────────────────────────────────┤
│  Recent Activity                        [View all →]     │
│  [activity feed: avatar + action + timestamp]            │
└─────────────────────────────────────────────────────────┘
```

**Composition notes:**
- Status cards are compact (not full stat cards) — a row of colored counters
- Workload bars show per-member capacity — visual scan instead of table
- Sprint progress full-width below the charts — unifying element
- No donut charts here — linear progress communicates urgency better

---

## Preset 4 — Support Dashboard

**Domain:** Customer support managers, ops teams
**Dominant story:** Queue health and response performance
**Focal element:** Open tickets stat + response time trend

```
┌─────────────────────────────────────────────────────────┐
│ Support Overview               [Today ▾]   [Refresh ↺]  │
├─────────────────────────────────────────────────────────┤
│  [Open: 47]  [Avg Response: 2.4h ↑]  [CSAT: 94% ↑]  [Resolved today: 23] │
├────────────────────────────────┬────────────────────────┤
│  Response Time (7d)            │  Tickets by Category    │
│  [line chart with SLA line]    │  [horizontal bars]      │
├────────────────────────────────┴────────────────────────┤
│  Ticket Queue                           [Assign]  [Filter] │
│  [table: ID, subject, customer, priority, status, time]  │
└─────────────────────────────────────────────────────────┘
```

**Composition notes:**
- Response time chart includes a horizontal SLA target line — critical for support
- Ticket queue is actionable — table with inline assignment and status update
- Priority badges use semantic colors (urgent = red, high = amber, normal = blue, low = gray)
- "Refresh" button because support data is live — manual or auto-refresh visible

---

## Preset 5 — Admin Overview

**Domain:** System administrators, infrastructure, ops
**Dominant story:** System health and user activity
**Focal element:** Health indicators (green/amber/red status grid)

```
┌─────────────────────────────────────────────────────────┐
│ System Administration                        [Settings ⚙]│
├─────────────────────────────────────────────────────────┤
│  System Health                                           │
│  ● API        ● Database    ● Email       ● Webhooks     │  ← status indicator grid
│  Operational  Operational   Degraded      Operational    │
├────────────────────────────────┬────────────────────────┤
│  [Active Users: 1,240]  [Storage: 68%]  │ Alerts: 2 ⚠   │
├────────────────────────────────┴────────────────────────┤
│  Recent Signups                         [View all →]     │
│  [table: name, email, plan, signed up, status]           │
├─────────────────────────────────────────────────────────┤
│  Audit Log                              [View all →]     │
│  [feed: user + action + timestamp + IP]                  │
└─────────────────────────────────────────────────────────┘
```

**Composition notes:**
- Health indicator grid uses colored dots with labels — not cards with shadows
- Storage usage shows as a progress bar (68%) — not just a number
- Audit log is a feed, not a table — time-first, chronological
- Alert count in header if any system is degraded — always visible

---

## Composition anti-patterns to avoid

1. Four equal KPI cards as the ONLY opening element — always have one focal element with more visual weight
2. Pie charts — use horizontal bars or donut charts instead (easier to scan)
3. Charts with 8+ colors — group into "Other" if needed
4. Dashboard without a date range selector
5. Stat numbers in serif font
6. Charts using library default colors (blues/reds/greens not from the system palette)
7. More than 3 chart types on one page — consistency over variety
