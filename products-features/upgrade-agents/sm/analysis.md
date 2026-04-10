# Analysis — AIOX sm vs AIOSON-native `@sm`

> Data: 2026-03-21
> Escopo: analisar o agente `sm` do AIOX e definir como um papel equivalente poderia existir no AIOSON sem copiar o modelo de forma literal

---

## 1. Resumo executivo

O `AIOX sm` e um agente de **story preparation + sprint/process coordination**.
Ele existe para pegar um epic ou backlog ja priorizado, quebrar isso em stories acionaveis, validar se a story esta pronta para desenvolvimento, coordenar a passagem para `@dev` e manter a disciplina do fluxo local de branches.

No AIOSON, esse papel hoje **nao existe como agente oficial**.
As responsabilidades estao espalhadas entre:

- `@product` para PRD base, descoberta do que construir e ciclo de feature
- `@pm` para priorizacao, sequencing e acceptance criteria
- `@orchestrator` para decomposicao paralela em projetos `MEDIUM`
- `workflow-next` para enforcement do fluxo oficial

Por isso, o mapeamento correto nao e:

- `AIOX sm` = `AIOSON @pm`

O mapeamento correto e mais proximo de:

- `AIOX sm` = uma camada que hoje o AIOSON distribui entre `@pm`, `@orchestrator` e o gap entre planejamento e execucao

### Leitura mais importante

- o `AIOX sm` e mais forte em **story drafting, ready-for-dev checklist, ritual de backlog/sprint e handoff operacional para dev**
- o AIOSON ja e mais forte em **cadeia de contexto, brownfield awareness, workflow proporcional por classificacao e orquestracao documental do projeto**

O melhor ganho para o AIOSON nao seria copiar um Scrum Master classico.
O melhor ganho seria criar um `@sm` **nativo do AIOSON**, com foco em:

- transformar PRD/spec/architecture em lotes de execucao prontos para `@dev`
- marcar dependencias, blockers e ordem de implementacao
- servir de ponte entre planejamento e execucao
- ajudar `@orchestrator` e squads quando houver trabalho multi-lane

Em outras palavras:

- no AIOX, o `sm` gira em torno de story
- no AIOSON, um `@sm` deveria girar em torno de **execution readiness**

---

## 2. Como o AIOX sm funciona

Fonte principal usada:

- https://github.com/SynkraAI/aiox-core/blob/main/.claude/commands/AIOX/agents/sm.md

Quando alguma conclusao abaixo depende do ecossistema maior do AIOX, isso deve ser lido como **inferencia baseada na fonte**.

### 2.1. E um Scrum Master operacional, nao estrategico

O proprio arquivo define o agente como:

- Scrum Master
- story preparation specialist
- technical scrum master

Ele nao cria PRD nem desenha arquitetura.
Ele entra quando o trabalho ja foi decidido em nivel mais alto e precisa virar unidade clara para implementacao.

### 2.2. O centro de gravidade dele e a story

O foco declarado inclui:

- user story creation from PRD
- story validation
- acceptance criteria definition
- story refinement
- sprint planning
- backlog grooming

Ou seja, o agente trabalha em cima de backlog/story lifecycle como unidade principal de execucao.

### 2.3. Ele tem um command UX simples e muito focado

No arquivo aparecem como comandos centrais:

- `*draft`
- `*story-checklist`

Isso deixa claro que o papel principal nao e amplo.
Ele e um agente cirurgico para preparar e validar a proxima unidade de desenvolvimento.

### 2.4. Ele e um agente de handoff para dev

O texto diz que ele prepara historias claras para um dev agent implementar sem confusao.
Essa preocupacao com “developer handoff preparation” e central.

### 2.5. Ele tambem cobre coordenacao de sprint/backlog

O escopo inclui:

- sprint planning assistance
- agile process guidance
- backlog grooming
- retrospectives
- daily standup facilitation

Esse conjunto mostra um agente com mais “ritual de processo” do que normalmente existe hoje no AIOSON.

### 2.6. Ele assume gestao local de branches

Esse e um detalhe importante do AIOX sm:

- pode criar branch local
- trocar branch
- listar branch
- deletar branch local
- fazer merge local

E explicitamente delega operacoes remotas para outro agente.

Isso mostra que o `sm` do AIOX nao e apenas um planejador; ele tambem ajuda a governar a disciplina operacional de execucao.

### 2.7. Ele vive dentro de uma cadeia maior PM/PO/dev/devops/master

O arquivo explicita colaboracao com:

- `@pm`
- `@po`
- `@dev`
- `@github-devops`
- `@aiox-master`

Logo, ele nao foi desenhado como agente isolado.
Ele depende de uma malha de papeis ja bem separada.

---

## 3. Como o AIOSON cobre partes desse espaco hoje

Fontes principais no AIOSON:

- `template/.aioson/agents/product.md`
- `template/.aioson/agents/pm.md`
- `template/.aioson/agents/orchestrator.md`
- `src/commands/workflow-next.js`
- `docs/pt/agentes.md`

### 3.1. `@product` ja faz a entrada e o controle do ciclo da feature

No AIOSON, `@product` ja cobre varios pontos que em outros ecossistemas poderiam cair em PO/PM/SM:

- cria o `prd.md` ou `prd-{slug}.md`
- mantem `features.md`
- impede abrir nova feature com outra ainda `in_progress`
- decide proximo agente com base em classificacao e complexidade

Isso significa que o AIOSON ja possui um controle forte do “o que vem agora?”.

### 3.2. `@pm` ja cobre priorizacao e acceptance clarity

O `@pm` do AIOSON tem missao muito objetiva:

- enrich the living PRD with prioritization, sequencing, and testable acceptance clarity

Ele ja cuida de:

- ordem do MVP
- out of scope
- delivery plan
- acceptance criteria

Ou seja, a camada de planejamento leve ja existe.

### 3.3. `@orchestrator` ja cobre paralelismo em `MEDIUM`

O `@orchestrator` ja faz:

- identificar modulos e dependencias
- classificar paralelo vs sequencial
- gerar contexto por subagente
- manter `shared-decisions.md`
- manter `agent-N.status.md`

Isso cobre uma parte importante do que um “SM de execucao” poderia querer fazer em projetos maiores.

### 3.4. `workflow-next` ja impone a sequencia oficial

O comando `workflow-next` ja formaliza:

- workflow por `project` e `feature`
- classificacao `MICRO`, `SMALL`, `MEDIUM`
- agentes obrigatorios
- detours permitidos
- estado persistido em `workflow.state.json`

Ou seja, o AIOSON ja tem engine de fluxo onde um futuro `@sm` poderia se encaixar.

### 3.5. O que falta hoje e a camada entre “planejado” e “pronto para executar”

Mesmo com `@product`, `@pm` e `@orchestrator`, ainda existe um gap:

- quem pega PRD/requirements/spec/architecture e transforma isso em lotes concretos de implementacao prontos para `@dev`?
- quem define ordem fina, bloqueios, checkpoints de QA e cortes de entrega para uma feature maior?
- quem faz o “ready check” antes de jogar o trabalho para execucao?

Hoje isso tende a ficar dissolvido entre leitura humana do contexto e a habilidade do proprio `@dev`.

### 3.6. Nao ha hoje nenhum `@sm` ou equivalente explicito

A busca no repositorio por `scrum`, `@sm` ou `sm` nao mostrou um agente oficial com esse papel.
Tambem nao ha um artefato de workflow dedicado a esse tipo de coordenacao.

---

## 4. Diferenca estrutural entre os dois modelos

### AIOX

O AIOX exposto por essa fonte parece funcionar mais como:

- `@pm` organiza o nivel de produto/epic
- `@po` prioriza backlog
- `@sm` desce isso para stories prontas
- `@dev` implementa
- `@devops` cuida da camada remota
- `@aiox-master` corrige rumo e coordena excecoes

### AIOSON

O AIOSON funciona mais como:

- `@product` define o PRD base e o ciclo da feature
- `@analyst` transforma escopo em requisitos e modelagem
- `@architect` define arquitetura
- `@pm` lapida prioridade e acceptance
- `@orchestrator` coordena paralelismo em `MEDIUM`
- `@dev` implementa em cima da cadeia de contexto
- `@qa` valida e fecha a feature

Logo, o `AIOX sm` nao encontra um espelho direto no AIOSON.
Ele encaixa melhor como uma nova camada opcional entre **planejamento e execucao**.

---

## 5. O que o AIOX sm tem que o AIOSON ainda nao tem

## 5.1. Um papel explicito de “developer handoff preparation”

No AIOSON, esse handoff existe implicitamente via documentos.
No AIOX, o `sm` deixa isso como missao central.

## 5.2. Um “ready-for-dev” mais formal

O comando `*story-checklist` mostra uma preocupacao clara com completude antes da implementacao.
O AIOSON ainda nao tem um equivalente explicito focado em readiness de execucao.

## 5.3. Um mecanismo de slicing fino do trabalho

O `AIOX sm` quebra em stories.
O AIOSON ainda nao oferece um agente dedicado a quebrar uma feature grande em:

- batches
- lanes
- sequencias internas
- checkpoints de entrega

## 5.4. Linguagem operacional para backlog e sprint

Mesmo que o AIOSON nao queira virar Scrum-heavy, falta hoje um vocabulario operacional intermediario para:

- proximo lote
- bloco atual
- blockers
- dependencias imediatas
- onda de correcao pos-QA

## 5.5. Checklist de completude antes do `@dev`

Isso e importante especialmente para:

- projeto `SMALL` com varias partes
- feature `MEDIUM`
- execucao por multiplos agentes
- squads ou workers gerados

---

## 6. O que o AIOSON ja tem e o AIOX sm nao mostra nessa fonte

## 6.1. Cadeia de contexto muito mais rica

O AIOSON opera com:

- `project.context.md`
- `prd.md` / `prd-{slug}.md`
- `requirements-{slug}.md`
- `spec.md` / `spec-{slug}.md`
- `discovery.md`
- `architecture.md`

Isso e muito mais rico do que um modelo apenas story-centric.

## 6.2. Brownfield awareness real

O AIOSON ja foi desenhado para ler base existente, usar `discovery.md`, scan local e contexto de projeto.
Nada disso aparece como foco principal no `AIOX sm`.

## 6.3. Workflow proporcional por classificacao

O AIOSON ja decide o peso do processo por:

- `MICRO`
- `SMALL`
- `MEDIUM`

Isso e uma vantagem clara.
Um futuro `@sm` nao deveria destruir essa proporcionalidade.

## 6.4. Feature registry e lifecycle

O AIOSON ja controla:

- feature aberta
- feature concluida
- feature abandonada

Isso ja da uma malha de governanca melhor do que apenas “criar proxima story”.

## 6.5. Orquestracao paralela nativa para `MEDIUM`

O `@orchestrator` ja cobre coordenacao paralela em nivel de modulo e contrato compartilhado.
Isso significa que o AIOSON nao precisa copiar o `sm` como coordenador total.

## 6.6. Runtime de workflow persistido

`workflow.state.json`, `workflow.config.json` e eventos de workflow ja existem.
O AIOSON pode adicionar um `@sm` encaixando no runtime atual, sem reinventar a fundacao.

---

## 7. Como um `@sm` faria sentido no AIOSON

### 7.1. Nao como Scrum Master classico

Se o AIOSON copiar o papel classico de daily, retro e grooming como nucleo, o resultado tende a ficar artificial.

O uso nativo mais forte seria:

- execution readiness coordinator
- planner de lotes de implementacao
- tradutor de contexto para trabalho pronto de execucao

### 7.2. O ponto certo do fluxo

No AIOSON, esse agente deveria entrar **imediatamente antes da execucao**:

- depois que os artefatos de planejamento ja existem
- antes de `@dev`
- antes de `@orchestrator` quando o objetivo for alimentar paralelismo com batches/lane ownership

Regra mental boa:

- `@pm` responde “o que vem primeiro e como medir pronto”
- `@sm` responde “como isso vira trabalho executavel agora”

### 7.3. O objeto central nao deve ser “story”

No AIOSON, o melhor objeto central nao e `story.md`.
O melhor objeto central seria algo como:

- `execution-plan.md`
- `execution-{slug}.md`
- ou uma secao formal em `spec`

Esse artefato pode conter stories internas se ajudar, mas a fonte de verdade continua sendo a cadeia de contexto do projeto.

### 7.4. O `@sm` pode ser muito util em squads

Esse ponto e importante para o AIOSON.
Como o ecossistema possui squads e agentes gerados, o `@sm` pode virar a camada que:

- quebra trabalho em pacotes consumiveis por multiplos agentes
- define ownership por lane
- sequencia dependencias entre squads/agentes
- organiza ondas de correcao depois do `@qa`

### 7.5. O `@sm` pode funcionar como “bridge agent”

Em vez de competir com `@pm` ou `@orchestrator`, ele conecta:

- `@product` / `@pm` / `@analyst` / `@architect`
- com `@dev`, `@qa`, `@orchestrator` e squads

Esse e o encaixe mais elegante.

---

## 8. O que NAO vale copiar cegamente do AIOX sm

## 8.1. Nao tornar story o centro obrigatorio do framework

Isso conflitaria com a arquitetura documental do AIOSON.

## 8.2. Nao duplicar `@pm` nem `@product`

Se o `@sm` tambem passar a reescrever prioridade, escopo e intencao de produto, ele vira sobreposicao.

## 8.3. Nao tornar branch management a principal identidade do agente

No AIOSON, gestao de branch local pode ate aparecer como capacidade auxiliar, mas nao deveria definir o agente.

## 8.4. Nao colocar cerimonias de Scrum como obrigatorias

Daily, retro e grooming podem existir como modos opcionais no futuro.
Mas copiar isso como nucleo inicial seria inflar o framework sem necessidade.

## 8.5. Nao enfraquecer o `@dev`

O `@dev` do AIOSON ja le contexto rico e tem autonomia.
O `@sm` deve melhorar readiness e sequencing, nao infantilizar a execucao.

---

## 9. Melhor evolucao recomendada para o AIOSON

## 9.1. Criar um `@sm` opcional e execution-first

Missao sugerida:

- transformar planejamento em execucao clara
- quebrar em batches
- definir ordem e dependencias
- marcar blockers e checkpoints
- preparar handoff para `@dev`

## 9.2. Posicionar o agente como detour oficial primeiro

Antes de mexer no workflow padrao, o caminho mais seguro e:

- permitir `@sm` como detour/agent opcional
- testar em projetos `SMALL` e `MEDIUM`
- medir se ele realmente reduz friccao

## 9.3. Criar um artefato de execution readiness

O melhor primeiro output seria algo como:

- `.aioson/context/execution-plan.md`
- `.aioson/context/execution-{slug}.md`

Esse documento pode conter:

- batches
- ordem
- dependencias
- pronto para `@dev`
- checkpoints para `@qa`
- plano de correcao se a primeira rodada falhar

## 9.4. Conectar `@sm` com `@orchestrator`

Em `MEDIUM`, o `@sm` poderia preparar:

- lanes
- ownership
- ordem de desbloqueio

E o `@orchestrator` usaria isso para montar a execucao paralela.

## 9.5. Conectar `@sm` com squads

Para squads e agentes gerados, o `@sm` pode funcionar como:

- pre-orchestrator
- task packager
- dependency slicer

Esse encaixe e muito mais valioso para o AIOSON do que copiar daily standup.

---

## 10. Veredito

Se a pergunta for:

- “o AIOSON precisa copiar o `AIOX sm`?”
  Resposta: nao

- “o AIOSON se beneficiaria de um agente nessa regiao do fluxo?”
  Resposta: sim, claramente

- “qual forma faz mais sentido?”
  Resposta: um `@sm` nativo, opcional e execution-first

### O que o AIOX sm traz de mais util como ideia

- developer handoff preparation
- readiness checklist
- slicing fino do trabalho
- foco em blockers e proxima unidade executavel

### O que o AIOSON deve preservar

- cadeia de contexto como fonte de verdade
- proporcionalidade por classificacao
- `@product` e `@pm` sem sobreposicao
- `@orchestrator` como coordenador de paralelismo
- `@dev` como executor de contexto rico

### Recomendacao final

O AIOSON nao precisa de um “Scrum Master classico”.
Ele precisa de um `@sm` que funcione como:

- execution readiness agent
- delivery slicing agent
- bridge entre planejamento e implementacao
- apoio a orquestracao de squads/agentes

Esse e o pedaco da ideia do `AIOX sm` que realmente enriqueceria o AIOSON.

