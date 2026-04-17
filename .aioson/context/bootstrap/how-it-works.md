---
updated_at: "2026-04-17T00:50:39-03:00"
purpose: "Fast system understanding for implementation agents"
---

# How It Works

## Core model

AIOSON is a Node.js CLI that orchestrates specialized agents through a workflow engine.

The important architectural split is:

- agent prompts define what each agent should do
- the CLI and runtime define how workflow progression, gates, retries, and handoffs work

The system is not prompt-only anymore. Several protections already live in the motor.

## Main workflow kernel

Primary command flow:

- `aioson workflow:next .`
- `aioson workflow:next . --complete=<agent>`
- `aioson workflow:heal . --stage=<agent>`
- `aioson workflow:execute . --feature=<slug>`

Key responsibilities of `workflow:next` today:

- initialize or continue workflow state
- activate the next official agent
- validate stage completion
- run handoff contract checks
- run technical gates
- generate handoff data in both legacy and machine-readable forms
- sync runtime state
- optionally auto-heal blocked stages

## Protections already in the motor

The current engine already includes:

- technical gates after `@dev` and before `@qa`
- handoff contract validation by stage
- self-healing with retry budget
- `--auto-heal` inside `workflow:next`
- commit guardrails before `@committer`
- `commit:prepare` as safe commit preparation flow
- path guard injection
- test briefing injection for `@qa` and `@tester`
- workflow hardening via `workflow:harden`
- autonomy policy resolution via `.aioson/config/autonomy-protocol.json`
- capability manifest loading for official workflow agents
- `handoff-protocol.json` written in parallel with `last-handoff.json`
- warning-first handoff protocol validation against target agent capabilities
- operational inspection through `workflow:next --status`
- deterministic next-step recommendation through `workflow:next --suggest`
- explicit headless commit preparation via `commit:prepare --agent-safe --staged-only --mode=headless`
- resumable unified runner shell via `workflow:execute` on top of `workflow:next`
- optional multi-checkpoint runner advancement via `workflow:execute --max-checkpoints=<n>`
- project-mode contract gates that consult `spec.md` when it exists, without making `featureSlug` mandatory for official project stages
- canonical prompts/manifests for `@ux-ui`, `@pm`, and `@orchestrator` that now describe the actual workflow and `parallel:*` CLI primitives instead of implicit harness-only tools
- machine-readable parallel workspace artifacts via `workspace.manifest.json`, `ownership-map.json`, and `merge-plan.json`
- explicit lane ownership and merge metadata maintained by `parallel:init`, `parallel:assign`, `parallel:status`, and `parallel:doctor --fix`
- dependency blockers, dependency order violations, and stale parallel artifacts detected via `parallel:status` / `parallel:doctor`
- `parallel:doctor --fix` rebuilds machine-readable parallel artifacts from the lane status files when they drift out of sync
- deterministic merge execution now exists via `parallel:merge --apply`, which marks lanes as `merged` only when the structural checks pass
- lane-level file ownership can now be declared via `write_paths` in the lane status files and derived machine-readable artifacts
- `parallel:status` / `parallel:doctor` now validate write-scope coverage, invalid path patterns, and overlapping file ownership between lanes
- `parallel:guard --lane=<n> --paths=<...>` now acts as a preflight write-scope validator before a lane starts editing files

## Prompt/runtime boundary

Important system insight:

- prompts already encourage agents to call `aioson` commands
- true autonomy is still constrained by the external tool or harness
- "can the agent run shell without permission?" is not solved by prompt text alone

That means future autonomy work must be modeled as runtime/tooling contract, not only prompt editing.

## Files that matter for fast orientation

Read these first when working on autonomy/orchestration topics:

1. `.aioson/context/project.context.md`
2. `.aioson/context/project-pulse.md`
3. `done/motor-hardening-implementacao.md`
4. `products-features/upgrade-agents/roadmap-consolidado-autonomia-orquestracao.md`
5. `products-features/upgrade-agents/checklist-executavel-autonomia-orquestracao.md`
6. `plans/Upgrade-Agents/Plano-Definitivo-Implementacao-Protocol-Contracts.md`

## Current architectural direction

Preferred direction:

- extend `workflow:next`
- extend `workflow:execute`
- keep one workflow motor
- add autonomy as a controlled capability
- treat sequential checkpoint automation as acceptable only while `workflow.state.json` remains the single source of truth
- treat parallelism as a controlled layer with machine-readable lane ownership before adding execution automation
- treat `parallel:guard` as a preflight contract, not as full sandbox enforcement
- treat lane status files as the editable operational source and machine-readable parallel artifacts as derived state that can be validated and rebuilt
- treat deterministic merge as orchestration-state progression first, not as a substitute for git/worktree merge automation

Avoid by default:

- creating a second orchestration motor with overlapping semantics
- treating client-specific hooks as the center of the architecture
- starting real parallel execution before lane ownership and merge enforcement are reliable
