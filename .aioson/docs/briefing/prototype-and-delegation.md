---
description: Briefing Refiner prototype route, reference identity extraction, and explicit-model delegation
agents: [briefing-refiner]
task_types: [briefing-prototype, visual-refinement, explicit-model-delegation]
triggers: [prototype requested, rich-surface prototype accepted, user names another model]
---

# Briefing Prototype and Delegation

Load for every visible or interaction-bearing feature, or when the user explicitly names another model for a bounded supporting task. A genuinely non-visual feature may record `prototype: not_applicable` with evidence instead.

This module owns only the canonical, feature-owned prototype after a Briefing exists. For screenshot-led experiments, redesign options, or model arenas without a refinable Briefing, load `visual-exploration.md`; never write those candidates into `.aioson/briefings/` or reuse them directly as the approved prototype.

## Explicit model delegation

This route is user-requested only. Load `.aioson/docs/model-delegation.md` and follow it exactly.

1. Keep ownership of scope, Operational Surface Map, completeness, prototype integration, and final readiness.
2. Write `.aioson/briefings/{slug}/delegation-task.md` with one exact question, expected evidence, allowed capabilities, and exclusions. Do not include secrets or hidden reasoning.
3. Plan:

```bash
aioson delegation:plan . --explicit-model-request --host=<current-host> --provider=<requested-provider-or-current-host> --model="<requested-model>" --kind=<kind> --task-file=.aioson/briefings/{slug}/delegation-task.md --research-slug=<research-slug> --json
```

4. For native mode, dispatch exactly one host subagent with `worker_prompt` and explicitly bind `native_dispatch.model`. If binding cannot be proved, use `aioson delegation:run` with the same flags. Use returned external mode for cross-provider work; never silently inherit another model.
5. Validate returned evidence, persist it through the parent-owned `persistence.path`, record material provenance, and resume normal gates. Unavailable delegation is a disclosed limitation, never a fabricated result.

## Prototype trigger and inputs

Prototype mode is required for workspaces, boards/cards, pipelines, CRM/Kanban, dashboards, admin/management, repeated CRUD, builders/editors, and other visible or interaction-heavy surfaces. Approval blocks until the active-feature prototype exists and its owned manifest can be frozen as `status: approved`; only a genuinely non-visual feature may use an explicit `not_applicable` decision.

Read the briefing and its operational surface from `solution-options.md` or `expansion-scout.md`, falling back to `.aioson/docs/feature-expansion-taxonomy.md`.

## Visual route

Resolve `design_skill` from project context:

- For `interface-design` with specific reference images, ask for identity references in `.aioson/briefings/{slug}/references/identity/` and structural/component references in `.aioson/briefings/{slug}/references/structure/`.
- When the user points at a reference/inspiration **site URL** (effects, motion, layout), do not read it through harness web tools — they strip CSS/JS. Run `aioson web:save . --url=<url> --slug=<ref-slug>` then `aioson web:extract . --slug=<ref-slug>`, and use `researchs/<ref-slug>/extract.md` (fonts, palette, keyframes, transitions, libraries) as the identity/effects evidence; pull targeted snippets with `--query=<text>` instead of bulk-reading saved HTML/CSS/JS. Saved originals are local reference only and are never shipped in the prototype.
- Load `.aioson/skills/process/reference-identity-extract/SKILL.md`, extract once to `.aioson/briefings/{slug}/identity.md`, then run:

```bash
aioson verify:artifact . --kind=identity --file=.aioson/briefings/{slug}/identity.md --advisory 2>/dev/null || true
```

`identity.md` parameterizes the one chosen design engine; its `## Component structure notes` inform the operational surface. Without images, let `interface-design` operate intent-first.

- If `design_skill` names an installed preset, use only that preset.
- If it is blank, default to `interface-design` in intent-first origination mode without asking. Commit to one aesthetic register and one product-specific signature move, then originate a new layout with premium tokenized craft — palette, typography, depth, and purposeful motion honoring `prefers-reduced-motion` — at the same ambition regardless of which model executes the run. This default is declared, never silent: record `design_skill: interface-design (default)` in `prototype-manifest.md` and add one non-blocking structured finding recommending the project register a definitive `design_skill`. Reference images stay optional; when the user provides them, the identity route above still applies.

If the user named another model for reference research or critique, finish explicit delegation first. Otherwise do not delegate merely because it might help.

## Build

1. Load `.aioson/skills/process/prototype-forge/SKILL.md`.
2. Follow its complete build contract, non-regression order, completeness-first gate, and bounded premium quality pass.
3. Write:

```text
.aioson/briefings/{slug}/prototype.html
.aioson/briefings/{slug}/prototype-manifest.md
```

The manifest declares `feature: {slug}`, `status: draft`, and the `identity:` record the build consumed (or `none`) during refinement. That identity line is what carries the extracted visual system past briefing approval into the PRD and implementation; omitting it silently strands the record here. Never reuse another briefing's manifest/prototype. The user-controlled `aioson briefing:approve` command changes it to `status: approved`; only then may Product and downstream agents treat it as binding.
4. Verify owner/path directly because no PRD exists. Product later runs `aioson prototype:check . --feature={slug} --strict`. Measure the built prototype here — the earliest point where craft is provable, before any PRD binds it:

```bash
aioson verify:artifact . --kind=visual --slug={slug} --advisory --runtime 2>/dev/null || true
```

Repair the blocking findings (decorative blob, animation with no `prefers-reduced-motion`, cards three deep) in the prototype itself. Threshold warnings — token adherence, off-grid spacing, depth strategies, font count, missing states — become structured findings only when this surface cannot justify them.

`--runtime` is always attempted, never assumed: with Playwright present it measures what only a browser sees (horizontal overflow at 360px, clipped text, off-screen elements, tap targets, computed contrast); absent, the report says so and the gate stays static-only. Either way, record the outcome in the manifest's Quality evidence — "runtime measured, N findings repaired" or the report's own not-available reason. A silent skip is the one forbidden state.
5. Give the exact paths and state that the prototype models the final visual/interaction contract but does not prove backend integration: mock-only behavior is design evidence, never implementation proof, and refresh may reset mock state. Status remains draft until the user approves the briefing, then Product must preserve or explicitly document deviations from the approved binding.

Prototype work never edits `briefings.md`, never becomes canonical feedback, and never trades away a Core screen/action/state for visual polish.
