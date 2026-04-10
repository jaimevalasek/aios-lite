# Estratégia de Evolução da Orquestração — AIOSON

> Data: 2026-03-21
> Objetivo: definir o que faz sentido implementar para que o aioson se torne um framework de desenvolvimento com IA eficiente, inteligente e escalável — do projeto solo ao projeto corporativo

---

## Premissa fundamental

O aioson já tem algo raro: **enforcement real**.

A maioria dos frameworks de IA para desenvolvimento são prompt-only — dependem da disciplina do LLM para seguir o fluxo. O aioson já tem:

- Workflow com state machine (`workflow.state.json`)
- Validação de artefatos por estágio
- Runtime SQLite com lineage
- Sequências adaptadas por classificação (MICRO/SMALL/MEDIUM)
- Squads como artefatos físicos do projeto

O que falta não é mais funcionalidade. É **conectar o que já existe num plano operacional coerente** que funcione do projeto de 1 pessoa ao projeto de 10 equipes.

---

## Princípio de design: escala como gradiente, não como tipo

O aioson já acertou a base com MICRO/SMALL/MEDIUM. Mas a evolução natural não é adicionar LARGE/ENTERPRISE como categorias separadas. É tratar escala como **gradiente de capacidades que se ativam conforme necessário**.

```
Solo dev, 1 feature rápida
  → MICRO: @setup → @dev
  → sem squad, sem pipeline, sem paralelismo
  → custo zero de cerimônia

Dev solo, app completa
  → SMALL: @setup → @product → @analyst → @architect → @dev → @qa
  → workflow sequencial, artefatos por estágio
  → disciplina sem overhead

Time ou projeto complexo
  → MEDIUM: sequência completa + @orchestrator + lanes paralelas
  → squads opcionais para domínios especializados
  → pipelines entre squads se necessário

Múltiplos times, domínios cruzados
  → MEDIUM+: tudo acima + conductor + engine + handoff protocol
  → squads como times autônomos com ports e contratos
  → pipeline DAG com execução real
```

A chave: **cada camada se ativa sozinha quando o contexto pede**. Um projeto MICRO nunca vê a complexidade de um MEDIUM+. Mas um MEDIUM+ tem toda a disciplina de um MICRO embaixo.

---

## O que faz sentido implementar — e o que não faz

### Critérios de decisão

Para cada ideia do aiox-master ou de qualquer outra fonte, a pergunta é:

1. **Resolve um problema real que o aioson já enfrenta?** (não hipotético)
2. **Funciona para projetos pequenos sem adicionar cerimônia?**
3. **Escala naturalmente quando o projeto cresce?**
4. **Pode ser implementado sobre a infraestrutura que já existe?** (runtime, workflow-next, squads)
5. **O custo de implementação é proporcional ao valor?**

---

## Bloco 1 — Continuidade entre sessões (prioridade alta)

### O problema real

Hoje, quando o usuário fecha uma sessão Claude Code e abre outra, o LLM precisa reconstruir contexto do zero. O `workflow.state.json` diz onde o projeto está, mas não diz **o que aconteceu na última sessão** nem **o que deveria acontecer agora**.

O aiox-master resolve isso com handoffs artefatuais. O aioson pode resolver melhor.

### A solução para o aioson

**Handoff de sessão automático** — não entre agentes, mas entre sessões.

Quando uma sessão termina (agent completa, workflow avança, usuário sai):

```json
// .aioson/context/last-handoff.json
{
  "session_ended_at": "2026-03-21T14:30:00Z",
  "last_agent": "@analyst",
  "last_stage": "analyst",
  "what_was_done": "Mapeamento de entidades completo. Discovery.md gerado.",
  "what_comes_next": "@architect — definir arquitetura técnica",
  "open_decisions": [
    "Escolha entre PostgreSQL e MongoDB não resolvida"
  ],
  "context_files_updated": [
    ".aioson/context/discovery.md"
  ]
}
```

Quando uma nova sessão começa, qualquer agente lê isso primeiro e sabe exatamente onde retomar.

### Por que funciona para qualquer tamanho

- MICRO: handoff simples ("estava no @dev, faltam 2 endpoints")
- SMALL: handoff com decisões abertas ("@analyst terminou, @architect é o próximo")
- MEDIUM: handoff com status de lanes paralelas

### Implementação

- `workflow:next --complete` já existe. Adicionar geração de `last-handoff.json` nesse momento.
- `runtime-log --finish` já existe. Adicionar geração de handoff nesse momento.
- Cada agente, na ativação, checa se `last-handoff.json` existe e usa como briefing.
- Custo: baixo. É um JSON a mais no complete/finish.

---

## Bloco 2 — Conductor como camada de inteligência (prioridade alta)

### O problema real

O aioson tem um roteador (`workflow-next`) e um paralelizador (`@orchestrator`). Mas não tem um **conselheiro** — algo que olhe para o estado do projeto inteiro e diga "aqui é onde você está, aqui é para onde deveria ir, e por quê".

O aiox-master faz isso como persona. O aioson pode fazer como **serviço**.

### A solução para o aioson

Não criar um agente `@conductor` separado. Em vez disso, enriquecer o `workflow:next` para ser mais inteligente:

```bash
# Hoje
aioson workflow:next .
# → "Próximo: @architect"

# Evolução
aioson workflow:next . --status
# → Estado completo:
#   Projeto: task-manager (SMALL)
#   Estágio atual: analyst (completo)
#   Próximo: @architect
#   Artefatos: discovery.md ✓, prd.md ✓, architecture.md ✗
#   Decisões abertas: 1
#   Squads ativos: 0
#   Último handoff: 2h atrás
#   Sugestão: "Ative @architect para definir a arquitetura. O discovery.md está completo."

aioson workflow:next . --suggest
# → Analisa contexto e sugere ação ideal, mesmo fora da sequência padrão
#   "O prd.md menciona integrações com Stripe. Considere ativar @analyst novamente
#    para mapear a integração antes de prosseguir para @architect."
```

### Por que funciona para qualquer tamanho

- MICRO: `workflow:next` diz "@dev" e pronto
- SMALL: `--status` mostra onde está no fluxo
- MEDIUM: `--status` inclui lanes paralelas, squads ativos, pipeline status
- Projetos grandes: `--suggest` analisa artefatos e propõe desvios inteligentes

### O que o aiox-master faz que NÃO faz sentido aqui

- Criar um agente-mestre separado com persona e greeting. Isso adiciona uma entidade a mais sem resolver o problema.
- Duplicar comandos que já existem no CLI. O aioson já tem `squad:status`, `squad:validate`, `workflow:next`. Consolidar a experiência nesses comandos, não criar uma camada paralela.

---

## Bloco 3 — Squad Pipeline Run (prioridade média-alta)

### O problema real

O aioson já tem a infraestrutura de pipeline:

- `pipeline_nodes` (squads como nós)
- `pipeline_edges` (conexões com ports)
- `getTopologicalOrder()` (ordem de execução)
- `squad_handoffs` (registro de transferências)

Mas `squad-pipeline.js` só implementa `list`, `show`, `status`. Não tem `run`.

Isso significa que o modelo de DAG entre squads existe no papel mas não executa de verdade.

### A solução para o aioson

Implementar `run` em duas fases:

**Fase 1 — Guided run (low-cost)**

```bash
aioson squad:pipeline . --sub=run --pipeline=content-pipeline
# → Consulta topological order
# → Identifica o primeiro nó não completo
# → Mostra:
#   "Pipeline: content-pipeline
#    Ordem: research → writing → review → publish
#    Status: research ✓, writing (pendente)
#    Próximo: Ativar squad 'writing'
#    Comando: aioson agent @writing-orchestrator"
```

Guided = o sistema diz o que fazer. O humano executa.

**Fase 2 — Engine run (quando viável)**

```bash
aioson squad:pipeline . --sub=run --pipeline=content-pipeline --mode=engine
# → Executa cada nó na ordem
# → Consome handoffs automaticamente
# → Registra runs no runtime
# → Para em falha ou gate humano
```

### Por que funciona para qualquer tamanho

- Projetos sem squads: pipeline não existe, zero overhead
- Projeto com 1 squad: não precisa de pipeline
- Projeto com 2+ squads conectados: guided run funciona imediatamente
- Projeto com muitos squads: engine run automatiza a cadeia

### Implementação concreta

Adicionar ao `squad-pipeline.js`:

```javascript
if (subcommand === 'run') {
  const order = getTopologicalOrder(db, slugArg);
  // Identificar próximo nó pendente
  // Verificar handoffs consumidos/pendentes
  // Em guided mode: mostrar próximo passo
  // Em engine mode: executar via agent prompt
}

if (subcommand === 'continue') {
  // Retomar de onde parou
}

if (subcommand === 'skip') {
  // Pular nó atual e avançar
}
```

---

## Bloco 4 — Catálogo unificado de agentes (prioridade média)

### O problema real

Hoje o aioson tem dois mundos separados:

1. **Agentes oficiais** — definidos em `constants.js`, 15 agentes com paths, deps, outputs
2. **Agentes de squad** — gerados em `.aioson/squads/{slug}/agents/`, sem registro central

Um usuário com 3 squads ativos tem 15 agentes oficiais + N agentes de squad. Mas não existe um comando que mostre todos juntos nem que resolva "quem pode fazer X?".

### A solução para o aioson

Expandir `aioson agents:list` para incluir agentes de squad:

```bash
aioson agents:list .
# → Agentes oficiais (15):
#   @setup    — Initialize project context
#   @product  — Define PRD
#   @analyst  — Discover requirements
#   ...
#
# → Squads ativos (2):
#   content-squad/
#     @content-orchestrator — Coordena o time de conteúdo
#     @scriptwriter         — Escreve roteiros
#     @copywriter           — Escreve copy
#   data-squad/
#     @data-orchestrator    — Coordena pipeline de dados
#     @etl-agent            — Processa ETL
#
# → Workers (3):
#   content-squad/workers/formatter.md
#   data-squad/workers/validator.md
#   data-squad/workers/enricher.md

aioson agents:find . "escrever roteiro"
# → Melhor match: @scriptwriter (content-squad)
#   Também relevante: @copywriter (content-squad)
```

### Por que funciona para qualquer tamanho

- Sem squads: mostra só os 15 oficiais (como hoje)
- Com squads: mostra tudo consolidado
- A busca por capacidade é útil a partir do momento que o projeto tem mais de ~5 agentes

### Implementação

- Ler `constants.js` para oficiais (já existe)
- Scan `.aioson/squads/*/agents/*.md` para squad agents
- Scan `.aioson/squads/*/workers/*.md` para workers
- Ler `squad.manifest.json` de cada squad para metadata
- Custo: moderado. É scan de filesystem + parse de manifests que já existem.

---

## Bloco 5 — Capability awareness no workflow (prioridade média)

### O problema real

O `workflow-next` hoje roteia por sequência fixa: setup → product → analyst → architect → dev → qa.

Mas em projetos reais:

- Às vezes o usuário já tem um PRD pronto e não precisa de @product
- Às vezes o projeto precisa de um squad de conteúdo antes do @dev
- Às vezes o @analyst descobre que o escopo é maior que o esperado e a classificação deveria mudar

O `workflow-next` já tem detours e skip. Mas não tem **reclassificação dinâmica** nem **inserção de estágios customizados**.

### A solução para o aioson

**Reclassificação dinâmica:**

```bash
aioson workflow:next . --reclassify
# → Analisa artefatos existentes
# → Se discovery.md mostra 12 entidades mas classificação é MICRO:
#   "⚠ Classificação atual: MICRO
#    Entidades descobertas: 12
#    Sugestão: reclassificar para SMALL
#    Isso adicionaria: @product, @analyst, @architect, @qa
#    Aceitar? [s/n]"
```

**Estágios customizados:**

Permitir que o `workflow.config.json` do projeto aceite estágios de squad:

```json
{
  "project": {
    "MEDIUM": [
      "setup", "product", "analyst", "architect",
      "squad:content-squad",
      "dev", "qa"
    ]
  }
}
```

O workflow-next trataria `squad:content-squad` como um estágio que ativa o orchestrator do squad em vez de um agente oficial.

### Por que funciona para qualquer tamanho

- MICRO: nunca reclassifica (2 estágios, impossível ter mais entidades)
- SMALL: reclassifica se o analyst descobrir mais complexidade que o esperado
- MEDIUM: pode inserir estágios de squad no fluxo principal

---

## Bloco 6 — Governance leve (prioridade baixa-média)

### O problema real

Hoje nada impede um usuário de:

- Criar 5 squads para domínios sobrepostos
- Modificar um artefato compartilhado sem saber que outro squad depende dele
- Pular estágios de workflow que produziriam artefatos necessários depois

O aiox-master resolve isso com IDS, hooks e validação. Mas o aioson não precisa de tudo isso.

### A solução para o aioson — governance como informação, não como bloqueio

```bash
aioson check .
# → Roda uma verificação rápida do estado do projeto:
#
# Workflow: SMALL, estágio atual @architect
# Artefatos: discovery.md ✓ (12h atrás), prd.md ✓ (1d atrás)
# Squads: 2 ativos (content-squad, data-squad)
# ⚠ Possível sobreposição: content-squad e data-squad
#   ambos declaram skill "text-processing" — verificar se é intencional
# Pipelines: 1 (content-pipeline, status: draft)
# Genomes: 3 aplicados
# Saúde geral: ✓ sem problemas críticos
```

Isso é o IDS do aiox-master, mas numa versão que:
- Não bloqueia nada
- Não exige registro manual
- Roda com scan dos artefatos que já existem
- Serve como health check, não como governança pesada

### Pre-create advisory (versão leve)

Antes de `@squad create`, verificar automaticamente:

```
Criando squad para domínio "conteúdo digital"...
ℹ Squad existente encontrado: content-squad (ativo desde 2026-03-15)
  Agentes: @scriptwriter, @copywriter, @editor
Opções:
  1. Criar novo squad mesmo assim (slug diferente)
  2. Estender o squad existente
  3. Cancelar
```

Isso é o `*ids check` do AIOX, mas integrado naturalmente no fluxo de criação.

---

## Bloco 7 — Run tree no runtime (prioridade baixa)

### O problema real

O runtime já registra tasks, runs e events. Mas a relação pai/filho entre runs não é explorada como produto.

O `execution-gateway.js` já tem `parent_run_key`. Mas não existe um comando que mostre a árvore de execução de forma útil.

### A solução para o aioson

```bash
aioson runtime:tree .
# → Workflow: task-manager (SMALL)
#   └─ @workflow (controller) [completed]
#      ├─ @setup [completed] — 3 events, 2m
#      ├─ @product [completed] — 5 events, 15m
#      ├─ @analyst [completed] — 8 events, 25m
#      ├─ @architect [running] — 2 events, 10m (em andamento)
#      └─ @dev [pendente]
#         └─ @qa [pendente]
```

Para projetos com squads:

```bash
aioson runtime:tree .
# → Workflow: plataforma-conteudo (MEDIUM)
#   └─ @workflow (controller) [running]
#      ├─ @setup [completed]
#      ├─ @product [completed]
#      ├─ @analyst [completed]
#      ├─ @architect [completed]
#      ├─ content-squad [running]
#      │  ├─ @scriptwriter [completed] — 12 events
#      │  ├─ @copywriter [running] — 4 events
#      │  └─ @editor [pendente]
#      ├─ @dev [pendente]
#      └─ @qa [pendente]
```

### Implementação

Query no runtime SQLite com `parent_run_key` para montar a árvore. Os dados já existem. É só apresentação.

---

## O que NÃO implementar

### 1. Persona system / greeting / zodiac

O aiox-master tem um sistema de persona completo com archetype, zodiac, greeting_levels, signature_closing. Isso é branding, não valor operacional. O aioson é um framework de desenvolvimento, não um chatbot com personalidade.

### 2. Knowledge Base mode (`*kb`)

Carregar uma base de conhecimento do framework inteiro no contexto do LLM é caro e raramente necessário. O aioson já resolve isso com agentes especializados que carregam só o que precisam. Um `*kb` global seria context waste na maioria dos casos.

### 3. YAML monolítico de definição de agentes

O aiox-master coloca tudo num bloco YAML gigante. O aioson já tem uma separação melhor: agentes em .md (legíveis), runtime em JS (executável), manifests em JSON (parseável). Manter assim.

### 4. Command-shell dentro do LLM

O AIOX opera como shell de comandos (`*create`, `*modify`, etc). O aioson já tem CLI real com Node.js. Não transformar o LLM num shell quando já existe um CLI.

### 5. Engine mode automático completo

Spawning real de subagentes (o "engine mode" do AIOX) é tecnicamente possível mas frágil. Cada LLM instance custa tokens, pode falhar, pode divergir. Para o aioson, a evolução correta é:

- Guided mode = CLI sugere e humano ativa (funciona hoje)
- Semi-engine = CLI ativa agentes em sequence com gates humanos (fase 2)
- Full engine = automação completa (só quando o runtime provar que é estável)

### 6. Deprecate/undo component

O AIOX tem `*deprecate-component` e `*undo-last`. Para o aioson, git já resolve isso. Não reinventar version control.

### 7. Component lifecycle para agentes oficiais

Os agentes oficiais do aioson são templates estáticos. Eles não precisam de create/modify/deprecate programático. Quem precisa disso são os squads — e eles já têm.

---

## Roadmap de implementação sugerido

### Fase 1 — Continuidade (custo baixo, valor alto)

- [ ] `last-handoff.json` gerado por `workflow:next --complete` e `runtime-log --finish`
- [ ] Leitura de handoff no startup de cada agente
- [ ] `workflow:next --status` com visão completa do projeto

**Resultado:** O usuário nunca perde o fio entre sessões.

### Fase 2 — Catálogo e visibilidade (custo moderado, valor alto)

- [ ] `agents:list` expandido para incluir agentes de squad e workers
- [ ] `workflow:next --suggest` com análise de artefatos
- [ ] `runtime:tree` para visualizar a árvore de execução

**Resultado:** O usuário sempre sabe onde está, quem pode ajudar, e o que já aconteceu.

### Fase 3 — Pipeline run (custo moderado, valor alto para projetos com squads)

- [ ] `squad:pipeline --sub=run` em guided mode
- [ ] `squad:pipeline --sub=continue` e `--sub=skip`
- [ ] Consumo automático de handoffs entre nós do pipeline

**Resultado:** Pipelines de squads funcionam de verdade, não só como diagrama.

### Fase 4 — Workflow dinâmico (custo moderado, valor médio)

- [ ] Reclassificação dinâmica via `workflow:next --reclassify`
- [ ] Estágios de squad inseríveis no workflow.config.json
- [ ] Advisory check antes de `@squad create`

**Resultado:** O workflow se adapta ao projeto em vez de forçar o projeto no workflow.

### Fase 5 — Health check (custo baixo, valor cumulativo)

- [ ] `aioson check .` com verificação leve do ecossistema
- [ ] Detecção de sobreposição entre squads
- [ ] Validação de integridade de artefatos

**Resultado:** O projeto se auto-diagnostica.

---

## Exemplo: como isso funciona na prática

### Cenário 1 — Dev solo, app de tarefas (MICRO)

```bash
aioson setup .                    # Cria contexto
aioson workflow:next .            # → "@dev"
# Usuário ativa @dev, implementa, termina
aioson workflow:next . --complete # → Gera handoff, workflow completo
```

Zero overhead. 2 comandos. Nenhuma camada extra ativada.

### Cenário 2 — Dev solo, SaaS completo (SMALL)

```bash
aioson setup .                    # → SMALL detectado
aioson workflow:next .            # → "@product"
# Sessão 1: @product gera prd.md
aioson workflow:next . --complete # → handoff: "PRD completo, próximo: @analyst"

# Sessão 2 (dia seguinte):
aioson workflow:next .            # → Lê handoff, mostra: "Retomando: @analyst"
# @analyst gera discovery.md
aioson workflow:next . --complete

# Sessão 3:
aioson workflow:next . --status
# → "Projeto: task-saas (SMALL)
#    ✓ setup, ✓ product, ✓ analyst
#    → architect (próximo)
#    Artefatos: project.context.md ✓, prd.md ✓, discovery.md ✓
#    Sugestão: ative @architect"
```

Continuidade perfeita entre sessões. Status rico. Zero cerimônia extra.

### Cenário 3 — Time, plataforma de conteúdo (MEDIUM + squads)

```bash
aioson setup .                    # → MEDIUM detectado
# Workflow normal até @architect completar

# Usuário cria squad de conteúdo
aioson agent @squad               # → Cria content-squad
aioson agent @squad               # → Cria review-squad

# Conecta em pipeline
aioson squad:pipeline . --sub=create --pipeline=content-flow
# → content-squad [write] → review-squad [review] → output

# Executa pipeline (guided)
aioson squad:pipeline . --sub=run --pipeline=content-flow
# → "Próximo: ativar content-squad (@content-orchestrator)
#    Comando: aioson agent @content-orchestrator"

# Verifica estado geral
aioson agents:list .
# → 15 oficiais + 6 de squad + 3 workers

aioson workflow:next . --status
# → Visão completa: workflow + squads + pipeline + handoffs

aioson runtime:tree .
# → Árvore de execução com agentes oficiais e squads
```

Tudo conectado. Tudo rastreável. Mas cada camada só aparece quando é relevante.

---

## Princípios finais

1. **Escala como gradiente** — cada feature se ativa quando o contexto pede, não quando o tamanho é classificado
2. **CLI como centro** — o CLI real é o conductor, não um agente-prompt
3. **Artefatos como prova** — o aioson prova que as coisas aconteceram, não confia que o LLM fez
4. **Runtime como memória** — SQLite é a verdade, não o contexto do LLM
5. **Composição, não substituição** — cada nova camada se compõe sobre as existentes
6. **Informação, não bloqueio** — governance como advisory, nunca como gate (exceto workflow enforcement que já existe)
7. **Custo proporcional** — MICRO não paga o preço de MEDIUM

---

## Referências cruzadas

- Análise Codex prévia: `products-features/upgrade-agents/orchestrator-master/analysis.md`
- Deep analysis AIOX vs AIOSON: `products-features/upgrade-agents/orchestrator-master/aiox-vs-aioson-deep-analysis.md`
- AIOX source: https://github.com/SynkraAI/aiox-core/blob/main/.claude/commands/AIOX/agents/aiox-master.md
