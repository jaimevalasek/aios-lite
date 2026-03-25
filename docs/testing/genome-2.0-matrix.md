# Genome 2.0 Test Matrix

## Scope

| Scenario | Layer | Expected Result |
| --- | --- | --- |
| 1. Legacy genome is readable by the core | `aioson` core | Markdown without v2 frontmatter is normalized and receives synthesized compat metadata |
| 2. Genome 2.0 is generated and saved | `aioson` core | Markdown and `.meta.json` are persisted together with v2 schema |
| 3. New squad receives genome | `aioson` squad binding | Manifest, blueprint and readiness get synchronized bindings |
| 4. Existing squad receives binding | `aioson` squad binding | Executor and squad scopes merge without breaking legacy executor genomes |
| 5. Artisan generates Genome Brief | `aioson-dashboard` Artisan API | Genome brief result returns markdown, confidence and fallback file write remains non-fatal |
| 6. `/genomes` lists metadata | `aioson-dashboard` catalog | Catalog returns local genome metadata, origin and binding counts |
| 7. `/squads` shows bindings | `aioson-dashboard` squads | Squad payload and UI consumers expose squad and executor bindings |
| 8. `/pipelines` shows badges | `aioson-dashboard` pipelines | Pipeline payload exposes contextual `genomeBindings` on squad nodes only |
| 9. Legacy data remains valid | cross-repo contract | Dashboard still reads manifests written by the core for legacy and v2 formats |

## Automated Coverage

- Core fixtures and smoke: `tests/integration/genome-2.0-smoke.test.js`
- Core binding contract: `tests/integration/genome-binding-contract.test.js`
- Dashboard Artisan brief API: `tests/api/artisan.generate-genome-brief.test.mjs`
- Dashboard contract and catalog/bindings: `tests/integration/genome-binding-contract.test.mjs`
- Dashboard pipeline/catalog integration: `tests/integration/dashboard.genome-catalog-and-bindings.test.mjs`

## Rollout Entry Point

- Full gated rollout: `npm run test:genome-2.0:rollout -- --dashboard-root ../aioson-dashboard`
- Operational runbook: `genome-2.0-rollout.md`

## Shared Fixtures

- `tests/fixtures/genomes/legacy-genome.md`
- `tests/fixtures/genomes/genome-2.0.md`
- `tests/fixtures/genomes/genome-2.0.meta.json`
- `tests/fixtures/squads/squad-without-genome/`
- `tests/fixtures/squads/squad-with-genome/`
