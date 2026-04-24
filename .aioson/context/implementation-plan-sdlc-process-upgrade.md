---
feature: sdlc-process-upgrade
status: approved
created_by: pm
created_at: "2026-04-24T01:11:05-03:00"
classification: MEDIUM
gate: C
gate_status: approved
active_execution_artifact: ".aioson/plans/sdlc-process-upgrade/manifest.md"
---

# Implementation Plan — SDLC Process Upgrade

## Gate C Summary

Gate C: approved.

`@dev` may implement after `@orchestrator` prepares execution coordination. This is a MEDIUM feature, so `@dev` must not bypass this plan, the architecture, the conformance contract, or the active Sheldon manifest.

## Required Context Package

Load these before implementation planning:

1. `.aioson/context/project.context.md`
2. `.aioson/context/prd-sdlc-process-upgrade.md`
3. `.aioson/context/sheldon-enrichment-sdlc-process-upgrade.md`
4. `.aioson/context/requirements-sdlc-process-upgrade.md`
5. `.aioson/context/spec-sdlc-process-upgrade.md`
6. `.aioson/context/architecture.md`
7. `.aioson/context/conformance-sdlc-process-upgrade.yaml`
8. `.aioson/plans/sdlc-process-upgrade/manifest.md`
9. Current phase file from `.aioson/plans/sdlc-process-upgrade/plan-*.md`

Do not use `docs/pt/` as planning context until the implementation behavior exists and docs are ready to be updated.

## Pre-Taken Decisions

- Keep one workflow motor: `workflow:next` / `workflow:execute`.
- `@pm` owns initial `implementation-plan-{slug}.md` for MEDIUM.
- `gate:approve` must validate with `gate:check` before writing.
- Gate fields use flat frontmatter in the MVP: `gate_requirements`, `gate_design`, `gate_plan`, `gate_execution`.
- Active Sheldon manifest wins over implementation plan during execution while manifest is not `complete` or `done`.
- `docs/pt/` is system documentation only, not operational planning space.
- Root `plans/` is pre-production source only; only `plans/source-manifest.md` may be updated by agents.
- Prompt changes must be applied to `template/.aioson/agents/` and synchronized to `.aioson/agents/` when they are framework-distributed behavior.

## Execution Sequence

| Phase | Scope | Primary files | Done criteria |
|---|---|---|---|
| 1 | Canonical paths/source contract | `.aioson/rules/`, `.aioson/context/project-map.md`, relevant agent prompts/templates | Agents distinguish root `plans/`, `.aioson/plans/{slug}/`, `.aioson/context/implementation-plan-*`, and `docs/pt/`; tests cover wrong destinations. |
| 2 | Gate approval UX | `src/commands/gate-check.js`, new `src/commands/gate-approve.js`, `src/preflight-engine.js`, `src/cli.js`, i18n, SDD refs | `gate:approve` exists, blocks when `gate:check` blocks, writes flat gate fields, and help/docs explain usage. |
| 3 | State continuity/next step | `src/commands/preflight.js`, `src/preflight-engine.js`, `workflow-status/execute`, `pulse-update`, runtime/agent done | CLI outputs agree on `next_missing`, `next_agent`, stale dev-state relation, and recovery state. |
| 4 | Implementation plan ownership | `@pm` prompt/template, SDD `artifact-map.md`/`pm.md`, rules, `handoff-contract.js`, `artifact-validate.js`, `gate-check.js` | All sources agree that `@pm` produces initial MEDIUM implementation plan; Gate C points missing plan to `@pm`. |
| 5 | Handoff/preflight readiness | `src/preflight-engine.js`, `src/commands/preflight.js`, `src/commands/artifact-validate.js`, `@orchestrator` prompt/template | `sheldon`, `pm`, `orchestrator`, `dev`, `qa` get role-aware packages and no false READY. |
| 6 | Dev execution context | `@dev`, `@deyvin`, `src/preflight-engine.js`, `workflow-execute`, state helpers | `active_execution_artifact` is exposed; active manifest wins; done phases are skipped. |
| 7 | Product/Sheldon flow | `@product`, `@sheldon`, templates, optional validator checks | Sheldon RF-01 selects PRD before early-exit; Product registers feature and handoff explains next step. |
| 8 | Memory/observability/docs/tests | `@discover`, bootstrap files, `devlog-process`, runtime/pulse, CLI help, final `docs/pt/`, regression tests | Bootstrap has four files; devlogs tested on fixtures; help/docs match behavior; full regression suite covers motivating bugs. |

## Phase Context Rules

For each phase, `@dev` reads:

- always: project context, spec, architecture, this implementation plan, manifest
- phase-specific: only the matching `.aioson/plans/sdlc-process-upgrade/plan-*.md`
- verification: conformance YAML entries for the phase AC range

Do not reload old feature specs or stale `dev-state.md` for `doc-refresh` as active context.

## Checkpoints

After each phase:

1. Update `.aioson/plans/sdlc-process-upgrade/manifest.md` phase status if implementation uses manifest tracking.
2. Update `.aioson/context/spec-sdlc-process-upgrade.md` with decisions and checkpoint.
3. Run the phase-specific node tests.
4. Run `node bin/aioson.js artifact:validate . --feature=sdlc-process-upgrade --json`.
5. Emit `agent:done` or `pulse:update` with the completed phase and next action.

## QA Requirements

Before Gate D:

- Run `npm test`.
- Run targeted `node:test` files for gates, preflight, artifact validation, Sheldon RF-01, manifest precedence, PM ownership, bootstrap refresh, and help alignment.
- Verify `.aioson/context/conformance-sdlc-process-upgrade.yaml` AC-SDLC-01 through AC-SDLC-40.
- Confirm final docs in `docs/pt/` describe implemented behavior only.

## Orchestrator Handoff

Next agent: `@orchestrator`.

Reason: this MEDIUM feature touches prompts, CLI commands, shared parser/state logic, rules, templates, docs, and tests. `@orchestrator` should prepare lane/context coordination before `@dev` edits multiple areas.

Minimum orchestrator input:

- `.aioson/context/requirements-sdlc-process-upgrade.md`
- `.aioson/context/spec-sdlc-process-upgrade.md`
- `.aioson/context/architecture.md`
- `.aioson/context/implementation-plan-sdlc-process-upgrade.md`
- `.aioson/context/conformance-sdlc-process-upgrade.yaml`
- `.aioson/plans/sdlc-process-upgrade/manifest.md`

Gate C passed — `@orchestrator` may proceed.
