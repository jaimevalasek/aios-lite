# Project Brief — aioson-orchestration-enrichment

> Benchmark estratégico entre o `aiox-master` do AIOX e a camada de orquestração atual do `aioson`
> Status: análise concluída em 2026-03-21 — candidata forte para evolução do core

---

## O que é

Esta pasta documenta uma linha de evolução para o `aioson` inspirada no papel que o
`aiox-master` exerce no AIOX: um agente-mestre capaz de governar fluxos, acionar
agentes especializados, sugerir próximos passos e operar uma camada de workflow
mais explícita.

A ideia aqui **não é copiar a interface do AIOX literalmente** e nem alterar o
comportamento atual do `aioson` agora.

A proposta é identificar:

- o que o `aiox-master` já resolve bem em orquestração
- o que o `aioson` ainda não resolve ou resolve de forma parcial
- o que o `aioson` já faz melhor do que o AIOX em termos de runtime, squads e contexto
- qual seria uma evolução coerente do `aioson` sem quebrar sua arquitetura atual

---

## Fontes analisadas

### Fonte externa principal

- `aiox-master`: https://github.com/SynkraAI/aiox-core/blob/main/.claude/commands/AIOX/agents/aiox-master.md

### Fontes locais do AIOSON

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

### Nota metodológica

A análise externa foi feita principalmente em cima do arquivo `aiox-master.md`.
Quando alguma conclusão depende de nomes de comando, dependências ou convenções
sugeridas por esse arquivo, isso é tratado como **inferência baseada na fonte**,
não como prova de implementação completa de todo o ecossistema AIOX.

---

## Leitura executiva

O `aiox-master` parece operar como uma **camada-mestre de governança e execução**.
Ele não é só “mais um agente”: ele concentra comandos, workflow, handoff,
validação, manifest, memória, auditoria e um modo de execução que pode ser:

- `guided`: troca manual / guiada de persona
- `engine`: execução real com spawning de subagentes

O `aioson`, por outro lado, já é mais forte em:

- enforcement de workflow por estágio do projeto
- integração com runtime SQLite e trilha de eventos
- squads persistentes como artefatos reais do projeto
- pipelines e handoffs persistidos no runtime
- genomes, output strategy, dashboard e cloud sync

Mas ele ainda não tem uma figura equivalente ao `aiox-master` como:

- **conductor universal** sobre agentes oficiais + agentes de squad
- **camada única de comando operacional** para roteamento, execução, status e próximo passo
- **engine real de execução multiagente** para workflows e pipelines
- **handoff protocol forte** entre agentes com sugestão automática do próximo comando
- **registry/manifest de capacidades** abrangendo agentes oficiais e agentes gerados

---

## O que o AIOX traz de ideia forte para o AIOSON

### 1. Agente-mestre como produto do sistema

No AIOX, o orquestrador é um componente de primeira classe.
No `aioson`, a orquestração está espalhada entre:

- `workflow-next`
- `@orchestrator`
- `parallel:*`
- `@squad`
- runtime / dashboard

Isso funciona, mas reduz a sensação de um “centro de comando” único.

### 2. Dois modos claros de execução

A separação `guided` vs `engine` é muito valiosa.
No `aioson`, hoje existe:

- workflow guiado por stage
- prompts preparados para handoff
- workspace paralelo por arquivos `.status.md`

Mas ainda não existe uma distinção explícita do tipo:

- `manual/guided`: humano continua trocando de agente
- `engine`: sistema realmente aciona, coordena e acompanha subexecuções

### 3. Handoff como artefato explícito de navegação

O `aiox-master` usa a ideia de handoff artefatual para sugerir o próximo comando.
No `aioson`, já existe runtime e já existem handoffs de pipeline entre squads,
mas ainda falta um **handoff de navegação operacional entre agentes**.

### 4. Camada de governança de componentes

O AIOX coloca no orquestrador temas como:

- validação
- update de manifest
- proposta de modificação
- auditoria
- memória
- segurança
- pre-check antes de criar ou modificar componentes

No `aioson`, isso ainda é distribuído e menos unificado.

### 5. Registry mental do ecossistema

Pelo conjunto de comandos do `aiox-master`, o AIOX parece tratar agentes,
workflows, templates e checklists como entidades governadas por registry.
O `aioson` tem definição e manifests, mas ainda não um **grafo único de
capacidades e relacionamentos** entre agentes oficiais, squads, workers,
skills, pipelines e genomes.

---

## O que o AIOSON já tem e o AIOX parece não mostrar nessa fonte

### 1. Workflow enforcement por estágio real do projeto

O `aioson` já força a entrada no estágio correto via `workflow-next`, em vez de
apenas oferecer um meta-agente poderoso.

### 2. Runtime persistente com SQLite

O `aioson` já tem uma trilha concreta de:

- tasks
- agent runs
- execution events
- squad pipelines
- squad handoffs

Isso é uma base excelente para uma futura orquestração engine-driven.

### 3. Squads persistentes como sistema operacional local

Os squads do `aioson` não são só prompts efêmeros.
Eles geram:

- agents/
- workers/
- workflows/
- checklists/
- manifests/
- docs/
- scripts/
- output strategy

### 4. Genomes como camada contextual persistente

Essa camada muda bastante a natureza do sistema.
O AIOX, pelo menos nessa fonte, não mostra um equivalente tão claro a:

- genome bindings por squad
- genome bindings por executor
- leitura compatível de versões legadas

### 5. Integração dashboard + cloud + runtime

O `aioson` já tem infraestrutura local e visual para observabilidade e operação.
Isso coloca o projeto em posição boa para absorver uma camada de orquestração
mais forte sem recomeçar do zero.

---

## Hipótese de evolução recomendada

A direção mais promissora para o `aioson` é adicionar uma nova camada:

```text
Orchestration Control Layer
  ├─ master conductor (novo)
  ├─ workflow router (já existe, evolui)
  ├─ squad execution engine (novo)
  ├─ handoff protocol (novo)
  ├─ capability registry (novo)
  └─ runtime lineage / run tree (parcialmente existe)
```

Sem substituir o que já existe.
A evolução ideal é **compor em cima** do runtime, workflow e squads atuais.

---

## MVP recomendado

### Fase 1 — Conductor unificado

Criar uma camada conceitual de `master orchestration` no `aioson` capaz de:

- entender agentes oficiais e agentes de squad como um mesmo catálogo operacional
- sugerir o próximo passo com base em estado + handoff + workflow
- operar em `guided mode`

### Fase 2 — Handoff protocol entre agentes

Adicionar artefatos operacionais persistentes para:

- origem
- destino
- motivo do handoff
- contexto mínimo
- próximo comando sugerido
- status de consumo

### Fase 3 — Engine real de execução

Transformar algumas capacidades hoje guiadas em execução real:

- `workflow engine`
- `squad pipeline run`
- execução controlada de lanes paralelas
- lineage pai/filho entre runs

### Fase 4 — Registry de capacidades

Indexar em um mesmo grafo:

- agentes oficiais
- agentes gerados por squads
- workers
- skills
- templates
- pipelines
- genomes
- output strategies

---

## Restrições importantes

### O que não deve ser copiado do AIOX sem adaptação

- um meta-agente que bypassa o workflow do projeto
- um sistema muito centrado em comandos se isso enfraquecer o runtime do `aioson`
- persona/orquestrador acima do contrato de contexto do projeto

### O que deve ser preservado no AIOSON

- workflow enforcement por estágio
- separation entre agentes oficiais e squads, mas com camada comum de capability
- runtime SQLite como fonte de verdade
- contratos persistentes de manifesto e outputs

---

## Resultado esperado

Se essa linha evoluir bem, o `aioson` passaria a ter:

- um **conductor universal** sem perder a disciplina de workflow
- um **engine real** para agentes oficiais e squads
- um **handoff protocol reutilizável** entre agentes, squads e pipelines
- uma **camada de governança operacional** mais forte
- uma experiência de orquestração mais próxima do que o `aiox-master` sugere,
  mas ancorada no runtime persistente e nos manifests que o `aioson` já possui

---

## Documentos desta pasta

- `analysis.md` — comparação detalhada AIOX vs AIOSON, gaps e recomendações
