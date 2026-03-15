# Operational UX Playbook

> This reference documents the UX logic extracted from the AIOS Dashboard implementation.
> Use it when defining navigation, hierarchy, grouping, page composition, and interaction patterns.

---

## 1. Core UX principle

This system treats the product like an operating surface.

That means:

- the user should see current pressure first
- the next useful action should be one click away
- supporting history and metrics should stay available without taking over the page
- the UI should guide the user through live state, not just display records

---

## 2. Hierarchy rules extracted from the dashboard

### Rule 1: runtime before infrastructure

Operational signals must appear above:

- paths
- configuration
- administrative utilities
- long explanatory blocks

This was applied directly in the dashboard: runtime, agents, tasks, workflows, and memory lanes moved above lower-priority infrastructure.

### Rule 2: one dominant section per screen

Each premium route has one primary working area:

- overview: runtime pulse
- tasks: control tower
- workflows: execution topology + catalog
- memories: memory model + fresh assets

Everything else is secondary support.

### Rule 3: grouped meaning beats flat listing

Do not show long ungrouped lists when the records can be grouped by origin, momentum, layer, or domain.

Real examples from the implementation:

- agents split into official vs squad agents
- squad agents grouped by squad
- workflows represented as lanes per squad
- memories grouped into foundation / generated / capabilities

---

## 3. Navigation pattern

The navigation stack has three layers:

### Left rail

Permanent product modules and project switching.

Use it for:

- top-level routes
- project/workspace selector
- persistent product identity

### Top search bar

This is a search-first control strip.

Include:

- command palette entry point
- active route label
- active project chip
- system utility such as theme toggle or live status chip

### Right activity rail

Keep contextual panels visible on desktop.

The shipped pattern uses three tabs:

- `Status`
- `History`
- `Metrics`

This is important: the right rail should never be decorative. It must summarize the current route context and provide quick drill-downs.

---

## 4. Search-first interaction

The premium feel improved because navigation stopped depending only on the left rail.

Required behaviors:

- command palette open via `Ctrl/Cmd + K`
- close via `Esc`
- immediate focus on the search field
- searchable items drawn from real routes and project context
- result items should be clickable cards, not plain text rows

If a dashboard has many modules and no fast command surface, it will feel slower than it looks.

---

## 5. Page archetypes extracted from the implementation

### A. Command center overview

Use when the user needs a system pulse before drilling deeper.

Composition:

- metrics row
- runtime pulse block
- project snapshot
- momentum boards for workflows, queue, memory

### B. Queue / control tower

Use when a route is primarily about active work items.

Composition:

- metrics row
- left column: load mix + active queue
- right column: backlog / recent history
- bottom: grouped load map or concentration map

### C. Workflow catalog

Use when a route represents grouped execution lanes or modules.

Composition:

- metrics row
- left: capacity topology / featured lanes
- right: dense lane catalog

### D. Knowledge explorer

Use when surfacing memory, assets, documents, or learned context.

Composition:

- metrics row
- model explanation or layer summary
- recent asset stream
- grouped knowledge columns

### E. Grouped registry

Use when a route is still index-like but should not feel flat.

Composition:

- metrics row
- registry header
- segmented groups with direct actions inside each group

---

## 6. Data modeling for premium UX

A key implementation pattern was to build UI-specific records instead of binding components directly to raw data.

Reuse this pattern in new projects:

- create aggregated task records that already know their group, counts, and latest signal
- create workflow records that already know momentum and capability volume
- create memory or asset records that already know scope, kind, and source

This lets the UI stay concise and intentional.

---

## 7. Interaction patterns to preserve

### Project switcher

- collapsible panel in the left rail
- active project clearly highlighted
- switching should preserve current route when possible

### State tabs

- use compact segmented controls for status / history / metrics
- active state gets a premium fill, not just bold text

### Direct action cards

- every major card should offer the next drill-down
- do not force the user to navigate back to the left rail for everything

### Empty states

- use styled empty states with dashed border and an orientation sentence
- explain what will populate this area and where the user should go next

### Theme toggle

- small persistent utility
- should feel integrated, not like a floating widget

---

## 8. Responsive playbook

The responsive strategy is progressive collapse, not redesign.

- keep the same route structure on mobile/tablet
- hide the right rail below desktop
- stack split sections vertically
- let chips and actions wrap naturally
- keep titles, helper text, and action labels short enough to survive narrower widths

Avoid shipping a dense desktop layout with no collapse strategy.

---

## 9. Anti-patterns extracted from what was improved

Avoid these regressions:

- placing paths, IDs, and infrastructure blocks above runtime-critical information
- leaving all cards with the same visual weight and no focal block
- separating related items into different screens when grouped cards would work better
- over-expanding padding and gaps until the dashboard feels empty
- making the premium layer only visual, with no navigation or interaction upgrade
- using status colors as decoration rather than meaning
- rendering every route as the same metric-row-plus-card-grid template without adapting to the job of the page

---

## 10. What creates the premium feel in UX terms

The premium effect is the combination of:

- a productized shell
- faster route entry through search
- contextual side information always available
- clear operational hierarchy
- grouped drill-downs that match how the user thinks
- reduced friction between reading and acting

If the UI looks expensive but still feels slow to operate, the premium bar was missed.
