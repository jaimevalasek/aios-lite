# Dashboards - Preset Compositions

Read after `references/foundations.md`, `references/components.md`, and `references/patterns.md`.

These presets help the agent choose a fitting operational composition instead of falling back to random card grids.

## Preset 1: Inventory Operations Board

The default preset for inventory, stock control, catalog operations, warehouse-lite systems, and supply dashboards.

**Best for:** stock control, inventory movement, replenishment monitoring, product operations.

**Default theme:** Dark.

**Layout composition:**

```text
TOP BAR: Logo + product name + compact status badge + account/actions
STATS ROW: 3-4 high-signal cards only
SUBNAV: Dashboard | Products | Movements (or equivalent)
MAIN GRID:
  LEFT RAIL (220-260px): monitoring blocks, quick filters, credential/mode card
  CENTER (primary): stock radar / urgent items / operational summary
  RIGHT RAIL (320-380px): recent movements / alerts / short activity feed
```

**Why it works:**
- One central operational story above the fold
- Urgent items are visible without a product-wall overload
- Movement history stays contextual, not dominant
- The left rail gives monitoring without stealing the main stage

**Rules:**
- Do not render a full product catalog above the fold.
- Show 2-4 urgent product/entity cards in the central radar block.
- Use color semantics sparingly: green = stable, amber = low, red = zero/critical.
- Prefer operational labels such as `Baixo estoque`, `Zerados`, `Saude do estoque`, `Movimentacao recente`.
- Keep the focal block as a clear, calm panel. Do not turn it into a second dashboard shell inside the dashboard.
- Treat operational tables as part of the visual system, not as raw browser defaults.
- Avoid `border-collapse: collapse` when the result creates harsh row blocks, broken hover fills, or cramped column rhythm.
- A data row should read as an intentional operational lane: aligned numbers, consistent vertical padding, clear action grouping, and enough breathing room around status chips.
- Hover and selected-row feedback must feel like surface state, not like a flat painted rectangle dropped behind text.
- When the target reference is a dense premium board, do not inflate the page into a hero-led composition.
- Keep the top area compact: title, support copy, stats, and tabs must sit on a tight vertical rhythm with minimal dead air.
- Reduce card radius, internal padding, and gaps before adding more decorative treatment.
- Typography must stay compact and operational: smaller labels, tighter headings, shorter line-height, and less visual breathing room than marketing or showcase layouts.
- The shell should feel unified and grid-bound, not like separate floating cards with oversized spacing between them.
- For dashboards inspired by compact command-center references, density is part of the visual identity, not a usability compromise.

## Preset 2: Premium Control Center

A niche command-center composition for AI systems, monitoring platforms, and premium operational software.

**Best for:** AI systems, orchestration panels, intelligence products, multi-module operational platforms.

**Default theme:** Dark.

**Layout composition:**

```text
TOP BAR: Logo + system subtitle + nav + status badge
STATS ROW: 4 stat cards
SECONDARY NAV: domain tabs
MAIN GRID:
  PRIMARY PANEL: a single large analysis/control surface
  SUPPORT PANEL: mode/status block
  LOWER PANELS: grouped operational cards or capabilities
```

**Guardrail:**
- Do not use this preset for inventory just because the product is dark and premium.
- Use it only when the product genuinely benefits from command-center semantics.
- DNA panels, mode panels, and labeled capability cards are optional, not default.

## Preset 3: Admin Analytics

Metrics-driven layout for performance tracking.

**Best for:** analytics, SaaS admin, revenue tracking, reporting dashboards.

**Default theme:** Dark or light.

**Layout composition:**

```text
TOP BAR
STATS ROW
FILTER / DATE BAR
MAIN:
  chart panel
  ranked list or summary panel
  table or report panel
```

**Guardrail:**
- Let charts and tables do the work.
- Do not overload the page with decorative status cards.

## Preset 4: Ops Cockpit

Real-time monitoring with alert-first hierarchy.

**Best for:** system monitoring, logistics control, incident response, infra operations.

**Default theme:** Dark.

**Layout composition:**

```text
TOP BAR
STATUS ROW
MAIN GRID:
  alert feed
  system status cluster
  quick stats / context rail
```

**Guardrail:**
- Alerts must be scannable first.
- Status color should carry meaning, not atmosphere.

## Preset 5: CRM / Contact Manager

List-detail composition for entity-centric products.

**Best for:** CRM, support tools, people directories, account management.

**Default theme:** Light or dark.

**Layout composition:**

```text
TOP BAR
TAB BAR
LIST-DETAIL SPLIT:
  entity list
  active profile/detail view
```

## Inventory mapping guide

For inventory requests, default to `Inventory Operations Board` unless the user explicitly asks for another direction.

| Inventory concept | UI treatment |
|---|---|
| low stock | urgent card in stock radar |
| zero stock | critical card in stock radar |
| recent entry/exit | right-rail activity list |
| valuation / total items | top stat row |
| category or supplier monitoring | left rail blocks or filters |
| replenishment threshold | progress bar + limit helper |

## Operational table guardrails

Inventory products and movement logs often end up in tables. This is where many otherwise-good dashboards lose quality.

### Goals
- keep rows scannable in under a second
- maintain the same premium density as the rest of the board
- avoid the feeling of spreadsheet leftovers pasted into a polished shell

### Rules
1. Use tabular numerals for quantities, prices, thresholds, and derived values.
2. Keep status, quantity, and actions visually separated; they should not collapse into one dense text block.
3. If the table is the main catalog surface, row height and column spacing matter as much as card spacing elsewhere.
4. Status chips must sit comfortably inside the row rhythm; if they crowd neighboring columns, widen the lane or reduce chip weight.
5. Action buttons in tables should read as a grouped control cluster, not as independent floating pills.
6. If the row highlight makes the row look like a cheap rectangular overlay, the implementation is wrong.

### Preferred implementation tendencies
- use `border-collapse: separate` plus controlled `border-spacing` when a more breathable premium row treatment is needed
- or keep `collapse`, but then style cells carefully enough that hover, focus, and separators still feel deliberate
- reserve dense compact rows for analytics/reporting contexts, not for the primary inventory catalog

### Failure signs
- serif fallback or typography mismatch inside the table only
- row hover painting a hard rectangle with no relation to the surrounding surface system
- status chips appearing squeezed between quantity and price
- actions looking detached from the row rhythm
- numbers misaligned enough that scanning stock levels feels slower than it should
- the page opens with a large hero-like block instead of a compact operational header
- cards feel puffy, rounded, and over-padded compared to the intended reference
- typography looks elegant in isolation but too large and airy for a dense board
- the layout reads like a polished demo instead of a serious operational surface

## Selection rules

1. Start from the product's main pressure, not from a visual trope.
2. Pick one dominant preset per screen.
3. Mix only small traits from another preset when the primary composition is already clear.
4. For inventory and stock systems, never default to `Premium Control Center` unless the user explicitly wants a command-center style.
