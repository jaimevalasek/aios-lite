# Premium Command Center UI

> Use this skill when the product is a dashboard, admin panel, control tower, command center, or internal operating surface that must feel premium without becoming bloated.
> This skill was extracted from the real AIOS Dashboard implementation: tri-rail shell, aurora-glass surfaces, compact density, search-first navigation, grouped operational cards, and data-aware page hierarchy.

---

## What this skill captures

This is not a generic "modern dashboard" guide. It captures the concrete moves that created the premium feel in the AIOS Dashboard:

- tri-rail shell: left navigation, center workspace, right activity rail
- aurora-glass visual system with strong contrast and restrained semantic color
- compact density tuned for operational reading, not marketing whitespace
- search-first interaction via top search bar + command palette
- contextual right rail with status/history/metrics tabs
- page archetypes built around runtime priority, not equal-weight card walls
- UI view-model aggregation (`workflow lanes`, `task queue`, `memory assets`) instead of rendering raw backend shapes directly

---

## When to use this skill

Apply this skill when:

- the product is an operational dashboard or internal tool
- the user asks for a premium, high-contrast, high-trust interface
- the current UI feels washed out, generic, or too expanded
- the app has multiple modules that need one shared shell and consistent hierarchy
- the interface must surface live signals, queue state, history, and deep links
- the stack supports custom UI work (React, Next.js, TALL, Blade, Vue, custom HTML/CSS, etc.)

---

## When not to use this skill

Do not apply this skill blindly when:

- the project is a landing page or campaign site
- the product is intentionally minimal, calm, editorial, or consumer-soft
- the existing brand system is already strong and conflicts with aurora-glass language
- the screen is simple CRUD that should remain utilitarian and low-chrome
- the domain demands conventional enterprise neutrality over expressiveness

In those cases, borrow only the pieces that fit: density control, hierarchy discipline, grouped operational cards, or contextual rails.

---

## Read order

1. Read this file fully.
2. Read [visual-system-and-component-patterns](../references/premium-command-center-ui/visual-system-and-component-patterns.md) before choosing tokens or components.
3. Read [operational-ux-playbook](../references/premium-command-center-ui/operational-ux-playbook.md) before defining page hierarchy, navigation, or grouping.
4. If another agent will apply the system, give it [master-application-prompt](../references/premium-command-center-ui/master-application-prompt.md).
5. Before shipping, run [quality-validation-checklist](../references/premium-command-center-ui/quality-validation-checklist.md).

---

## Application flow

### 1. Inspect the product before drawing anything

Identify the real operational nouns and verbs first:

- What is the live signal?
- What is the queue?
- What is the grouped catalog?
- What deserves persistent navigation?
- What belongs in context, not in the primary column?

Do not start from components. Start from operational pressure.

### 2. Translate raw data into UI-native objects

The AIOS Dashboard improved dramatically when raw backend records were converted into UI view models such as:

- `GlobalTaskRecord`
- `WorkflowRecord`
- `MemoryAssetRecord`

Follow the same principle in new projects. Do not render tables straight from storage shape when the user actually needs lanes, signals, grouped cards, or contextual summaries.

### 3. Choose the shell intentionally

Use the tri-rail shell when the product has:

- 5+ first-class modules
- live or near-live context
- a need for persistent navigation + persistent context
- enough desktop usage to justify a right rail

Collapse progressively below the desktop breakpoint instead of building a separate mobile design system.

### 4. Choose the page archetype

Reuse the patterns that actually shipped in the dashboard:

- command center overview
- queue / control tower
- workflow catalog
- grouped registry
- knowledge explorer

Use the UX playbook to decide which archetype fits each route.

### 5. Apply the visual language without diluting it

Preserve these moves together:

- dark graphite or cool mist foundation
- aurora background fields on the page and shell, not everywhere
- borders-first depth with one shadow family only
- 3 surface levels max
- compact spacing and short helper copy
- semantic badges and gradient fills tied to meaning, not decoration

### 6. Build direct next actions into the UI

Every major card should expose the next useful step:

- open the squad
- inspect the task
- view logs
- switch workspace
- drill into workflow or memory source

Premium feel comes from reduced friction, not only from color.

---

## How to adapt this skill to new projects

Adapt the system structurally, not literally.

- Replace `squads` with the domain grouping that matters in the new product.
- Replace `tasks` with the domain queue or active work item.
- Replace `memories` with the project’s knowledge layer, asset layer, or context layer.
- Replace `activity rail` content with the three slices that matter most: current state, history, metrics.
- Keep the same visual grammar and density discipline even when labels and data change.

If the new project already has a design system:

- port the hierarchy rules first
- port the page archetypes second
- port the shell behaviors third
- port colors only if they do not violate brand or accessibility

---

## How to preserve the same level of visual quality

The quality bar is preserved when all of the following remain true:

- runtime or primary operations appear above infrastructure or metadata
- every screen has one obvious focal block
- cards are grouped by operational meaning, not just by data type
- the shell behaves like a product operating surface
- semantic colors are limited and consistent
- empty states are styled and intentional
- search, navigation, and context work together instead of competing
- density is compact but never cramped

If the result looks like a generic dark dashboard with random gradients, the skill was not applied correctly.

---

## Non-negotiable quality bar

- No flat, washed-out backgrounds.
- No equal-emphasis card grids for every section.
- No giant padding values that make the product feel empty.
- No rainbow status colors without semantic meaning.
- No shadow-heavy cards mixed with border-heavy cards.
- No hidden next step after a user reads a card.
- No infrastructure-first hierarchy.
- No top-level page without a clear route back to the operating workflow.

---

## Expected output when using this skill

When you apply this skill to a new product, deliver:

1. explicit visual direction and density choice
2. shell structure and route hierarchy
3. page archetype selection per major screen
4. reusable component set
5. state handling (default / hover / active / empty / loading / error)
6. responsive behavior notes
7. validation against the checklist before handoff
