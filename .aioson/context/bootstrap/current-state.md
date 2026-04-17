---
updated_at: "2026-04-17T00:50:39-03:00"
source: "Autonomy/orchestration analysis and planning session"
---

# Current State

## What the system already has

These capabilities were confirmed during this analysis:

- `@dev`, `@qa`, and `@committer` prompts already contain CLI-aware behavior
- `workflow:next --complete` is the real stage transition primitive
- `workflow:next --auto-heal` already exists
- `workflow:heal` already exists as manual fallback
- handoff generation already happens in workflow completion flow
- technical gates already block broken handoffs
- handoff contracts already block incomplete stage exits
- `commit:prepare` already exists and is the expected pre-commit path
- `workflow:harden` already exists
- test briefing and path guard are already injected by the motor
- machine-readable autonomy policy layer now exists via `.aioson/config/autonomy-protocol.json`
- official workflow agents now have capability manifests in `.aioson/agents/*.manifest.json`
- `agent:prompt`, `workflow:next`, and `workflow:execute` now resolve an effective autonomy mode
- workflow completion now dual-writes `last-handoff.json` and `handoff-protocol.json`
- handoff protocol validation now exists in warning-first mode
- `workflow:next --status` now exposes active stage, queued next stage, contract readiness, pending gate, autonomy mode, artifacts, and last handoff data
- `workflow:next --suggest` now returns a deterministic next command based on workflow state and handoff contract readiness
- `commit:prepare` now supports an explicit agent-safe/headless path and blocks non-interactive staging ambiguity with a structured error
- `workflow:execute` now seeds/resumes feature workflow state, predicts blockers in dry-run, and advances one or more valid checkpoints through `workflow:next`
- project-mode handoff gates now use `.aioson/context/spec.md` when present and no longer fail just because a workflow stage has no feature slug
- `@ux-ui`, `@pm`, and `@orchestrator` prompts/manifests are now aligned with the current runtime contracts instead of outdated harness assumptions
- `parallel:init` now creates a machine-readable parallel workspace baseline with `workspace.manifest.json`, `ownership-map.json`, and `merge-plan.json`
- `parallel:assign` now writes explicit lane ownership and merge metadata into both lane status files and machine-readable artifacts
- `parallel:assign` now preserves manual lane dependencies declared in the lane status files when rebuilding machine-readable artifacts
- `parallel:status` now reports machine-file health, ownership conflicts, dependency blockers, dependency order violations, and stale machine-readable artifacts
- `parallel:doctor` now validates stale machine-readable artifacts, ownership conflicts, invalid lane dependencies, blocked dependencies, and merge-order violations
- `parallel:doctor --fix` now reconstructs stale machine-readable parallel artifacts in addition to restoring missing shared and lane status files
- `parallel:merge` now consumes `merge-plan.json` and executes a deterministic merge only when every lane is structurally ready
- merged lanes now persist as `status: merged`, and `parallel:status` reports merged lanes explicitly
- lane status files, `workspace.manifest.json`, and `ownership-map.json` now carry explicit `write_paths` declarations per lane
- `parallel:status` and `parallel:doctor` now report write-scope coverage gaps, invalid `write_paths` patterns, and overlapping file ownership across lanes
- `parallel:guard` now validates whether a given lane is allowed to write specific project paths before execution starts
- `parallel:merge` now also blocks when declared `write_paths` overlap or contain invalid patterns

## What the system does not have yet

These are real gaps, not already-delivered work:

- hard enforcement of isolated write scopes inside the edit/execution harness itself
- real filesystem/worktree isolation per lane during implementation

## Correct reading of the backlog

The outdated assumption was:

- "next step is updating prompts so agents can call CLI"

The corrected reading is:

- prompt awareness is already delivered
- the next work is operational hardening of autonomy

## Priority order discovered in this session

1. clean old planning docs so they stop describing completed work as pending
2. close the sequential autonomous flow
3. revisit runner depth and then parallelism

## Canonical planning files for this topic

- `products-features/upgrade-agents/agentes-autonomos-cli.md`
- `products-features/upgrade-agents/roadmap-consolidado-autonomia-orquestracao.md`
- `products-features/upgrade-agents/checklist-executavel-autonomia-orquestracao.md`
- `plans/Upgrade-Agents/Plano-Definitivo-Implementacao-Protocol-Contracts.md`

## Practical resume point

If a future agent resumes this topic, the safest next implementation slice is:

- move from preflight `parallel:guard` validation to enforced write blocking inside execution/edit flows

After that:

- evaluate whether parallel lanes need worktree-backed isolation instead of shared-workspace coordination
