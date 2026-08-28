---
description: Refiner prototype route, reference identity extraction, and explicit-model delegation
agents: [refiner]
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
- When the user points at a reference/inspiration **site URL** (effects, motion, layout), load `.aioson/docs/web-capture.md` on demand and apply its capture-route decision; on the AIOSON route, `researchs/<ref-slug>/extract.md` is the identity/effects evidence.
- Load `.aioson/skills/process/reference-identity-extract/SKILL.md`, extract once to `.aioson/briefings/{slug}/identity.md`, then run:

```bash
aioson verify:artifact . --kind=identity --file=.aioson/briefings/{slug}/identity.md --advisory 2>/dev/null || true
```

`identity.md` parameterizes the one chosen design engine; its `## Component structure notes` inform the operational surface. Without images, let `interface-design` operate intent-first.

- With an identity, draw the starting material FROM it: `aioson design:seed . --slug={slug} --json` resolves the briefing record (then the project brand record) by itself — its `theme` fixes the ground pole and an optional `register:` fixes the register; the registry still diversifies hue and pairing, and never flips the pole the owner showed. Record `references: extracted` in the manifest frontmatter.

- If `design_skill` names a project-forged skill (site-forge or hybrid output), use only that skill.
- If it is blank, default to `interface-design` in intent-first origination mode without asking. Commit to one aesthetic register and one product-specific signature move, then draw the starting material with `aioson design:seed . --register=<register> --slug={slug} --json` and build FROM one candidate — the draw supplies a contrast-solved hue family, ground pole, typeface pairing, and hero posture, diversified against the operator's recent projects, which is what keeps unrelated projects from all wearing the model's favorite palette. Originate the layout from it with premium tokenized craft — palette, typography, depth, and purposeful motion honoring `prefers-reduced-motion` — at the same ambition regardless of which model executes the run. This default is declared, never silent: record `design_skill: interface-design (default)` in `prototype-manifest.md` and add one non-blocking structured finding recommending the project register a definitive `design_skill`. For a premium-intent surface (marketing, institutional, showcase — anywhere the aesthetic is the argument), ask once, before originating, whether the owner has visual references — screenshots, capture folders, site URLs; owners who care about the aesthetic almost always hold a mental bar they can show. In the same round, ask for **anti-references**: two to five things this must NOT look like (competitors, styles, clichés — "not another dark dashboard with neon", "nothing that looks like a bank"). Owners who cannot articulate the bar can almost always name what breaks it, and a named anti-reference outranks ten positive adjectives: record them in the manifest's `## Visual direction` as its anti-goals, where they bind every later build and review round. References given → the identity route above, which outranks intent-first origination. No references → originate, and record the answer as a manifest fact: `references: declined` (the owner has none) or `references: unavailable` (asked, no answer yet). `verify:artifact --kind=visual` warns `references_unasked` on a brand-surface prototype built `identity: none` with no such line — a missing answer means the question was never asked, and the seed decided the direction alone. A stated ground without images (`--pole=dark|light`) is a preference the draw honors, not an identity.
- The installed skill catalog is never the decision surface. The framework ships no fixed presets; a forged skill is used only when the owner explicitly names one, and enumerating installed skills as a menu turns the aesthetic decision into a re-roll of the same fixed looks.

If the user named another model for reference research or critique, finish explicit delegation first. Otherwise do not delegate merely because it might help.

## Build

1. Load `.aioson/skills/process/prototype-forge/SKILL.md`, and — for every surface where the aesthetic argues — `.aioson/docs/design/visual-effects.md` (the effect vocabulary with its CSS recipes and cost contracts) plus the engine's `references/aesthetic-registers.md`: the register's premium bar names the moves, the vocabulary tells how each one is built and what it costs.
2. Follow its complete build contract, non-regression order, completeness-first gate, and bounded premium quality pass. The bar is measured twice: statically as `craft weight N/100` (each lever graded 0–2 — a delivered face at 96px+ with tracked caps or italic contrast, atmosphere on more than one layer, a hover system that moves plus an ambient or scroll-driven signature, image-led media, composition that overlaps the grid) and, with `--runtime`, as fold density (the share of the first fold that is type, media or painted surface rather than bare page ground). A lever that is merely present is thin; a first fold that is mostly page color is empty however rich the stylesheet.
3. Write:

```text
.aioson/briefings/{slug}/prototype.html
.aioson/briefings/{slug}/prototype-manifest.md
```

The manifest declares `feature: {slug}`, `status: draft`, and the `identity:` record the build consumed (or `none`) during refinement. That identity line is what carries the extracted visual system past briefing approval into the PRD and implementation; omitting it silently strands the record here. Never reuse another briefing's manifest/prototype. The user-controlled `aioson briefing:approve` command changes it to `status: approved`; only then may Product and downstream agents treat it as binding.
4. Verify owner/path directly because no PRD exists. Product later runs `aioson prototype:check . --feature={slug} --strict`. Measure the built prototype here — the earliest point where craft is provable, before any PRD binds it:

```bash
aioson verify:artifact . --kind=visual --slug={slug} --advisory --runtime --screenshots 2>/dev/null || true
```

Before this run, declare `## Runtime matrix` in the manifest: one named entry/primary route and one route for every demonstrable loading, empty, error, and success state. The runtime verifier visits that matrix at mobile and desktop, checks that each declared state is structurally visible, and stores screenshots when `--screenshots` is enabled. `--route=<hash>` remains the one-off override; a single entry route is not full-surface evidence.

Repair the blocking findings (decorative blob, animation with no `prefers-reduced-motion`, cards three deep, missing/empty manifest `## Visual direction`, primary feature below the fold) in the prototype itself. Threshold warnings — token adherence, off-grid spacing, depth strategies, font count, missing states, emoji-as-icon, uniform card walls, missing tour/primary markers — become structured findings only when this surface cannot justify them.

`--runtime` is always attempted, never assumed: with Playwright present it measures overflow, clipping, off-screen elements, tap targets, computed contrast, exact loaded font faces, broken media, computed material/motion, visible state markers, the primary-feature fold, and the declared route matrix. A run that requested runtime but could not complete it is reported as `UNVERIFIED`, never `ok: true`. When Playwright is absent, surface the enable decision to the user once per feature — "runtime telemetry is off; enable with `npm i -D playwright && npx playwright install chromium`?" — and record the answer. If the owner explicitly waives runtime, rerun without `--runtime` and record the waiver plus reason; that new report is an explicit static-only decision, not a silently degraded runtime run. The manifest's Quality evidence is a machine-bound projection of the persisted report (`verdict`, exact `evidence` path, `craft N/N`, `runtime`, `routes N`), not free-form claims. Briefing approval cross-checks it and refuses missing, stale, failed, or unverified evidence; lifecycle fields and the evidence projection itself do not invalidate the content hash, but changes to the prototype, briefing, identity, manifest decisions, or local visual assets do.
Interactions are proven the way craft is measured, not asserted from the HTML you wrote: author a prototype walkthrough (grammar in `.aioson/docs/qa/browser-walkthrough.md`) whose steps carry the `PROM-*` ids they demonstrate — the first-open tour, each promised state switch, every confirm/cancel path, drag-and-drop persistence within the session — and run `aioson browser:run . --script=<file> --file=.aioson/briefings/{slug}/prototype.html --slug={slug} --prototype 2>/dev/null || true`. Read the page first with `aioson browser:snapshot . --file=.aioson/briefings/{slug}/prototype.html`. The report lands in `.aioson/briefings/{slug}/browser/` beside the manifest; a promise whose step fails is a prototype defect to repair before approval, and `not_reached` is not demonstrated. Prototype walkthroughs never count as delivery AC evidence — QA writes its own against the real application.
5. Give the exact paths and state that the prototype models the final visual/interaction contract but does not prove backend integration: mock-only behavior is design evidence, never implementation proof, and refresh may reset mock state. Status remains draft until the user approves the briefing, then Product must preserve or explicitly document deviations from the approved binding.

## Rejection closes the loop

When the user rejects a visual that had passed every gate, the rejection is evidence of a harness miss, not just a rebuild order. Before rebuilding, append one learning under `.aioson/learnings/` (plus its `INDEX.md` line) naming: the pattern that slipped through, the gate that stayed green, and the cheapest check that would have caught it. A fingerprint that recurs across features graduates into a project rule via `aioson rule:new`. Then rebuild.

The rebuild itself is re-routed with **new visual input, identity-first** — rerunning the same engine mode on the same inputs, or swapping to another forged skill, is rolling the same dice that just lost:

1. Ask for the owner's references first. Someone who rejected a surface holds a mental bar; ask them to show it (screenshots, capture folders, reference site URLs) and run the identity route above. This is the recommended option whenever the complaint is sameness, "generic", or aesthetic quality.
2. No references available → originate again, but with a **different aesthetic register** executed at its premium bar and a **fresh draw** (`aioson design:seed . --register=<new register> --slug={slug} --seed=<N+1> --json` — the seed override is what makes the re-roll land elsewhere), and treat every craft warning from the rejected build's `kind=visual` report (undelivered typeface, OS-stack typography, `craft floor N/5`, `craft weight N/100`, `bare ground` fold density, `references_unasked`, `cross-project palette repetition`, `shallow material system`, `declared finish never applied`, every `generation tell:`/`copy tell:` line, `browser chrome never themed`) as the explicit fix list of the new build.
3. A forged skill only if the owner names one unprompted. Never present the installed skill catalog as the rebuild menu, and never mark a skill as the recommended answer to a quality or sameness complaint.

When a decision question is genuinely needed, it has exactly this shape — extract identity from your references (recommended; ask for them) / premium origination without references / a specific forged skill you name — never a list of installed skills.

Prototype work never edits `briefings.md`, never becomes canonical feedback, and never trades away a Core screen/action/state for visual polish.
