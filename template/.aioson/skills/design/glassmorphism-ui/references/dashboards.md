# Dashboards — Glassmorphism UI

Dashboard compositions and presets. All dashboards use the App Shell from `patterns.md`.

---

## General Rules for All Dashboards

1. **Background always gradient** — never solid. The gradient is what makes glass visible.
2. **Stat numbers**: sans-serif bold, optionally with gradient text (`var(--accent-gradient)` with `-webkit-background-clip: text`).
3. **Charts**: accent violet as primary, semi-transparent gradient fills, rgba grid lines.
4. **Cards**: glass with visible blur — the user must perceive the glass. Not solid cards with a blur filter.
5. **Card hover**: `glass-bg` → `glass-bg-hover` + `shadow-sm` → `shadow-md`, 200ms.
6. **One hero element** per dashboard: one card or number that is significantly larger/more prominent — the "anchor" the user reads first.

---

## Chart Color Palette

```css
--chart-1: var(--accent);              /* #7C3AED violet */
--chart-2: var(--accent-secondary);   /* #3B82F6 blue */
--chart-3: #10B981;                   /* emerald */
--chart-4: #F59E0B;                   /* amber */
--chart-5: #EC4899;                   /* pink */
--chart-6: #6366F1;                   /* indigo */

/* Gradient area fills (for area/line charts) */
--chart-fill-1: linear-gradient(180deg, rgba(124, 58, 237, 0.25) 0%, rgba(124, 58, 237, 0) 100%);
--chart-fill-2: linear-gradient(180deg, rgba(59, 130, 246, 0.25) 0%, rgba(59, 130, 246, 0) 100%);
--chart-fill-3: linear-gradient(180deg, rgba(16, 185, 129, 0.25) 0%, rgba(16, 185, 129, 0) 100%);
--chart-fill-4: linear-gradient(180deg, rgba(245, 158, 11, 0.25) 0%, rgba(245, 158, 11, 0) 100%);
```

### Chart rules
- **Area charts**: always gradient fill (top color → transparent), never solid fill. Makes chart feel part of the glass environment.
- **Bar charts**: gradient fill (vertical, accent → accent-strong), top radius 4px.
- **Donut charts**: accent palette, center area transparent (glass shows through).
- **Line charts**: accent color line (2px), gradient fill below the line.
- **Grid lines**: `rgba(255, 255, 255, 0.10)` on dark, `rgba(0, 0, 0, 0.06)` on light.
- **Tooltips**: glass card (blur, transparent bg, luminous border) — never solid white box.
- **Axis labels**: `var(--text-muted)`, `text-xs`.

---

## 1. Fintech Dashboard

**Expression mode**: Crystal Dashboard
**Feel**: premium, trustworthy, sophisticated

Layout:
```
Header: "My Portfolio" + date range + refresh icon
Row 1: 4 stat glass cards (full-width)
  ├─ Total Value: large gradient text number + portfolio growth %
  ├─ Today's P&L: number + green/red trend
  ├─ Annual Return: % + sparkline (mini area chart)
  └─ Cash Balance: number + "available to invest"

Row 2 (2 columns):
  Left (60%): Performance chart — area chart with gradient fill
    Time range tabs: 1D / 1W / 1M / 3M / 1Y / All
    X-axis: dates, Y-axis: portfolio value
    Gradient fill: accent-fill-1 (violet → transparent)
  Right (40%): Asset Allocation — donut chart glass card
    Donut center: "Total" label + value
    Legend: assets with colored indicators + %

Row 3: Holdings glass table card
  Columns: Asset / Allocation / Price / 24h Change / Value / P&L
  Rows: 48px, ticker bold + full name text-muted, change colored green/red
  Search input above table (glass input)
```

Signature: portfolio value number in gradient text (violet → blue), repeated in the donut center and in the hero stat card.

---

## 2. Crypto Dashboard

**Expression mode**: Crystal Dashboard
**Feel**: modern, fast-moving, high-information-density

Layout:
```
Header: "Crypto Portfolio" + total value (hero: text-4xl gradient) + 24h change badge

Row 1: 4 compact glass stat cards
  ├─ BTC Price + 24h change sparkline
  ├─ ETH Price + change
  ├─ Portfolio BTC value
  └─ Unrealized P&L (green or red gradient text)

Row 2 (main chart): Price chart glass card (full width)
  Pair selector: BTC/USD ETH/USD SOL/USD (glass chips)
  Time: 1H 4H 1D 1W (glass chip tabs)
  Chart: area with gradient fill, price overlay label on hover
  Volume bars: at bottom of chart area, rgba fill

Row 3 (2 columns):
  Left (60%): Watchlist — glass cards in a list
    Each: coin icon + name + price + 24h sparkline + change %
    Sorted by: 24h performance (glass sort chips)
  Right (40%): Order Book glass card
    Bids: green, rgba green bg on rows
    Asks: red, rgba red bg on rows
    Spread: centered label between sections

Row 4: Recent Transactions — glass table
  Columns: Asset / Type (buy/sell badge) / Amount / Price / Date / Status
```

Signature: live-feeling price numbers with slight pulsing opacity animation on change, bid/ask rows with semantic glass tints.

---

## 3. Analytics Dashboard

**Expression mode**: Crystal Dashboard
**Feel**: efficient, data-rich, clear

Layout:
```
Header: "Analytics" + date range picker (glass input with calendar icon) + comparison toggle

Metric strip (glass bar, full width): 4-5 metrics inline
  Sessions | Pageviews | Bounce Rate | Avg Duration | Conversions
  Dividers: 1px glass-border between metrics
  Each: label text-xs text-muted + value text-2xl weight-bold + trend arrow

Primary trend chart (full width glass card):
  Line chart: sessions over time, comparison line dashed
  Gradient fill below primary line
  Legend: glass chips for each series

Row (2 columns):
  Left (55%): Traffic Sources — horizontal bar chart glass card
    Sources: Organic / Direct / Referral / Social / Email
    Bar: gradient fill, label + % at end
  Right (45%): Top Pages — glass table
    Columns: Page / Views / Bounce / Duration
    Rows compact 40px

Row: Geographic distribution — world map with glass overlay points
  OR: Country table glass card with flag + country + sessions + %

Row: Device breakdown — 3 mini glass cards (Desktop / Mobile / Tablet)
  Each: device icon + % + bar progress
```

Signature: metric strip as a standalone glass bar (not individual cards) — unusual, memorable, efficient.

---

## 4. Media Dashboard

**Expression mode**: Media Player
**Feel**: immersive, atmospheric, alive

Special rule: **the background adapts to the dominant color of the current track/album**. Extract primary color → generate gradient → smooth transition on track change.

Layout:
```
Background: extracted album art color → aurora gradient (dynamic)
  Transition: 800ms when track changes

Hero (top section): Now Playing glass card (centered, large)
  Album art: rounded (radius-2xl), 160px, with reflection effect below
  Track title: text-2xl weight-bold text-heading
  Artist: text-base text-secondary
  Progress bar (glass strip): current time / total time
  Controls: ← prev | play/pause (large glass button, accent gradient) | next →
  Volume: glass knob or slider

Row 2 (3 columns):
  Left (25%): glass stat cards (small)
    ├─ Listening streak (days)
    ├─ Minutes today
    └─ Tracks played
  Center (50%): Main listening chart — area chart (weekly listening hours)
    Gradient fill matching current album color (not fixed violet)
  Right (25%): Recently Played — glass list
    Each: thumbnail + track + artist + duration

Row 3 (2 columns):
  Left: Top Artists — glass cards grid (3x2)
    Each: avatar (rounded) + name + genre badge
  Right: Queue / Playlist — glass list
    Each: # + thumbnail + title + artist + duration + remove icon (hover)
```

Signature: the entire dashboard color scheme shifts to match the current track — headline feature, not decoration.

---

## 5. Wellness Dashboard

**Expression mode**: Zen Workspace (or Crystal if the product is data-rich)
**Feel**: calm, focused, encouraging, clear

Layout:
```
Header: "Good morning, [Name]" + date + last sync timestamp

Hero (prominent glass card, radius-2xl):
  Daily Wellness Score: circular progress (SVG or canvas)
  Center: score number text-4xl weight-bold + label text-sm text-secondary
  Ring: gradient stroke (green → accent), animated on load
  Context: "Better than yesterday" or "Getting there" — positive framing only

Row 1: 4 mini glass stat cards
  Sleep: hours + sleep quality badge + moon icon
  Steps: number + goal progress bar + footprint icon
  Heart Rate: bpm + status badge (resting/elevated) + heart icon
  Hydration: glasses + goal % + drop icon

Row 2 (2 columns):
  Left (60%): Activity Chart — 7-day area chart
    Two series: steps + activity minutes (different gradient fills)
    X-axis: days of week
    Highlight: today's bar/point with accent glow
  Right (40%): Sleep Analysis — bar chart
    Bars: sleep duration per night, 7 nights
    Color: semantic green for ≥7h, amber for 6-7h, red for <6h
    Reference line: 8h goal, dashed

Row 3 (2 columns):
  Left: Weekly Comparison — glass table
    Metric / This week / Last week / Change
    Change: semantic green/red with arrow
  Right: Mood Tracker — glass card with emoji indicators
    7 days × mood rating (1-5)
    Emoji circles with glass bg, selected state accent tinted
```

Signature: circular progress score as the hero — large, centered, with animated ring. Reinforced by all metric cards using subtle circular mini-progress indicators.
