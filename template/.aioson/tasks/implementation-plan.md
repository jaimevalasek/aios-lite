# Task: Generate Implementation Plan

> Fase obrigatória entre spec completa e início de implementação.
> Garante consistência, define sequência, e prepara context package para novo chat.

## Quando executar

### Automaticamente (agentes detectam)
- /dev detecta que NÃO existe `implementation-plan.md` mas EXISTEM:
  - `architecture.md` (SMALL/MEDIUM) ou `project.context.md` (MICRO)
  - Pelo menos um de: `prd.md`, `prd-{slug}.md`, `readiness.md`
- /orchestrator detecta o mesmo no Step 1

### Manualmente
- Usuário pede: "gere o plano de implementação"
- Após /architect ou /pm finalizar seus artefatos

### Feature mode
- Detecta `prd-{slug}.md` existente sem `implementation-plan-{slug}.md`
- Gera plan scoped à feature

## Processo

### Passo 1 — Inventory check

Listar todos os artefatos em `.aioson/context/`. Para cada um, verificar:
- Existe? Está completo? É consistente com os outros?
- Sinalizar gaps e contradições

Artefatos a verificar (em ordem de prioridade):

| Artefato | Obrigatório para | Se ausente |
|----------|-------------------|------------|
| `project.context.md` | MICRO, SMALL, MEDIUM | STOP — não gere plan sem identidade |
| `architecture.md` | SMALL, MEDIUM | Warn — plan terá sequência menos precisa |
| `prd.md` ou `prd-{slug}.md` | Todos (se existe) | Info — plan baseado apenas em architecture |
| `discovery.md` | SMALL, MEDIUM | Warn — risco de conflitos com entidades existentes |
| `ui-spec.md` | Se tem UI | Info — fases de UI terão menos detalhe |
| `readiness.md` | Se existe | Info — plan assume readiness = READY |
| `spec.md` | Se existe | Info — sem histórico de decisões anteriores |
| `design-doc.md` | Se existe | Info — decisões arquiteturais menos firmes |
| `requirements-{slug}.md` | Feature mode | Warn — regras de negócio podem faltar |

### Passo 2 — Cross-analysis

Ler os artefatos na ordem: `project.context` → `discovery` → `architecture` → `prd` → `ui-spec` → `requirements` → `spec` → `design-doc`

Buscar ativamente:
- **Entidades fantasma:** referenciadas no PRD mas ausentes no discovery
- **Contradições técnicas:** decisão no architecture que conflita com o PRD
- **Dependências invisíveis:** feature no ui-spec que depende de algo não coberto
- **Assumptions implícitas:** qualquer artefato que assume algo sem declarar
- **Scope creep:** requisitos que parecem fora do scope declarado
- **Riscos de integração:** pontos onde módulos diferentes precisam concordar

Para cada issue encontrado, classificar:
- **BLOCK** — não pode prosseguir sem resolver (ex: entidade central faltando)
- **WARN** — pode prosseguir com assumption explícita (ex: campo inferido)
- **INFO** — anotar para o dev ter consciência (ex: possível refatoração futura)

### Passo 3 — Sequence planning

Definir a ordem de implementação baseada em:

**Dependências de dados (sempre primeiro):**
1. Migrations / schemas / contracts
2. Models / types / entities
3. Repositories / data access

**Dependências de lógica (depois dos dados):**
4. Services / actions / use-cases
5. Validação / policies / authorization

**Dependências de interface (por último):**
6. Controllers / API routes / handlers
7. Views / components / pages

**Módulos independentes:**
- Identificar módulos que NÃO compartilham entidades → podem ser paralelos
- Identificar módulos que COMPARTILHAM entidades → devem ser sequenciais
- Se /orchestrator vai usar, marcar explicitamente: `parallel: true/false`

**Para cada fase, definir:**
- Título descritivo
- O que implementar (concreto, não vago)
- De que depende
- Quais artefatos o /dev precisa ler
- Critério de done (como saber que terminou)
- Checkpoint gate (o que verificar antes de seguir)

### Passo 4 — Context package

O context package é o conjunto MÍNIMO de arquivos que o próximo agente ou chat precisa ler para executar o plan com qualidade máxima.

**Princípios:**
- Menos é mais — 3-5 arquivos é o ideal, nunca mais de 7
- O implementation-plan.md SEMPRE é o primeiro arquivo
- Artefatos já digeridos no plan NÃO precisam ser re-lidos
- Separar "leitura obrigatória" de "leitura sob demanda"

**Formato do context package:**

```
Leitura obrigatória (nesta ordem):
1. implementation-plan.md ← este arquivo
2. project.context.md
3. architecture.md (se SMALL/MEDIUM)
4. spec.md (se existe — histórico de decisões)

Leitura sob demanda (quando tocar no tema):
- discovery.md — quando tocar em entidades existentes
- prd.md — quando tiver dúvida sobre requisito
- ui-spec.md — quando implementar UI
- requirements-{slug}.md — quando implementar a feature

NÃO re-ler (já sintetizado neste plan):
- [lista de artefatos cujo conteúdo relevante já está no plan]
```

### Passo 5 — Decision registry

Separar decisões em duas categorias:

**Decisões pré-tomadas (NÃO re-discutir):**
- Decisões do /architect que já foram validadas
- Escolhas de stack documentadas em project.context.md
- Convenções definidas em rules/
- Restrições documentadas no prd

**Decisões adiadas (o /dev vai tomar):**
- Trade-offs que só fazem sentido com código na frente
- Escolhas de implementação (ex: eager vs lazy loading)
- Otimizações que dependem de profiling

Para cada decisão adiada: descrever o trade-off e indicar a direção preferida.

### Passo 6 — Generate plan

Salvar o plan como:
- **Project mode:** `.aioson/context/implementation-plan.md`
- **Feature mode:** `.aioson/context/implementation-plan-{slug}.md`

Formato do artefato:

```markdown
---
project: "{project_name}"
scope: "{project | feature}"
feature_slug: "{slug ou null}"
created: "{ISO-8601}"
status: "draft"
classification: "{MICRO | SMALL | MEDIUM}"
source_artifacts:
  - project.context.md
  - architecture.md
  - prd.md
---

# Implementation Plan

> Gerado após consolidação de todos os artefatos de spec.
> Aprovado pelo usuário antes de qualquer implementação.
> Status: draft → approved → in_progress → completed

## Pre-flight check

### Artefatos lidos
- [x] project.context.md — ok
- [x] architecture.md — ok
- [ ] discovery.md — missing (proceeding with assumptions)
[...]

### Consistency check
{issues encontrados, classificados como BLOCK/WARN/INFO}

### Readiness verdict
{READY | READY_WITH_ASSUMPTIONS | NOT_READY}

## Execution Strategy

### Fase 1 — {título} (estimativa: {N arquivos/commits})
- **O que:** {descrição concreta — não "implementar o módulo", mas "criar migration users com campos X, Y, Z + model User com relação hasMany Orders"}
- **Depende de:** nada
- **Artefatos de entrada:** {lista de arquivos que o dev precisa ler}
- **Critério de done:** {ex: migration roda sem erro, model passa nos testes de relação}
- **Checkpoint:** {ex: verificar que a tabela users existe e tem os campos corretos}

### Fase 2 — {título}
[...]

### Fases paralelas (se /orchestrator for usar)
- Fase X e Fase Y podem rodar em paralelo (sem entidades compartilhadas)
- Fase Z depende de X (compartilham tabela orders)

## Decisões pré-tomadas
- {decisão 1 — fonte: architecture.md — não re-discutir}
- {decisão 2 — fonte: prd.md — validado pelo product}

## Decisões adiadas
- {decisão 1 — trade-off: A vs B — direção preferida: A porque ...}
- {decisão 2 — depende do resultado da Fase 1}

## Context Package

### Leitura obrigatória (ordem importa)
1. `implementation-plan.md` ← este arquivo
2. `project.context.md`
3. `architecture.md`
4. `spec.md`

### Leitura sob demanda
- `discovery.md` — quando tocar em entidades
- `prd.md` — quando tiver dúvida sobre requisito
- `ui-spec.md` — quando implementar UI

### NÃO re-ler
- {artefato X — já sintetizado nas fases acima}

## Instruções para o próximo agente

> Para /dev ou /orchestrator:
>
> 1. Leia este arquivo PRIMEIRO
> 2. Siga a sequência de fases na ordem
> 3. Após cada fase, atualize spec.md com as decisões tomadas
> 4. Se encontrar contradição com este plano, PARE e pergunte ao usuário
> 5. Decisões pré-tomadas são final — não re-discutir
> 6. Decisões adiadas são para você tomar — registre em spec.md
> 7. Ao completar cada fase, marque o checkpoint
```

### Passo 7 — Apresentar ao usuário

Mostrar resumo conciso:

```
Implementation Plan gerado.

Fases: {N} ({M paralelas se orchestrator)
Consistency: {N blocks, M warns, P infos}
Readiness: {READY | READY_WITH_ASSUMPTIONS | NOT_READY}
Context package: {N arquivos obrigatórios + M sob demanda}

Sequência:
1. {fase 1 — 1 linha}
2. {fase 2 — 1 linha}
[...]

Recomendação: {iniciar novo chat para implementação / continuar aqui}
```

Perguntar:
> "Plano de implementação pronto. Quer ajustar algo antes de começar?"

Se o chat atual já consumiu muitos tokens com discovery/design:
> "Recomendo iniciar um novo chat para a implementação — o context package está definido no plano."

## Adaptação por classificação

### MICRO
- Plan é **opcional** (overhead pode não valer)
- Se gerado: 1-3 fases, sem cross-analysis profunda
- Context package: só `project.context.md` + `implementation-plan.md`
- Pular passo 2 (cross-analysis) se artefatos são mínimos

### SMALL
- Plan é **recomendado**
- 3-5 fases típicas
- Context package: 3-4 arquivos
- Cross-analysis: PRD ↔ architecture + discovery ↔ PRD

### MEDIUM
- Plan é **obrigatório** (orchestrator precisa antes de paralelizar)
- 5-10 fases com dependências explícitas
- Context package: 4-5 arquivos + subagent-specific packages
- Cross-analysis: completa entre todos os artefatos
- Marcar fases paralelas explicitamente

## Regras

- NÃO comece a implementar nesta task — SÓ planeje
- NÃO ignore gaps BLOCK — sinalize e PARE
- NÃO invente requisitos — se não está nos artefatos, é uma decisão adiada
- O plan é um ARTEFATO PERSISTENTE — salve em arquivo, nunca só no chat
- Se readiness = NOT_READY, PARE e diga o que falta antes de gerar fases
- Cada fase deve ser CONCRETA o suficiente para o /dev executar sem ambiguidade
- Fases vagas como "implementar o backend" são proibidas — detalhe QUAIS arquivos, QUAIS entidades
- Após aprovação do usuário, mude status de `draft` para `approved`
