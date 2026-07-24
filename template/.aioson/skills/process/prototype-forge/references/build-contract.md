---
description: Enforceable structure, behavior, state, and CSP contract for Prototype Forge
agents: [briefing-refiner]
task_types: [app-prototype-build]
triggers: [prototype forge execution, operational surface map approved]
---

# Prototype Forge Build Contract

## Artifact

Produce one `prototype.html` under 2,000,000 bytes with inline CSS, JS, SVG, and optional data/blob images. Use hash routing. No network request, external script/style/font/service, iframe, module import, or CDN. It must work in the Play viewer's CSP and directly in a browser.

## State and navigation

- Seed realistic data for every Core object, enough to show populated and empty states.
- Every Core object has reachable list/index, detail, and management surface.
- Authenticated products include functional account/user navigation and implied persistent chrome.
- Assign stable `data-aioson-id` anchors to meaningful regions and Core actions.

## Behavior

Create, edit, delete, archive, and restore mutate in-memory state and re-render. Use design-system modals, drawers, inline forms, and toasts. Never use native `alert`, `confirm`, or `prompt`; dead controls are failures.

Render and make toggleable: loading, empty, error, populated, and permission-denied. An explicit approved defer may replace an operation, but silence may not.

## Visual engine

Load the selected design skill before layout. Use semantic, product-specific tokens and realistic interface copy. Honor reduced motion, responsiveness, contrast, and the skill's stability rules. Avoid generic AI-dashboard gradients, repeated card grids, excessive pills/glows, and nested containers unless the selected identity calls for them.

`identity.md`, when selected, supplies the engine's tokens and augments component regions/anatomy/states; it does not create a parallel visual system.

## Blocking gaps

A Core object without a reachable management surface, an action that does not mutate state, a missing required state, dead authenticated chrome, or a prohibited external dependency is blocking—not backlog polish.
