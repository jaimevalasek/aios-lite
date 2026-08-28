---
name: benchmark-execution-playbook
description: "Detailed benchmark run guidance the kernel routes to on demand: completeness checklists per product type, technology leverage, premium-craft criteria, interaction contracts, and minimum validation list."
agents: [benchmark]
task_types: [benchmarking, implementation, validation]
load_tier: trigger
triggers: [benchmark run, complete vertical, completeness checklist, technology leverage, premium craft, interaction contracts, benchmark validation, game loop, app workflow]
---

# Benchmark execution playbook

The `@benchmark` kernel routes here on demand. This module carries the detailed criteria; the kernel keeps the binding posture and gates.

## Completeness checklist per product type

**Game** — resolve entry, discoverable controls, core loop, feedback, progression, completion/failure, restart, relevant pause/audio, responsive input, and a satisfying first minute.

**App** — resolve orientation, the core workflow end to end, credible data, navigation, validation, useful persistence, feedback, and relevant loading, empty, error, retry, and success states.

Never pad the result with decorative dashboards, inert buttons, fake integrations, placeholder charts, or disconnected screens.

## Technology leverage

- Reuse the existing stack, package manager, components, and conventions when present. Do not replace a working foundation merely to express a preference.
- In an empty workspace, choose the lightest production-sensible JavaScript/web stack that can deliver the intended experience reliably in the available time.
- Use mature libraries when they create material value: rendering, game loops, physics, animation, audio, visualization, state, accessibility, or testing.
- Verify library APIs and compatibility instead of guessing. Respect the existing lockfile and avoid dependency multiplication for effects that native CSS, SVG, Canvas, or platform APIs handle better.
- On the static route there is no build step and no server: ship a plain `index.html`, ES modules, and CSS the browser loads directly, with the assets beside them. That constrains the tooling, never the ambition — Canvas/WebGL, WebAudio, and the Web Animations API all work with no toolchain at all.
- Prefer local or generated assets: use image/audio generation tools when available and useful, otherwise original CSS, SVG, Canvas, procedural, or properly licensed assets. Do not depend on fragile hotlinks.

## Premium-craft criteria

- Make the primary action and current state immediately legible.
- Use motion and microinteractions to explain causality and reward action; include reduced motion behavior.
- Make layouts responsive and interactions usable with the relevant keyboard, pointer, and touch inputs.
- Preserve accessibility: semantic structure, focus visibility, contrast, readable type, labels, and non-color-only feedback.
- Protect performance: avoid unbounded particles, layout thrashing, oversized assets, blocking work, and gratuitous animation.
- Give every visible control a real behavior. Remove anything that cannot be finished honestly.
- Do not force the app into one HTML file. Use the file and module structure appropriate to the selected stack.

## Interaction contracts

Honor these only where the product actually has that surface:

- masked validated forms where forms exist;
- modal-confirmed status/destructive actions where status objects exist;
- drag-and-drop for genuinely recurring status flows;
- a widget-led home only for a management product.

Never bolt a management surface onto a product (a game, a toy, a visualizer) that has none.

## Minimum validation list

- the documented start/build path works from the run root;
- the core loop or workflow can be completed;
- important controls and state transitions behave;
- responsive layout and keyboard/touch behavior appropriate to the product;
- console/runtime output has no known blocking error;
- result entrypoints exist and stay inside the run root.
- for any visible delivery, the normal served entrypoint has a passed visual runtime report across desktop/mobile and the primary + reachable state routes, with at least one final screenshot referenced in the result; layout-only or `UNVERIFIED` telemetry is not a completed visual result.
