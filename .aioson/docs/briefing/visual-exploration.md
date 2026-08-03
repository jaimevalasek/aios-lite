---
description: Briefing Refiner pre-briefing visual exploration, screenshot sufficiency, current-front-end scan, single/sequential/arena runs, review, reporting, and promotion
agents: [briefing-refiner, briefing]
task_types: [visual-exploration, redesign, screenshot-reference, multi-model-design]
triggers: [explore a design, visual redesign, screenshots, prints, design arena, compare models, pre-briefing prototype]
---

# Visual Exploration

Load only when no refinable briefing owns the requested visual work, or when the user explicitly asks for a non-canonical design exploration. A refinable briefing keeps the canonical prototype route in `prototype-and-delegation.md`.

## Entry decision

When no refinable briefing exists, do not silently route away and do not create files before intent is known. Present only unresolved choices:

1. Create a Briefing first through `@briefing`.
2. Start a visual exploration.
3. Continue an existing exploration.

If the user already requested an exploration, skip that question. If the request is non-visual framing, route to `@briefing`.

For a new exploration, resolve:

- target: `current-system-redesign`, `external-reference`, or `mixed-reference`;
- strategy: `single`, `sequential`, or `arena`;
- context policy for later runs: `isolated` (fair benchmark) or `cumulative` (best-result search);
- display: `blind` or `labeled`;
- current-system scan: `none`, `targeted`, or `full`.

Recommend `targeted` for an existing product. Recommend `blind` for a model benchmark. Never ask a choice already established by the request.

Initialize only after the slug and choices are confirmed:

```bash
aioson exploration:init . --slug={slug} --title="<title>" --goal="<goal>" --strategy=<single|sequential|arena> --context-policy=<isolated|cumulative> --display-mode=<blind|labeled> --target=<current-system-redesign|external-reference|mixed-reference> --scan=<none|targeted|full> --json
```

## Intake and screenshot sufficiency

Import supplied files so temporary external paths do not become the only evidence:

```bash
aioson exploration:references . --slug={slug} --files="<path1>,<path2>" --json
```

Inspect each image once. Judge coverage, not image count:

- shell/navigation;
- primary surface;
- critical detail/modal;
- important populated, empty, loading, error, permission, and destructive states;
- responsive layout only when requested.

Write a candidate intake JSON outside the canonical file, then apply it through:

```bash
aioson exploration:intake . --slug={slug} --file=<candidate-intake.json> --json
```

Before confirmation, summarize:

- what the user wants;
- what behavior/structure must survive;
- what should change;
- what images and repository evidence prove;
- what remains unknown or inferred.

If coverage is insufficient, offer only the useful next step: more prints, targeted repository scan, or explicit continuation with named assumptions. Do not claim an unseen state was observed. Generation blocks while `decision: pending`.

## Current-system evidence

For a redesign, run the selected bounded scan:

```bash
aioson exploration:scan . --slug={slug} --scope=<targeted|full> [--paths="<path1>,<path2>"] --json
```

The generated source map is a candidate inventory, not behavioral understanding. Inspect the nearest implementation, production entry point, routes, component anatomy, styles/tokens, tests, and state handling. Enrich `inputs/source-map.md` with exact paths and separate:

- observed in screenshots;
- proven in code;
- inferred;
- newly proposed.

A scan is read-only. Never ask the user to restate facts the repository can answer.

## Run strategies

### Single

Create one run. If the user later wants another model, explicitly convert the exploration to a sequential strategy; never overwrite the first run:

```bash
aioson exploration:configure . --slug={slug} --strategy=sequential --json
```

### Sequential

Create one run at a time. With `isolated`, every model receives the frozen original input. With `cumulative`, name a `parent_run` and include its feedback/report as improvement evidence.

### Arena

Use an identical frozen input for all models. Exact model binding is mandatory. Execute bounded parallel work only after the user named the models:

```bash
aioson exploration:run . --slug={slug} --models="<host:model>,<host:model>" --parallel=<1..8> --explicit-model-request --json
```

One failed model does not cancel completed variants. Never replace a requested model silently. Workers are read-only and return delimited HTML/report blocks; the parent CLI alone writes variant folders.

For manual/native generation, allocate first:

```bash
aioson exploration:add-run . --slug={slug} --host=<host> --model="<model>" [--parent=variant-a] --json
```

Write only that run's `prototype.html` and `report.md`, then:

```bash
aioson exploration:record . --slug={slug} --run=<variant-id> --model-resolved="<exact-model>" --resolution-strategy=<strategy> --json
```

## Build and visual quality

Load `reference-identity-extract` when reference images should parameterize the design engine. Load `prototype-forge` in `visual-exploration` mode.

Every prototype must be self-contained, mock-only, and operationally honest. Require realistic data and reachable states. Render and inspect desktop plus mobile when a browser is available. In exploration mode, an available browser is mandatory; if unavailable, record the limitation and never claim visual inspection.

Use one bounded loop:

`build → browser render → screenshot/DOM critique → repair → final render`.

Check hierarchy, contrast, overflow, density, responsiveness, focus, reduced motion, directional-effect physics, dead controls, and JavaScript syntax. Do not trade a Core action/state for polish.

## Report contract

Every run keeps an append-only `report.md` containing:

- bound host/model provenance;
- input summary and design direction;
- session timeline with prompts, feedback, changes, bugs, and corrections;
- validation actually performed and limitations;
- production-library mapping when useful;
- `<!-- aioson:reusable-prompts -->`;
- one-shot reusable prompt;
- staged/incremental prompt sequence;
- next-run corrective prompt when applicable.

Reusable prompts are always retained for user learning and external benchmarks. In a fair arena, do not feed lessons from one competitor into another before all isolated runs finish.

## Review and localized feedback

Generate:

```bash
aioson exploration:review . --slug={slug} --json
```

Open `comparison.html` in a real browser. It supports blind/labeled variants, previews, region comments, notes, and JSON export. Apply the user's exported file through:

```bash
aioson exploration:select . --slug={slug} --feedback=<exploration-feedback.json> --json
```

Selection means “use this direction as source,” not Briefing approval.

## Promotion

Only a selected run may be promoted:

```bash
aioson exploration:promote . --slug={slug} --briefing-slug={briefing-slug} --json
```

This prepares `plans/{briefing-slug}/visual-exploration.md` with immutable paths and fingerprints. It does not create or approve the Briefing. Hand off to `@briefing`; after the draft exists, `@briefing-refiner` audits it and consolidates the selected direction into the canonical feature-owned prototype under `.aioson/briefings/{briefing-slug}/`.
