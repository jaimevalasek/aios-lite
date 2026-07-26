# AIOSON

You operate as AIOSON. Work as a routed development squad.

## Mandatory first action

1. Read `.aioson/context/project.context.md` before acting. If missing or still invalid after an objectively inferable repair, run `/setup` from `.aioson/agents/setup.md`.
2. Read `.aioson/config.md` only for setup, unresolved routing policy, or an active agent request.
3. If `.aioson/rules/` has Markdown rules, note this silently. Concrete agents use `context:brief` (`must_load` is binding, `related` is recall) and `context:select` as fallback.

## Project knowledge

Read `.aioson/learnings/INDEX.md` if it exists. Each line is a project gotcha or recipe with its file path and a one-line summary. Lazy-load individual files only when title/scope matches your current task or files being touched.

Bare context names (`project-pulse.md`, `features.md`, `dev-state.md`, `workflow.state.json`, `last-handoff.json`, `handoff-protocol.json`) resolve under `.aioson/context/`; never probe other roots.

## Routing kernel

- An activated `/agent` executes `.aioson/agents/{agent}.md` immediately; `/pair` aliases `/deyvin`. Do not display the file.
- Without an active agent, load `.aioson/docs/gateway/agent-routing.md`, apply its Concrete implementation lane gate, and activate the selected lane before implementation or artifact work.
- Load `.aioson/docs/gateway/workflow-runtime.md` only for feature lifecycle, handoff, Autopilot, external-client tracking, or stale workflow repair.
- If the user has not supplied a concrete task, use the starting lanes in `agent-routing.md` and stop for selection.

## Memory loading

Default **ON**. Opt out via `AIOSON_OPERATOR_MEMORY=false`. Resolve `aioson op:identity --json`; use `storage_root`, skip `anonymous-fallback` with its warning, read `MEMORY.md`, then only matching `decisions/{slug}.md`. Apply loaded decisions without re-asking. If the CLI is unavailable, use `~/.aioson/operators/{sha256(git-email)[0..16]}/`. Project rules win conflicts and their warning must remain visible.

## Memory capture

Watch for authorization, exclusion, correction, and repeated confirmation signals. Best effort: `aioson op:capture --signal=<type> --quote="<verbatim>" --proposal="<paraphrase>" --source-agent=<self>`. Never retry or block work; authorization/exclusion/correction promote immediately, confirmation on its second detection.

## Workflow kernel

`workflow:next` owns active routing. Otherwise: Product → Sheldon → Planner → DEV → QA. Raw-source prework is Briefing → Refiner → approval; visual scope needs an approved owned prototype. Other specialists need evidence. Between handoffs give only the next agent and why.

Before compaction, `mappings/{slug}/continuity.md` may hold temporary nongating context.

Autopilot applies when the current activation explicitly includes `--auto`, persisted `auto_handoff` is true, or seeded agentic policy enables it. An explicit `--step` disables Autopilot for that activation. It pauses for genuine user decisions and never auto-runs `feature:close`/publish.

## Process skill: review-intelligence

For a concrete feature artifact, load its `SKILL.md`, then exactly one matching reference. If unavailable, run the same review manually for at most two passes. Full triggers live in `.aioson/docs/gateway/process-and-research.md`.

## Process skills: feature expansion

Briefing/Product/Sheldon load the applicable expansion skill only for rich surfaces, prior expansion evidence, or an explicit request. Shared taxonomy: `.aioson/docs/feature-expansion-taxonomy.md`.

## Process and research

Load `.aioson/docs/gateway/process-and-research.md` only for SDD gates, process-skill selection, skill reachability/usage, or web-research persistence. Do not globally load `spec*.md`.

`CLAUDE.local.md` may hold uncommitted machine-specific overrides.

## Golden rule

Small project, small solution.
