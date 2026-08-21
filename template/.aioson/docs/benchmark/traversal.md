---
name: benchmark-traversal
description: "Measured-run traversal contract for @benchmark: bootstrap, route detection (prototype vs full chain), unattended stage conduction, gate topology, stage evidence, and honest result assembly."
agents: [benchmark]
task_types: [benchmarking, orchestration, workflow]
load_tier: trigger
triggers: [measured run, benchmark traversal, cockpit comparison, unattended chain, autopilot benchmark, route detection]
---

# Benchmark traversal contract

`@benchmark` routes here for any measured run. This module is binding for the whole round: it defines how the AIOSON side of a comparison crosses the real agent chain with no human in the loop. It never applies outside a workspace whose bootstrap wrote `.aioson/benchmark/measured-run.json` — the marker, not this text, is what softens any gate.

## The measured workspace

An external orchestrator (AIOSON Cockpit) materializes a disposable workspace per run: this agent's frozen instruction, boundary `AGENTS.md`/`CLAUDE.md`, and a minimal project context. Its first message carries an `[AIOSON_COCKPIT_BENCHMARK_V1]` envelope with `run_root`, `delivery_root`, `result_schema_version=1`, `report_path`, and the frozen `original_prompt`. Standalone runs (no envelope) use the current directory as both roots. Conducting the chain agents inside this workspace is @benchmark's own execution — the boundary files' "execute exclusively the managed benchmark agent" stays satisfied.

**Step 0 — bootstrap.** Run `aioson benchmark:bootstrap . --json` and require `"ok": true` before any stage. It installs the missing managed files (never replacing the frozen instruction or the boundary files), repairs `project.context.md` into a contract-valid one with `auto_handoff: true`, and writes the measured-run marker. `--check` is the dry verification: it proves the round can cross, or names every missing piece. If the CLI is unavailable, do not improvise the marker or the context — write a `failed` result naming the missing CLI and stop.

## Route detection

Decide from the frozen prompt what the honest deliverable is, then record the route and its reason in `report.md`:

- **prototype route** — the prompt asks for a game, toy, or playable visual experiment that honestly lives in one self-contained screen: no server, no accounts, no multi-view persistent data. A pure harness would answer with a single HTML file, so the comparable AIOSON artifact is the refiner's functional prototype. Stages: briefing → refiner only.
- **full route** — everything else: site, website, CRM, dashboard, SaaS, API, anything a developer would build as a real project (Node.js, React, Vite, or equivalent). A prototype would be a different category of artifact than the harness's running software, so the round crosses the entire chain: briefing → refiner → product → sheldon → planner → dev → qa.

Tie-break: when in doubt, take the full route — it is the real product path being measured. A game with a server, rankings, or accounts is full route.

## Unattended posture (binding at every stage)

- Questions are forbidden (`agent_questions=forbidden`). Never produce an artifact that waits for a human: no `review.html`, no `refinement-feedback.json`, no browser feedback loop, no confirmation prompts.
- Every structured decision resolves by its `recommended: true` option. A blocking finding with no recommended option fails the round explicitly with that reason — never a guess, never a stall.
- Log every automatic resolution in `report.md` under `## Auto-decisions` (stage · decision · option applied · why it was the recommended one).
- The human-only gates are never exercised inside a round: `briefing:approve`, prototype freezing, `feature:close`, commit, publish, deploy. The CLI refuses `briefing:approve` in a measured workspace by design (`prototype_skipped_measured_run`).
- Ceilings from the envelope (timeout, technology, platform) bound the work; they are never reasons to ask.

## Stage conduction

Activate each stage by executing its agent file (`.aioson/agents/{agent}.md`) under this contract, in order. After each stage, verify its evidence artifact exists — the external observer reads progress exclusively from these exact paths (relative to the workspace):

| # | Agent | Measured-run posture | Stage evidence |
|---|---|---|---|
| 1 | `briefing` | Derive the kebab-case slug from the prompt and proceed without slug confirmation (log it as an auto-decision). No user questions; classify open questions instead of asking them. Expansion only for a genuinely rich surface. | `.aioson/briefings/{slug}/briefings.md` |
| 2 | `refiner` | Audit the briefing; resolve each blocking finding by its recommended option; write `refinement-report.md` (round `measured-0`) documenting findings and auto-resolutions — it is the refinement authority downstream in this round. Skip the review surface entirely. Prototype route: additionally build the full working `prototype.html` (+ `prototype-manifest.md`, kept `status: draft`) through the normal prototype pipeline; it is the round deliverable. Full route: build no prototype — the skip is recorded deterministically as `skipped_measured_run` by the marker. | `.aioson/briefings/{slug}/refinement-report.md` |
| 3 | `product` | The measured-run marker replaces user approval as round authority (registry stays `draft`; nothing here ever becomes product authority). Consume briefing + refinement report; declare `prototype_status: skipped_measured_run`, `prototype: null`, `prototype_feature: null` in the PRD frontmatter — `prototype:check --strict` accepts this only under the marker. Set the agent-owned `product_scope: approved` and `prd_ready: approved` when the PRD is genuinely complete. | `.aioson/context/prd-{slug}.md` |
| 4 | `sheldon` | Normal independent enrichment and seal (`sheldon_review: approved`, hash-bound PASS). Decisions with a determined outcome never pause. After Sheldon completes, @benchmark writes the stage evidence file itself: a short summary (seal status, promoted report path, PRD hash) — Sheldon's canonical evidence lives elsewhere and the observer needs this exact path. | `.aioson/context/sheldon-review-{slug}.md` (written by @benchmark) |
| 5 | `planner` | Normal plan; an open decision resolves recommended-or-fail. Gate C must pass. | `.aioson/context/implementation-plan-{slug}.md` |
| 6 | `dev` | All phases through the phase loop without pausing at checkpoints; the runtime gate (build + boot + smoke) is part of done. | `.aioson/context/dev-state.md` |
| 7 | `qa` | Independent verdict. On a bounded FAIL, the single workflow-owned QA→DEV correction cycle runs; the final verdict is reported honestly either way. Gate D only on PASS. Stop after the verdict — never `feature:close`. | `.aioson/context/qa-report-{slug}.md` |

Prototype route ends after stage 2; stages 3–7 are recorded as not crossed (that is the route's contract, not an interruption).

Autopilot inside the workspace is already armed by bootstrap (`auto_handoff: true`); the stop conditions of `.aioson/docs/autopilot-handoff.md` reinterpret under this contract: a "genuine human decision" resolves by the recommended option, or fails the round when none exists.

## Failure protocol

A stage that cannot complete fails the round at that stage. Still write both result artifacts: `status: failed` (or `partial` when a runnable deliverable exists), the interrupted stage and reason in `known_limitations` (e.g. `traversal interrupted at planner: <reason>`), and the full story in `report.md`. Never leave the round without `benchmark-result.json` — a missing result reads as an invalid run, hiding the real failure point.

## Result assembly

- `benchmark-result.json` at the run root, **strict schema 1, exactly the kernel's 11 fields** — the external parser rejects unknown fields and any other schema version. The traversal's story fits inside them: route and auto-decision summary in `assumptions`, per-stage outcomes in `validation` (real commands and honest statuses), unfinished promises in `known_limitations`.
- `entrypoints` point at the real deliverable inside the run root: prototype route → the prototype HTML; full route → the app's true entry (source structure under the delivery root, run instructions that work from the run root).
- `report.md` at `report_path` with: route + reason, `## Stages` (per stage: started/ended ISO timestamps, outcome, evidence path), `## Auto-decisions`, validation evidence, and limitations. Timestamps are yours to record; duration, tokens, and cost belong to the external orchestrator — never invent them.
- A visible deliverable on either route is measured directly after its last stage: start it normally, run `verify:artifact --kind=visual --url=<served> --runtime --screenshots --advisory`, cover the primary route plus demonstrable loading/empty/error/success states, and reference the resulting images in `artifacts.screenshots`. The full route intentionally skips a briefing prototype; it never skips rendered evidence of the implementation. `UNVERIFIED` cannot support `completed`.
- Close with the kernel's completion gate: `aioson verify:artifact . --kind=benchmark-result --file=benchmark-result.json --advisory` and repair every named issue.
