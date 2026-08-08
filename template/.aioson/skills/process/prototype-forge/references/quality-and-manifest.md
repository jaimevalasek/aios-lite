---
description: Bounded premium polish, inspection evidence, and manifest contract for Prototype Forge
agents: [briefing-refiner]
task_types: [prototype-quality, prototype-handoff]
triggers: [functional prototype complete, prototype manifest]
---

# Prototype Forge Quality and Manifest

Before UI coding, state internally one visual thesis, two or three anti-goals, and one product-specific signature move. After the functional build:

1. Re-read the existing HTML and perform exactly one surgical polish pass; do not regenerate the artifact for style.
2. Apply the design skill's swap, squint, signature, token, responsive, contrast, and interaction-state checks.
3. Inspect DOM/CSS. When browser/screenshot tools exist, inspect at least one mobile and one desktop viewport. In `visual-exploration`, an available browser is mandatory: run exactly one `render → screenshot/DOM critique → repair → final render` loop. If unavailable, disclose the limitation and never claim visual inspection.
4. Fix overflow, hierarchy, type rhythm, contrast, unsupported assets, dead controls, and generic composition without losing any Core screen/action/state.
5. Record only checks actually performed. Never claim screenshot evidence when none ran.

The manifest includes:

- one screen-inventory row per Core object, including management surface
- `## Core interactions`, one backticked interaction token per line so `aioson prototype:check` can trace it to acceptance criteria
- selected `design_skill`
- frontmatter `identity:` naming the exact record the prototype was built from — the feature-owned `.aioson/briefings/{slug}/identity.md`, the shared `.aioson/context/identity.md`, or `none` for an intent-first build. This is the provenance the PRD must carry forward; `aioson prototype:check` fails when the manifest names a record and the PRD drops it. Never name an exploration identity: it is non-canonical and cannot bind downstream.
- explicit “mock only — refresh resets, no backend”
- `draft` or `locked-at: {ref}`
- `## Visual direction`: thesis, anti-goals, signature move
- `## Quality evidence`: checks and limitations
- `## Delegation provenance` only when another model was explicitly used

Exploration mode writes no briefing manifest. Its append-only `report.md` carries the same visual direction and truthful evidence, plus `<!-- aioson:reusable-prompts -->`, the exact generation prompt, a reusable one-shot prompt, an incremental prompt sequence, and any next-run corrective prompt.

Final checks:

- Core inventory and interactions match the surface map.
- Empty and error states are visible.
- No native dialogs, dead avatar/menu, or external dependencies.
- Visual system is selected-skill-specific rather than generic.
- Polish preserved functional completeness.
- Any remaining management gap is reported as blocking.
