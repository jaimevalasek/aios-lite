# Deep Analysis — AIOX Master vs AIOSON Orchestration

> Data: 2026-03-21
> Complementa: `analysis.md` (Codex) com visão cruzada detalhada
> Objetivo: mapear exatamente o que o aiox-master traz de ideia que enriqueceria o aioson e o que o aioson já tem que o aiox ainda não mostra

---

## Parte 1 — O que o AIOX tem que o AIOSON ainda não tem

### 1.1. IDS — Incremental Development System

O aiox-master traz um sistema de registry operacional completo:

| Comando AIOX | O que faz | Equivalente AIOSON |
|---|---|---|
| `*ids check {intent}` | Pre-check antes de criar componente (REUSE/ADAPT/CREATE) | **Não existe** |
| `*ids impact {entity-id}` | Análise de impacto com BFS em consumers | **Não existe** |
| `*ids register {file-path}` | Registro de nova entidade após criação | **Parcial** — manifests de squad existem mas não são um registry universal |
| `*ids health` | Health check do registry | **Não existe** |
| `*ids stats` | Estatísticas do ecossistema | **Parcial** — `squad:status` e `squad:validate` cobrem squads mas não agentes oficiais |

**Valor para o AIOSON:** Um IDS permitiria ao aioson responder programaticamente "o que já existe para este domínio?" antes de criar squads ou agentes duplicados. Hoje um usuário pode criar 3 squads de conteúdo sem saber que já existiam.

### 1.2. Pre-action hooks (pre_create / pre_modify / post_create)

O aiox-master define hooks automáticos:

```yaml
ids_hooks:
  pre_create:
    trigger: '*create agent|task|workflow'
    action: 'FrameworkGovernor.preCheck(intent, entityType)'
    mode: advisory
  pre_modify:
    trigger: '*modify agent|task|workflow'
    action: 'FrameworkGovernor.impactAnalysis(entityId)'
    mode: advisory
  post_create:
    trigger: 'After successful *create'
    action: 'FrameworkGovernor.postRegister(filePath, metadata)'
    mode: automatic
```

**No AIOSON:** Não existe nenhuma camada de hooks advisory. O `@squad` cria agentes, workers e manifests diretamente. Se um squad modifica algo que impacta outro, não há análise prévia.

**Valor:** Hooks advisory (não bloqueantes) dariam ao aioson uma camada de governança leve — especialmente para squads que compartilham domínios ou pipelines.

### 1.3. Handoff como artefato de navegação do sistema

O aiox-master tem um protocolo explícito:

1. Checa `.aiox/handoffs/` para artefatos não consumidos
2. Lê `from_agent` e `last_command`
3. Consulta `workflow-chains.yaml` para determinar próximo passo
4. Sugere o comando automaticamente
5. Marca como `consumed: true`

**No AIOSON:** O handoff existe em dois lugares isolados:
- `squad_handoffs` no runtime SQLite (pipeline entre squads)
- handoff textual entre agentes oficiais via `workflow:next`

Mas **não existe um handoff operacional universal** que conecte:
- agente oficial → agente oficial
- agente oficial → agente de squad
- agente de squad → agente de squad (fora de pipeline)
- worker → orquestrador do squad

**Valor:** Um protocolo de handoff universal permitiria continuidade automática entre sessões e entre agentes de qualquer tipo.

### 1.4. Guided mode vs Engine mode como contrato explícito

O AIOX define dois modos claros de workflow:

- **guided** (`--mode=guided`): persona-switch manual, humano no controle
- **engine** (`--mode=engine`): spawning real de subagentes

**No AIOSON:** A distinção existe implicitamente:
- `workflow:next` = guided (humano avança estágios)
- `@orchestrator` parallel = semi-engine (cria contextos para subagentes)
- `squad:pipeline` = engine conceitual (DAG), mas só implementa `list`, `show`, `status` — **não tem `run`**

**Valor:** Nomear e formalizar essa distinção ajudaria o aioson a comunicar claramente ao usuário "estou sugerindo" vs "estou executando".

### 1.5. Validate-workflow e validate-agents como comandos de primeiro nível

O aiox-master expõe:

- `*validate-workflow {name} [--strict] [--all]` — valida YAML, agents, artifacts, lógica
- `*validate-agents` — valida todas as definições de agentes

**No AIOSON:** Existe `squad:validate` para squads, mas não há validação universal de:
- consistência entre agentes oficiais
- integridade de workflows
- referências cruzadas entre templates de agentes

### 1.6. Knowledge Base toggle (`*kb`)

O AIOX tem um modo KB que carrega todo o conhecimento do framework sob demanda.

**No AIOSON:** Não existe modo equivalente. Cada agente carrega seu próprio contexto, mas não há uma base de conhecimento unificada do método/framework que possa ser consultada.

### 1.7. Component lifecycle management

O aiox-master oferece um ciclo de vida completo:

- `*create` → `*modify` → `*deprecate-component` → `*undo-last`
- `*propose-modification` antes de modificar
- `*list-components` para inventário

**No AIOSON:** Squads têm `create`, `validate`, `analyze`, `extend`, `repair`, `export` — um ciclo bastante rico. Mas agentes oficiais não têm nenhum ciclo de vida programático. São arquivos `.md` estáticos no template.

---

## Parte 2 — O que o AIOSON tem que o AIOX não mostra

### 2.1. Runtime SQLite persistente com lineage

O AIOSON tem em `runtime-store.js`:

```
tasks → runs → events → squad_handoffs → pipeline_nodes → pipeline_edges
```

Isso permite:
- Observabilidade real de o que cada agente fez
- Timeline de execução
- Lineage pai/filho entre runs
- Base para replay e auditoria

**No AIOX:** O aiox-master menciona "memory layer" e "audit logging", mas não mostra uma store persistente equivalente. O tracking parece depender de arquivos YAML estáticos e memória do LLM.

### 2.2. Squads como sistema operacional local completo

Um squad no AIOSON gera fisicamente:

```
.aioson/squads/{slug}/
  ├── agents/           # Agentes invocáveis
  ├── workers/          # Workers especializados
  ├── workflows/        # Workflows do squad
  ├── checklists/       # Checklists operacionais
  ├── manifest.md       # Manifesto com ports e outputs
  ├── docs/             # Documentação do squad
  └── scripts/          # Scripts de automação
```

**No AIOX:** Os componentes são referenciados em templates e dependencies YAML, mas não formam um "time instalado" no projeto. Os agentes do AIOX são definições centrais, não instâncias locais persistentes.

### 2.3. Genomes como camada cognitiva/contextual

O aioson tem `@genome` que gera artefatos com:
- tipo: `domain`, `function`, `persona`, `hybrid`
- binding por squad ou por executor
- integração com profiler pipeline para personas baseadas em evidência
- integração com makopy.com para reuso de genomes

**No AIOX:** Não aparece nada equivalente. Os agentes do AIOX recebem um YAML de definição, mas não têm uma camada separada de "conhecimento contextual" que pode ser aplicada, versionada e compartilhada.

### 2.4. Workflow enforcement por artefato

O `workflow-next.js` do aioson verifica se o artefato esperado do estágio existe antes de permitir avanço:

- Não tem discovery? Não avança para architecture
- Não tem architecture? Não avança para dev

**No AIOX:** O aiox-master sugere rotas e delega, mas a disciplina de "prova por artefato" não aparece. O fluxo parece mais dependente de prompt discipline.

### 2.5. Pipeline DAG entre squads com topological sort

O aioson já tem no runtime:

- `pipeline_nodes` (squads como nós)
- `pipeline_edges` (conexões com ports)
- `getTopologicalOrder()` com detecção de ciclo
- `squad_handoffs` para rastreio

**No AIOX:** Workflows existem como YAML estáticos (brownfield-discovery.yaml etc), mas a resolução de DAG dinâmico entre equipes não aparece.

### 2.6. Output strategy por squad

O aioson permite configurar estratégia de output por squad:
- tipo de output esperado
- formato
- destino
- ports de entrada/saída

**No AIOX:** Outputs são implícitos nas tasks e templates, não formalizados como contrato.

### 2.7. Profiler pipeline para personas

O aioson tem um pipeline completo de 3 estágios:
1. `@profiler-researcher` — coleta evidência
2. `@profiler-enricher` — análise cognitiva
3. `@profiler-forge` — gera o genome persona

**No AIOX:** Não aparece nada equivalente a geração de personas baseada em evidência.

### 2.8. Multi-language support nativo

Cada agente do aioson detecta idioma e carrega locale se disponível (`pt-BR`, `es`, `fr`).

**No AIOX:** O aiox-master é bilíngue (pt/en) no vocabulário, mas não tem sistema de locales por agente.

### 2.9. Squad subcommands ricos

O `@squad` do aioson tem:
- `design` → `create` → `validate` → `analyze` → `extend` → `repair` → `export` → `pipeline` → `automate`

**No AIOX:** `*create agent` e `*modify agent` cobrem o ciclo básico, mas não há operações de análise, reparo ou exportação de times.

### 2.10. Dashboard e cloud sync

O aioson já tem infraestrutura para:
- Dashboard local com visualização de runtime
- Sync para cloud (aios-cloud-runner)

**No AIOX:** O aiox-master é puramente CLI/prompt, sem camada visual ou cloud.

---

## Parte 3 — Matriz de capacidades cruzada

| Capacidade | AIOX | AIOSON | Gap |
|---|---|---|---|
| Conductor universal | ✅ aiox-master | ❌ Distribuído | AIOSON precisa |
| Handoff artefatual universal | ✅ .aiox/handoffs/ | ⚠️ Só pipeline squads | AIOSON precisa |
| Guided vs Engine explícito | ✅ --mode flag | ⚠️ Implícito | AIOSON precisa |
| IDS / Registry de componentes | ✅ ids check/impact/register | ❌ | AIOSON precisa |
| Pre-action hooks | ✅ advisory hooks | ❌ | AIOSON precisa |
| KB mode | ✅ *kb toggle | ❌ | Nice-to-have |
| Component lifecycle | ✅ create/modify/deprecate/undo | ⚠️ Só squads | AIOSON precisa para oficiais |
| Validate workflow/agents | ✅ *validate-* | ⚠️ squad:validate | AIOSON precisa universal |
| Runtime persistente SQLite | ❌ | ✅ tasks/runs/events | AIOX não tem |
| Squads como artefato local | ❌ | ✅ agents/workers/manifests | AIOX não tem |
| Genomes | ❌ | ✅ domain/function/persona/hybrid | AIOX não tem |
| Workflow enforcement por artefato | ❌ | ✅ workflow-next | AIOX não tem |
| Pipeline DAG com topological sort | ❌ | ✅ pipeline_nodes/edges | AIOX não tem |
| Output strategy formal | ❌ | ✅ por squad | AIOX não tem |
| Profiler pipeline | ❌ | ✅ 3 estágios | AIOX não tem |
| Multi-language agents | ❌ | ✅ locales/ | AIOX não tem |
| Dashboard + cloud | ❌ | ✅ dashboard + cloud sync | AIOX não tem |

---

## Parte 4 — Recomendações de enriquecimento para o AIOSON

### Prioridade 1 — Conductor Layer (novo)

Criar uma camada `@conductor` ou `@master` que:

1. **Catálogo unificado** — lista agentes oficiais + agentes de squad em um inventário único
2. **Roteamento inteligente** — dado o contexto atual do projeto, sugere qual agente/squad ativar
3. **Status consolidado** — mostra onde o projeto está em termos de workflow, squads ativos, pipelines, handoffs pendentes
4. **Respeita workflow-next** — não bypassa o gate de estágios, apenas sugere e coordena acima dele

Não substituir o `@orchestrator` atual (focado em paralelismo MEDIUM). O conductor fica acima.

### Prioridade 2 — Handoff Protocol Universal

Adicionar ao runtime uma tabela `agent_handoffs`:

```sql
CREATE TABLE agent_handoffs (
  id TEXT PRIMARY KEY,
  from_agent TEXT NOT NULL,
  to_agent TEXT,
  reason TEXT,
  context_ref TEXT,
  suggested_next TEXT,
  status TEXT DEFAULT 'pending',  -- pending | consumed | expired
  run_key TEXT,
  created_at TEXT,
  consumed_at TEXT
);
```

E fazer com que:
- `workflow:next --complete` crie um handoff automaticamente
- `runtime-log --finish` crie um handoff
- O conductor/next-step consuma handoffs para sugerir continuidade
- Funcione entre agentes oficiais ↔ squad agents ↔ workers

### Prioridade 3 — Squad Pipeline Run Engine

O `squad-pipeline.js` já tem `list`, `show`, `status`. Falta:

- `run` — executa o DAG na ordem topológica
- `continue` — retoma de onde parou
- `skip {node}` — pula um nó e continua
- `abort` — cancela execução

A implementação pode ser guided-first (sugere o próximo squad a ativar) e evoluir para engine (execução automática).

### Prioridade 4 — Capability Registry

Um comando `aioson registry` (ou parte do conductor) que:

```
aioson registry:list           # lista tudo
aioson registry:search {term}  # busca por capacidade
aioson registry:impact {id}    # quem depende de quem
aioson registry:health         # integridade do ecossistema
```

Indexaria:
- Agentes oficiais (template/.aioson/agents/)
- Agentes de squad (.aioson/squads/*/agents/)
- Workers (.aioson/squads/*/workers/)
- Genomes (.aioson/genomes/)
- Pipelines (runtime)
- Workflows (template/.aioson/tasks/)

### Prioridade 5 — Pre-action Advisory Hooks

Antes de `@squad create`, verificar:
- Já existe squad com domínio similar?
- Já existe genome para este domínio?
- Algum pipeline será impactado?

Modo advisory (não bloqueia, apenas informa).

### Prioridade 6 — Validate Universal

Expandir validação para além de squads:

```
aioson validate:agents         # valida todos os agentes oficiais
aioson validate:workflows      # valida integridade dos workflows
aioson validate:ecosystem      # check completo do ecossistema
```

---

## Parte 5 — O que NÃO copiar do AIOX

### 5.1. Persona/greeting system

O aiox-master tem um sistema elaborado de persona com zodíaco, greeting levels, signature closing. Isso é estilo/branding, não valor operacional. O aioson deve manter sua abordagem funcional.

### 5.2. YAML monolítico de definição

O aiox-master coloca tudo (agent, persona, commands, dependencies, security, hooks) em um único bloco YAML enorme. O aioson já tem uma separação melhor (agentes em .md, runtime em JS, manifests separados).

### 5.3. Command-shell textual como interface principal

O AIOX opera como um shell de comandos (`*create`, `*modify`, etc). O aioson já tem CLI real (`aioson squad:create`, `aioson workflow:next`). Não regredir para um modelo prompt-only.

### 5.4. Centralizar inteligência em prompt-only

O aiox-master é essencialmente um prompt grande. O aioson já tem código real (JS), runtime (SQLite), CLI. A evolução deve ser código + prompt, não prompt mais longo.

### 5.5. Load-on-demand extremo

O AIOX insiste em não carregar recursos na ativação. O aioson já faz isso de forma mais inteligente — carrega contexto do projeto porque precisa dele para decidir. Não sacrificar awareness por economia de contexto.

---

## Parte 6 — Conclusão executiva

### O AIOX é forte em orquestração como conceito

O aiox-master mostra uma visão madura de:
- conductor universal
- governança de componentes
- handoff como navegação
- modos de execução explícitos
- registry operacional

### O AIOSON é forte em orquestração como implementação

O aioson já tem:
- runtime real
- enforcement real
- squads como artefato real
- genomes como camada cognitiva real
- pipeline DAG real
- dashboard real

### A oportunidade

O aioson pode absorver as **ideias de orquestração** do AIOX e implementá-las sobre a **infraestrutura real** que já possui. O resultado seria um sistema que supera ambos:

- A visão de conductor do AIOX + o runtime do aioson
- O handoff universal do AIOX + os pipelines persistentes do aioson
- O IDS do AIOX + o capability graph natural dos squads/genomes do aioson
- O guided/engine do AIOX + o workflow enforcement do aioson

O aioson está numa posição privilegiada: tem a fundação de engenharia. O que falta é elevar a camada de orquestração ao nível conceitual que o aiox-master demonstra.

---

## Referências

### Externa
- AIOX `aiox-master`: https://github.com/SynkraAI/aiox-core/blob/main/.claude/commands/AIOX/agents/aiox-master.md

### Internas do AIOSON
- `src/execution-gateway.js` — classificação de agentes e runtime
- `src/commands/workflow-next.js` — workflow enforcement
- `src/commands/squad-pipeline.js` — pipeline DAG (list/show/status)
- `template/.aioson/agents/orchestrator.md` — orquestrador atual
- `template/.aioson/agents/squad.md` — sistema de squads
- `template/.aioson/agents/genome.md` — genomes
- `products-features/upgrade-agents/orchestrator-master/analysis.md` — análise Codex prévia
