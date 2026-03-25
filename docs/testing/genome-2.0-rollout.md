# Genome 2.0 Rollout Runbook

## Goal

Bring the full Genome 2.0 package into `aioson` and `aioson-dashboard` with explicit gates, repeatable checks, and a non-destructive fallback path.

This document operationalizes Phase 09 from `notes-local/plano-genome-2/09-rollout-checklist.md`.

## Recommended implementation order

1. Block A: `aioson` core, bindings, compatibility.
2. Block B: dashboard Artisan genome incubation and `/genomes` catalog.
3. Block C: dashboard squad bindings and pipeline contextual badges.
4. Block D: integration, regression, and manual close-out.

## Recommended merge order

1. `aioson` Phase 01
2. `aioson` Phase 02
3. `aioson` Phase 03
4. `aioson-dashboard` Phase 04
5. `aioson-dashboard` Phase 05
6. `aioson-dashboard` Phase 06
7. `aioson-dashboard` Phase 07
8. Integration coverage from Phase 08
9. This rollout phase and final docs

## Commands by block

### Block A

Run from `aioson`:

```bash
npm run test:genome-2.0:block-a
```

This executes:

- core smoke for legacy + v2 genomes;
- compatibility tests;
- full core test suite;
- core lint.

### Block B

Run from `aioson-dashboard`:

```bash
npm run test:genome-2.0:block-b
```

This covers:

- Genome Brief generation helpers and API payloads;
- Artisan schema compatibility;
- `/genomes` catalog and detail payloads.

### Block C

Run from `aioson-dashboard`:

```bash
npm run test:genome-2.0:block-c
```

This covers:

- squad genome apply/remove flows;
- squad bindings payloads;
- pipeline genome badge payloads.

### Block D

Run from `aioson-dashboard`:

```bash
npm run test:genome-2.0:block-d
```

This executes the full dashboard gate:

- complete automated suite;
- lint;
- production build.

### Full rollout from the core repo

Run from `aioson`:

```bash
npm run test:genome-2.0:rollout -- --dashboard-root ../aioson-dashboard
```

Useful options:

- `--block=A|B|C|D`
- `--skip-dashboard`
- `--dry-run`
- `--json`

## Mandatory smoke acceptance

### After Block A

- [ ] Legacy genome is readable.
- [ ] Genome 2.0 writes markdown and `.meta.json`.
- [ ] New squad binding persists correctly.
- [ ] Existing squad binding stays compatible.
- [ ] Migrate and repair paths still work in dry-run.

### After Block B

- [ ] `/artisan` supports genome ideas.
- [ ] `Genome Brief` is persisted.
- [ ] `/genomes` lists legacy and v2 genomes.
- [ ] Catalog cards show type, depth, and evidence mode.

### After Block C

- [ ] `/squads` manages squad and executor bindings.
- [ ] Apply and remove binding flows are stable.
- [ ] `/pipelines` shows contextual genome badges only.
- [ ] Legacy pipelines remain valid.

### After Block D

- [ ] Automated checks pass.
- [ ] Manual checklist is complete.
- [ ] Legacy data remains accessible.

## Manual close-out

Use the manual regression guide in `genome-2.0-manual-regression.md` after the automated rollout checks pass.

Recommended sequence:

1. Validate `/genomes`.
2. Validate `/squads` binding management.
3. Validate `/pipelines` contextual rendering.
4. Re-check a legacy genome end-to-end.

## Fallback strategy

If compatibility regresses at any point:

1. Keep the new code in place.
2. Stop new writes where possible.
3. Keep tolerant reads active.
4. Record the gap before patching.
5. Re-run the relevant block and then the full rollout gate.

Dashboard-specific fallback:

- keep `/genomes` returning a minimal payload;
- hide advanced genome badges if enrichment breaks;
- never block the listing because of missing v2 metadata.

## Final release acceptance

Only close the package when all statements below are true:

- [ ] Genome 2.0 can be created.
- [ ] Genome 2.0 can be applied to a new squad.
- [ ] Genome 2.0 can be applied to an existing squad.
- [ ] `/artisan` supports genome incubation.
- [ ] `/genomes` exposes the enriched catalog.
- [ ] `/squads` manages bindings safely.
- [ ] `/pipelines` treats genomes as context, not executable nodes.
- [ ] Automated and manual validation are both complete.

## Suggested commit messages

```bash
feat(core): implement genome 2.0 foundation
feat(core): add genome bindings to squads
feat(core): add migration and compatibility layer for genome 2.0
feat(dashboard): add genome incubation flow to artisan
feat(dashboard): enrich genomes catalog for genome 2.0
feat(dashboard): add genome bindings management to squads
feat(dashboard): show genome bindings in squad pipelines without changing pipeline model
test(integration): add end-to-end coverage for genome 2.0 and dashboard bindings
docs(plan): add rollout checklist for genome 2.0 program
```
