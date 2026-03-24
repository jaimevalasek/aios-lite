# AIOSON — Squad Generation Enrichment: Master Plan

> **Para:** Claude Code (Opus 4.6)
> **Projeto:** github.com/jaimevalasek/aioson
> **Data:** 2026-03-23
> **Inspiração:** OpenSquad (renatoasse/opensquad) + visão original AIOSON
> **Filosofia:** Não copiar — absorver o espírito e ir além

## Visão

O squad do AIOSON já é estruturalmente mais rico que o OpenSquad (tipos de executor, genomes, DISC profiles, pipelines DAG, workers, checklists, automação LLM-to-script). O que falta é **profundidade na fase de criação** — hoje o squad nasce "seco", dependendo 100% do que o LLM já sabe. Este plano adiciona:

1. **@orache** — Agente de investigação profunda que alimenta a criação do squad com conhecimento real do domínio
2. **Review loops** — Ciclos de rejeição/retry nas workflows
3. **Model tiering** — Custo inteligente por executor
4. **Task decomposition** — Tarefas granulares dentro de cada executor
5. **Format/platform templates** — Catálogo de best practices por plataforma
6. **Profiler integration** — Conexão do profiler pipeline com a criação de squads
7. **Squad scoring com métricas reais** — Não só coverage, mas quality signals
8. **Investigação programática** — O que dá para fazer via JS sem LLM

## Regra de ouro

**NÃO quebrar nada.** Este plano é 100% aditivo. Tudo que existe continua funcionando. As mudanças no `squad.md` são adições de seções e routing — nunca remoção.

## Espírito criativo

> "O resultado bom é o piso, não o teto."

Cada feature aqui foi pensada para que o squad do AIOSON produza resultados **excepcionais**, não apenas corretos. A investigação do @orache não é um WebSearch genérico — é uma análise de domínio que descobre frameworks, anti-patterns, benchmarks e referências que o LLM sozinho não conheceria. O model tiering não é só economia — é colocar o modelo certo na fase certa. Os review loops não são burocracia — são o mecanismo que transforma "bom" em "excepcional".

## Fases

```
Fase 1  (P0) — @orache: Agente de Investigação
Fase 2  (P0) — Review Loops nas Workflows
Fase 3  (P1) — Model Tiering por Executor
Fase 4  (P1) — Task Decomposition por Executor
Fase 5  (P2) — Format/Platform Templates
Fase 6  (P2) — Profiler Integration no Squad Flow
Fase 7  (P2) — Squad Quality Scoring Avançado
Fase 10 (P0) — Implementation Plan: Fase de Plano entre Spec e Execução  ← NOVO
Fase 11 (P1) — Squad Learning: Memória Adaptativa e Evolução Contínua   ← NOVO
```

> **Fases 10 e 11** atuam em DOIS NÍVEIS: agentes AIOSON (framework) e squads gerados.
> A Fase 10 garante que nenhuma execução comece sem plano de implementação revisado.
> A Fase 11 garante que cada session seja melhor que a anterior via aprendizado acumulativo.

```
Fase 1 (P0) ─────────────────┐
                              ├──→ Fase 3 (P1) ──→ Fase 5 (P2)
Fase 2 (P0) ─────────────────┤                     Fase 6 (P2)
                              ├──→ Fase 4 (P1) ──→ Fase 7 (P2)
                              │
Fase 10 (P0) ────────────────┤    (independente — pode rodar em paralelo com 1 e 2)
                              │
                              ├──→ Fase 11 (P1)   (enriched by Fase 10 plans + Fase 2 review loops)
                              │
                              └──→ (todas P2 podem rodar em paralelo)
```

## Arquivos de implementação

| Arquivo | Fase | O que implementa | Depende de |
|---------|------|-------------------|------------|
| `01-FASE-orache-agent.md` | @orache (P0) | Agente de investigação + CLI + integração squad | Nada |
| `02-FASE-review-loops.md` | Review Loops (P0) | onReject, maxRetries, veto conditions nas workflows | Nada |
| `03-FASE-model-tiering.md` | Model Tiering (P1) | modelTier por executor, custo estimado | Fase 1 ou 2 |
| `04-FASE-task-decomposition.md` | Task Decomposition (P1) | tasks/ dentro de cada executor | Fase 1 ou 2 |
| `05-FASE-format-templates.md` | Format Templates (P2) | Catálogo de formatos por plataforma | Fase 4 |
| `06-FASE-profiler-integration.md` | Profiler Integration (P2) | Conexão profiler → squad creation | Fase 1 |
| `07-FASE-quality-scoring.md` | Quality Scoring (P2) | Métricas avançadas de qualidade do squad | Fase 2 + 4 |
| `10-FASE-implementation-plan.md` | Implementation Plan (P0) | Plano entre spec e execução (2 níveis) | Nada |
| `11-FASE-squad-learning.md` | Squad Learning (P1) | Memória adaptativa + promoção a rules (2 níveis) | Fase 10 enriquece |

## Referência transversal

| Arquivo | Conteúdo | Quando ler |
|---------|----------|------------|
| `09-ARQUITETURA-squad-leve.md` | **LEIA PRIMEIRO** — 3 mudanças arquiteturais que afetam tudo | ANTES de qualquer fase |
| `08-JS-vs-LLM-analysis.md` | Mapa completo do que é JS vs. LLM + ideias criativas | Antes de implementar |

**Leitura obrigatória:** `09-ARQUITETURA-squad-leve.md` define onde outputs ficam, como rules e skills do squad funcionam, e como o squad.md fica leve. Todas as fases foram atualizadas para respeitar essas decisões.

## Inventário de mudanças total (todas as fases)

### Arquivos NOVOS a criar
```
# Agente @orache (Fase 1)
template/.aioson/agents/orache.md
template/.aioson/locales/pt-BR/agents/orache.md
template/.aioson/locales/es/agents/orache.md
template/.aioson/locales/fr/agents/orache.md

# Tasks novas (Fases 1, 2, 4, 6)
template/.aioson/tasks/squad-investigate.md
template/.aioson/tasks/squad-review.md
template/.aioson/tasks/squad-task-decompose.md
template/.aioson/tasks/squad-profile.md

# Skills do agente squad (Fase 5 + Arquitetura)
template/.aioson/skills/squad/SKILL.md                  # Router
template/.aioson/skills/squad/domains/.gitkeep           # Domain skills (extensível)
template/.aioson/skills/squad/formats/catalog.json       # Catálogo de formatos
template/.aioson/skills/squad/formats/social/*.md        # 7+ formatos sociais
template/.aioson/skills/squad/formats/content/*.md       # 5+ formatos conteúdo
template/.aioson/skills/squad/formats/business/*.md      # 3+ formatos negócio
template/.aioson/skills/squad/formats/creative/*.md      # 3+ formatos criativos
template/.aioson/skills/squad/patterns/*.md              # 4 patterns (review, multi-platform, persona, pipeline)
template/.aioson/skills/squad/references/*.md            # 3 references (archetypes, checklists, workflows)

# Rules do squad (Arquitetura)
template/.aioson/rules/squad/README.md                   # Explica como criar rules
template/.aioson/rules/squad/.gitkeep

# Diretório de pesquisas (Arquitetura)
template/squad-searches/.gitkeep

# CLI + testes
src/commands/squad-investigate.js                        # Fase 1
src/commands/squad-score.js                              # Fase 7
src/utils/squad-helpers.js                               # Fase 3-7 (utilities)
tests/squad-investigate.test.js                          # Fase 1
tests/squad-review-loops.test.js                         # Fase 2
tests/squad-task-decomposition.test.js                   # Fase 4
tests/squad-score.test.js                                # Fase 7

# Implementation Plan (Fase 10) — afeta DOIS NÍVEIS: framework + squads
template/.aioson/tasks/implementation-plan.md            # Task framework-level
template/.aioson/tasks/squad-execution-plan.md           # Task squad-level
src/commands/implementation-plan.js                      # CLI framework-level
src/commands/squad-plan.js                               # CLI squad-level
tests/implementation-plan.test.js                        # Testes framework
tests/squad-plan.test.js                                 # Testes squad

# Squad Learning (Fase 11) — afeta DOIS NÍVEIS: framework + squads
template/.aioson/tasks/squad-learning-review.md          # Task de revisão de learnings
src/commands/squad-learning.js                           # CLI squad learnings
src/commands/learning.js                                 # CLI project learnings
tests/squad-learning.test.js                             # Testes squad
tests/learning.test.js                                   # Testes project
```

### Arquivos EDITADOS (aditivamente)
```
template/.aioson/agents/squad.md                        # Fases 1,2,3,4,5,6,7,10,11
template/.aioson/agents/dev.md                          # Fases 10,11
template/.aioson/agents/orchestrator.md                 # Fases 10,11
template/.aioson/context/spec.md.template               # Fase 11
template/.aioson/schemas/squad-manifest.schema.json     # Fases 2,3,4,5
template/.aioson/schemas/squad-blueprint.schema.json    # Fases 1,3,6
template/.aioson/locales/*/agents/squad.md              # Todas as fases
template/.aioson/locales/*/agents/dev.md                # Fases 10,11
template/.aioson/locales/*/agents/orchestrator.md       # Fases 10,11
src/runtime-store.js                                    # Fases 1,2,7,10,11
src/cli.js                                              # Fases 1,7,10,11
src/commands/squad-validate.js                          # Fases 2,3,4
src/commands/squad-doctor.js                            # Fase 7
src/commands/squad-status.js                            # Fase 3
src/i18n/messages/*.js                                  # Fases 10,11
```

### Novas tabelas SQLite
```sql
squad_investigations    -- Fase 1
workflow_reviews        -- Fase 2
squad_scores            -- Fase 7
implementation_plans    -- Fase 10 (framework level)
plan_phases             -- Fase 10 (framework level)
squad_execution_plans   -- Fase 10 (squad level)
squad_plan_rounds       -- Fase 10 (squad level)
squad_learnings         -- Fase 11 (squad level)
project_learnings       -- Fase 11 (framework level)
```

## Contexto crítico do codebase

### O que NÃO tocar
- Todos os arquivos em `src/commands/squad-*.js` — funcionam e têm testes
- `runtime-store.js` — adicionar tabelas, nunca alterar as existentes
- Todos os agentes existentes em `template/.aioson/agents/`
- Testes existentes em `tests/`
- Schemas existentes em `template/.aioson/schemas/`

### O que EDITAR (aditivamente)
- `template/.aioson/agents/squad.md` — routing @orache, review loops, model tiering, execution plan step, learnings no orchestrator
- `template/.aioson/agents/dev.md` — implementation plan detection, session learnings
- `template/.aioson/agents/orchestrator.md` — Step 1b (plan verification), session learnings
- `template/.aioson/context/spec.md.template` — seção Session Learnings
- `template/.aioson/schemas/squad-manifest.schema.json` — adicionar novos campos
- `template/.aioson/schemas/squad-blueprint.schema.json` — adicionar campos de investigação
- `src/cli.js` — registrar novos comandos (fases 1,7,10,11)
- `src/runtime-store.js` — adicionar novas tabelas (fases 1,2,7,10,11)
- `src/i18n/messages/*.js` — mensagens dos novos comandos
- Locales (`template/.aioson/locales/*/agents/squad.md`) — espelhar mudanças
- Locales (`template/.aioson/locales/*/agents/dev.md`) — espelhar mudanças
- Locales (`template/.aioson/locales/*/agents/orchestrator.md`) — espelhar mudanças

### O que CRIAR
```
# Agente @orache (Fase 1)
template/.aioson/agents/orache.md                    # NOVO — Agente @orache
template/.aioson/locales/pt-BR/agents/orache.md      # NOVO — Locale PT-BR
template/.aioson/locales/es/agents/orache.md          # NOVO — Locale ES
template/.aioson/locales/fr/agents/orache.md          # NOVO — Locale FR

# Tasks (Fases 1, 2, 4, 6, 10, 11)
template/.aioson/tasks/squad-investigate.md            # NOVO — Task de investigação
template/.aioson/tasks/squad-review.md                 # NOVO — Task de review loop
template/.aioson/tasks/implementation-plan.md          # NOVO — Task de plan framework-level (Fase 10)
template/.aioson/tasks/squad-execution-plan.md         # NOVO — Task de plan squad-level (Fase 10)
template/.aioson/tasks/squad-learning-review.md        # NOVO — Task de revisão de learnings (Fase 11)
template/.aioson/formats/                              # NOVO — Catálogo de formatos

# CLI + testes (Fases 1, 7, 10, 11)
src/commands/squad-investigate.js                      # NOVO — CLI investigação programática
src/commands/implementation-plan.js                    # NOVO — CLI plan framework-level (Fase 10)
src/commands/squad-plan.js                             # NOVO — CLI plan squad-level (Fase 10)
src/commands/squad-learning.js                         # NOVO — CLI squad learnings (Fase 11)
src/commands/learning.js                               # NOVO — CLI project learnings (Fase 11)
tests/squad-investigate.test.js                        # NOVO — Testes Fase 1
tests/implementation-plan.test.js                      # NOVO — Testes Fase 10
tests/squad-plan.test.js                               # NOVO — Testes Fase 10
tests/squad-learning.test.js                           # NOVO — Testes Fase 11
tests/learning.test.js                                 # NOVO — Testes Fase 11
```

### Convenções
- CLI: `node:test` + `node:assert/strict`
- Módulos: `'use strict'` + CommonJS (`require`)
- SQLite: `better-sqlite3`
- Agent files: `# Agent @nome` + bloco `> ⚡ ACTIVATED`
- i18n: traduções em `src/i18n/messages/{lang}.js`
