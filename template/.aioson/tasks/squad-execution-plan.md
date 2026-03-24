# Task: Squad Execution Plan

> Gera o plano de execução do squad após criação e validação.
> Define como os executors vão atacar o objetivo em sequência.
> Garante consistência entre executors, workflows, e checklists.

## Quando usar
- Automaticamente após `@squad create` + `@squad validate` + warm-up (para squads qualificados)
- `@squad plan <slug>` — invocação direta
- Antes da primeira session produtiva do squad
- Quando o squad muda (novos executors, nova investigation, workflow redesign)

## Entrada
- Squad manifest (`squad.manifest.json`)
- Blueprint (`.designs/{slug}.blueprint.json`)
- Investigation report (se existir em `squad-searches/`)
- Workflow definition (se existir em `workflows/`)
- Quality checklists (se existirem em `checklists/`)
- Loaded rules de `.aioson/rules/squad/`
- Loaded skills de `.aioson/skills/squad/`
- Learnings anteriores (se `learnings/index.md` existir)

## Processo

### Passo 1 — Re-análise cruzada

Ler o manifest completo e verificar consistência:

**Coverage analysis — cada executor:**
- O role cobre algo ÚNICO que nenhum outro executor cobre?
- Existe gap no coverage? (aspecto do goal que ninguém cobre)
- Existe overlap? (dois executors fazem a mesma coisa)
- As skills declaradas existem e são relevantes para o role?

**Workflow analysis — se workflow existe:**
- Cada phase tem executor atribuído que existe no manifest?
- O output de cada phase é o input esperado da próxima?
- Existem handoffs sem transformação clara?
- Human gates estão posicionados em pontos de risco real?
- Review loops (se configurados) apontam para phases que existem?

**Checklist analysis:**
- Os critérios do checklist cobrem os aspectos críticos do domínio?
- Existem critérios genéricos demais? (substituir por específicos)
- Existe critério que nenhum executor pode avaliar? (gap de competência)

**Investigation analysis — se investigation report existe:**
- Os anti-patterns descobertos estão refletidos como hard constraints nos executors?
- O vocabulário de domínio foi injetado nos executors relevantes?
- Os frameworks descobertos estão sendo usados na estrutura do squad?
- Os benchmarks de qualidade estão no checklist?

Para cada issue, classificar:
- **ADJUST** — corrigir antes de executar (ex: executor sem coverage)
- **WARN** — sinalizar mas pode prosseguir (ex: overlap parcial intencional)
- **INFO** — anotar para consciência do orquestrador (ex: dimension não coberta pela investigation)

### Passo 2 — Sequência de ativação

Definir a ordem ideal de rounds para atingir o goal do squad.

**Se o squad tem workflow definido:**
- Usar as phases do workflow como base
- Mapear cada phase para um round no execution plan
- Adicionar rounds de review/synthesis entre phases críticas
- Respeitar o execution mode (sequential/parallel/mixed)

**Se o squad NÃO tem workflow:**
- Derivar a sequência do manifest + domain knowledge
- Heurística padrão:

```
1. Research / Analysis (executors com focus em pesquisa)
2. Creation / Production (executors com focus em criação)
3. Review / Quality (executors com focus em revisão)
4. Synthesis / Delivery (@orquestrador)
```

**Para cada round, definir:**

```markdown
### Round {N} — {título descritivo}
- **Executor:** @{slug} ({type})
- **Objective:** {o que este executor vai produzir neste round}
- **Input:** {o que precisa receber — de quem, qual artefato}
- **Output esperado:** {artefato concreto que será produzido}
- **Quality gate:** {critério de aceitação deste round}
- **Anti-patterns a evitar:** {do investigation report, se disponível}
- **Handoff:** output → Round {N+1} input
- **Parallel:** {true | false — se pode rodar junto com outro round}
```

**Rounds especiais:**
- `Round 0 — Context Loading` (implícito, não um round real): o orquestrador carrega learnings e context
- `Round N — Synthesis` (sempre o último): @orquestrador sintetiza todos os outputs em deliverable final
- `Review Round` (após rounds críticos): se review loop está configurado, inserir round de review

### Passo 3 — Context per executor

Para cada executor no plan, definir o "briefing package":

```markdown
## Briefing: @{executor-slug}

### Deve ler antes de começar
- Seu agent file (`.aioson/squads/{slug}/agents/{executor}.md`)
- Output do round anterior (se houver)
- {artefato específico relevante para este executor}

### Contexto injetado pelo orquestrador
- Goal do squad: {1 frase}
- Seu objetivo neste round: {1 frase}
- Anti-patterns a evitar: {lista curta}
- Vocabulário de domínio: {termos-chave, se da investigation}

### O que NÃO precisa ler
- {artefatos de outros executors que não são input deste round}
- {investigation completa — só os excerpts relevantes}
```

### Passo 4 — Success criteria

Definir como saber que o squad cumpriu o objective:

```markdown
## Success Criteria

### Output final esperado
- {descrição concreta do deliverable — não "conteúdo de qualidade" mas "3 scripts de vídeo com hook, body, e CTA"}

### Quality gates que devem passar
- {checklist item 1 — do quality.md}
- {checklist item 2}
- {item do investigation report, se aplicável}

### Definition of done
- [ ] Todos os rounds completados
- [ ] Output final salvo em `output/{squad-slug}/`
- [ ] Session HTML gerado em `output/{squad-slug}/{session-id}.html`
- [ ] Nenhum review loop pendente (se configurados)
- [ ] Checklists validados
```

### Passo 5 — Orchestration notes

Instruções específicas para o @orquestrador:

```markdown
## Orchestration Notes

### Session management
- {como o orquestrador deve abrir a session}
- {quando escalar para o usuário vs. decidir autonomamente}
- {como lidar com review loops se configurados}

### Round transitions
- Após cada round, verificar o quality gate ANTES de passar ao próximo
- Se quality gate falha: {retry strategy — do review loop config ou default}
- Se executor pede ajuda de outro: {routing rules}

### Escalation policy
- Se um executor não consegue produzir output: escalar ao usuário
- Se dois executors conflitam: sintetizar a tensão e perguntar ao usuário
- Se o quality gate falha após max retries: {strategy}

### Learning capture
- Ao final da session, detectar learnings (ver squad-learning)
- Registrar em `learnings/` antes de fechar a session
```

### Passo 6 — Gerar execution-plan.md

Salvar em `.aioson/squads/{slug}/docs/execution-plan.md`:

```markdown
---
squad: "{squad-slug}"
created: "{ISO-8601}"
status: "draft"
based_on_blueprint: "{blueprint path}"
based_on_investigation: "{investigation path ou null}"
rounds_total: {N}
source_artifacts:
  - squad.manifest.json
  - {blueprint path}
  - {investigation path}
---

# Execution Plan: {squad-name}

> Plano de como o squad vai atacar o objetivo.
> Gerado após criação, aprovado antes da primeira session.
> Status: draft → approved → in_progress → completed

## Pre-flight check

### Artefatos consolidados
{inventory do Passo 1}

### Consistency check
{issues encontrados, classificados como ADJUST/WARN/INFO}

### Squad readiness verdict
{READY | NEEDS_ADJUSTMENT | NOT_READY}

## Execution Strategy

### Sequência de rounds
{Rounds do Passo 2}

## Executor Briefings
{Briefings do Passo 3}

## Success Criteria
{Critérios do Passo 4}

## Orchestration Notes
{Notas do Passo 5}

## Context Package (para session ou novo chat)

### O que o @orquestrador deve ler no início de cada session
1. Este execution-plan.md
2. squad.manifest.json
3. Último session HTML (se não é a primeira session)
4. learnings/index.md (se existe)

### O que cada executor recebe
- Seu agent file + briefing deste plan
- Output do round anterior (se houver)
```

### Passo 7 — Apresentar ao usuário

```
Execution Plan gerado para squad {name}.

Rounds: {N} ({M paralelos se houver)
Consistency: {N adjusts, M warns, P infos}
Readiness: {READY | NEEDS_ADJUSTMENT | NOT_READY}

Sequência:
1. {round 1 — executor — 1 linha}
2. {round 2 — executor — 1 linha}
[...]

Success criteria: {1 linha do deliverable final esperado}
```

Perguntar:
> "Plano de execução pronto. Quer ajustar algo antes de iniciar a primeira session?"

Se NEEDS_ADJUSTMENT:
> "Encontrei {N} ajustes necessários. Quer que eu corrija antes de aprovar o plan?"

## Quando gerar automaticamente (decision tree para squad.md)

```
Squad criado e validado
  ├── 4+ executors? → GERAR automaticamente
  ├── Workflow definido? → GERAR automaticamente
  ├── Investigation @orache foi feita? → GERAR automaticamente
  ├── Mode = software ou mixed? → GERAR automaticamente
  ├── 3 executors + goal simples? → OFERECER (não obrigar)
  ├── Ephemeral squad? → PULAR
  └── 2 executors + flow óbvio? → PULAR
```

## Regras

- NÃO execute nenhum round aqui — SÓ planeje
- NÃO ignore issues ADJUST — sinalize e ofereça correção
- NÃO gere rounds vagos como "produzir conteúdo" — detalhe O QUE, COMO, e COM QUAIS inputs
- O execution plan é PERSISTENTE — salvar em arquivo, não só no chat
- Se investigation existe, DEVE ser usada para enriquecer o plan
- Se learnings existem, DEVEM informar a sequência de rounds
- Rounds review são OPCIONAIS se não há review loop configurado, mas RECOMENDADOS para squads com 4+ executors
- Após aprovação do usuário, mudar status de `draft` para `approved`
- Se o squad é editado depois do plan ser aprovado, marcar plan como `stale`
