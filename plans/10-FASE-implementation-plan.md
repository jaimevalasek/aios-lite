# Fase 10 — Implementation Plan: Fase de Plano entre Spec e Execução

> **Prioridade:** P0 (afeta qualidade de TUDO que é implementado — framework e squads)
> **Depende de:** Nada (pode rodar paralelo com qualquer outra fase)
> **Escopo:** Dois níveis — agentes AIOSON + squads gerados
> **Filosofia:** "Spec pronta não é permissão para codar. É permissão para PLANEJAR como codar."

## O Problema

Hoje em ambos os níveis (framework AIOSON e squads), o fluxo é:

```
Spec/Design pronta → Execução direta (código ou conteúdo)
```

Isso causa:

1. **Perda de contexto** — O chat que fez discovery + design + architecture já consumiu tokens. Quando chega na implementação, o modelo tem menos "espaço" para pensar na execução.
2. **Sem re-síntese** — Ninguém olha pro spec completo e pergunta "isso faz sentido como um TODO, as peças se encaixam?"
3. **Sem sequência definida** — O /dev começa a implementar mas não tem um plano explícito de "primeiro A, depois B, porque B depende de A"
4. **Sem checkpoint de contexto para novo chat** — Se o usuário abre um novo chat (ou deveria abrir), não existe um "pacote de contexto" pronto que diz "leia estes 3 arquivos e você tem tudo"
5. **Squads sofrem o mesmo** — Um squad que termina o design e vai produzir conteúdo não re-analisa se os executors vão atacar o problema na ordem certa

## Conceito

Adicionar uma fase obrigatória de **Implementation Plan** que:

1. Lê TODOS os artefatos produzidos até aqui (spec, architecture, discovery, investigation, blueprint, rules, skills)
2. Faz uma **re-análise cruzada** de consistência (gaps, contradições, assumptions não validadas)
3. Gera um **plano de implementação sequencial** com checkpoints
4. Define um **context package** mínimo para novo chat ou nova session
5. Apresenta ao usuário para aprovação antes de seguir

## Dois níveis de aplicação

### Nível 1: Agentes AIOSON (framework)

Quando os agentes /dev, /orchestrator vão implementar um projeto ou feature.

**Trigger:** Após /architect + /pm + /ux-ui terem produzido seus artefatos, ANTES de /dev ou /orchestrator começar a codar.

**Onde se encaixa no workflow:**
```
/setup → /analyst → /architect → /ux-ui → /pm → /product
                                                    ↓
                                          ┌─────────────────┐
                                          │ IMPLEMENTATION   │  ← NOVO
                                          │ PLAN             │
                                          └────────┬────────┘
                                                   ↓
                                    /dev ou /orchestrator (execução)
```

### Nível 2: Squads gerados

Quando um squad criado vai executar suas primeiras sessions de trabalho.

**Trigger:** Após design + create + validate do squad, ANTES da primeira session produtiva.

**Onde se encaixa no lifecycle do squad:**
```
@squad design → @squad create → @squad validate → warm-up
                                                      ↓
                                            ┌─────────────────┐
                                            │ EXECUTION PLAN   │  ← NOVO
                                            │ (squad-level)    │
                                            └────────┬────────┘
                                                     ↓
                                              Squad sessions
```

## O que é JS vs. LLM

**JS (determinístico, zero LLM):**
- Verificar que todos os artefatos pré-requisito existem no filesystem
- Calcular completeness score do context package
- Registrar o plan no SQLite com status (draft, approved, in-progress, completed)
- Validar que o plan referencia arquivos que existem
- Gerar um índice de checkpoints e rastrear progresso
- Detectar quando o plan está stale (artefatos mudaram depois do plan ser gerado)

**LLM (requer inteligência):**
- Re-análise cruzada dos artefatos (encontrar gaps, contradições)
- Definir a sequência de implementação (dependências, ordem)
- Escolher o que entra no context package mínimo
- Gerar o plano com checkpoints significativos
- Adaptar o plano ao nível do projeto (MICRO vs SMALL vs MEDIUM)
- No squad: definir qual executor ataca primeiro e como os outputs fluem

## Artefato: Implementation Plan

### Para agentes AIOSON (Nível 1)

Salvar em `.aioson/context/implementation-plan.md` (project mode) ou `.aioson/context/implementation-plan-{slug}.md` (feature mode).

```markdown
---
project: "{project_name}"
scope: "{project | feature}"
feature_slug: "{slug ou null}"
created: "{ISO-8601}"
status: "draft"
classification: "{MICRO | SMALL | MEDIUM}"
---

# Implementation Plan

> Gerado após consolidação de todos os artefatos de spec.
> Aprovado pelo usuário antes de qualquer implementação.

## Pre-flight check

### Artefatos lidos
- [x] project.context.md — {status: ok | stale | missing}
- [x] discovery.md — {status}
- [x] architecture.md — {status}
- [x] prd.md / prd-{slug}.md — {status}
- [x] ui-spec.md — {status}
- [ ] readiness.md — {status}
- [ ] design-doc.md — {status}
- [ ] spec.md — {status}

### Consistency check
- {gap ou contradição encontrada e como resolver}
- {assumption que precisa confirmação}
- {risco que emergiu da re-análise}

### Readiness verdict
{READY | READY_WITH_ASSUMPTIONS | NOT_READY}

Se NOT_READY: listar o que falta e qual agente deve resolver.

## Execution Strategy

### Sequência de implementação

#### Fase 1 — {título} (estimativa: {commits/arquivos})
- **O que:** {descrição concreta}
- **Depende de:** {nada | fase anterior}
- **Artefatos de entrada:** {arquivos que o dev precisa ler}
- **Critério de done:** {como saber que terminou}
- **Checkpoint:** {o que verificar antes de seguir}

#### Fase 2 — {título}
- **O que:** {descrição}
- **Depende de:** Fase 1
- **Artefatos de entrada:** {arquivos}
- **Critério de done:** {verificação}
- **Checkpoint:** {gate}

[...]

### Decisões pré-tomadas
- {decisão 1 — já definida no architecture.md, não re-discutir}
- {decisão 2 — já validada pelo /architect}

### Decisões adiadas (explicitamente)
- {decisão que SÓ pode ser tomada durante implementação, com contexto}
- {trade-off que o dev vai encontrar e qual direção preferir}

## Context Package (para novo chat)

### Leitura obrigatória (ordem importa)
1. `implementation-plan.md` ← este arquivo (fonte de verdade da sequência)
2. `project.context.md` (identidade do projeto)
3. `architecture.md` (decisões técnicas)
4. `spec.md` (estado atual, decisões tomadas)

### Leitura sob demanda
- `discovery.md` — ler quando tocar em entidades existentes
- `prd.md` — ler quando tiver dúvida sobre um requisito
- `ui-spec.md` — ler quando implementar UI
- `requirements-{slug}.md` — ler quando implementar a feature específica

### NÃO ler (já digerido neste plano)
- {artefato que já foi sintetizado aqui e não precisa ser re-lido}

## Instruções para o próximo agente

> Para /dev ou /orchestrator:
>
> 1. Leia este arquivo PRIMEIRO
> 2. Siga a sequência de fases na ordem
> 3. Após cada fase, atualize spec.md com as decisões tomadas
> 4. Se encontrar uma contradição com este plano, PARE e pergunte ao usuário
> 5. As decisões pré-tomadas são final — não re-discutir
> 6. As decisões adiadas são seus para tomar — registre em spec.md
```

### Para squads gerados (Nível 2)

Salvar em `.aioson/squads/{squad-slug}/docs/execution-plan.md`.

```markdown
---
squad: "{squad-slug}"
created: "{ISO-8601}"
status: "draft"
based_on: "{blueprint path}"
investigation: "{investigation path ou null}"
---

# Execution Plan: {squad-name}

> Plano de como o squad vai atacar o objetivo.
> Gerado após criação, aprovado antes da primeira session.

## Pre-flight check

### Artefatos consolidados
- [x] Blueprint — {path}
- [x] Investigation report — {path ou "não realizada"}
- [x] Manifest — {path}
- [x] Workflow — {path ou "sem workflow"}
- [x] Checklists — {path}
- [ ] Rules carregadas — {lista de rules que aplicam}
- [ ] Skills carregadas — {lista de skills que aplicam}

### Consistency check
- {gap entre executors: algo que ninguém cobre}
- {overlap entre executors: dois fazem a mesma coisa}
- {workflow gap: output de fase X não é input de fase Y}
- {quality gap: checklist não cobre aspecto crítico do domínio}

### Squad readiness verdict
{READY | NEEDS_ADJUSTMENT | NOT_READY}

## Execution Strategy

### Sequência de ativação

#### Round 1 — {título} (executor: @{slug})
- **Objetivo:** {o que este executor vai produzir primeiro}
- **Input:** {contexto que precisa receber}
- **Output esperado:** {artefato concreto}
- **Quality gate:** {critério de aceitação}
- **Handoff para:** Round 2

#### Round 2 — {título} (executor: @{slug})
[...]

### Orchestration notes
- {como o @orquestrador deve coordenar}
- {quando escalar para o usuário}
- {como usar review loops se configurados}

## Context Package (para session ou novo chat)

### O que o @orquestrador deve ler no início de cada session
1. Este execution-plan.md
2. squad.manifest.json (quem são os executors)
3. Último session HTML (se não é a primeira session)
4. Learnings anteriores (se existem — ver squad-learning)

### O que cada executor deve receber
- Seu agent file + contexto do round atual
- Output do round anterior (se houver)
- Anti-patterns relevantes (do investigation report)

## Success criteria
- {como saber que o squad cumpriu o objetivo}
- {métricas concretas se aplicável}
- {output final esperado}
```

## Mudanças no framework AIOSON (Nível 1)

### Novo arquivo: `template/.aioson/agents/planner.md`

Não é um agente separado invocável pelo usuário. É uma **seção de comportamento** que o /orchestrator e o /dev executam antes de codar.

**Decisão de design:** Em vez de criar um novo agente `/planner`, a lógica de geração do implementation plan fica como:
- Uma task interna: `.aioson/tasks/implementation-plan.md`
- Invocada automaticamente pelo /orchestrator no início do Step 5 (após ler todos os artefatos)
- Invocada automaticamente pelo /dev quando detecta que `implementation-plan.md` não existe mas os pré-requisitos existem

### Novo arquivo: `template/.aioson/tasks/implementation-plan.md`

```markdown
# Task: Generate Implementation Plan

> Fase obrigatória entre spec completa e início de implementação.
> Garante consistência, define sequência, e prepara context package.

## Quando executar

### Automaticamente (agentes detectam)
- /dev detecta que NÃO existe `implementation-plan.md` mas EXISTEM:
  - `architecture.md` (SMALL/MEDIUM) ou `project.context.md` (MICRO)
  - Pelo menos um de: `prd.md`, `prd-{slug}.md`, `readiness.md`
- /orchestrator detecta o mesmo no Step 1

### Manualmente
- Usuário pede: "gere o plano de implementação"
- Após /architect ou /pm finalizar seus artefatos

## Processo

### Passo 1 — Inventory check
Listar todos os artefatos em `.aioson/context/`. Para cada um:
- Existe? Está completo? É consistente com os outros?
- Sinalizar gaps e contradições

### Passo 2 — Cross-analysis
Ler os artefatos na ordem: project.context → discovery → architecture → prd → ui-spec → requirements → spec
Buscar:
- Entidades referenciadas no PRD que não estão no discovery
- Decisões no architecture que contradizem o PRD
- Features no ui-spec que dependem de algo não coberto pelo architecture
- Assumptions implícitas em qualquer artefato

### Passo 3 — Sequence planning
Definir a ordem de implementação:
- Dependências de dados (migrations antes de models antes de controllers)
- Dependências de UI (layout antes de componentes antes de interações)
- Módulos independentes que podem ser paralelos (/orchestrator usa isso)

### Passo 4 — Context package
Definir quais arquivos o próximo agente/chat DEVE ler e em qual ordem.
Minimizar: o context package ideal tem 3-5 arquivos, não 12.

### Passo 5 — Generate plan
Salvar `implementation-plan.md` no formato definido.

### Passo 6 — Present to user
Mostrar o plano resumido:
- Sequência de fases (1 linha cada)
- Gaps encontrados (se houver)
- Readiness verdict
- Context package

Perguntar:
> "Plano de implementação pronto. Quer ajustar algo antes de começar?
> Recomendo iniciar um novo chat para a implementação — o context package está definido."

## Regras
- NÃO comece a implementar nesta task — só planeje
- NÃO ignore gaps encontrados — sinalize-os explicitamente
- Se readiness = NOT_READY, PARE e diga o que falta
- O plan é um ARTEFATO PERSISTENTE — salve em arquivo, não só no chat
- Quando o usuário aprovar, sugira: "Inicie um novo chat e peça para /dev seguir o implementation plan"
```

### Edições em agentes existentes

#### `dev.md` — Adicionar detection automática

Adicionar após "## Feature mode detection":

```markdown
## Implementation plan detection

Before starting any implementation, check whether an implementation plan exists:

1. **Project mode:** look for `.aioson/context/implementation-plan.md`
2. **Feature mode:** look for `.aioson/context/implementation-plan-{slug}.md`

**If plan exists AND status = approved:**
- Follow the plan's execution strategy phase by phase
- Read only the files listed in the context package
- After each phase, update spec.md AND check the plan's checkpoint criteria
- Emit `aioson runtime:emit . --agent=dev --type=plan_checkpoint --plan-step=<N>` after each phase
- If you encounter a contradiction with the plan, STOP and ask the user

**If plan exists AND status = draft:**
- Tell the user: "There's a draft implementation plan. Want me to review and approve it before starting?"

**If plan does NOT exist BUT prerequisites exist:**
- Tell the user: "I found spec artifacts but no implementation plan. I recommend generating one first for higher quality results. Should I create it?"
- If user says yes → execute `.aioson/tasks/implementation-plan.md`
- If user says no → proceed with standard flow (no block, just recommendation)

**MICRO projects exception:**
- For MICRO projects, an implementation plan is OPTIONAL (not worth the overhead)
- Only suggest it if the user explicitly asks or if the spec looks complex for MICRO
```

#### `orchestrator.md` — Adicionar no Step 1

Adicionar após "### Step 1 — Identify modules and dependencies":

```markdown
### Step 1b — Generate or verify implementation plan

Before parallelizing any work:

1. Check if `.aioson/context/implementation-plan.md` exists
2. If not → execute `.aioson/tasks/implementation-plan.md` first
3. If yes → verify it's still valid (check if source artifacts changed after plan creation)
4. Use the plan's execution strategy to inform module sequencing
5. The plan's "decisões pré-tomadas" are constraints — do not override them

The implementation plan is the single source of truth for execution order.
Subagent context files should reference the plan's phases, not re-derive them.
```

## Mudanças nos Squads (Nível 2)

### Nova task: `template/.aioson/tasks/squad-execution-plan.md`

```markdown
# Task: Squad Execution Plan

> Gera o plano de execução do squad após criação.
> Define como os executors vão atacar o objetivo em sequência.

## Quando usar
- Automaticamente após `@squad create` + `@squad validate` + warm-up
- `@squad plan <slug>` — invocação direta
- Antes da primeira session produtiva do squad

## Entrada
- Squad manifest (`squad.manifest.json`)
- Blueprint (`.designs/{slug}.blueprint.json`)
- Investigation report (se existir)
- Workflow definition (se existir)
- Quality checklists
- Loaded rules e skills

## Processo

### Passo 1 — Re-análise cruzada
Ler o manifest completo. Para cada executor:
- O role cobre algo único?
- Há gap no coverage (ninguém cobre aspecto X)?
- Há overlap (dois executors fazem a mesma coisa)?
- O workflow conecta todos os outputs/inputs corretamente?

### Passo 2 — Sequência de ativação
Definir a ordem ideal de rounds:
- Qual executor precisa rodar primeiro (gera contexto para os outros)
- Quais podem rodar em paralelo
- Onde estão os review checkpoints
- Quando o @orquestrador deve sintetizar

Se o squad tem workflow definido → usar as phases como base.
Se não tem workflow → derivar a sequência do manifest + domain knowledge.

### Passo 3 — Context per executor
Para cada executor, definir:
- O que ele DEVE ler antes de começar
- O que ele recebe do executor anterior
- O que ele produz como output
- Anti-patterns que ele deve evitar (do investigation report)

### Passo 4 — Success criteria
Definir como saber que o squad cumpriu o objetivo:
- Output final esperado (concreto)
- Quality gates que devem passar
- O que o checklist deve validar

### Passo 5 — Gerar execution-plan.md
Salvar em `.aioson/squads/{slug}/docs/execution-plan.md`.

### Passo 6 — Apresentar ao usuário
Mostrar resumo:
- Sequência de rounds (1 linha cada)
- Gaps encontrados
- Recomendação: começar ou ajustar

> "Plano de execução pronto para o squad {name}. Quer ajustar antes de iniciar a primeira session?"

## Regras
- NÃO execute nenhum round aqui — só planeje
- Gaps encontrados devem ser resolvidos ANTES da execução
- O execution plan é persistente — salvar em arquivo
- Sugerir novo chat se o chat atual já consumiu muito contexto com design/create
```

### Edições no `squad.md` — Adicionar routing e flow

**Nova rota no subcommand routing:**
```markdown
- `@squad plan <slug>` → read and execute `.aioson/tasks/squad-execution-plan.md`
```

**Modificar o flow principal (após Step 5 — Save squad metadata):**

```markdown
### Step 6 — Generate execution plan (recommended)

After saving metadata, evaluate whether the squad would benefit from an execution plan:

**Always generate for:**
- Squads with 4+ executors
- Squads with workflows defined
- Squads created from investigation (@orache)
- Squads with mode: software or mixed

**Optional (offer) for:**
- Squads with 3 executors and simple goals
- Content squads with straightforward pipelines

**Skip for:**
- Ephemeral squads
- Squads with 2 executors and obvious flow

When generating: read and execute `.aioson/tasks/squad-execution-plan.md`.

After the plan is approved (or skipped), proceed with the warm-up round.
```

### Edições no orchestrator gerado

Adicionar no template do orchestrator (Step 3):

```markdown
## Execution plan awareness

Before the first session and at the start of each new session:
1. Check if `docs/execution-plan.md` exists in the squad package
2. If yes → follow the plan's sequence of rounds
3. If no → proceed with ad-hoc orchestration based on the manifest
4. After each productive round, verify against the plan's success criteria
5. If the plan defines quality gates, enforce them before moving to the next round
```

## CLI: `squad-plan.js` (novo)

**Responsabilidades (JS, zero LLM):**

```javascript
// Subcomandos:
// aioson squad:plan show <slug>           — mostra o execution plan
// aioson squad:plan status <slug>         — mostra progresso (rounds completed)
// aioson squad:plan checkpoint <slug> <N> — marca round N como completed
// aioson squad:plan stale <slug>          — verifica se o plan está stale
//                                           (artefatos mudaram após plan criado)

// Nova tabela SQLite:
// squad_plans (plan_slug, squad_slug, status, rounds_total, rounds_completed,
//              created_at, updated_at, stale_check_at)
//
// plan_checkpoints (plan_slug, round_number, status, completed_at, notes)
```

## CLI: `implementation-plan.js` (novo, framework level)

**Responsabilidades (JS, zero LLM):**

```javascript
// Subcomandos:
// aioson plan:show [slug]                — mostra o implementation plan
// aioson plan:status [slug]              — mostra progresso (fases completed)
// aioson plan:checkpoint [slug] <N>      — marca fase N como completed
// aioson plan:stale [slug]               — verifica se artefatos mudaram após plan

// Nova tabela SQLite:
// implementation_plans (plan_id, project_name, scope, feature_slug,
//                       status, phases_total, phases_completed,
//                       created_at, updated_at)
//
// plan_phases (plan_id, phase_number, title, status, completed_at, notes)
```

## Integração com classificação de projeto

### MICRO
- Implementation plan é **opcional** (o overhead não vale para projetos triviais)
- Se gerado, é mínimo: 1-2 fases, sem cross-analysis profunda
- Context package: só `project.context.md` + `implementation-plan.md`

### SMALL
- Implementation plan é **recomendado**
- 3-5 fases típicas
- Context package: 3-4 arquivos
- Cross-analysis: gaps e contradições entre PRD ↔ architecture

### MEDIUM
- Implementation plan é **obrigatório** (o /orchestrator gera antes de paralelizar)
- 5-10 fases com dependências
- Context package: 4-5 arquivos + subagent-specific packages
- Cross-analysis: completa entre todos os artefatos

## Integração com `aioson workflow:next`

Quando o AIOSON CLI controla o workflow:

```
aioson workflow:next . --tool=claude
```

Após o step "pm" ou "product", o workflow deve inserir um step "plan" que:
1. Verifica se os pré-requisitos existem
2. Gera ou pede que o agente gere o implementation plan
3. Apresenta o plan ao usuário
4. Só libera o step "dev" ou "orchestrator" após aprovação

## Nova tabela SQLite (runtime-store.js)

```sql
CREATE TABLE IF NOT EXISTS implementation_plans (
  plan_id TEXT PRIMARY KEY,
  project_name TEXT,
  scope TEXT DEFAULT 'project',    -- project | feature
  feature_slug TEXT,               -- NULL se scope = project
  status TEXT DEFAULT 'draft',     -- draft | approved | in_progress | completed | stale
  classification TEXT,             -- MICRO | SMALL | MEDIUM
  phases_total INTEGER DEFAULT 0,
  phases_completed INTEGER DEFAULT 0,
  source_artifacts TEXT,           -- JSON array dos artefatos que geraram o plan
  source_hash TEXT,                -- hash dos artefatos para detecção de staleness
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS plan_phases (
  plan_id TEXT NOT NULL,
  phase_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  status TEXT DEFAULT 'pending',   -- pending | in_progress | completed | skipped
  completed_at TEXT,
  notes TEXT,
  PRIMARY KEY (plan_id, phase_number),
  FOREIGN KEY (plan_id) REFERENCES implementation_plans(plan_id)
);

CREATE TABLE IF NOT EXISTS squad_execution_plans (
  plan_slug TEXT PRIMARY KEY,
  squad_slug TEXT NOT NULL,
  status TEXT DEFAULT 'draft',
  rounds_total INTEGER DEFAULT 0,
  rounds_completed INTEGER DEFAULT 0,
  based_on_blueprint TEXT,
  based_on_investigation TEXT,
  source_hash TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS squad_plan_rounds (
  plan_slug TEXT NOT NULL,
  round_number INTEGER NOT NULL,
  executor_slug TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  completed_at TEXT,
  notes TEXT,
  PRIMARY KEY (plan_slug, round_number),
  FOREIGN KEY (plan_slug) REFERENCES squad_execution_plans(plan_slug)
);
```

## Resumo de mudanças

| Arquivo | Ação | O que muda |
|---------|------|------------|
| `template/.aioson/tasks/implementation-plan.md` | CRIAR | Task de geração de plan (framework level) |
| `template/.aioson/tasks/squad-execution-plan.md` | CRIAR | Task de geração de plan (squad level) |
| `src/commands/implementation-plan.js` | CRIAR | CLI para gestão de plans (framework level) |
| `src/commands/squad-plan.js` | CRIAR | CLI para gestão de plans (squad level) |
| `tests/implementation-plan.test.js` | CRIAR | Testes CLI |
| `tests/squad-plan.test.js` | CRIAR | Testes CLI |
| `template/.aioson/agents/dev.md` | EDITAR | Seção "Implementation plan detection" |
| `template/.aioson/agents/orchestrator.md` | EDITAR | Step 1b — Generate or verify plan |
| `template/.aioson/agents/squad.md` | EDITAR | Routing + Step 6 + template do orchestrator |
| `template/.aioson/locales/*/agents/squad.md` | EDITAR | Espelhar mudanças |
| `template/.aioson/locales/*/agents/dev.md` | EDITAR | Espelhar mudanças |
| `template/.aioson/locales/*/agents/orchestrator.md` | EDITAR | Espelhar mudanças |
| `src/runtime-store.js` | EDITAR | 4 novas tabelas |
| `src/cli.js` | EDITAR | Registrar novos comandos |
| `src/i18n/messages/*.js` | EDITAR | Mensagens dos novos comandos |

## Prioridade de implementação

```
1. template/.aioson/tasks/implementation-plan.md          ← framework task
2. template/.aioson/tasks/squad-execution-plan.md         ← squad task
3. Editar dev.md (detection)                              ← framework integration
4. Editar orchestrator.md (Step 1b)                       ← framework integration
5. Editar squad.md (routing + Step 6 + orchestrator)      ← squad integration
6. src/runtime-store.js (tabelas)                         ← persistence
7. src/commands/implementation-plan.js                    ← CLI
8. src/commands/squad-plan.js                             ← CLI
9. Testes                                                 ← validação
10. Locales                                               ← i18n
```
