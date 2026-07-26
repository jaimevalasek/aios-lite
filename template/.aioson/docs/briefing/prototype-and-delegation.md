---
description: Briefing Refiner prototype route, reference identity extraction, and explicit-model delegation
agents: [briefing-refiner]
task_types: [briefing-prototype, visual-refinement, explicit-model-delegation]
triggers: [prototype requested, rich-surface prototype accepted, user names another model]
---

# Briefing Prototype and Delegation

Load for every visible or interaction-bearing feature, or when the user explicitly names another model for a bounded supporting task. A genuinely non-visual feature may record `prototype: not_applicable` with evidence instead.

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
- Load `.aioson/skills/process/reference-identity-extract/SKILL.md`, extract once to `.aioson/briefings/{slug}/identity.md`, then run:

```bash
aioson verify:artifact . --kind=identity --file=.aioson/briefings/{slug}/identity.md --advisory 2>/dev/null || true
```

`identity.md` parameterizes the one chosen design engine; its `## Component structure notes` inform the operational surface. Without images, let `interface-design` operate intent-first.

- If `design_skill` names an installed preset, use only that preset.
- If it is blank for a site/web app and the user declines references, ask which installed skill to use; do not auto-pick.

If the user named another model for reference research or critique, finish explicit delegation first. Otherwise do not delegate merely because it might help.

## Build

1. Load `.aioson/skills/process/prototype-forge/SKILL.md`.
2. Follow its complete build contract, non-regression order, completeness-first gate, and bounded premium quality pass.
3. Write:

```text
.aioson/briefings/{slug}/prototype.html
.aioson/briefings/{slug}/prototype-manifest.md
```

The manifest declares `feature: {slug}` and `status: draft` during refinement. Never reuse another briefing's manifest/prototype. The user-controlled `aioson briefing:approve` command changes it to `status: approved`; only then may Product and downstream agents treat it as binding.
4. Verify owner/path directly because no PRD exists. Product later runs `aioson prototype:check . --feature={slug} --strict`.
5. Give the exact paths and state that the prototype models the final visual/interaction contract but does not prove backend integration: mock-only behavior is design evidence, never implementation proof, and refresh may reset mock state. Status remains draft until the user approves the briefing, then Product must preserve or explicitly document deviations from the approved binding.

Prototype work never edits `briefings.md`, never becomes canonical feedback, and never trades away a Core screen/action/state for visual polish.
