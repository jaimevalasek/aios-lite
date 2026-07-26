# Streamlined Reference — Product

## Product owns

- One PRD with explicit scope, exclusions, user flows, feature-owned prototype status (`current` or `none`), stable `CAP-*` outcomes, repository-backed `## Current System Fit`, and observable `AC-*` rows.
- Complete `PROM-*` source coverage when the briefing contains a source promise map.
- `product_scope: approved`, `prd_ready: approved`, and `sheldon_review: pending` in frontmatter.
- No implementation design or plan.

Only `.aioson/briefings/{slug}/prototype.html` with an approved manifest owned by `{slug}` may be `current`. Another feature's prototype remains historical after closure. For genuinely nonvisual work, resolve a routine mismatch to `prototype: null` / `prototype_status: none`, name the exclusion in the PRD and chat, and inspect the repository instead of asking for confirmation.

## Mandatory independent enrichment

Product always hands the feature PRD to Sheldon. Sheldon edits this same PRD, may repair `CAP-*`/`AC-*` and source coverage rows, marks `sheldon_review: approved`, and promotes one current hash-bound PASS; it creates no parallel specification pack.

## Stop conditions

Stop only for a decision that materially changes product behavior, scope, cost, data, or risk. Infer correctness details from evidence. Keep useful but nonessential ideas deferred. Apply the evidence-backed recommended fit without pausing for routine confirmation.

## Handoff

Any Product-ready feature PRD → `@sheldon`; only a current Sheldon-approved PRD proceeds to `@planner`. Already-specified bounded technical work uses the separate Simple Plan lane instead of pretending to be a MICRO feature.
