---
feature: briefing-lineage-migration
verdict: pass
verified_at: 2026-07-27T16:41:22Z
production_entry: node bin/aioson.js briefing:migrate-lineage
---

# QA — briefing-lineage-migration

## Verdict and blocking findings

**PASS.** A correção DEV preencheu a evidência estrita sem mudar o escopo ou o
comportamento de produto. A auditoria agora mapeia 20/20 ACs com asserções;
o pacote QA focado passou 72/72; e o binário normal confirmou que o incidente
Cockpit permanece canônico, com 18/18 promessas e zero mutação no dry-run.

## CAP/AC evidence table

| CAP | AC | Result | Evidence |
|---|---|---|---|
| CAP-lineage-migration-command | AC-lineage-001 | PASS | `node --test tests/briefing-lineage-migration.test.js ...` passou; o CLI normal permaneceu preview byte-stable e idempotente. |
| CAP-lineage-migration-command | AC-lineage-002 | PASS | Mesmo pacote verificou `--dry-run`, `--write` e opções conflitantes sem mutação indevida. |
| CAP-lineage-migration-command | AC-lineage-003 | PASS | Mesmo pacote conferiu hashes, backup, report, registry e PRD preservados. |
| CAP-lineage-migration-command | AC-lineage-004 | PASS | Mesmo pacote exerceu compare-and-swap e restauração após falha injetada. |
| CAP-lineage-source-preservation | AC-lineage-005 | PASS | Mesmo pacote rejeitou escape por caminho real sem tocar no sentinela externo. |
| CAP-lineage-source-preservation | AC-lineage-006 | PASS | Mesmo pacote preservou pesquisa e URL como evidência complementar não canônica. |
| CAP-lineage-source-preservation | AC-lineage-007 | PASS | Fixture Cockpit-shaped preservou os 18 IDs, intenções e estados de promessa. |
| CAP-lineage-source-preservation | AC-lineage-008 | PASS | Matriz negativa encerrou com código estável e zero mutação. |
| CAP-lineage-prework-lifecycle | AC-lineage-009 | PASS | `tests/feature-completeness.test.js` cobriu fonte ausente antes da absorção. |
| CAP-lineage-prework-lifecycle | AC-lineage-010 | PASS | Mesmo pacote cobriu ausência pós-PRD, drift presente e lifecycle contraditório. |
| CAP-lineage-decision-normalization | AC-lineage-011 | PASS | Mesmo pacote aceitou underscore, hífen e espaço como `not_applicable`. |
| CAP-lineage-review-generation | AC-lineage-012 | PASS | Regressão de migração reportou somente o packet vinculado ao briefing e preservou packet/report históricos byte a byte. |
| CAP-lineage-review-generation | AC-lineage-013 | PASS | `tests/review-intelligence-cli.test.js` e `review:status` preservaram PASS Sheldon atual diante de histórico stale. |
| CAP-lineage-gate-ownership | AC-lineage-014 | PASS | `tests/gate-check.test.js` isolou roteamento para migração, Sheldon e recuperação sem desviar para Planner. |
| CAP-lineage-migration-command | AC-lineage-015 | PASS | `tests/i18n-cli.test.js` e o binário normal expuseram o comando localizado. |
| CAP-lineage-migration-command; CAP-lineage-source-preservation; CAP-lineage-prework-lifecycle; CAP-lineage-decision-normalization; CAP-lineage-review-generation; CAP-lineage-gate-ownership | AC-lineage-016 | PASS | Pacote focado QA 72/72 e Gate D executou `npm run ci` (syntax + `npm test`) com sucesso no fingerprint `sha256:5e65a414…`. |
| CAP-lineage-prework-lifecycle; CAP-lineage-gate-ownership | AC-lineage-017 | PASS | Fixture integrado confirmou Gate C PASS, artifact VALID, preflight READY, handoff válido e feature close válido no mesmo baseline. |
| CAP-lineage-gate-ownership | AC-lineage-018 | PASS | Fixture pós-Plan/pós-DEV sem checkpoint retornou `recovered_execution` sem fabricar checkpoint ou apagar implementação. |
| CAP-lineage-migration-command; CAP-lineage-prework-lifecycle; CAP-lineage-review-generation; CAP-lineage-gate-ownership | AC-lineage-019 | PASS | Smoke Cockpit real confirmou 18/18, SHA idêntico e convergência de Gate C, artifact validate e preflight. |
| CAP-lineage-migration-command | AC-lineage-020 | PASS | Matriz negativa rejeitou projeto/slug inválidos e traversal antes de qualquer acesso fora da raiz. |

## Commands executed and results

- `node bin/aioson.js ac:test-audit . --feature=briefing-lineage-migration --strict`: PASS; 20/20 cobertos, 0 fracos.
- `node --test tests/briefing-lineage-migration.test.js tests/feature-completeness.test.js tests/feature-completeness-integration.test.js tests/review-intelligence-cli.test.js tests/handoff-contract-sheldon.test.js tests/gate-check.test.js tests/i18n-cli.test.js`: PASS; 72/72.
- `npm run ci`: PASS no Gate D em 173.021 ms; `check:syntax` e `npm test` concluíram no fingerprint de implementação `sha256:5e65a414…`.
- `node bin/aioson.js briefing:migrate-lineage C:\dev\playapps\aioson-cockpit --slug=project-squad-runtime --json`: PASS; `already_canonical`, SHA-256 idêntico e zero mutação.
- `node bin/aioson.js gate:check C:\dev\playapps\aioson-cockpit --feature=project-squad-runtime --gate=C --json`: PASS; 18/18 e `recovered_execution`.
- `node bin/aioson.js artifact:validate C:\dev\playapps\aioson-cockpit --feature=project-squad-runtime --json`: PASS; `VALID` com o mesmo baseline.
- `node bin/aioson.js preflight C:\dev\playapps\aioson-cockpit --agent=dev --feature=project-squad-runtime --json`: PASS; `READY` com o mesmo baseline.

## Production-path smoke

- Entry: `node bin/aioson.js briefing:migrate-lineage C:\dev\playapps\aioson-cockpit --slug=project-squad-runtime --json`.
- Trigger: operador solicita preview da migração de linhagem do incidente real.
- Real boundary: dispatch normal do CLI → `runBriefingMigrateLineage` → registry, briefing e validação de confinamento real.
- State change: nenhum, por desenho; o dry-run retornou o mesmo SHA-256 e `already_canonical`.
- Visible result: JSON confirmou zero linhas migradas, zero reviews afetados e `next_action: none`.

Os consumidores oficiais do mesmo snapshot retornaram a mesma classificação de
recuperação: Gate C `PASS`, artifact `VALID` e preflight `READY`; nenhum criou
checkpoint ou alterou o incidente.

## Prototype fidelity and approved deviations

Não aplicável. O PRD declara `prototype_status: none`; nenhum protótipo
histórico foi usado como autoridade de entrega.

## Prototype binding resolution

`none` explícito para `briefing-lineage-migration`; a checagem estrita retornou
`not_applicable` / `explicit_none` sem binding cruzado.

## Engineering-control evidence and recovery result

- Confinamento, slugs inseguros e conflitos de escrita: matriz focada passou.
- Atomicidade, concorrência e idempotência: compare-and-swap, rollback e rerun passaram.
- Lifecycle, normalização, reviews stale e owner causal: cobertura focada passou.
- Recuperação do checkpoint legado: fixture e Cockpit real retornaram
  `recovered_execution` de modo somente leitura.

## Regression/security notes

- Sheldon atual: PASS hash-bound ao PRD SHA-256 `eaedb765494e75bda091f9beee4c912c5eb24acd6204b4de0aedd742bdbcf5c5`.
- `git diff --check` não encontrou erro de whitespace; avisos CRLF são informativos.
- Não houve gatilho concreto para Pentester; o limite real de caminho e symlink foi exercitado pela regressão de migração.
