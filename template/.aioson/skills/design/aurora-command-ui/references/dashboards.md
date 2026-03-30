# Dashboards — Aurora Command UI

5 dashboard presets. All require the aurora gradient substrate and glass panels from `design-tokens.md`.

---

## General rules for all dashboards

1. **Aurora substrate always visible** — glass panels must reveal the gradient below. If panels feel solid, reduce glass-surface alpha.
2. **Gradient stat numbers** — hero metrics use `background: var(--accent-gradient); -webkit-background-clip: text; color: transparent` on the number only.
3. **Teal-electric for live states** — active, online, live, real-time indicators always use `--accent-primary` (#00C8E8) with the dot glow.
4. **Violet for CTAs and highlights** — primary action buttons use the full gradient. Highlighted or featured cards may use a `--accent-violet-dim` background wash.
5. **One hero element per dashboard** — one surface is significantly larger or more prominent. It is the anchor the eye reads first.
6. **Mono labels as structural rails** — every section begins with a mono uppercase label. This is non-negotiable.
7. **Chart containers are glass** — charts live inside `glass-surface` panels, never as raw bare elements on the aurora background.

---

## Chart color palette

```css
--chart-1: #00C8E8;              /* teal-electric — primary series */
--chart-2: #7C3AED;              /* violet — secondary series */
--chart-3: #00D68F;              /* green — positive / growth */
--chart-4: #F4A91D;              /* amber — warning / caution */
--chart-5: #FF5A67;              /* red — negative / critical */
--chart-6: #A78BFA;              /* soft violet — tertiary series */

/* Area/line chart gradient fills */
--chart-fill-1: linear-gradient(180deg, rgba(0,200,232,0.22) 0%, rgba(0,200,232,0) 100%);
--chart-fill-2: linear-gradient(180deg, rgba(124,58,237,0.22) 0%, rgba(124,58,237,0) 100%);
--chart-fill-3: linear-gradient(180deg, rgba(0,214,143,0.22) 0%, rgba(0,214,143,0) 100%);
--chart-fill-4: linear-gradient(180deg, rgba(244,169,29,0.22) 0%, rgba(244,169,29,0) 100%);
```

### Chart rendering rules
- **Area charts**: gradient fill (aurora fill rule — top color → transparent). Never solid fill.
- **Line charts**: 2px stroke in chart color + gradient fill below.
- **Bar charts**: gradient fill (vertical, teal-electric → violet), top `border-radius: 4px`.
- **Donut charts**: teal-electric primary segment, violet secondary. Center area transparent (aurora shows through).
- **Grid lines**: `rgba(255,255,255,0.06)` dark / `rgba(0,0,0,0.06)` light.
- **Axis labels**: `var(--text-muted)`, `font-size: var(--text-xs)`.
- **Tooltips**: glass card (glass-surface + blur-md + glass-border) — never solid white box.

---

## 1. Security Operations Center (SOC)

**Expression mode**: Eclipse Command
**Feel**: surgical, high-trust, tactically dense, atmospheric authority

**Domain vocabulary**: threat, incident, alert, severity, vector, actor, signal, rule, containment

**Layout:**
```
COMMAND STRIP: ● LIVE — 3 ACTIVE INCIDENTS  ● 847ms DETECT LATENCY  ● 12 AGENTS ONLINE
TOPBAR: [Logo] ── [OVERVIEW / INCIDENTS / AGENTS / INTEL / CONFIG] ── [SOC-ANALYST badge]

STAT ROW (4 cards):
  ├── Open Incidents: 3  (amber if >0)
  ├── Resolved Today: 28  (green)
  ├── Mean TTD: 00:04:12  (mono timestamp)
  └── Agent Coverage: 99.4%  (teal-electric)

SPLIT (2/3 + 1/3):
  LEFT: Hero chart panel — "Threat Events (24h)" — area chart, teal line
  RIGHT: Alert Tape — live feed of latest alerts, scrollable glass panel

FULL WIDTH:
  MONO: INCIDENT QUEUE ▸
  Glass data table: ID | Severity | Source | Time | Status | Assignee | Actions
```

**Signature move**: the command strip at the top with live dot indicators using teal-electric glow — appears on the strip, the stat cards, active sidebar items, and live alert rows.

---

## 2. AI Analytics Platform

**Expression mode**: Deep Analytics
**Feel**: intelligent, precise, premium, data-curated

**Domain vocabulary**: model, inference, accuracy, throughput, token, latency, cost/call, deployment

**Layout:**
```
TOPBAR: [Logo] ── [MODELS / DEPLOYMENTS / USAGE / COSTS] ── [Period selector]

HERO METRIC PANEL (full width):
  MONO: PLATFORM PERFORMANCE
  Left side: Total Inferences  4,820,190  ↑ 12.4% (gradient stat number)
  Right side: Area chart — inference volume over 30d — teal fill
  Sub-row: [Avg Latency: 234ms] [Success Rate: 99.7%] [Active Models: 12]

BODY SPLIT (3 equal cols):
  ├── MODEL HEALTH glass card — bar chart: latency by model
  ├── COST BREAKDOWN glass card — donut: cost by endpoint
  └── TOKEN USAGE glass card — line: tokens/day trend

FULL WIDTH:
  MONO: MODEL REGISTRY ▸
  Glass table: Model | Version | Latency p99 | RPM | Status | Deploy Date
```

**Signature move**: gradient text on the hero stat number + aurora gradient fill on the area chart — the data visualization itself feels like part of the aurora background.

---

## 3. Financial Command Center

**Expression mode**: Eclipse Command
**Feel**: authoritative, premium, trustworthy, measured

**Domain vocabulary**: position, allocation, exposure, yield, drawdown, rebalance, settlement, custody

**Layout:**
```
TOPBAR: [Logo] ── [POSITIONS / RISK / TRANSACTIONS / REPORTS] ── [Portfolio selector]

STAT ROW (4 cards):
  ├── Portfolio NAV: $48.2M  ↑ 2.1% (gradient)
  ├── Day P&L: +$842,190  (green glow)
  ├── Risk Score: 6.2/10  (amber)
  └── Cash Yield: 4.82%  (teal)

SPLIT (1/2 + 1/2):
  LEFT: Allocation breakdown — donut chart + legend — glass panel
  RIGHT: Performance vs Benchmark — area chart — glass panel

SIDEBAR RAIL (right, 280px):
  MONO: RECENT TRANSACTIONS ▸
  Scrollable feed of transaction rows: amount + asset + time + status

FULL WIDTH:
  MONO: POSITIONS ▸
  Glass table: Asset | Qty | Avg Cost | Current | P&L | P&L% | Weight | Actions
```

**Signature move**: teal-electric for positive movements, semantic-red for losses — the color system itself communicates portfolio health at a glance.

---

## 4. CRM Intelligence Board

**Expression mode**: Crystal Intelligence
**Feel**: curated, intelligent, present, dimensional

**Domain vocabulary**: lead, pipeline, deal, stage, forecast, churn, LTV, engagement, signal

**Layout:**
```
TOPBAR: [Logo] ── [PIPELINE / CONTACTS / ACTIVITIES / FORECAST] ── [User avatar]

HERO: Pipeline Value
  MONO: REVENUE PIPELINE
  $6,240,000 in active deals  ↑ 18% QoQ  (gradient number)
  Stage breakdown: 4 horizontal bars with teal-to-violet gradient fills

BODY GRID (3 cols):
  ├── Deals Closing This Month: 12 deals / $840K
  ├── At-Risk Accounts: 7 flagged (amber)
  └── Win Rate: 34% ↑ from 28% (green)

FULL WIDTH:
  MONO: ACTIVE DEALS ▸
  Glass table: Company | Contact | Stage | Value | Probability | Close Date | Owner | Signal
  Signal column: colored indicator (green = engaged, amber = cold, red = churning)
```

**Signature move**: the "Signal" column uses a teal-electric → violet gradient indicator to show engagement state — the gradient encodes time + intent in a single visual element.

---

## 5. Infrastructure Cockpit

**Expression mode**: Eclipse Command (Industrial variant)
**Feel**: practical, mechanical, high-signal, dense

**Domain vocabulary**: node, cluster, pod, replica, cpu, memory, throughput, latency, region, deploy

**Layout:**
```
COMMAND STRIP: ● 142 NODES  ● 4 DEGRADED  ● 2 REGIONS ONLINE  ● p99 124ms

TOPBAR: [Logo] ── [CLUSTERS / SERVICES / DEPLOYMENTS / ALERTS / LOGS] ── [Env: PROD]

STAT ROW (5 compact cards):
  ├── CPU Usage: 68%
  ├── Memory: 74%
  ├── Disk: 41%
  ├── Network In: 2.4 GB/s
  └── Error Rate: 0.04%

SPLIT (1/3 + 1/3 + 1/3):
  LEFT: CPU Heatmap by node (grid of colored dots)
  CENTER: Service health — list of services + status bars
  RIGHT: Active alerts — glass feed, ordered by severity

FULL WIDTH:
  MONO: DEPLOYMENT HISTORY ▸
  Glass table: Service | Version | Status | Replicas | CPU Avg | Mem Avg | Deploy Time | Actions
```

**Signature move**: the node heatmap — a grid of small colored squares using teal (healthy) → amber (warn) → red (critical) — a visual fingerprint of the entire infrastructure in one compact panel.

---

## Glass panel rules

```css
/* Standard glass dashboard card */
.glass-panel {
  background: var(--glass-surface);
  backdrop-filter: var(--glass-blur-md);
  -webkit-backdrop-filter: var(--glass-blur-md);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-xl);
  padding: var(--space-5);
  position: relative;
  overflow: hidden;
}

.glass-panel::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: var(--glass-highlight);
  pointer-events: none;
}

/* Elevated / hero panel */
.glass-panel-hero {
  background: var(--glass-elevated);
  backdrop-filter: var(--glass-blur-lg);
  box-shadow: var(--shadow-glow);
}

/* Gradient stat number */
.stat-number-gradient {
  background: var(--accent-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-size: var(--text-4xl);
  font-weight: var(--weight-bold);
  font-variant-numeric: tabular-nums;
  line-height: 1;
}
```
