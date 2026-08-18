---
description: Enforceable structure, behavior, state, and CSP contract for Prototype Forge
agents: [briefing-refiner]
task_types: [app-prototype-build]
triggers: [prototype forge execution, operational surface map approved]
enforcement: no-native-dialogs
---

# Prototype Forge Build Contract

## Artifact

Produce one `prototype.html` under 2,000,000 bytes with inline CSS, JS, SVG, and optional data/blob images. Use hash routing. No network request, external script/style/service, iframe, module import, or CDN. It must work in the Play viewer's CSP and directly in a browser.

**Typeface delivery is the one sanctioned external resource.** A surface whose typography never leaves the OS default stacks renders as a default document on every machine — the most visible "cheap" tell there is, and the telemetry measures it. Deliver one real typeface either way:

- a stylesheet `<link>` to a dedicated font host only (`fonts.googleapis.com`/`fonts.gstatic.com`, `fonts.bunny.net`, `api.fontshare.com`) — never a general CDN; or
- an embedded `@font-face` with a data-URI WOFF2 inside the byte budget.

Font delivery is progressive enhancement by contract: declare a deliberate fallback stack that preserves hierarchy and scale, so the file still reads offline and under a CSP that blocks the host. Naming a family without any delivery mechanism is worse than naming none — the chosen face silently never reaches the owner.

In `canonical-briefing`, the artifact belongs to `.aioson/briefings/{slug}/`. In `visual-exploration`, it belongs only to the parent-assigned `.aioson/explorations/{slug}/runs/{variant}/`; never read a sibling variant under isolated policy.

## State and navigation

- Seed realistic data for every Core object, enough to show populated and empty states.
- Every Core object has reachable list/index, detail, and management surface.
- Authenticated products include functional account/user navigation and implied persistent chrome.
- Assign stable `data-aioson-id` anchors to meaningful regions and Core actions.
- Mark the one region rendering the briefing's #1 differentiator with `data-aioson-primary`. It must start inside the first viewport of its screen at desktop and mobile — the runtime fold check anchors on this marker, and a differentiator below the fold is a feature the owner never sees.

## First-open explainer

The prototype exists so the owner can validate how the app works; an owner who has to ask "how would I use this?" means the prototype failed its one job. Overlay the first open with a 3–5 step tour in lay language — each step translated from a briefing promise (`PROM-*`), anchored to a `data-aioson-tour` region with a visible highlight — dismissible, and reopenable through a persistent `?` control. The tour is part of the artifact, not polish.

## Behavior

Create, edit, delete, archive, and restore mutate in-memory state and re-render. Use design-system modals, drawers, inline forms, and toasts. Never use native `alert`, `confirm`, or `prompt`; dead controls are failures.

Render and make toggleable: loading, empty, error, populated, and permission-denied. An explicit approved defer may replace an operation, but silence may not.

## Interaction patterns

Before building forms or transitions, read matching `.aioson/rules/` and project docs; they are binding over these defaults.

- Structured form fields (documents, phones, postal codes, dates, currency) carry working masks, correct input semantics, and inline layered validation with specific error copy in the project locale. Static unmasked inputs in a form surface are blocking.
- Controls that change status, delete, archive, or apply a hard-to-reverse edit confirm through a design-system modal naming the action, object, and consequence.
- A recurrent bidirectional status flow (kanban, pipeline, ordered queue) moves primarily by working drag-and-drop over mock state — drag states, drop targets, optimistic move with undo — plus an accessible menu/keyboard fallback. Destructive drop targets still confirm.
- A management product (CRM, ERP, cockpit, admin) opens on a home with 3–6 decision-driving widgets fed by the seeded data: KPIs with unit and trend, attention indicators, each drilling into the filtered records.

## Visual engine

Load the selected design skill before layout. Use semantic, product-specific tokens and realistic interface copy. Honor reduced motion, responsiveness, contrast, and the skill's stability rules. Avoid generic AI-dashboard gradients, repeated card grids, excessive pills/glows, and nested containers unless the selected identity calls for them.

Anti-slop is the subtractive half; the craft floor is the additive half, and hygiene alone does not clear it. `kind=visual` measures five ambition levers — a delivered typeface, display-scale type (56px+ where the surface argues in the first viewport), one earned material atmosphere (`.aioson/docs/design/visual-effects.md` owns the vocabulary and cost contracts), motion choreography, and evidence imagery. Each lever is optional; shipping with the aggregate floor warning unaddressed is not. For surfaces that argue by inspection and have no real asset yet, host image generation (when available) is the sanctioned plan B — provenance labeled `generated`, never presented as the client's real work.

`identity.md`, when selected, supplies the engine's tokens and augments component regions/anatomy/states; it does not create a parallel visual system.

## Blocking gaps

A Core object without a reachable management surface, an action that does not mutate state, a missing required state, dead authenticated chrome, or a prohibited external dependency is blocking—not backlog polish.
