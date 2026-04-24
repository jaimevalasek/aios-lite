---
feature: sdlc-process-upgrade
classification: MEDIUM
created_at: "2026-04-24T01:07:04-03:00"
gate_design: approved
sources:
  - .aioson/context/prd-sdlc-process-upgrade.md
  - .aioson/context/requirements-sdlc-process-upgrade.md
  - .aioson/context/spec-sdlc-process-upgrade.md
  - .aioson/context/sheldon-enrichment-sdlc-process-upgrade.md
  - .aioson/plans/sdlc-process-upgrade/manifest.md
---

# Architecture — SDLC Process Upgrade

## 1. Architecture Overview

Esta feature deve fechar o ciclo de desenvolvimento do AIOSON sem criar um segundo motor de workflow. A arquitetura correta e uma camada de contrato deterministico em cima dos componentes existentes: `preflight-engine`, `gate:check`, `workflow:execute`, `artifact:validate`, `handoff-contract`, `agent:done`, `pulse:update`, prompts oficiais e regras de path.

O resultado esperado e que o CLI determine estado, gates, contexto e proximo agente; os prompts apenas consumam esse estado e expliquem ao usuario a acao concreta.

## 2. Design Decisions

### D1 — Um unico motor de workflow

`workflow:next` e `workflow:execute` continuam sendo o centro da progressao. Nenhum agente, plano ou comando novo deve criar uma orquestracao paralela para resolver este problema.

Racional: o projeto ja tem handoff contracts, runtime state, workflow state, gates e preflight. O problema e desalinhamento entre essas pecas, nao ausencia de motor.

### D2 — `@pm` e dono do implementation plan MEDIUM

Para features MEDIUM, `.aioson/context/implementation-plan-{slug}.md` deve ser produzido por `@pm`. `@architect` fornece decisoes tecnicas, `@orchestrator` distribui/coordena, e `@dev` executa.

Racional: Gate C exige plano aprovado antes de implementacao. Se `@dev` cria o plano inicial, ele fica responsavel por aprovar a propria execucao, quebrando separacao de fases.

### D3 — `gate:approve` deve ser deterministico e validar antes de escrever

Adicionar `src/commands/gate-approve.js` como caminho feliz de aprovacao. O comando deve rodar a mesma validacao de `gate:check`; se `gate:check` bloquear, `gate:approve` tambem bloqueia. Quando passar, atualiza `spec-{slug}.md` usando campos flat `gate_requirements`, `gate_design`, `gate_plan`, `gate_execution`.

Racional: hoje o usuario recebe mensagens de gate, mas nao tem um caminho claro de aprovacao. Editar YAML manualmente nao deve ser o caminho principal.

### D4 — Formato de gates deve ser machine-readable simples

O formato canonico no MVP e frontmatter flat:

```yaml
gate_requirements: approved
gate_design: approved
gate_plan: pending
gate_execution: pending
```

`phase_gates` nested YAML pode continuar sendo aceito apenas se o parser for expandido com suporte real. Ate la, docs/templates/prompts nao devem tratar nested YAML como contrato canonico.

### D5 — `preflight` deve ser role-aware

`buildContextPackage()` e `evaluateReadiness()` devem ter regras especificas para todos os agentes oficiais do fluxo: `product`, `sheldon`, `analyst`, `architect`, `ux-ui`, `pm`, `orchestrator`, `dev`, `deyvin`, `qa`.

Racional: falso READY acontece quando agentes sem regras especificas caem no default permissivo.

### D6 — Manifest Sheldon ativo vence implementation plan durante execucao

Se `.aioson/plans/{slug}/manifest.md` existir e nao estiver `complete`/`done`, ele e `active_execution_artifact`. O implementation plan continua obrigatorio para Gate C em MEDIUM, mas vira contexto auxiliar enquanto o manifest controla as fases.

Racional: o usuario quer preservar detalhes do enrichment/fases Sheldon ate o `@dev`. A precedencia precisa ser explicitada pelo CLI e pelos prompts.

### D7 — `project-pulse` e resumo de retomada; runtime e log tecnico

`agent:done` deve registrar runtime e, para agentes oficiais, deixar dados suficientes para `pulse:update` ou uma atualizacao automatica equivalente. `project-pulse.md` permanece o arquivo humano/agente para retomada curta.

Racional: SQLite/runtime e bom para dashboard; `project-pulse.md` e o primeiro arquivo que agentes leem em novo chat.

## 3. Folder and Module Structure

Nao criar uma pasta nova de dominio para esta feature. A mudanca atravessa comandos e contratos existentes.

```text
src/
  cli.js
  preflight-engine.js
  handoff-contract.js
  commands/
    artifact-validate.js
    gate-check.js
    gate-approve.js          # novo
    preflight.js
    workflow-execute.js
    workflow-next.js
    workflow-status.js
    pulse-update.js
    runtime.js
    agent-done*.js           # usar arquivo existente que registra agent:done
  i18n/
    messages/
      en.js
      pt-BR.js
      es.js
      fr.js

.aioson/
  agents/
    product.md
    sheldon.md
    analyst.md
    architect.md
    pm.md
    orchestrator.md
    dev.md
    deyvin.md
    qa.md
    discover.md
  rules/
    aioson-context-boundary.md
    disk-first-artifacts.md
    project-path-contract.md  # novo ou equivalente universal
  skills/process/aioson-spec-driven/references/
    artifact-map.md
    approval-gates.md
    classification-map.md
    pm.md

template/
  .aioson/
    agents/
    rules/
    skills/process/aioson-spec-driven/references/

test/
  *.test.js                  # seguir padrao existente node:test
```

Nomeclatura segue o `design-doc.md`: arquivos CLI em kebab-case, responsabilidades pequenas e reuso antes de criar novos modulos.

## 4. Module Responsibilities

### `src/preflight-engine.js`

Responsabilidades novas:

- Expor `active_execution_artifact`.
- Classificar `dev_state_relation`: `same_feature`, `different_feature`, `stale_done`, `project`, `unknown`.
- Construir context package por agente oficial.
- Bloquear ou alertar quando um agente nao tem contexto minimo.
- Detectar manifest ativo em `.aioson/plans/{slug}/manifest.md`.
- Ler gates por parser unico compartilhado.

### `src/commands/preflight.js`

Responsabilidades novas:

- Exibir `next_agent`, `next_missing`, `active_execution_artifact` e warnings de stale state.
- Mostrar READY, READY_WITH_WARNINGS ou BLOCKED.
- Em JSON, manter campos estaveis para consumo por `workflow:execute`, agentes e testes.

### `src/commands/gate-check.js`

Responsabilidades novas:

- Exportar `checkGate()` para reuso por `gate-approve`.
- Melhorar recomendacao por gate:
  - Gate A bloqueado -> `@analyst`
  - Gate B bloqueado -> `@architect`
  - Gate C bloqueado -> `@pm`
  - Gate D bloqueado -> `@qa`
- Validar status do `implementation-plan-{slug}.md` em Gate C, nao apenas existencia.

### `src/commands/gate-approve.js`

Novo comando.

Contrato:

```bash
aioson gate:approve . --feature=<slug> --gate=<A|B|C|D>
aioson gate:approve . --feature=<slug> --gate=<A|B|C|D> --json
```

Fluxo:

1. Reusar `checkGate()`.
2. Se BLOCKED, retornar erro com blockers e `next_agent`.
3. Se PASS, atualizar o campo flat correspondente em `spec-{slug}.md`.
4. Atualizar `last_checkpoint`.
5. Opcionalmente emitir runtime/pulse quando flags ou contexto indicarem.

Sem confirmacao interativa no MVP. O comando so escreve quando a validacao deterministica passa.

### `src/commands/artifact-validate.js`

Responsabilidades novas:

- Calcular `next_missing`.
- Calcular `next_agent`.
- Corrigir contagem de REQ/AC para IDs slugged como `REQ-SDLC-01` e `AC-SDLC-01`.
- Considerar Gate B/Gate C no diagnostico, nao apenas existencia de arquivos.

### `src/handoff-contract.js`

Responsabilidades novas:

- Reconciliar `pm` como dono de `implementation-plan-{slug}.md`.
- Tratar `orchestrator` como consumidor de Gate C aprovado.
- Para Gate C, exigir plan existente e status aprovado.
- Usar o mesmo parser/validador compartilhado de gates do `preflight-engine`.

### `src/commands/workflow-execute.js`

Responsabilidades novas:

- Em dry-run, prever blockers com a mesma regra de `artifact:validate` e `preflight`.
- Garantir que help/documentacao liste `--feature`, `--tool`, `--start-from`, `--max-checkpoints` e flags realmente suportadas.
- Sequencia MEDIUM deve respeitar `@pm` antes de `@orchestrator`/`@dev`.

### `src/commands/pulse-update.js` e `agent:done`

Responsabilidades novas:

- Padronizar output de retomada: last_agent, last_gate, active_feature, blockers, next action.
- Evitar dois formatos concorrentes para `project-pulse.md`.
- Se `agent:done` nao atualizar pulse automaticamente, ele deve pelo menos registrar dados que permitam `pulse:update` ou handoff deterministicamente.

## 5. Prompt and Rule Architecture

### Universal path contract

Adicionar regra universal ou ampliar regra existente para cobrir todos os agentes que criam artefatos:

- `plans/` root: source-only, read-only para agentes, exceto `plans/source-manifest.md`.
- `.aioson/plans/{slug}/`: phased plan do Sheldon.
- `.aioson/context/implementation-plan-{slug}.md`: plano de execucao PM/SDD.
- `docs/pt/`: documentacao publica do sistema, nunca plano operacional.

Agentes afetados:

- `@product`
- `@sheldon`
- `@analyst`
- `@architect`
- `@pm`
- `@orchestrator`
- `@dev`
- `@deyvin`
- `@qa`
- `@discover`

### Prompt updates required

| Agent | Architectural change |
|---|---|
| `@product` | Handoff sempre informa proximo agente, criterio de passagem e artifact path; registra `features.md`. |
| `@sheldon` | RF-01 seleciona PRD antes de early-exit; `spec.md` project-level nao bloqueia feature PRD. |
| `@analyst` | Ler `sheldon-enrichment-{slug}.md`; usar gate fields flat ou comando de aprovacao. |
| `@architect` | Gate B por spec slug e arquitetura atual da feature; nao confiar em architecture.md antigo. |
| `@pm` | Produzir `implementation-plan-{slug}.md` em MEDIUM; marcar Gate C quando aprovado. |
| `@orchestrator` | Ler `requirements-{slug}.md` e corpo de `spec-{slug}.md`; exigir Gate C. |
| `@dev` | Aplicar precedencia manifest ativo > implementation plan auxiliar; bloquear sem Gate C em MEDIUM. |
| `@deyvin` | Mesma precedencia de `@dev` em continuidade. |
| `@qa` | Usar conformance YAML e Gate D; validar comportamento, artifacts e links. |
| `@discover` | Refresh deve criar bootstrap faltante, nao assumir cache parcial completo. |

Sempre atualizar `template/.aioson/agents/` junto com `.aioson/agents/` quando a mudanca for parte do framework distribuido.

## 6. Gate and State Model

### Gate states

Estados permitidos:

- `pending`
- `approved`
- `rejected`
- `skipped` apenas quando a classificacao permitir explicitamente

### Gate prerequisites

| Gate | Owner | Required before | Required evidence |
|---|---|---|---|
| A requirements | `@analyst` | `@architect` | requirements + spec with `gate_requirements: approved` |
| B design | `@architect` | `@pm` | architecture + spec with `gate_design: approved` |
| C plan | `@pm` | `@orchestrator`/`@dev` | implementation plan status approved + spec with `gate_plan: approved` |
| D execution | `@qa` | feature close | QA sign-off PASS + spec with `gate_execution: approved` |

### Next agent resolution

O algoritmo comum deve seguir esta ordem:

1. Se PRD ausente -> `@product`.
2. Se enrichment requerido e ausente/stale em MEDIUM -> `@sheldon`.
3. Se requirements ou Gate A ausente -> `@analyst`.
4. Se architecture ou Gate B ausente -> `@architect`.
5. Se UI existir/aplicar e ui-spec ausente -> `@ux-ui`.
6. Se implementation plan ou Gate C ausente -> `@pm`.
7. Se paralelizacao for aplicavel e Gate C aprovado -> `@orchestrator`.
8. Se implementacao pendente -> `@dev`.
9. Se QA/Gate D pendente -> `@qa`.

Para este projeto CLI (`project_type=script`), `@ux-ui` e informativo/skip salvo se a feature tocar dashboard ou experiencia visual.

## 7. Integration Architecture

### CLI registration

`src/cli.js` deve registrar:

- `gate:approve`
- alias `gate-approve`
- help atualizado nos locales

### i18n/help

Atualizar:

- `src/i18n/messages/en.js`
- `src/i18n/messages/pt-BR.js`
- `src/i18n/messages/es.js`
- `src/i18n/messages/fr.js`

O help deve refletir a implementacao real. Hoje `workflow:execute` implementa `--feature`, mas o help principal nao mostra isso.

### Runtime and dashboard

Nao alterar dashboard nesta feature. O runtime SQLite recebe eventos via comandos existentes. `project-pulse.md` continua como artefato de retomada lido por agentes.

### Docs

`docs/pt/` so deve ser atualizado depois que CLI e prompts estiverem alinhados. Nao criar plano operacional ali.

## 8. Phase-by-Phase Architecture Map

### Phase 1 — Canonical Paths and Source Contract

Tocar:

- `.aioson/rules/`
- `.aioson/context/project-map.md` se mantido como mapa
- `.aioson/agents/product.md`
- `.aioson/agents/sheldon.md`
- `.aioson/agents/pm.md`
- `.aioson/agents/orchestrator.md`
- `.aioson/agents/discover.md`
- templates equivalentes

Critico: garantir regra universal antes de editar docs.

### Phase 2 — Gates and Approval UX

Tocar:

- `src/commands/gate-check.js`
- `src/commands/gate-approve.js`
- `src/preflight-engine.js`
- `src/cli.js`
- `src/i18n/messages/*.js`
- `.aioson/skills/process/aioson-spec-driven/references/approval-gates.md`
- prompts que comunicam handoff

Critico: `gate:approve` deve ser testado com PASS e BLOCKED.

### Phase 3 — State Continuity and Next Step

Tocar:

- `src/commands/preflight.js`
- `src/preflight-engine.js`
- `src/commands/workflow-execute.js`
- `src/commands/workflow-status.js`
- `src/commands/pulse-update.js`
- comando/arquivo real de `agent:done`

Critico: comandos precisam concordar sobre `next_agent`.

### Phase 4 — Implementation Plan Ownership

Tocar:

- `.aioson/agents/pm.md`
- `template/.aioson/agents/pm.md`
- `.aioson/skills/process/aioson-spec-driven/references/artifact-map.md`
- `.aioson/skills/process/aioson-spec-driven/references/pm.md`
- `.aioson/rules/*.md`
- `src/handoff-contract.js`
- `src/commands/artifact-validate.js`
- `src/commands/gate-check.js`

Critico: eliminar contradicao onde `@pm` e instruido a nao criar o plano que o sistema exige.

### Phase 5 — Handoff and Preflight Readiness

Tocar:

- `src/preflight-engine.js`
- `src/commands/preflight.js`
- `src/commands/artifact-validate.js`
- `.aioson/agents/orchestrator.md`
- template equivalente

Critico: `orchestrator` deve bloquear sem requirements/spec/Gate C.

### Phase 6 — Dev Execution Context

Tocar:

- `src/preflight-engine.js`
- `src/commands/preflight.js`
- `src/commands/workflow-execute.js`
- `.aioson/agents/dev.md`
- `.aioson/agents/deyvin.md`
- templates equivalentes

Critico: manifest ativo vence e deve aparecer em `active_execution_artifact`.

### Phase 7 — Product and Sheldon Flow

Tocar:

- `.aioson/agents/product.md`
- `.aioson/agents/sheldon.md`
- templates equivalentes
- possivelmente `src/commands/artifact-validate.js` para repair suggestion

Critico: RF-01 do Sheldon precisa mudar de ordem.

### Phase 8 — Memory, Observability, Docs and Regression Tests

Tocar:

- `.aioson/agents/discover.md`
- template equivalente
- `src/commands/devlog-process.js`
- `src/commands/runtime.js`
- `src/commands/pulse-update.js`
- `src/cli.js`
- docs finais em `docs/pt/`
- testes node:test

Critico: docs so depois do comportamento real.

## 9. Testing Architecture

Usar `node:test` conforme `project.context.md`.

Suites recomendadas:

| Test area | Target |
|---|---|
| Path contract | Prompts/rules nao mandam criar planos em `docs/pt/` ou root `plans/`. |
| Gate parser | Flat fields passam; nested YAML sem suporte nao passa acidentalmente. |
| `gate:approve` | Bloqueia quando `gate:check` bloqueia; escreve campo flat quando passa. |
| `artifact:validate` | Retorna `next_missing` e `next_agent`; conta `REQ-SDLC-*` e `AC-SDLC-*`. |
| Preflight readiness | `sheldon`, `pm`, `orchestrator`, `dev`, `qa` nao recebem falso READY. |
| Dev state relation | `dev-state.md` de outra feature done vira warning/contexto historico. |
| Manifest precedence | Manifest ativo vence implementation plan; phases done sao puladas. |
| Sheldon RF-01 | PRD target selection ocorre antes de early-exit. |
| PM ownership | Todas as fontes dizem que `@pm` cria initial implementation plan MEDIUM. |
| Bootstrap refresh | `@discover` cria bootstrap files faltantes. |
| Help alignment | `workflow:execute` help lista flags reais. |

Testes que alteram devlogs ou runtime devem usar fixture/copia em `/tmp` ou diretorio temporario, nunca devlogs reais do workspace.

## 10. Implementation Sequence for @pm

`@pm` deve criar `.aioson/context/implementation-plan-sdlc-process-upgrade.md` com:

1. Context package obrigatorio por fase.
2. Ordem de implementacao alinhada as 8 fases Sheldon.
3. Checkpoint de done por fase.
4. Arquivos candidatos de leitura/escrita.
5. Testes exigidos por fase.
6. Regras de template sync quando prompts forem alterados.
7. Decisoes finais:
   - `@pm` owns implementation plan MEDIUM.
   - `gate:approve` e deterministico e valida antes de escrever.
   - manifest ativo vence implementation plan durante execucao.
   - `docs/pt/` so recebe docs finais.

Gate C deve ficar bloqueado enquanto esse arquivo nao existir com `status: approved` e `gate_plan: approved`.

## 11. Implementation Sequence for @dev

Depois de Gate C:

1. Criar testes de contrato para path/gates/preflight antes de editar prompts amplamente.
2. Implementar parser/approval/gate fixes.
3. Implementar `next_missing`/`next_agent` em `artifact:validate`.
4. Implementar role-aware preflight e dev-state relation.
5. Alinhar prompts/rules/templates.
6. Implementar PM ownership e orchestrator context.
7. Implementar manifest precedence para `@dev`/`@deyvin`.
8. Corrigir Sheldon RF-01 e Product handoff.
9. Corrigir bootstrap/discover/devlog/help.
10. Atualizar docs finais.
11. Rodar `npm test` e testes especificos.

## 12. Non-goals and Deferred Items

- Nao criar dashboard/UI.
- Nao criar segundo workflow engine.
- Nao implementar isolamento real de worktree/lane.
- Nao migrar todo historico antigo.
- Nao mudar o formato de todos os artefatos de uma vez.
- Nao transformar root `plans/` em documentacao permanente.
- Nao exigir web research para esta fase; os achados ja foram validados contra arquivos locais.

## 13. Handoff

Gate B esta aprovado para `sdlc-process-upgrade`.

Proximo agente: `@pm`.

Por que: esta feature e MEDIUM e precisa de Gate C antes de `@orchestrator` ou `@dev`. O `@pm` deve produzir `.aioson/context/implementation-plan-sdlc-process-upgrade.md`, com status aprovado, usando PRD, enrichment, requirements, spec, conformance e este architecture.

Comando/acao recomendada:

```bash
node bin/aioson.js preflight . --agent=pm --feature=sdlc-process-upgrade
```

Depois, ativar `@pm`.

> **Gate B:** Architecture approved — @dev can proceed.
