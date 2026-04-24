---
target_prd: prd-sdlc-process-upgrade.md
feature: sdlc-process-upgrade
agent: sheldon
round: 1
last_enrichment_date: 2026-04-24
readiness: ready_for_downstream
sizing_score: 16
sizing_decision: external_phased_plan_recommended
plan_path: .aioson/plans/sdlc-process-upgrade/manifest.md
sources_used:
  - plans/analise-gap-handoff-orchestrator-artefatos.md
  - plans/analise-gap-aprovacao-gates-sdd.md
  - plans/analise-dev-precedencia-manifest-implementation-plan.md
  - plans/analise-bug-sheldon-parada-anticipada.md
  - plans/analise-bootstrap-memoria-projeto.md
  - plans/analise-devlogs-memoria-sessoes.md
  - plans/analise-sistema-brains-memoria-procedural.md
  - .aioson/agents/product.md
  - .aioson/agents/sheldon.md
  - .aioson/agents/pm.md
  - .aioson/agents/orchestrator.md
  - .aioson/agents/dev.md
  - .aioson/agents/discover.md
  - src/commands/gate-check.js
  - src/commands/artifact-validate.js
  - src/commands/preflight.js
  - src/preflight-engine.js
  - src/handoff-contract.js
---

# Sheldon Enrichment — SDLC Process Upgrade

## Scope note

`plans/` e `prds/` na raiz sao fontes pre-producao. Eles podem ser lidos por `@product` e `@sheldon`, mas nao sao artefatos executaveis, nao sao destino de plano canonico e podem ser descartados depois.

Destinos canonicos confirmados nos arquivos atuais:

| Tipo | Destino canonico | Evidencia |
|---|---|---|
| PRD ativo | `.aioson/context/prd-{slug}.md` | `product.md`, `artifact-map.md` |
| Enrichment Sheldon | `.aioson/context/sheldon-enrichment-{slug}.md` | `artifact-map.md`, `artifact:validate` |
| Plano faseado Sheldon | `.aioson/plans/{slug}/manifest.md` + `plan-*.md` | `enrichment-paths.md`, `project-map.md`, `implementation-plan.js` |
| Implementation plan plano | `.aioson/context/implementation-plan-{slug}.md` | `handoff-contract.js`, `artifact:validate`, rule context boundary |
| Documentacao publica | `docs/pt/` | `project-map.md` — documentacao humana do sistema |

Criar plano operacional em `docs/pt/` e incorreto. `docs/pt/` so deve receber documentacao do sistema quando a mudanca ja foi definida/implementada e precisa ser documentada.

## Validated findings

### F01 — `@sheldon` ainda tem early-exit global antes de selecionar PRD

Severidade: critica.

Estado atual confirmado:
- `.aioson/agents/sheldon.md` tem regra global: se `features.md` marca o PRD como `done` ou se `spec.md` indica implementacao completa, o agente informa e sai.
- A regra aparece antes de RF-01.
- RF-01 so depois manda listar PRDs e selecionar alvo.

Impacto:
- Em projeto com multiplos PRDs, o agente pode sair avaliando estado global, nao o PRD selecionado.
- `spec.md` project-level pode bloquear enrichment de uma feature nova sem relacao direta.

Correcao recomendada:
- Remover early-exit global da secao "Position in the workflow".
- RF-01 deve ser: scan de PRDs -> selecao do alvo -> status check do alvo selecionado.
- `spec.md` nunca deve bloquear PRD feature-level; se existir `spec-{slug}.md` com Gate D aprovado para o slug selecionado, ai sim bloquear.
- PRD existente mas ausente em `features.md` deve gerar warning e continuar.

### F02 — `@product`/`@sheldon` tratam `plans/` corretamente como fonte, mas o risco operacional continua alto

Severidade: alta.

Estado atual confirmado:
- `product.md` e `sheldon.md` dizem explicitamente que `plans/*.md` sao fontes pre-producao, nao planos reais.
- Ambos mandam registrar consumo em `plans/source-manifest.md`.
- `project.context.md` tambem avisa que `plans/` e `prds/` sao fontes de pesquisa pre-producao.

Risco real:
- O nome `plans/` colide semanticamente com `.aioson/plans/{slug}/`.
- O agente pode inferir que deve criar novo plano em `plans/`, principalmente quando o usuario fala "plano".
- A regra correta existe, mas nao esta reforcada como "never write execution artifacts to root plans/".

Correcao recomendada:
- Adicionar regra universal ou process rule: `plans/` root e read-only source area para agentes; somente `source-manifest.md` pode ser atualizado ali.
- Todo plano executavel deve ir para `.aioson/plans/{slug}/` ou `.aioson/context/implementation-plan-{slug}.md`, conforme tipo.

### F03 — O ownership de `implementation-plan-{slug}.md` esta contraditorio

Severidade: critica.

Estado atual confirmado:
- `.aioson/rules/disk-first-artifacts.md` diz que `@pm` deve produzir `.aioson/context/implementation-plan-{slug}.md`.
- `.aioson/rules/aioson-context-boundary.md` lista `implementation-plan-{slug}.md ← pm`.
- `handoff-contract.js` exige `implementation-plan-{slug}.md` para stage `pm`.
- `artifact:validate` exige `implementation-plan-{slug}.md` para MEDIUM.
- `gate-check.js` exige `implementation-plan-{slug}.md` para Gate C.
- Mas `.aioson/agents/pm.md` diz: "Do not silently create implementation-plan.md or implementation-plan-{slug}.md as if they were mandatory outputs".
- `artifact-map.md` e `SKILL.md` ainda atribuem `implementation-plan-{slug}.md` a `@dev`, conflitando com regras e contratos.

Impacto:
- O sistema exige o plano, mas o agente que deveria produzi-lo e instruido a nao produzir.
- Gate C pode ficar estruturalmente bloqueado.

Correcao recomendada:
- Escolher uma unica fonte de verdade: `@pm` produz `implementation-plan-{slug}.md` em MEDIUM.
- Atualizar `pm.md`, `artifact-map.md`, `SKILL.md`, `classification-map.md`, docs e tests.
- `@dev` deve consumir e atualizar estado, nao ser dono primario do plano inicial.

### F04 — `@orchestrator` ignora artefatos tecnicos essenciais de feature mode

Severidade: critica.

Estado atual confirmado:
- Required input do `@orchestrator` nao lista `requirements-{slug}.md`.
- Pre-gate le apenas frontmatter de `spec-{slug}.md`.
- Step 1 manda ler `prd.md` e `architecture.md`.
- Worker context fala em `spec.md`, `discovery.md`, `architecture.md` e implementation plan, mas nao formaliza `requirements-{slug}.md`.

Impacto:
- O orquestrador pode paralelizar sem regras de negocio, ACs e edge cases gerados pelo `@analyst`.
- Em feature mode, `discovery.md` pode estar defasado e nao substituir `requirements-{slug}.md`.

Correcao recomendada:
- `@orchestrator` feature mode deve exigir `requirements-{slug}.md` e corpo de `spec-{slug}.md`.
- `artifact:validate` deve reportar proximo agente e consumidor afetado, nao apenas lista de arquivos ausentes.

### F05 — `@dev` e `@deyvin` nao tem precedencia forte entre manifest e implementation-plan

Severidade: alta.

Estado atual confirmado:
- `dev.md` lista dois modos: SMALL/MEDIUM com `implementation-plan-{slug}.md` e "Feature with Sheldon plan" com `.aioson/plans/{slug}/manifest.md`.
- Mais abaixo, diz "Also check `.aioson/plans/{slug}/manifest.md`".
- A formulacao "also check" torna manifest secundario, nao artefato ativo.

Impacto:
- Quando ambos existem, o agente pode seguir o plano errado.

Correcao recomendada:
- Precedencia canonica:
  1. Manifest Sheldon ativo (`status != complete/done`) vence.
  2. Implementation plan e referencia enquanto manifest ativo existir.
  3. Manifest completo devolve prioridade ao implementation-plan, se houver trabalho pendente.
- `preflight` e `state:save` devem expor `active_execution_artifact`.

### F06 — `preflight` esta permissivo demais para agentes nao implementados no readiness evaluator

Severidade: alta.

Estado atual confirmado:
- `preflight . --agent=sheldon --feature=sdlc-process-upgrade --json` retorna `READY`.
- `context_package` inclui apenas `project.context.md`, sem o PRD.
- `evaluateReadiness()` so tem regras especificas para `dev`, `qa`, `analyst`, `architect`.
- `sheldon`, `product`, `pm`, `orchestrator` nao tem blockers especificos.

Impacto:
- O comando pode dar falso READY.
- Agentes podem iniciar com contexto insuficiente apesar de existirem artefatos obrigatorios.

Correcao recomendada:
- Adicionar readiness/context package por agente oficial.
- Para `@sheldon`: exigir `prd-{slug}.md` e `features.md` quando existir.
- Para `@pm`: exigir PRD, discovery, architecture e, se MEDIUM, Gate B aprovado.
- Para `@orchestrator`: exigir Gate C, requirements/spec/architecture/plan conforme modo.

### F07 — `dev-state.md` stale nao bloqueia nem alerta preflight de nova feature

Severidade: media-alta.

Estado atual confirmado:
- `.aioson/context/dev-state.md` aponta `active_feature: doc-refresh`, `status: done`, `updated_at: 2026-04-17`.
- `preflight` para `sdlc-process-upgrade` inclui esse dev-state antigo no output, mas nao alerta que pertence a outra feature.

Impacto:
- Retomada pode misturar estado velho de documentacao com feature nova.

Correcao recomendada:
- `readDevState`/`preflight` deve classificar `dev_state_relation`: `same_feature`, `different_feature`, `project`, `stale_done`.
- Se `status: done` e `active_feature` diferente do slug, nao tratar como contexto ativo.

### F08 — Bootstrap continua incompleto e refresh do `@discover` nao garante os quatro arquivos

Severidade: alta.

Estado atual confirmado:
- `.aioson/context/bootstrap/` contem `current-state.md`, `how-it-works.md`, `what-it-does.md`.
- `what-is.md` esta ausente.
- `discover.md` diz que refresh mode ativa quando existe qualquer `.md`, e full scan so quando vazio/ausente.
- Refresh depende de `generated_at`, mas arquivos antigos usam `updated_at`; o novo `what-it-does.md` foi criado por `@product`, nao `@discover`.

Impacto:
- `@product` e `@analyst` esperam `what-is.md` e `what-it-does.md`; um deles ainda nao existe.
- O cache semantico pode parecer presente mas estar parcialmente invalido.

Correcao recomendada:
- `@discover` refresh deve primeiro garantir os quatro arquivos.
- `generated_at` ausente deve cair para `updated_at`, mtime ou full regeneration assistida.
- `preflight` deve reportar bootstrap incompleto para agentes que dependem dele.

### F09 — Gate parsing aceita formatos diferentes, mas o contrato documentado usa YAML nested que pode falhar

Severidade: alta.

Estado atual confirmado:
- `parseGatesFromSpec()` reconhece campos `gate_requirements`, `gate_design`, `gate_plan`, `gate_execution`, JSON inline em `phase_gates`, e linhas de texto `Gate A: approved`.
- `approval-gates.md` e algumas rules mostram `phase_gates:` YAML nested.
- `spec-harness-driven-aioson.md` usa YAML nested para `phase_gates`.
- O parser simples de frontmatter nao entende YAML nested; nesse caso, o fallback por linhas de conteudo pode funcionar acidentalmente porque ha comentarios contendo "approved".

Impacto:
- Gate pode passar ou falhar por acidente textual, nao por schema confiavel.

Correcao recomendada:
- Padronizar formato machine-readable dos gates: campos flat `gate_requirements`, etc., ou JSON inline.
- Atualizar templates e docs para nao usar YAML nested se o parser continuar simples.
- Adicionar teste com `phase_gates:` nested sem comentarios para provar o bug.

### F10 — `workflow:execute` implementa `--feature`, mas o help principal esta desatualizado

Severidade: media.

Estado atual confirmado:
- `workflow-execute.js` exige `options.feature`.
- Help principal mostra `workflow:execute [path] [--steps=<n>] [--dry-run] [--lane=<n>]`, sem `--feature`, `--tool`, `--start-from`, `--max-checkpoints`.
- `docs/pt/comandos-cli.md` documenta `--feature`.

Impacto:
- Usuario seguindo `--help` fica bloqueado ou usa comando incompleto.

Correcao recomendada:
- Atualizar help/i18n do CLI e schemas para refletir implementacao real.
- Adicionar teste que help lista flags obrigatorias de comandos novos.

### F11 — `devlog:process` existe; a analise antiga que dizia "nao existe" esta stale

Severidade: media.

Estado atual confirmado:
- `src/cli.js` registra `devlog:process`.
- `src/commands/devlog-process.js` implementa processamento.
- Analise em `plans/analise-devlogs-memoria-sessoes.md` esta parcialmente stale.

Risco ainda aberto:
- Nao foi validado nesta rodada se o comando processa os devlogs reais sem erro, porque ele modifica arquivos adicionando `processed_at`.

Correcao recomendada:
- Criar fixture em teste temporario/copia para validar `devlog:process` sem tocar devlogs reais.
- Atualizar a analise ou deixar claro que `plans/` pode estar stale.

### F12 — `project-map.md` nao se aplica aos agentes que mais erram path de produto/processo

Severidade: media.

Estado atual confirmado:
- `project-map.md` aplica para `[dev, architect, ux-ui, qa, tester, committer]`.
- `product`, `sheldon`, `pm`, `orchestrator`, `discover` nao estao na lista.
- O erro de criar plano em `docs/pt/` ocorreu justamente fora dos agentes cobertos pelo mapa.

Correcao recomendada:
- Tornar `project-map.md` universal ou incluir todos os agentes que criam artefatos.
- Adicionar regra explicita: `docs/pt/` e documentacao do sistema, nao scratchpad e nao plano operacional.

## Sizing

Score estimado: 16.

Justificativa:
- 8+ trilhas/areas de correcao: gates, handoff, PM plan, dev precedence, Sheldon RF-01, preflight, bootstrap, devstate, docs/help, devlogs.
- 3+ artefatos/contratos de estado envolvidos: context, plans, runtime, docs, prompts, source manifests.
- Multiplos agentes oficiais afetados.
- CLI e prompts precisam mudar juntos.
- Requer testes de regressao cross-module.

Decisao: plano externo criado em `.aioson/plans/sdlc-process-upgrade/` apos confirmacao do usuario.

## Improvements applied

- Criado enrichment slug-specific para satisfazer a cadeia de artefatos esperada por `artifact:validate`.
- Separadas fontes `plans/` de destinos canonicos.
- Validados achados contra arquivos atuais em vez de confiar apenas nos documentos de analise.
- Criado plano faseado oficial em `.aioson/plans/sdlc-process-upgrade/`.

## Improvements discarded

- Nao foi criado arquivo em `docs/pt/`.
- Nao foram editados prompts ou codigo nesta rodada.

## Recommended phased plan

Plano criado:

```text
.aioson/plans/sdlc-process-upgrade/
  manifest.md
  plan-canonical-paths-and-source-contract.md
  plan-gates-and-gate-approval.md
  plan-implementation-plan-ownership.md
  plan-handoff-and-preflight-readiness.md
  plan-sheldon-and-dev-execution-state.md
  plan-memory-and-observability.md
  plan-docs-help-and-regression-tests.md
```

## Handoff

Proximo agente: `@analyst`.

Antes de `@analyst`, decisao humana recomendada:

- Aprovar ou ajustar a criacao do plano externo em `.aioson/plans/sdlc-process-upgrade/`.
- Confirmar a decisao de ownership: `@pm` e dono de `implementation-plan-{slug}.md` em MEDIUM.

Se o plano externo for aprovado, `@analyst` deve ler este enrichment e o manifest futuro antes de escrever `requirements-sdlc-process-upgrade.md`.
Com o plano criado, `@analyst` deve ler este enrichment e `.aioson/plans/sdlc-process-upgrade/manifest.md` antes de escrever `requirements-sdlc-process-upgrade.md`.
