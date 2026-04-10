# Análise — RPI, Context Engineering e Progressive Disclosure no AIOSON

> Data: 2026-03-21
> Fonte: https://www.youtube.com/watch?v=8fZUfVFWT4M + análise interna do codebase
> Objetivo: mapear o que o aioson já implementa dessas técnicas, o que falta, e como isso se conecta com a evolução de orquestração

---

## O que o vídeo ensina (consolidado)

### Metodologia RPI — Research, Plan, Implement

1. **Research** — escanear o projeto antes de qualquer alteração. Entender onde as lógicas vivem.
2. **Plan** — gerar plano técnico detalhado (arquivos afetados, componentes novos, comandos, critérios de teste) ANTES de codar.
3. **Implement** — executar em blocos pequenos seguindo o plano, evitando que a IA se perca em contextos grandes.

### Engenharia de Contexto e Smart Zone

- **Smart Zone** (até 40% do contexto) vs **Dumb Zone** (acima de 60%) — quanto mais contexto o LLM carrega, mais alucina.
- **Progressive Disclosure** — entregar informações gradualmente conforme a tarefa precisa.
- **On-demand Loading** — carregar regras/docs específicas só quando o prompt exige.

### Infraestrutura de IA para desenvolvimento

- **Technical Design Doc (TDD)** — "fonte da verdade" escrita por humanos (MVP, glossário, fluxos).
- **Rules e Guidelines** — arquivos estáticos no repositório que ensinam arquitetura e padrões.
- **Skills** — habilidades portáteis invocáveis sob demanda.
- **MCP** — protocolo para conectar IA a dados externos.

### Workflow avançado

- **Discovery → Design Doc → Quebra de tarefas → Planejamento técnico → Implementação assistida**
- **Paralelização com Git Work Trees** — agentes em branches distintas simultaneamente.
- **Arquitetura amigável à IA** — modularização, work trees, paralelização.
- **Memória de longo prazo** — planos salvos no repositório para sessões futuras.

### O problema dos 70%

- A IA gera 70% da base, mas o ajuste final consome todo o tempo ganho.
- A solução é controle de contexto + planejamento + implementação incremental.
- Ganhos realistas: 30-40% de produtividade, não 10x.

---

## Como o AIOSON já implementa isso

### RPI — Research, Plan, Implement

| Fase RPI | Implementação AIOSON | Status |
|---|---|---|
| **Research** | `@analyst` faz discovery de domínio, entidades, regras de negócio. Gera `discovery.md`. `@setup` detecta framework. Scan artifacts (`scan-index.md`, `scan-folders.md`). | ✅ Completo |
| **Plan** | `@product` gera PRD. `@architect` gera `architecture.md`. `@discovery-design-doc` gera `design-doc.md` com fluxos técnicos, decisões, slices. `@pm` prioriza e sequencia. | ✅ Completo |
| **Implement** | `@dev` implementa em blocos atômicos (declare → implement → validate → commit). `@deyvin` para continuidade par-a-par. | ✅ Completo |

**Avaliação:** O aioson já implementa RPI nativamente. Cada fase é um agente com artefato obrigatório. O workflow-next garante a sequência.

### Progressive Disclosure

| Técnica | Implementação AIOSON | Status |
|---|---|---|
| Rules on-demand | `.aioson/rules/` com YAML frontmatter `agents: [dev, architect]`. Carregado condicionalmente por cada agente. | ✅ Completo |
| Docs on-demand | `.aioson/docs/` com frontmatter `description:`. Carregado só quando relevante à tarefa. | ✅ Completo |
| Design-docs on-demand | `.aioson/context/design-doc.md` e `design-doc-{slug}.md` com frontmatter `scope:` e `agents:[]`. | ✅ Completo |
| Skills on-demand | `.aioson/skills/` e `.aioson/installed-skills/` com `SKILL.md` e frontmatter. Carregado por match de framework/tarefa. | ✅ Completo |
| Contexto mínimo por agente | Cada agente carrega só `project.context.md` + seus artefatos específicos, nunca tudo. | ✅ Completo |
| Silent check | Diretórios opcionais verificados sem alarme. Só mencionados quando materialmente relevantes. | ✅ Completo |

**Avaliação:** O aioson já é excelente em progressive disclosure. O sistema de frontmatter com `agents:[]` para targeting é elegante e funciona.

### Smart Zone / Gestão de Contexto

| Técnica | Implementação AIOSON | Status |
|---|---|---|
| Contexto mínimo por estágio | Workflow sequencial garante que cada agente vê só o que precisa. | ✅ Completo |
| Scope boundary por agente | "You operate exclusively as @{agent}. Do not perform work belonging to another agent." | ✅ Completo |
| Feature mode scoping | Agentes em feature mode leem `prd-{slug}.md` e `requirements-{slug}.md`, não o projeto inteiro. | ✅ Completo |
| Design-doc scope targeting | `scope: "billing"` em design-doc carrega só para features de billing. | ✅ Completo |
| Evitar Dumb Zone | Não há mecanismo explícito de monitoramento de % de contexto usado. | ⚠️ Não implementado |

### Memória de Longo Prazo

| Técnica | Implementação AIOSON | Status |
|---|---|---|
| Planos salvos no repositório | PRD, discovery, architecture, design-doc — todos em `.aioson/context/`. | ✅ Completo |
| Spec de progresso | `spec.md` atualizado pelo @orchestrator com decisões, done, blockers. | ✅ Completo |
| Workflow state | `workflow.state.json` persiste estado entre sessões. | ✅ Completo |
| Runtime events | SQLite com tasks, runs, events — auditoria completa. | ✅ Completo |
| Handoff entre sessões | **Não existe** `last-handoff.json` para briefing automático. | ❌ Falta (proposto no Bloco 1 da evolução) |

### Paralelização e Work Trees

| Técnica | Implementação AIOSON | Status |
|---|---|---|
| Lanes paralelas | `@orchestrator` cria `agent-N.status.md` para trabalho paralelo em MEDIUM. | ✅ Completo |
| Shared decisions | `.aioson/context/parallel/shared-decisions.md` para coordenação cross-lane. | ✅ Completo |
| Git work trees | **Não implementado** — mencionado no vídeo como técnica avançada. | ❌ Ausente |
| Squad pipelines | DAG com topological sort, mas sem `run` engine. | ⚠️ Parcial |

### Infraestrutura

| Componente | Implementação AIOSON | Status |
|---|---|---|
| TDD (Technical Design Doc) | `design-doc.md` com 17 seções (governance → acceptance criteria). | ✅ Completo |
| Rules/Guidelines | `.aioson/rules/` + regras embarcadas nos agentes. | ✅ Completo |
| Skills portáteis | `.aioson/skills/` com matching por framework + design skill isolation. | ✅ Completo |
| MCP | Suporte a MCPs registrados por squad (`squad_mcps` no runtime). | ✅ Completo |

---

## O que FALTA no aioson — conectando com a evolução proposta

### 1. Handoff de sessão (Bloco 1 da evolução)

O vídeo enfatiza "memória de longo prazo" salva no repositório. O aioson já salva planos e artefatos, mas **não salva o briefing da transição entre sessões**. O `last-handoff.json` proposto resolve isso diretamente.

**Conexão:** Progressive disclosure entre sessões — a próxima sessão recebe só o delta, não precisa reconstruir tudo.

### 2. Git Work Trees para paralelização real

O vídeo menciona trabalhar em branches distintas simultaneamente. O aioson tem lanes paralelas via arquivos `.status.md`, mas não usa git work trees reais.

**Proposta para o aioson:**

```bash
aioson parallel:worktree . --lane=1 --branch=feat/auth
aioson parallel:worktree . --lane=2 --branch=feat/dashboard
# Cada lane trabalha numa worktree isolada
# Merge controlado ao final
```

Isso conecta diretamente com:
- `@orchestrator` que já identifica módulos paralelos
- `parallel-init.js` que já cria lanes
- A proposta de squad pipeline run (Bloco 3)

**Valor:** Paralelização real em vez de paralelização textual. Dois agentes IA podem trabalhar simultaneamente sem conflito de arquivos.

### 3. Plan como artefato de primeira classe (além do PRD)

O vídeo insiste em plano técnico detalhado ANTES de implementar. O aioson tem:
- PRD (`@product`)
- Architecture (`@architect`)
- Design-doc (`@discovery-design-doc`)

Mas não tem um **plano de implementação técnico** no sentido do vídeo: lista de arquivos a modificar, ordem de execução, comandos de terminal, critérios de teste por bloco.

**Proposta para o aioson:**

O `@architect` ou um novo estágio (`@planner`) poderia gerar:

```markdown
# implementation-plan.md

## Slice 1 — Auth module
Files: src/models/User.js, src/routes/auth.js, src/middleware/auth.js
Dependencies: database migration first
Commands: npx knex migrate:latest
Tests: POST /auth/login returns 200, POST /auth/register creates user
Estimate: ~30min AI-assisted

## Slice 2 — Dashboard
Files: src/pages/Dashboard.vue, src/composables/useDashboard.js
Dependencies: Auth module complete
Tests: Dashboard renders user name, Dashboard shows stats
Estimate: ~20min AI-assisted
```

Isso conecta diretamente com:
- Progressive disclosure: @dev recebe um slice por vez, não o plano inteiro
- Smart Zone: cada slice é pequeno o suficiente para caber na zona inteligente
- Workflow enforcement: workflow-next poderia avançar por slices dentro do @dev

### 4. Context budget awareness

O vídeo fala da "Smart Zone" (40%) vs "Dumb Zone" (60%). O aioson não monitora quanto contexto está sendo usado.

**Proposta leve para o aioson:**

Adicionar uma nota nos agentes:

```markdown
## Context management
When loading rules, docs, design-docs, and skills:
- Count approximately how many files you're loading
- If loading more than 3 large documents (>200 lines each), stop and prioritize
- Prefer: project.context.md + 1 design-doc + rules relevantes
- Avoid: carregar todos os docs + todas as rules + todos os skills de uma vez
```

Isso não é enforcement, é guidance. Progressive disclosure que o próprio agente pratica.

### 5. Planos de refatoração persistentes

O vídeo menciona "salve planos de refatoração complexos no repositório para sessões futuras".

**O aioson já suporta isso** via `.aioson/docs/`:

```markdown
---
description: "Plano de refatoração do módulo de autenticação — migração de JWT para sessions"
---
# Refactoring Plan — Auth Module
...
```

Qualquer agente que trabalhe com auth carregaria esse doc automaticamente. Isso já funciona. **A lacuna é documentar e incentivar esse padrão de uso.**

---

## Síntese: o que o aioson já é vs o que precisa virar

### O aioson já é

1. **Framework RPI nativo** — Research (@analyst), Plan (@product + @architect + @design-doc), Implement (@dev)
2. **Sistema de progressive disclosure completo** — rules, docs, design-docs, skills, tudo on-demand com frontmatter
3. **Memória de longo prazo via artefatos** — tudo persiste em `.aioson/context/`
4. **Workflow com enforcement real** — não depende de prompt discipline
5. **Paralelismo estruturado** — lanes, shared decisions, squad pipelines

### O aioson precisa virar

1. **Framework com continuidade entre sessões** — handoff automático (proposto)
2. **Framework com paralelização real** — git work trees integrados (novo)
3. **Framework com plano de implementação granular** — slices técnicos (novo)
4. **Framework com awareness de contexto** — guidance de Smart Zone (novo)
5. **Framework com pipeline execution** — squad run engine (proposto)
6. **Framework com catálogo unificado** — agentes oficiais + squads (proposto)

### O que já está pronto e só precisa de documentação

- Rules on-demand — funciona, mas poucos usuários sabem usar
- Docs on-demand — funciona, mas o padrão de refactoring plans não é documentado
- Design-docs — funciona, mas a diferença entre design-doc e PRD não é óbvia para novos usuários
- Skills — funciona, mas a lista de skills disponíveis não é autodiscoverable

---

## Conexão com a evolução de orquestração

A análise do aiox-master (documento anterior) propôs 7 blocos de evolução. Esta análise das técnicas do vídeo adiciona 3 conceitos novos:

| Conceito novo | Bloco de evolução que se beneficia |
|---|---|
| Git work trees | Bloco 3 (Pipeline Run) + @orchestrator |
| Implementation plan / slices | Bloco 2 (Conductor) + @architect / novo estágio |
| Context budget awareness | Todos os agentes — guidance nos templates |

E confirma que 4 conceitos do vídeo **já existem no aioson**:
- RPI ✅
- Progressive disclosure ✅
- On-demand loading ✅
- Memória de longo prazo ✅

O aioson está numa posição privilegiada: **já implementou a maioria das técnicas que o vídeo recomenda**. As lacunas são conectividade entre sessões, paralelização real, e granularidade no planejamento de implementação.

---

## Referências

- Vídeo: https://www.youtube.com/watch?v=8fZUfVFWT4M
- Screenshot: architecture-rule on-demand loading no Claude Code
- Análise prévia orquestração: `orchestration-evolution-strategy.md`
- Análise AIOX vs AIOSON: `aiox-vs-aioson-deep-analysis.md`
