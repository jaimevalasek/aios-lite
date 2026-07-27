---
feature: briefing-lineage-migration
status: approved
source_prd: .aioson/context/prd-briefing-lineage-migration.md
source_briefing: null
sheldon_review: required
prototype: null
prototype_status: none
prototype_feature: null
---

# Implementation Plan — briefing-lineage-migration

## Objective

Permitir que o operador migre e valide briefings legados pelo binário normal do AIOSON, preservando intenção e lifecycle enquanto todas as rotas oficiais concordam sobre linhagem, review atual e estado do Gate C.

## Repository evidence

- Production entry point: `bin/aioson.js` carrega `src/cli.js`, que faz o dispatch dos comandos `briefing:*`.
- Existing command and registry patterns to reuse: `src/commands/briefing.js`, `src/lib/briefing-refiner/briefing-registry.js` e `src/lib/briefing-refiner/briefing-paths.js`.
- Existing lineage and plan validation boundaries: `src/lib/feature-source-lineage.js`, `src/lib/feature-completeness-format.js`, `src/lib/feature-completeness.js` e `src/lib/feature-repository-fit.js`.
- Existing review and gate boundaries: `src/review-intelligence/engine.js`, `src/lib/sheldon-review.js`, `src/lib/gate-checkpoint.js`, `src/commands/gate-check.js` e `src/commands/gate-approve.js`.
- Official consumers: `src/commands/artifact-validate.js`, `src/commands/preflight.js`, `src/handoff-contract.js`, `src/commands/workflow-next.js` e `src/commands/feature-close.js`.
- Confirmed production regression: in `C:\dev\playapps\aioson-cockpit`, `project-squad-runtime` has an approved plan and current Sheldon PASS, no Gate C checkpoint, and planned `create` files written after the plan; Gate C currently blocks with `implementation_delta_create_path_exists` and incorrectly recommends Planner.
- Source authority: `plans/correcao-migracao-linhagem-briefings-aprovados.md` has SHA-256 `a1e3779f2abd302aa0e812425203baddea5c5bce5cd0b2d4b60b9b308ad0bf4d`; the PRD explicitly records that this feature has no canonical briefing or `PROM-*`.
- Prototype binding: none; repository behavior and tests are the executable baseline.
- Runtime and dependencies: Node.js `>=20.0.0`; no new package is required.
- Test runner: `npm test` (`node --test --test-concurrency=8`).

## Engineering Controls

| Concern | Evidence / trigger | Planned control | Verification | Recovery |
|---|---|---|---|---|
| Input and path confinement | The command accepts a project path and slug; `src/verification/path-policy.js` currently proves lexical containment only, and the PRD requires rejection of traversal, symlink, junction and reparse escapes | Validate an existing project first; validate a 1–128 character lowercase alphanumeric/hyphen slug before resolving briefing paths; require an exact registry match; resolve existing source files through real paths; preserve URLs as text and never fetch them | `node --test tests/briefing-lineage-migration.test.js tests/feature-completeness.test.js` with empty/oversized/type/traversal/separator/unknown slug, outside sentinels and platform-supported link escapes | Fail before mutation with a stable error code and no raw stack; leave project and outside sentinel byte-identical |
| Atomicity, concurrency and idempotency | `--write` changes an approved managed artifact and AC-lineage-004 requires recovery across every write boundary | Build a pure migration result first; use the analyzed briefing SHA-256 as a compare-and-swap precondition; use a content-addressed backup, sibling temporary files and a bounded transaction marker; promote briefing and report atomically; reuse a matching success report/backup on rerun | `node --test tests/briefing-lineage-migration.test.js` with injected failures before commit, during promotion and after briefing promotion, plus concurrent edit and second-run cases | Before commit remove temporary state; after partial promotion restore from the content-addressed backup or deterministically complete the matching report, never overwrite the concurrent edit |
| Legacy information preservation | The legacy inventory mixes source-pack files with research, code, URLs and conversation, while 18/18 promise IDs must survive | Recognize only known legacy header aliases; promote only real confined source-pack files to `SRC-*`; retain non-file evidence in a complementary non-canonical section; compare promise ID, approved intent and normalized state sets before allowing write; preserve every non-lineage byte and every non-target artifact | `node --test tests/briefing-lineage-migration.test.js` with mixed evidence, duplicates, ambiguity, malformed rows and the 18-promise incident shape | Refuse the migration and report the exact row whenever equivalence cannot be proven; no partial briefing rewrite |
| Lifecycle-dependent source truth | `/plans` is disposable after canonical absorption, but present sources must still detect drift | Resolve absorption from the exact registry entry, generated PRD and complete Source Coverage; require physical file and current hash before absorption; after absorption accept historical fingerprint when the file is absent, but still hash and fail a present divergent file | `node --test tests/feature-completeness.test.js tests/feature-completeness-integration.test.js` across pre-Product, post-PRD, missing, present, stale and contradictory lifecycle fixtures | Fail closed on incomplete coverage or contradictory registry/PRD state; recommend Product or lineage migration from the actual finding |
| Review generation immutability | `review:status` exposes a current Sheldon PASS but returns globally invalid when an unrelated Product packet is stale | Keep historical packets/reports immutable; make stale-only generations historical when another current generation exists; validate Gate C against the current Sheldon packet/report only; have migration report which packets reference a changed authority without rebinding them | `node --test tests/review-intelligence-cli.test.js tests/handoff-contract-sheldon.test.js tests/feature-completeness-integration.test.js` with mixed current/stale agents and an actual Sheldon authority change | A stale or absent current Sheldon generation still blocks and routes to Sheldon; historical files remain untouched and reprepare creates a new generation |
| Gate C baseline recovery and owner routing | `gate:approve` writes its checkpoint best-effort; the Cockpit plan predates created files, but checkpoint absence currently forces pre-implementation semantics forever | Preserve fresh checkpoint precedence; when it is absent/stale, derive a non-writing recovery classification from the approved plan hash/timestamp and exact delta path states; treat paths created or retired after the unchanged plan as evidence that implementation started; keep ambiguous or plan-newer states blocked with a Gate C recovery cause; map lineage, review, recovery, plan and execution findings to their real owners | `node --test tests/gate-check.test.js tests/feature-completeness-integration.test.js`, then run the normal binary against a temporary copy of `project-squad-runtime` and compare Gate C, artifact validate, DEV preflight, workflow/handoff and feature-close lineage classifications | Never fabricate a checkpoint; if evidence is insufficient, preserve files and report the recovery action instead of asking Planner to rewrite the approved plan |
| CLI localization compatibility | Help and command results are public in `en`, `pt-BR`, `es` and `fr` | Add the command usage and stable result/error messages to all four existing dictionaries; keep human and `--json` output semantically equivalent | `node --test tests/i18n-cli.test.js tests/briefing-lineage-migration.test.js` and `node bin/aioson.js help --locale=pt-BR` | Fall back through the existing i18n mechanism; no locale-specific mutation behavior |

## Implementation Delta

| CAP | Action | Existing evidence | Exact paths | Required change |
|---|---|---|---|---|
| CAP-lineage-migration-command | reuse | The published binary already delegates to the CLI module | bin/aioson.js | Exercise the new command through the normal production binary without adding an alternate entry point |
| CAP-lineage-migration-command | modify | `src/cli.js` registers aliases, JSON support, help and dispatch for existing `briefing:*` commands | src/cli.js | Register `briefing:migrate-lineage` and its hyphen alias, JSON mode, localized help and dispatch |
| CAP-lineage-migration-command | reuse | Registry parsing and safe briefing path resolution already centralize lifecycle metadata and slug-to-directory mapping | src/lib/briefing-refiner/briefing-registry.js, src/lib/briefing-refiner/briefing-paths.js | Reuse exact registry lookup and safe briefing resolution without changing approve/unapprove/refinement eligibility |
| CAP-lineage-migration-command | create | No command or pure transformer exists after inspecting the briefing command boundary | src/commands/briefing-migrate-lineage.js, src/lib/briefing-lineage-migration.js, tests/briefing-lineage-migration.test.js | Add validation, dry-run-by-default, explicit write transaction, audit result and focused end-to-end coverage |
| CAP-lineage-migration-command | modify | Existing dictionaries expose localized command help and result text | src/i18n/messages/en.js, src/i18n/messages/pt-BR.js, src/i18n/messages/es.js, src/i18n/messages/fr.js, tests/i18n-cli.test.js | Add equivalent command usage and stable migration result/error keys in all supported locales |
| CAP-lineage-migration-command | modify | The English and Portuguese CLI references are the public command documentation | docs/en/5-reference/cli-reference.md, docs/pt/5-referencia/comandos-cli.md | Document default preview, `--dry-run`, `--write`, `--json`, lifecycle support, backup/report and failure guarantees |
| CAP-lineage-source-preservation | create | No transformer currently separates canonical source-pack files from complementary legacy evidence | src/lib/briefing-lineage-migration.js, tests/briefing-lineage-migration.test.js | Parse known legacy schemas, preserve non-canonical evidence, prove promise equivalence and render only the lineage sections |
| CAP-lineage-source-preservation | modify | The current lineage validator assumes canonical columns, `plans/` paths and lexical containment | src/lib/feature-source-lineage.js, src/verification/path-policy.js, tests/feature-completeness.test.js | Add real-path confinement and validate canonical versus complementary evidence without following URLs or fabricating sources |
| CAP-lineage-source-preservation | reuse | The registry and briefing resolver already guard the canonical per-slug location | src/lib/briefing-refiner/briefing-registry.js, src/lib/briefing-refiner/briefing-paths.js | Reuse safe ownership and lifecycle lookup for all reads and writes |
| CAP-lineage-prework-lifecycle | modify | `analyzeFeatureCompleteness` invokes lineage without registry lifecycle and every call currently rehashes every inventory row | src/lib/feature-source-lineage.js, src/lib/feature-completeness.js, tests/feature-completeness.test.js, tests/feature-completeness-integration.test.js | Resolve canonical absorption once, apply stage-dependent presence rules and expose the same lineage lifecycle/result to every consumer |
| CAP-lineage-prework-lifecycle | reuse | `briefing-registry.js` is the existing source of `status`, `approved_at` and `prd_generated` | src/lib/briefing-refiner/briefing-registry.js | Read lifecycle without rewriting registry metadata |
| CAP-lineage-decision-normalization | modify | `normalizeLabel()` deletes underscore before Source Coverage validates a hyphenated vocabulary | src/lib/feature-completeness-format.js, src/lib/feature-source-lineage.js, tests/feature-completeness.test.js | Add one coverage-decision normalizer that maps underscore, hyphen and space aliases to internal `not_applicable` and aligns diagnostics |
| CAP-lineage-review-generation | create | Migration needs to report causal review impact but must not edit packets or reports | src/lib/briefing-lineage-migration.js | Compare the changed briefing path/hash with packet authority bindings and report affected agents/generations only |
| CAP-lineage-review-generation | modify | `reviewStatus()` treats any stale-only historical agent as a global failure, and `validateCurrentSheldonReview()` gates on that aggregate | src/review-intelligence/engine.js, src/lib/sheldon-review.js, src/handoff-contract.js, tests/review-intelligence-cli.test.js, tests/handoff-contract-sheldon.test.js, tests/feature-completeness-integration.test.js | Preserve fatal invalid-current behavior while making unrelated stale history non-blocking for a current Sheldon PASS across all handoff consumers |
| CAP-lineage-gate-ownership | modify | Plan lifecycle is currently inferred from checkpoint existence alone and owner routing is stage-generic | src/lib/feature-repository-fit.js, src/lib/feature-completeness.js, src/lib/gate-checkpoint.js, src/commands/gate-check.js, src/commands/preflight.js, src/commands/artifact-validate.js, src/handoff-contract.js, tests/gate-check.test.js, tests/feature-completeness-integration.test.js | Add evidence-based baseline recovery, structured cause/owner metadata and one shared lifecycle classification for official consumers |
| CAP-lineage-gate-ownership | reuse | Gate approval remains the owner of new checkpoints; workflow and close already consume handoff/completeness boundaries | src/commands/gate-approve.js, src/commands/workflow-next.js, src/commands/feature-close.js | Preserve best-effort checkpoint writing and consume the corrected shared result without inventing a second gate or checkpoint |

## Capability Delivery Plan

| CAP | Phase | Files | Verification |
|---|---|---|---|
| CAP-lineage-migration-command | 1 | bin/aioson.js, src/cli.js, src/lib/briefing-refiner/briefing-registry.js, src/lib/briefing-refiner/briefing-paths.js, src/commands/briefing-migrate-lineage.js, src/lib/briefing-lineage-migration.js, tests/briefing-lineage-migration.test.js, src/i18n/messages/en.js, src/i18n/messages/pt-BR.js, src/i18n/messages/es.js, src/i18n/messages/fr.js, tests/i18n-cli.test.js, docs/en/5-reference/cli-reference.md, docs/pt/5-referencia/comandos-cli.md | `node --test tests/briefing-lineage-migration.test.js tests/i18n-cli.test.js` plus normal-binary dry-run/write/idempotency smoke |
| CAP-lineage-source-preservation | 1 | src/lib/briefing-lineage-migration.js, tests/briefing-lineage-migration.test.js, src/lib/feature-source-lineage.js, src/verification/path-policy.js, tests/feature-completeness.test.js, src/lib/briefing-refiner/briefing-registry.js, src/lib/briefing-refiner/briefing-paths.js | `node --test tests/briefing-lineage-migration.test.js tests/feature-completeness.test.js` including mixed evidence, 18 promises and real-path escapes |
| CAP-lineage-prework-lifecycle | 2 | src/lib/feature-source-lineage.js, src/lib/feature-completeness.js, tests/feature-completeness.test.js, tests/feature-completeness-integration.test.js, src/lib/briefing-refiner/briefing-registry.js | `node --test tests/feature-completeness.test.js tests/feature-completeness-integration.test.js` across pre-Product and post-PRD states |
| CAP-lineage-decision-normalization | 2 | src/lib/feature-completeness-format.js, src/lib/feature-source-lineage.js, tests/feature-completeness.test.js | `node --test tests/feature-completeness.test.js` with underscore, hyphen and space aliases |
| CAP-lineage-review-generation | 3 | src/lib/briefing-lineage-migration.js, src/review-intelligence/engine.js, src/lib/sheldon-review.js, src/handoff-contract.js, tests/review-intelligence-cli.test.js, tests/handoff-contract-sheldon.test.js, tests/feature-completeness-integration.test.js | `node --test tests/review-intelligence-cli.test.js tests/handoff-contract-sheldon.test.js tests/feature-completeness-integration.test.js` with mixed current/stale generations |
| CAP-lineage-gate-ownership | 3 | src/lib/feature-repository-fit.js, src/lib/feature-completeness.js, src/lib/gate-checkpoint.js, src/commands/gate-check.js, src/commands/preflight.js, src/commands/artifact-validate.js, src/handoff-contract.js, tests/gate-check.test.js, tests/feature-completeness-integration.test.js, src/commands/gate-approve.js, src/commands/workflow-next.js, src/commands/feature-close.js | `node --test tests/gate-check.test.js tests/feature-completeness-integration.test.js` plus the temporary Cockpit snapshot matrix and `npm test` |

## Phase 1 — O operador migra com segurança pelo CLI real

- CAP/AC: CAP-lineage-migration-command — AC-lineage-001, AC-lineage-002, AC-lineage-003, AC-lineage-004, AC-lineage-015, AC-lineage-020; CAP-lineage-source-preservation — AC-lineage-005, AC-lineage-006, AC-lineage-007, AC-lineage-008.
- User-visible outcome: `aioson briefing:migrate-lineage [path] --slug=<slug>` previews by default, writes only with `--write`, emits the same audit semantics in human/JSON modes and reports already-canonical state without creating another artifact.
- Implementation:
  1. Build a pure parser/transformer for the known legacy inventory and promise headers, preserving line endings and every byte outside the lineage sections.
  2. Validate project existence, slug type/length/format, exact registry ownership, supported lifecycle, briefing/PRD structure, unique IDs, explicit provenance and semantic equality before any mutation.
  3. Resolve source-pack files by lexical and real path, hash only real confined files, and render research/code/URL/conversation into complementary non-canonical evidence without network access.
  4. For `--write`, recheck the analyzed hash, persist a content-addressed backup and bounded transaction marker, atomically promote briefing/report, and recover or finish deterministically on failure.
  5. Wire the command, alias, JSON handling, localized help/messages and English/Portuguese command documentation.
- Create/modify/reuse/retire: create `src/commands/briefing-migrate-lineage.js`, `src/lib/briefing-lineage-migration.js`, `tests/briefing-lineage-migration.test.js`; modify `src/cli.js`, `src/lib/feature-source-lineage.js`, `src/verification/path-policy.js`, `src/i18n/messages/en.js`, `src/i18n/messages/pt-BR.js`, `src/i18n/messages/es.js`, `src/i18n/messages/fr.js`, `tests/feature-completeness.test.js`, `tests/i18n-cli.test.js`, `docs/en/5-reference/cli-reference.md`, `docs/pt/5-referencia/comandos-cli.md`; reuse `bin/aioson.js`, `src/lib/briefing-refiner/briefing-registry.js`, `src/lib/briefing-refiner/briefing-paths.js`; retire none.
- Verification:
  - `node --test tests/briefing-lineage-migration.test.js tests/feature-completeness.test.js tests/i18n-cli.test.js`
  - Invoke `node bin/aioson.js briefing:migrate-lineage <temporary-project> --slug=legacy-lineage --json`, repeat with `--write`, then repeat unchanged and compare briefing, registry, PRD, plan, prototype and review hashes.
- Done when: draft, approved and post-PRD legacy fixtures either produce an exact non-mutating plan or one recoverable canonical rewrite; 18/18 promises remain semantically identical; invalid input and ambiguous/corrupt evidence exit nonzero with zero mutation.

## Phase 2 — A linhagem acompanha a absorção canônica

- CAP/AC: CAP-lineage-prework-lifecycle — AC-lineage-009, AC-lineage-010; CAP-lineage-decision-normalization — AC-lineage-011.
- User-visible outcome: prework ausente continua bloqueando antes do Product, deixa de bloquear depois de absorção completa, e todas as grafias documentadas de `not_applicable` produzem a mesma decisão.
- Implementation:
  1. Parse inventory, promises and Source Coverage before deciding whether a missing physical source is fatal.
  2. Resolve `pre_product`, `post_prd_absorbed` or `contradictory` from the exact registry entry, PRD presence/readiness and one coverage decision per promise.
  3. Require current file/fingerprint before absorption; after absorption accept historical fingerprint for an absent file, preserve absent no-fingerprint evidence only as unavailable complementary evidence, and continue failing a present stale file.
  4. Replace the ad hoc Source Coverage label check with one canonical coverage-decision normalizer and expose lifecycle plus findings from `analyzeFeatureCompleteness`.
- Create/modify/reuse/retire: modify `src/lib/feature-source-lineage.js`, `src/lib/feature-completeness.js`, `src/lib/feature-completeness-format.js`, `tests/feature-completeness.test.js`, `tests/feature-completeness-integration.test.js`; reuse `src/lib/briefing-refiner/briefing-registry.js`; create none; retire none.
- Verification:
  - `node --test tests/feature-completeness.test.js tests/feature-completeness-integration.test.js`
  - Run the fixture matrix through `analyzeFeatureCompleteness` with present/current, present/stale, absent/pre-Product, absent/post-PRD and contradictory registry/PRD states.
- Done when: only coherent post-PRD absorption tolerates missing prework, present drift still fails closed, and `not_applicable`, `not-applicable` and `not applicable` return internal `not_applicable`.

## Phase 3 — Reviews e Gate C convergem sem deadlock

- CAP/AC: CAP-lineage-review-generation — AC-lineage-012, AC-lineage-013; CAP-lineage-gate-ownership — AC-lineage-014, AC-lineage-017, AC-lineage-018; cross-phase closure — AC-lineage-016, AC-lineage-019.
- User-visible outcome: um PASS Sheldon atual prevalece sobre histórico stale não relacionado; Gate C recupera com segurança um baseline legado ausente quando há evidência pós-plano e aponta migração, Sheldon, recuperação, Planner ou Dev conforme a causa real.
- Implementation:
  1. Keep invalid current packets/reports fatal, but classify stale-only generations as history when a different current generation exists; make Sheldon validation inspect its own current packet/report and authority binding.
  2. Have migration output list only packets whose artifact/authority binding is changed; never rewrite or rebind historical JSON.
  3. Extend checkpoint reading with explicit fresh/missing/stale evidence and let implementation-delta validation compare the unchanged plan timestamp/hash with exact `create`/`retire` path states. A path created/retired after the plan proves execution started; a newer plan or ambiguous state blocks recovery without deleting code or writing a checkpoint.
  4. Return structured cause and owner metadata from completeness; consume it in Gate C, artifact validation, DEV preflight and handoff. Workflow and feature close continue through those corrected shared boundaries.
  5. Copy `C:\dev\playapps\aioson-cockpit` to an OS temporary directory in the smoke, run migration dry-run plus the official consumer matrix for `project-squad-runtime`, assert 18/18 promises/lifecycle/hashes, and remove only that generated temporary directory.
- Create/modify/reuse/retire: modify `src/review-intelligence/engine.js`, `src/lib/sheldon-review.js`, `src/lib/briefing-lineage-migration.js`, `src/lib/feature-repository-fit.js`, `src/lib/feature-completeness.js`, `src/lib/gate-checkpoint.js`, `src/commands/gate-check.js`, `src/commands/preflight.js`, `src/commands/artifact-validate.js`, `src/handoff-contract.js`, `tests/review-intelligence-cli.test.js`, `tests/handoff-contract-sheldon.test.js`, `tests/gate-check.test.js`, `tests/feature-completeness-integration.test.js`; reuse `src/commands/gate-approve.js`, `src/commands/workflow-next.js`, `src/commands/feature-close.js`; create none; retire none.
- Verification:
  - `node --test tests/review-intelligence-cli.test.js tests/handoff-contract-sheldon.test.js tests/gate-check.test.js tests/feature-completeness-integration.test.js`
  - `node bin/aioson.js gate:check <temporary-cockpit-copy> --feature=project-squad-runtime --gate=C --json`
  - `node bin/aioson.js artifact:validate <temporary-cockpit-copy> --feature=project-squad-runtime --json`
  - `node bin/aioson.js preflight <temporary-cockpit-copy> --agent=dev --feature=project-squad-runtime --json`
  - Exercise workflow/handoff and feature-close checks only inside the same temporary copy, asserting the shared lineage/baseline classification and cause owner.
  - `npm test`
- Done when: the current AIOSON feature passes Gate C; the copied Cockpit incident no longer receives `implementation_delta_create_path_exists` or a false Planner recommendation solely because its best-effort checkpoint is absent; stale current Sheldon evidence still blocks; all focused tests and `npm test` exit zero.
