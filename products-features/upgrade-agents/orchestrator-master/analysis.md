# Analysis — AIOX Master vs AIOSON Orchestration

> Data da análise: 2026-03-21
> Escopo: comparar o `aiox-master` do AIOX com a orquestração atual do `aioson`

---

## 1. Resumo curto

A melhor leitura é esta:

- o `aiox-master` é um **meta-orquestrador operacional**
- o `aioson` atual é um **sistema de workflow + runtime + squads persistentes**

Ou seja:

- o AIOX parece mais maduro no papel de **conductor universal**
- o AIOSON já é mais maduro em **persistência, runtime e artefatos reais de projeto**

A oportunidade não é trocar um pelo outro.
A oportunidade é o `aioson` absorver o que o `aiox-master` tem de melhor em:

- comando unificado
- handoff explícito
- workflow engine
- registry operacional
- coordenação entre agentes heterogêneos

---

## 2. Como o `aiox-master` funciona

### 2.1. Ele é um agente-mestre, não apenas um agente especializado

Pelo arquivo analisado, o `aiox-master` se apresenta como:

- `Master Orchestrator`
- `Framework Developer`
- `AIOX Method Expert`
- executor universal de capacidades do framework

Isso significa que ele acumula três papéis:

1. orquestrar
2. governar componentes do framework
3. executar workflows ou delegações

No `aioson`, hoje esses papéis estão separados entre:

- `workflow-next`
- `@orchestrator`
- `@squad`
- runtime
- commands CLI

### 2.2. Ele tem uma superfície de comando única

O `aiox-master` expõe um menu de comandos amplo, incluindo:

- `*workflow`
- `*run-workflow`
- `*plan`
- `*agent`
- `*update-manifest`
- `*validate-workflow`
- `*validate-agents`
- `*task`
- `*execute-checklist`
- `*create` / `*modify`
- comandos de IDS / registry

Isso cria uma experiência de “control plane” muito clara.

### 2.3. Ele separa guided mode de engine mode

Pela própria descrição do arquivo:

- `guided`: troca guiada de persona / fluxo manual
- `engine`: spawning real de subagentes

**Inferência baseada na fonte:** isso indica que o AIOX modela a orquestração em dois níveis:

- um nível conversacional / humano no loop
- um nível operacional / automático

No `aioson`, isso ainda está implícito e fragmentado.

### 2.4. Ele trata handoff como navegação do sistema

O `aiox-master` checa `.aiox/handoffs/`, procura handoffs não consumidos,
consulta `workflow-chains.yaml` e sugere o próximo comando automaticamente.

Isso é importante porque transforma handoff em:

- memória transitória
- mecanismo de navegação
- UX de continuidade

No `aioson`, o handoff hoje existe fortemente em pipelines de squads,
mas não como linguagem universal entre agentes.

### 2.5. Ele opera com load-on-demand de recursos

O arquivo insiste em:

- não pré-carregar recursos
- carregar dependências só quando necessário
- tratar tasks como workflows executáveis, não como documentação estática

Isso é uma boa ideia para sistemas multiagente porque evita custo e ruído.

### 2.6. Ele junta orquestração com governança

O `aiox-master` traz no mesmo centro:

- segurança
- autorização
- auditoria
- memory tracking
- validação de componentes
- update de manifest
- impacto antes de modificar entidades

Isso sugere um orquestrador que não é só roteador, mas também governador.

---

## 3. Como o `aioson` funciona hoje

### 3.1. O `aioson` já força workflow real por estágio

`src/commands/workflow-next.js` já faz:

- detecção de modo `project` / `feature`
- sequência por classificação (`MICRO`, `SMALL`, `MEDIUM`)
- detours
- skip controlado
- verificação de artefatos por estágio
- persistência em `.aioson/context/workflow.state.json`
- eventos de workflow

Isso é forte.
O `aioson` já tem enforcement estrutural, não apenas sugestão de fluxo.

### 3.2. O roteamento de agentes oficiais já existe

`src/commands/agents.js` e `src/agents.js` mostram que o sistema já:

- resolve o agente solicitado
- reaponta para o estágio correto quando necessário
- gera prompt estruturado por agente
- injeta lifecycle obrigatório
- registra runtime de handoff

Ou seja, o AIOSON já tem um roteador, mas ainda não um master conductor universal.

### 3.3. O runtime do `aioson` já é uma base muito melhor para engine futura

`src/execution-gateway.js` mostra que o sistema já sabe registrar:

- task
- run
- event
- source
- workflow stage
- parent run
- lineage parcial

Essa é a base certa para engine de multiagentes de verdade.

### 3.4. O `@orchestrator` do AIOSON é mais estreito que o `aiox-master`

O agente `template/.aioson/agents/orchestrator.md` faz principalmente:

- orquestração paralela para projetos `MEDIUM`
- criação de contextos por lane
- decisão de paralelo vs sequencial
- uso de arquivos `.status.md` e `shared-decisions.md`

Ou seja:

- ele é útil
- mas não é um conductor universal
- ele não governa agentes oficiais + squads + pipelines + manifests em um único plano

### 3.5. O `@squad` do AIOSON cria um sistema persistente de agentes

O `template/.aioson/agents/squad.md` mostra algo que o AIOX não aparece exibindo nessa fonte:

- squads geram agentes reais
- geram workers
- geram workflows
- geram checklists
- geram manifests
- geram docs locais
- geram estratégia de output
- podem receber genomes

Ou seja, o AIOSON já trata “time de agentes” como artefato persistente do projeto.

### 3.6. O pipeline de squads existe, mas o engine de execução ainda é parcial

A task `template/.aioson/tasks/squad-pipeline.md` descreve um modelo ambicioso:

- DAG entre squads
- handoffs
- topological order
- execução do pipeline

Mas a implementação real em `src/commands/squad-pipeline.js` hoje está concentrada em:

- `list`
- `show`
- `status`

**Conclusão importante:**

O `aioson` já tem o modelo e parte da persistência,
mas ainda não fechou um `run` engine equivalente ao que o AIOX sugere com `engine mode`.

---

## 4. Onde o AIOX está à frente em orquestração

## 4.1. Conductor universal

O AIOX tem uma entidade clara para:

- comandar
- sugerir
- validar
- delegar
- atualizar framework

No `aioson`, essa responsabilidade está distribuída.

## 4.2. Handoff operacional entre agentes

O AIOX parece transformar handoff em experiência principal de continuidade.
No `aioson`, isso ainda não virou protocolo universal entre agentes oficiais,
agentes de squad, workers e pipelines.

## 4.3. Engine mode explícito

O AIOX nomeia a automação real de subagentes.
O `aioson` ainda opera mais em:

- prompt handoff
- workspace paralelo textual
- runtime observável

Mas não em engine multiagente genérica.

## 4.4. Registry e governança de componentes

O AIOX parece mais perto de tratar o framework como uma malha governada por:

- manifest
- registry
- impact analysis
- pre-create / pre-modify hooks

O `aioson` ainda não consolidou isso num capability graph único.

## 4.5. UX de comando unificada

No AIOX, o usuário aparentemente consegue permanecer dentro do meta-agente
para grande parte do trabalho de coordenação.

No `aioson`, o usuário ou o CLI alternam mais entre:

- agentes específicos
- workflow-next
- parallel:*
- runtime:*
- squad:* 

---

## 5. Onde o AIOSON está à frente

## 5.1. Workflow enforcement real por evidência de artefato

O `aioson` não depende só de prompt discipline.
Ele valida se o artefato esperado daquele estágio existe.

## 5.2. Runtime persistente melhor definido

O runtime SQLite do `aioson` é uma fundação excelente para:

- observabilidade
- replay
- lineage
- dashboards
- future engine

## 5.3. Squads como sistema operacional local

No `aioson`, os squads não são apenas um time conceitual.
Eles viram estrutura física de projeto.

## 5.4. Pipelines e handoffs já possuem esquema real

Mesmo que o engine ainda esteja parcial, o modelo já existe no runtime:

- `pipeline_nodes`
- `pipeline_edges`
- `squad_handoffs`

## 5.5. Genomes e output strategy

O `aioson` já diferencia:

- capacidade operacional
- capacidade cognitiva / contextual
- estratégia de output

Esse nível de sofisticação não aparece de forma equivalente na fonte do AIOX analisada.

---

## 6. O que o `aioson` deveria absorver do `aiox-master`

## 6.1. Um novo agente ou camada `master conductor`

Não para substituir `workflow-next`.
Mas para ficar acima dele, com funções como:

- listar agentes oficiais e de squad em um catálogo único
- entender capacidades disponíveis
- sugerir rota ideal
- operar guided mode
- operar engine mode quando implementado
- consolidar status e handoffs

### Recomendação

Criar uma camada do tipo:

- `@master`
- `@conductor`
- ou `workflow conductor`

separada do atual `@orchestrator`.

O `@orchestrator` atual pode continuar focado em paralelismo MEDIUM.

## 6.2. Handoff protocol universal

Adicionar um protocolo único entre:

- agentes oficiais
- agentes de squad
- workers
- pipelines
- stages de workflow

Campos mínimos sugeridos:

- `from`
- `to`
- `reason`
- `context_ref`
- `proposed_next_command`
- `status`
- `consumed_at`
- `run_key_parent`

## 6.3. Guided vs engine como contrato explícito

Hoje o `aioson` tem sinais disso, mas não como contrato de produto.

Ele deveria distinguir claramente:

- `guided`: o sistema roteia, sugere, registra, mas o humano troca de agente
- `engine`: o sistema realmente executa subagentes, lanes ou pipelines

## 6.4. Capability registry

O `aioson` deveria conseguir responder programaticamente:

- quais agentes existem
- quais são oficiais
- quais vieram de squads
- quais genomes estão ativos
- quais workers existem
- quais outputs e ports cada squad expõe
- quais pipelines consomem cada squad

## 6.5. Policy layer

Inspirado na governança do AIOX, o `aioson` pode ganhar uma camada de policy para:

- sensibilidade da operação
- escopo permitido
- necessidade de confirmação
- impacto entre squads e pipelines
- risco de editar artefatos compartilhados

## 6.6. Run tree pai-filho exposto no dashboard

O `execution-gateway` já aponta nessa direção.
Falta elevar isso para experiência de produto:

- run do conductor
- child runs de agentes
- handoff status
- waiting / blocked / delegated / consumed

---

## 7. O que o `aioson` não deve copiar cegamente

## 7.1. Não enfraquecer o workflow gate

O maior risco de um master agent é virar bypass do fluxo.
No `aioson`, isso seria um erro.

O conductor deve:

- respeitar `workflow-next`
- consultar contexto e classificação
- nunca pular disciplina de estágio silenciosamente

## 7.2. Não transformar tudo em command shell textual

O `aioson` já tem runtime e dashboard.
A camada nova deve conversar com isso, não competir com isso.

## 7.3. Não centralizar demais a inteligência em prompt-only

A evolução ideal é:

- prompt + state + runtime + registry

não apenas um prompt mais longo.

---

## 8. Proposta arquitetural para o AIOSON

```text
AIOSON Orchestration Stack

Layer 1 — Governance
  - workflow-next
  - policy rules
  - impact analysis
  - capability registry

Layer 2 — Conductor
  - guided routing
  - handoff management
  - next-step suggestion
  - squad/official agent unification

Layer 3 — Execution Engine
  - parallel lanes
  - squad pipeline run
  - delegated agent runs
  - retry / abort / skip / continue

Layer 4 — Runtime & Observability
  - SQLite runtime
  - parent/child lineage
  - dashboard views
  - cloud/runtime sync
```

---

## 9. Backlog de enriquecimento sugerido

### Epic 1 — Universal Conductor

- catálogo único de agentes oficiais + squads
- resolver “quem pode fazer o quê”
- sugerir próximo passo
- guided mode

### Epic 2 — Agent Handoff Protocol

- artefatos persistentes de handoff
- sugestão automática de next step
- consumo / expiração / replay

### Epic 3 — Squad Execution Engine

- rodar DAG real de squads
- consumo automático de handoffs
- lineage e retries

### Epic 4 — Capability Graph

- mapear agentes, squads, workers, skills, pipelines, genomes e outputs
- impacto de mudança
- busca por capacidade

### Epic 5 — Policy & Safety Layer

- confirmação contextual
- regras por impacto
- guardrails para artefatos compartilhados

### Epic 6 — Dashboard Orchestration Views

- run tree
- handoff timeline
- blocked / waiting / delegated states
- guided vs engine mode na UI

---

## 10. Conclusão

O `aiox-master` sugere uma visão poderosa: um agente-orquestrador que age como
plano de controle do sistema.

O `aioson` ainda não tem isso como peça única.
Mas, estruturalmente, ele já tem algo muito valioso que o AIOX não aparece
mostrando nessa fonte:

- workflow enforcement
- runtime persistente
- squads como artefatos reais
- pipelines e handoffs persistidos
- genomes e output strategy

Por isso, a melhor direção não é “copiar o AIOX”.
É fazer o `aioson` evoluir para:

- **ter um conductor do nível do `aiox-master`**
- **usar o runtime e os manifests do `aioson` como fundação**
- **estender a orquestração para agentes oficiais e squads gerados num mesmo plano operacional**

Se isso for bem implementado, o `aioson` pode chegar a um ponto em que supera o AIOX
não só em persistência e projeto local, mas também em orquestração multiagente real.

---

## 11. Referências

### Externa

- AIOX `aiox-master`: https://github.com/SynkraAI/aiox-core/blob/main/.claude/commands/AIOX/agents/aiox-master.md

### Internas do AIOSON

- `src/commands/workflow-next.js`
- `src/commands/agents.js`
- `src/agents.js`
- `src/execution-gateway.js`
- `src/commands/parallel-init.js`
- `src/commands/parallel-assign.js`
- `src/commands/squad-pipeline.js`
- `template/.aioson/agents/orchestrator.md`
- `template/.aioson/agents/squad.md`
- `template/.aioson/tasks/squad-pipeline.md`
