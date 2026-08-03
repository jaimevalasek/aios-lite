# Recipe: visual exploration and multi-model arena

> **Use when:** you want a new skin for the current front end, a direction reconstructed from screenshots, or a fair model comparison before creating a Briefing.
> **Result:** clickable variants, blind or labeled comparison, reusable prompt reports, and a traceable source-pack promotion.

## Authority boundary

When a refinable Briefing exists, `@briefing-refiner` keeps the canonical prototype in `.aioson/briefings/{slug}/`.

Without one, candidates live under `.aioson/explorations/{slug}/`. Selection means “use this visual direction as evidence”; it is not product-scope or Briefing approval.

## Initialize

Choose a target (`current-system-redesign`, `external-reference`, or `mixed-reference`), a strategy (`single`, `sequential`, or `arena`), an `isolated` or `cumulative` context policy, a `blind` or `labeled` display, and a `none`, `targeted`, or `full` front-end scan.

```bash
aioson exploration:init . \
  --slug=dashboard-refresh \
  --title="Dashboard refresh" \
  --goal="Modernize the interface while preserving current tasks" \
  --strategy=arena \
  --context-policy=isolated \
  --display-mode=blind \
  --target=current-system-redesign \
  --scan=targeted \
  --json
```

## Import evidence and confirm intake

```bash
aioson exploration:references . --slug=dashboard-refresh --files="references/home.png,references/detail.png" --json
aioson exploration:scan . --slug=dashboard-refresh --scope=targeted --paths="src/app,src/components,src/styles" --json
aioson exploration:intake . --slug=dashboard-refresh --file=confirmed-intake.json --json
```

Screenshots prove observed visuals. Repository inspection proves current structure, routes, states, behavior, and tokens. The intake keeps observed facts, code evidence, assumptions, and proposals separate, and generation stays blocked while its decision is `pending`.

## Run the arena

```bash
aioson exploration:run . \
  --slug=dashboard-refresh \
  --models="codex:gpt-5.6,claude:opus-5,kimi:kimi-k3,qwen:qwen3-coder" \
  --parallel=4 \
  --explicit-model-request \
  --json
```

The parent allocates an immutable `runs/variant-*` directory per model before parallel execution. Workers remain read-only and return delimited prototype/report blocks; the parent validates and persists them. One failed model does not cancel successful variants or authorize silent substitution.

Use `sequential` when testing one model after another. An isolated run always receives the original frozen input. A cumulative run names a parent and receives its report as improvement evidence.

## Compare, select, and promote

```bash
aioson exploration:review . --slug=dashboard-refresh --json
aioson exploration:select . --slug=dashboard-refresh --feedback=.aioson/explorations/dashboard-refresh/exploration-feedback.json --json
aioson exploration:promote . --slug=dashboard-refresh --briefing-slug=dashboard-refresh-feature --json
```

`comparison.html` supports variant switching, region comments, notes, and feedback export. Every run report retains exact provenance, iteration lessons, limitations, the exact generation prompt, a reusable one-shot prompt, and an incremental sequence—even for rejected variants.

Promotion creates `plans/dashboard-refresh-feature/visual-exploration.md` with immutable paths and SHA-256 fingerprints. The normal route then remains:

`@briefing → @briefing-refiner → user approval → @product`
