---
name: prototype-forge
description: Self-contained prototype process for canonical Briefing surfaces or non-canonical visual explorations
---

# Prototype Forge

Generate a clickable, self-contained prototype in exactly one mode. `canonical-briefing` validates a confirmed operational surface map for a refinable Briefing. `visual-exploration` tests a visual direction, screenshot reference, redesign, or model variant without making it canonical. Skip tiny non-visual work.

## Ownership

Prototype Forge owns screens, navigation, mock state, CRUD, and state coverage. The selected `design_skill` owns tokens, composition, component anatomy, and motion. Never invent a second visual system.

Apply quality in order: operational completeness → working behavior/states → product-specific visual craft → one surgical polish pass.

## Inputs

For `canonical-briefing`:

1. Chosen surface map in `.aioson/briefings/{slug}/solution-options.md` or `expansion-scout.md`; fallback to the feature-expansion taxonomy. If none exists, build the map first.
2. `.aioson/briefings/{slug}/briefings.md`.
3. `design_skill` from project context, including its final quality reference.
4. For `interface-design`, resolve briefing `identity.md`, then project `identity.md`.

For `visual-exploration`:

1. Frozen `.aioson/explorations/{slug}/inputs/task.md`, `inputs/source-map.md`, and confirmed `intake.json`.
2. Only the run directory assigned by the parent; isolated runs must not inspect sibling reports or prototypes.
3. Resolve exploration `identity.md`, then project `identity.md`, then none.

An identity file **overlays the one engine** and is not a **second visual system**: apply Palette, Typography, Spacing & layout, Radius & depth, Motion, and `## Component structure notes`.

## Execution

Load `references/build-contract.md`, implement the complete functional prototype, then load `references/quality-and-manifest.md` for the one bounded polish pass and handoff evidence. Do not load the quality reference before functional completeness.

The prototype is a development reference, not production proof. A canonical lock stays draft until the workflow freezes it. An exploration stays non-canonical even after selection.

## Outputs

In `canonical-briefing`, write only:

- `.aioson/briefings/{slug}/prototype.html`
- `.aioson/briefings/{slug}/prototype-manifest.md`

The manifest begins:

```yaml
---
feature: {slug}
status: draft
---
```

Feature ownership must match the directory. A later lock may change `status`, never `feature`.

In `visual-exploration`, write only the assigned immutable run's `prototype.html` and `report.md`. The report must preserve `<!-- aioson:reusable-prompts -->`, the exact generation prompt, a reusable one-shot prompt, an incremental prompt sequence, validation evidence, and limitations. Never create a briefing manifest from an exploration run.

## Gate

Do not hand off until every Core object is reachable/manageable, every Core action mutates mock state, empty/error/permission states are demonstrable, authenticated chrome works when applicable, no native browser dialog or external dependency remains, the file is CSP-compatible and under 2,000,000 bytes, and visual evidence is honest.
