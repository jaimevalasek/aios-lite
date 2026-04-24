---
slug: context-archive-done
status: in_progress
started: 2026-04-24
classification_expected: SMALL
owner: "@product"
---

# PRD — Context Archive Done

## Vision
Manter o `.aioson/context/` enxuto automaticamente movendo os artefatos de features concluídas para uma pasta `done/` — sem o usuário precisar lembrar e sem que os agentes percam a memória histórica das features já entregues.

## Problem
O diretório `.aioson/context/` acumula, a cada feature entregue, uma família de arquivos (`prd-`, `spec-`, `requirements-`, `architecture-`, `implementation-plan-`, `sheldon-enrichment-`, `qa-report-`, `evals-`, `conformance-`, `security-findings-`) no root, misturados com artefatos globais vivos (`project.context.md`, `project-pulse.md`, `features.md`, etc.).

Hoje esse repositório tem **54 arquivos no root**, sendo **18 pertencentes a 4 features já marcadas como `done`** em `features.md`. A tendência é crescer indefinidamente conforme o projeto evolui, prejudicando:
- **Leitura humana**: difícil achar o que é atual
- **Onboarding de agentes**: agentes como `@cypher`, `@discover`, `@neo` e `@sheldon` que fazem glob em `prd*.md` acabam listando/carregando features antigas irrelevantes
- **Token budget**: agentes potencialmente leem headers de PRDs arquivados desnecessariamente

Arquivar manualmente não é solução — o usuário esquece; se move sem gerar manifest os agentes que dependem de visão histórica (para dedup de ideias ou bootstrap) perdem a trilha.

## Users
- **AIOSON operator (desenvolvedor usando o CLI)**: precisa que o `.aioson/context/` fique limpo sem ação manual após cada feature concluída; precisa poder reabrir (restore) uma feature arquivada se for necessário retomar o trabalho
- **Agentes de fluxo ativo (@dev, @analyst, @qa, @tester, @pm, @ux-ui, @product, @architect, @orchestrator, @pentester)**: já consomem apenas a feature ativa — precisam que o comportamento atual permaneça inalterado
- **Agentes de visão histórica (@cypher, @neo, @discover, @sheldon)**: precisam continuar tendo visibilidade sobre features já entregues para dedup, contexto geral, bootstrap e menu de enrichment — mas com custo de tokens baixo (manifest enxuto em vez de glob de PRDs completos)

## MVP scope

### Must-have 🔴
- **Comando CLI `aioson feature:archive . --feature=<slug>`**
  - Glob ancorado `*-{slug}.{md,yaml,json}` **apenas no root** de `.aioson/context/` (não recursivo, não entra em subdirs)
  - Move os arquivos batidos para `.aioson/context/done/{slug}/` preservando nomes
  - Cria/atualiza `.aioson/context/done/MANIFEST.md` com uma linha por feature (slug, completed-date, file_count, one-line summary extraído do PRD)
  - Safety guard: aborta se o slug não estiver como `done` em `features.md` (evita arquivar feature ativa por engano)
  - Suporta flag `--dry-run` (lista o que moveria, sem tocar em nada)
  - Suporta flag `--restore` (reverte: move de `done/{slug}/` de volta para o root e remove a linha do manifest)
  - Idempotente: rodar duas vezes sobre a mesma feature é no-op silencioso
  - Retorna JSON quando `--json` (para consumo programático)

- **Hook automático em `aioson feature:close`**
  - Quando `--verdict=PASS`, após atualizar spec/features/pulse, executar `runFeatureArchive` internamente
  - Atrás de flag opt-in `--archive` na **primeira entrega** (reduz risco na introdução)
  - Critério para virar default num ciclo futuro (não neste): comando rodar sem incidentes em ao menos 2 fechamentos reais
  - Objetivo: o usuário final jamais precisa digitar `feature:archive` manualmente

- **Atualização de 4 agentes** (1 linha cada, seção "Required input" ou equivalente):
  - `@cypher` — para dedup contra features entregues
  - `@neo` — para contexto geral do projeto
  - `@discover` — para montar `bootstrap/what-it-does.md` com features históricas
  - `@sheldon` — para limpar o menu de enrichment de features already done
  - Linha padrão: "Also read `.aioson/context/done/MANIFEST.md` for a summary of archived (done) features — do NOT load the archived files themselves unless the user explicitly requests history."

- **Dogfooding na entrega**: rodar o comando retroativamente para arquivar as 4 features `done` existentes (`cypher-agent`, `harness-driven-aioson`, `design-governance`, `pentester-agent`) + a recém-fechada `sdlc-process-upgrade`, validando que o manifest e a estrutura `done/{slug}/` ficam corretos.

### Should-have 🟡
- **Glob resiliente a extensões futuras**: atualmente `{md,yaml,json}` cobrem tudo. Se surgirem `.yml` ou `.txt` no futuro, a lista é config isolada (constante no comando).
- **Validação do MANIFEST** em `aioson doctor` ou `context:health`: avisar se há feature `done` em `features.md` mas não registrada no manifest (drift detection).

## Out of scope
- **Não arquivar arquivos globais**: `project.context.md`, `project-pulse.md`, `features.md`, `discovery.md`, `design-doc.md`, `prd.md`, `architecture.md`, `spec.md`, `scan-*.md`, `test-plan.md`, `test-inventory.md`, `module-src.md`, `context-pack.md`, `memory-index.md`, `dev-state.md`, `tasks.md`, `handoff-*.json`, `hardening-report.md`, `qa-report-test-coverage.md`, `spec.md.template` — o glob ancorado por slug não bate neles, mas reafirmar aqui como contrato.
- **Não tocar em subdirs existentes**: `bootstrap/`, `forensics/`, `parallel/`, `pipeline-retries/`, `seeds/` permanecem intactos.
- **Não arquivar features com status ≠ `done`**: `in_progress`, `abandoned`, `qa_failed` ficam no root.
- **Não modificar comportamento de agentes de fluxo ativo**: `@dev`, `@analyst`, `@qa`, `@tester`, `@pm`, `@ux-ui`, `@product`, `@architect`, `@orchestrator`, `@pentester` continuam iguais — eles já filtram via `features.md`.
- **Não mexer em `plans/`, `prds/`, `briefings/`** — estão fora de escopo (são fontes pré-produção).

## User flows

### Flow principal — arquivamento automático no fechamento de feature
`@qa` aprova a feature → executa `aioson feature:close . --feature={slug} --verdict=PASS --archive` → sistema atualiza `spec-{slug}.md` (QA sign-off), atualiza `features.md` (→ done), limpa `project-pulse.md`, e em seguida chama `runFeatureArchive({ feature: slug })` → arquivos `*-{slug}.{md,yaml,json}` são movidos para `.aioson/context/done/{slug}/` → manifest recebe nova linha → usuário recebe log único com todas as ações.

### Flow secundário — arquivamento retroativo manual
Usuário roda `aioson feature:archive . --feature=cypher-agent` → comando verifica status em `features.md` → confirma `done` → move os 2 arquivos (`prd-cypher-agent.md`, `sheldon-enrichment-cypher-agent.md`) → atualiza manifest → imprime resumo.

### Flow de reversão — reabrir feature arquivada
Se o usuário quiser voltar a mexer numa feature done: `aioson feature:archive . --feature={slug} --restore` → arquivos voltam para o root → linha do manifest é removida → usuário atualiza `features.md` manualmente se quiser mudar o status.

### Flow dry-run
`aioson feature:archive . --feature={slug} --dry-run` → lista arquivos que seriam movidos + destino + mudança no manifest, sem tocar em nada. Usado antes de rodar em features grandes ou em batch.

## Success metrics
- **Redução do root de `.aioson/context/`**: pós-dogfooding, root cai de 54 → ~30 arquivos (só globais + feature ativa), verificável por `ls .aioson/context/ -1 | wc -l`.
- **Zero regressão em agentes de fluxo ativo**: `@dev`, `@analyst`, `@qa` continuam abrindo o feature mode corretamente (teste: abrir uma feature simulada, verificar leituras).
- **Visão histórica preservada**: `@cypher` e `@discover` conseguem listar features entregues via manifest com ≤1% do custo de tokens do glob atual.
- **Taxa de adoção do hook**: após virar default (ciclo futuro), 100% dos `feature:close --verdict=PASS` resultam em arquivamento sem intervenção humana.
- **Reversibilidade comprovada**: `--restore` consegue reabrir qualquer feature arquivada sem perda de arquivo (teste E2E).

## Open questions
- **Nome da flag no `feature:close`**: `--archive` (opt-in explícito) vs `--no-archive` (default-on desde já). Recomendação atual: `--archive` opt-in no primeiro release, promover a default após 2 closures estáveis. Decisão final fica com `@architect`.
- **Padrão do one-line summary no manifest**: extrair da linha `## Vision` do PRD? Do frontmatter? Primeiro parágrafo? Decisão de `@analyst`/`@dev`.
- **Comportamento se `features.md` não existir**: abortar com erro ou criar sob demanda? Recomendação: abortar — a ausência é um sinal de projeto não inicializado.
- **Git guard**: o comando precisa respeitar `git-guard.json`? Provavelmente sim (mover arquivos é mutação). Validar com `@architect`.

## Next step

Classificação proposta: **SMALL** (1 comando CLI novo + 1 hook + 4 edits textuais em agentes, escopo bem delimitado, zero novas entidades de domínio).

Próximo agente: **`@analyst`** para confirmar classificação, mapear requirements (inclusive das open questions acima), e gerar `requirements-context-archive-done.md` + `spec-context-archive-done.md`.
