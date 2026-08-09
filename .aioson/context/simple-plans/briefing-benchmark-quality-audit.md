---
slug: briefing-benchmark-quality-audit
status: done
owner: dev
created_at: 2026-08-09
updated_at: 2026-08-09
classification: MICRO
risk: low
source: direct-user-request
---

# Simple Plan - Briefing Refiner and Benchmark Quality Audit

## Scope

Ensure the shared anti-slop intelligence discourages repetitive em-dash cadence across visual and specification work, and make `@benchmark` automatically reuse an explicitly selected project design skill without silently selecting or mixing visual systems.

## Context selected

- `context:brief` selected the visual-exploration, disk-first, output-brevity, agent-structural, and Simple Plan contracts plus the current project/dev state and agent-loading governance.
- Prompt review uses `.aioson/skills/process/prompt-sharpener/SKILL.md` and its one diagnostics reference because this is a multi-prompt adoption audit.
- Existing pattern: `template/.aioson/` is canonical, workspace copies remain byte-identical, `design/visual-quality` is the shared quality brain, and focused Node contract tests prove agent reachability.
- Operator memory requires agent reforms to be edited and tested externally, without activating AIOSON agents or delegating to subagents.

## Implementation intelligence

- Framework leverage: extend the existing `vq-002` and `sq-001` replaceability nodes so visual consumers and the Product/Sheldon specification lens inherit the same writing guard without a new router or prompt block.
- Structure boundary: the shared brain owns the canonical quality criterion; the benchmark kernel owns design-skill resolution for an isolated run; tests own reachability and prompt-contract proof.
- Automation boundary: `@benchmark` may load only a non-empty `design_skill` already declared by project context and present inside the run root. With no valid selection, it continues from repository evidence and the shared brain instead of asking, auto-picking, or mixing skills.
- Safety/fairness: no writes escape the benchmark run root, no Arena responsibility moves into the agent, and no model, account, cost, or comparison contract changes.

## Useful options considered

- Include now: natural punctuation cadence guard; occasional semantically useful em dash remains valid; explicit selected-skill reuse; compact fallback when the brain CLI or selected skill is unavailable.
- Defer: a separate cross-domain copy-quality brain and a deterministic prose linter until multiple non-visual consumers need them.
- Escalate: silently choosing `interface-design`, changing project `design_skill`, or making a new visual-system taxonomy. Those are setup/product decisions, not benchmark defaults.

## Expected paths

Behavior:

- `template/.aioson/brains/design/visual-quality.brain.json`
- `template/.aioson/agents/benchmark.md`

Support:

- `.aioson/brains/design/visual-quality.brain.json`
- `.aioson/agents/benchmark.md`
- `tests/visual-quality-intelligence.test.js`
- `tests/benchmark-agent.test.js`
- `.aioson/context/simple-plans/briefing-benchmark-quality-audit.md`
- `.aioson/context/dev-state.md`

Total: 2 behavior files, 8 paths, 2 existing modules.

## Done criteria

- `vq-002` and `sq-001` reject repetitive em-dash cadence while preserving deliberate, occasional use and source/code literals.
- Both `@briefing-refiner` and `@benchmark` retrieve the updated node through their existing automatic brain queries.
- `@dev` and `@deyvin` receive the visual guard, while `@product` and `@sheldon` receive only its specification-safe form and no layout authority.
- `@benchmark` reuses exactly one project-selected design skill when available and never auto-selects one when absent.
- Template/workspace pairs remain byte-identical and focused contract tests pass.

## Verification

- `node --test tests/visual-quality-intelligence.test.js tests/benchmark-agent.test.js tests/briefing-agent-kernels.test.js`
- `node bin/aioson.js brain:query . --agent=briefing-refiner --tags=visual-quality,layout --min-quality=4 --format=compact`
- `node bin/aioson.js brain:query . --agent=benchmark --tags=visual-quality --min-quality=4 --format=compact`
- `npm run check:syntax`
- `git diff --check`

## Session state

Next step: none. The bounded audit and implementation are complete.

## Verification evidence

- Relevant Briefing, visual-exploration, visual-intelligence, and benchmark suites: 76 passed, 0 failed with `--test-concurrency=1`.
- The first parallel run exposed one transient Windows `ENOTEMPTY` cleanup failure in the lineage fixture; its isolated rerun and the full sequential rerun passed without code changes.
- `npm run check:syntax`: 503 JavaScript files passed.
- Real brain queries returned all 9 visual nodes for Briefing Refiner, Benchmark, DEV, and Deyvin, and exactly the 3 specification nodes for Product and Sheldon.
- `interface-design` passed the Skill Creator validator.
- Template/workspace SHA-256 parity passed for the benchmark kernel and visual-quality brain.
- Scoped `git diff --check` passed. The repository-wide check remains affected only by pre-existing trailing whitespace in the unrelated in-progress `src/cli.js` changes.
- `skill:audit --reachability --usage` found no orphan or unregistered process skill; `prototype-forge` is directly routed from Briefing Refiner and design packages remain contextual by the explicit `design_skill` selection.
