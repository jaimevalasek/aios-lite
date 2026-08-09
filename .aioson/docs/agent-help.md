---
description: "Per-agent quick help printed by the --help activation token. Each section is keyed by `## @<agent>`; the agent prints ONLY its own section, translated to the interaction language, and stops."
task_types: [help]
triggers: [help, --help, agent options]
---

# Agent quick help (--help token)

Consumed by the `## Help (--help)` section of each agent kernel: a standalone `--help` in the activation arguments makes the agent print its section below (localized) and stop — no work, no CLI calls, no questions. Keep every section short: what / when / options / typical calls / produces / next.

## @product

- **What:** product discovery — defines what to build, for whom, and why; writes the PRD base.
- **When:** starting a new feature or project definition; the kickoff of every feature chain.
- **Options:** `--auto` (autopilot through implementation and review, stopping before the human `feature:close` gate), `--step` (manual handoffs for this activation). Without a token, follows the feature scheme/project default.
- **Typical:** `/product --auto build email notifications`, `/product redesign checkout`.
- **Produces:** one `prd-{slug}.md` product authority with explicit feature-owned prototype status (`current`/`none`) plus the `features.md` index row.
- **Next:** `@sheldon` for mandatory independent enrichment and hash-bound approval before Planner; `@copywriter` remains a site-specific content detour.

## @briefing

- **What:** turns conversational ideas, loose plans, or heterogeneous read-only source packs under `plans/{slug}/` (including SQL-only and mixed files) into a structured pre-production briefing.
- **When:** an early idea needs framing and evaluation BEFORE committing to a PRD.
- **Options:** none — point it at a loose plan/source-pack slug or describe the idea; deterministic discovery uses `aioson briefing:sources`.
- **Typical:** `/briefing evaluate plans/loyalty-program.md`, `/briefing reconstruct plans/legacy-billing`, `/briefing frame this idea: ...`.
- **Produces:** `.aioson/briefings/{slug}/briefings.md` (+ prototype when the flow calls for it).
- **Next:** `@briefing-refiner` (refine) or `@product` (PRD).

## @briefing-refiner

- **What:** reviews an existing briefing, or—when none exists—guides a non-canonical visual exploration from screenshots, current front-end evidence, or a multi-model arena.
- **When:** a briefing needs corrections/decisions, or you want to test visual directions before committing them to a Briefing.
- **Options:** in exploration mode it asks only unresolved target, single/sequential/arena, isolated/cumulative, blind/labeled, and scan choices.
- **Typical:** `/briefing-refiner refine loyalty-program`.
- **Produces:** canonical review/prototype artifacts for an existing Briefing, or immutable variants and reusable-prompt reports under `.aioson/explorations/{slug}/`.
- **Next:** `@product` after Briefing approval; an exploration first promotes its selected direction to `plans/{briefing-slug}/` and hands off to `@briefing`.

## @dev

- **What:** implements the reviewed PRD through the approved implementation plan — code, migrations, interfaces, and stack-native tests on the production path.
- **When:** implementation entry point, resume after a break, or QA corrections.
- **Options:** `--auto` (arm autopilot for this activation: implementation + review cycle), `--step` (override an always-autopilot project and stop at the manual `@qa` handoff for this activation).
- **Typical:** `/dev --auto`, `/dev` (follows the seeded scheme/flag), `/dev continue feature checkout`.
- **Produces:** the working implementation + tests and `dev-state.md` checkpoints; it does not create another specification.
- **Next:** `@qa` (hub of the post-dev review cycle).

## @deyvin

- **What:** continuity-first pair programming — recovers recent context, works in small validated slices. Alias: `/pair`.
- **When:** resuming known work, debugging together, a bounded fix on existing context.
- **Options:** none. Hard boundary: new project/feature, broad redesign, or mixed product+UX+implementation scope → hands off immediately, never codes first.
- **Typical:** `/deyvin continue yesterday's fix`, `/pair debug the failing upload test`.
- **Produces:** the validated slice + session continuity records.
- **Next:** the proper workflow agent when scope expands (`@product`/`@dev`).

## @discover

- **What:** reads key files/artifacts and builds the semantic knowledge cache in `.aioson/context/bootstrap/` (what the system is, does, how it works, current state).
- **When:** session start on broad work, after big landings, or when agents warn `bootstrap < 4/4` / stale.
- **Options:** none.
- **Typical:** `/discover` (full refresh).
- **Produces:** `bootstrap/how-it-works.md`, `bootstrap/current-state.md` (+ archive), instant context for every other agent.
- **Next:** whatever agent you originally needed — discover is a preparation step.

## @neo

- **What:** the system router — shows the full picture (project state, workflow stage, pending work) and routes you to the right agent. Never implements, never produces artifacts.
- **When:** you are lost, between features, or unsure which agent/lane fits the task.
- **Options:** none.
- **Typical:** `/neo where are we?`, `/neo what should I run next?`.
- **Produces:** orientation + a concrete routing recommendation.
- **Next:** the agent it names.

## @orache

- **What:** deep domain investigation before a squad/product push — real frameworks, anti-patterns, benchmarks, reference voices, vocabulary of the field.
- **When:** entering an unfamiliar domain, or before `@squad` assembles specialists.
- **Options:** `quick` (D1/D2/D5), `targeted`, or `full`; it reuses matching registered investigation reports within seven days and may read relevant technical cache entries.
- **Typical:** `/orache investigate the B2B onboarding-tools market`.
- **Produces:** a verified, registered report under `squad-searches/` with evidence ledger and concrete squad impacts.
- **Next:** `@squad`; Analyst/Architect only for an explicitly requested modeling/technical follow-up.

## @orchestrator

- **What:** optional coordination specialist for a user-requested parallel execution problem; it is not a specification authority.
- **When:** the approved implementation plan contains genuinely independent work that benefits from explicit coordination.
- **Options:** use only with a named coordination goal and ownership boundaries.
- **Typical:** `/orchestrator coordinate phases 2 and 3 of billing-portal`.
- **Produces:** coordination state and consolidated execution status, not a requirements/spec/design pack.
- **Next:** the current canonical owner (`@planner`, `@dev`, or `@qa`).

## @tester

- **What:** engineering-grade coverage for already-implemented behavior — adds tests and may correct one unequivocal bounded defect, but never invents product behavior or self-accepts delivery.
- **When:** `@qa` flags a coverage gap, or you want a systematic test pass on a finished surface.
- **Options:** feature-scoped via the workflow (`--feature=<slug>` when invoked through the CLI prompt); a direct bounded correction over a disabled manifest entry uses `review-cycle:advance ... --manual`.
- **Typical:** `/tester cover feature checkout`, or invoked after `@qa` only when enabled and concretely triggered.
- **Produces:** tests + `test-report-{slug}.md`; bounded corrections stay inside persisted allowed paths and a finite review cycle.
- **Next:** `@dev` once for cross-cutting gaps, or back to `@qa` for independent acceptance.

## @pentester

- **What:** evidence-driven adversarial security review — maps the complete declared threat surface, records explicit standards/path/route coverage, and may apply every eligible deterministic hardening that fits one bounded packet.
- **When:** sensitive surface (auth, money, uploads, secrets, external URLs) — via `@qa`'s trigger or on demand.
- **Options:** `--mode=app_target --feature=<slug> --scope=<target>` via `aioson agent:prompt pentester`; `--scope-mode=feature|simple-plan|paths|routes|project` with `--paths=`/`--routes=` chooses what is reviewed, and `--report=full|none` (`--no-report`) chooses whether the HTML bundle is produced. Without those flags the agent asks once. A direct bounded correction over a disabled manifest entry uses `review-cycle:advance ... --manual`.
- **Typical:** `/aioson:agent:pentester review the auth endpoints of feature accounts`, `/aioson:agent:pentester --scope-mode=project --report=none`. With `--scope-mode=feature` and no slug it lists the project's features (`aioson feature:list`) and asks which one.
- **Produces:** authoritative `security-findings-{slug}.json` always, plus localized `.aioson/pentester/{run_id}/relatorios/{index,vulnerabilidades,correcoes,cobertura}.html` when `--report=full`; economy mode summarizes in the response and the bundle can still be built later — `aioson pentester:report .` lists the persisted runs, `aioson pentester:report . --feature=<slug> --json` builds one. `@qa` owns closure.
- **Next:** `@dev` once for cross-cutting findings, or back to `@qa`; Pentester never self-accepts a fix.

## @qa

- **What:** proportional delivery review — checks the relevant ACs, focused tests, and the normal production path, then returns a fast PASS or a concise reproduction to Dev.
- **When:** right after `@dev`; re-verification after corrections.
- **Options:** none at activation — verdicts and routing are evidence-driven.
- **Typical:** `/qa verify feature checkout`, or auto-invoked by `@dev` under autopilot.
- **Produces:** `qa-report-{slug}.md` with verdict (PASS/FAIL), executable checks, and production-path evidence.
- **Next:** `@dev` (FAIL), a risk-triggered specialist, or STOP recommending `aioson feature:close` (human gate).

## @sheldon

- **What:** independently challenges and enriches every feature PRD in place against sources, briefing, approved prototype, repository evidence, and promise coverage without creating a parallel specification pack.
- **When:** after Product and before Planner in every MICRO/SMALL/MEDIUM feature.
- **Options:** none at activation — it edits the existing PRD and never creates a parallel spec pack.
- **Typical:** `/sheldon continue feature quick-filters`.
- **Produces:** the same `prd-{slug}.md` with `sheldon_review: approved` and stable `CAP-*`/`AC-*` trace.
- **Next:** `@planner`.

## @planner

- **What:** converts the Product-ready PRD and prototype into executable vertical implementation stages.
- **When:** every MICRO/SMALL/MEDIUM feature after the mandatory current Sheldon PASS.
- **Options:** none; unresolved product behavior returns to Product, while a truly specialist decision may trigger one bounded detour.
- **Typical:** `/planner plan feature quick-filters`.
- **Produces:** one `implementation-plan-{slug}.md` with exact paths, dependencies, checks, and early production-path proof.
- **Next:** `@dev`.

## @benchmark

- **What:** expands one frozen prompt into a complete, polished, runnable app or game without clarification questions.
- **When:** testing how much implementation quality a model can deliver with AIOSON as the reasoning layer.
- **Options:** accepts an assigned run root and explicit runtime/technology constraints; otherwise uses the current directory for one standalone run.
- **Typical:** `/benchmark create a cozy underwater strategy game`.
- **Produces:** the runnable delivery, `benchmark-result.json`, and `report.md`; it never creates Arena, model rankings, tokens, or cost data.
- **Next:** an external orchestrator may collect the isolated result for comparison, or the user can run the standalone entrypoint directly.
