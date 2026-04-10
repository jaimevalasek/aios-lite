# Analysis — AIOX pm vs AIOSON pm

> Data: 2026-03-21
> Escopo: comparar o agente `pm` do AIOX com o agente `@pm` do AIOSON, considerando o papel complementar do `@product` no AIOSON

---

## 1. Resumo executivo

Aqui existe um desalinhamento importante de nomenclatura.

Se comparar apenas pelo nome, a leitura fica errada.

### AIOX pm

O `AIOX pm` funciona como um Product Manager amplo, cobrindo:

- criação de PRD
- estratégia de produto
- visão e direcionamento
- épicos
- priorização
- pesquisa profunda via delegação
- execução de épicos
- em certo perfil, orquestração de outros agentes

### AIOSON pm

O `@pm` do AIOSON não é o dono principal do produto.
Ele entra tarde no fluxo e faz um trabalho muito mais estreito:

- enriquecer o PRD existente
- priorizar MVP
- ordenar entrega
- adicionar critérios de aceite
- preservar a intenção de produto definida antes

### Leitura mais importante

A sua suspeita está correta.
O paralelo funcional mais honesto não é:

- `AIOX pm` = `AIOSON pm`

O paralelo mais próximo é:

- `AIOX pm` ≈ `AIOSON @product` + parte do `AIOSON @pm`

E existe ainda um detalhe extra:

- no modo `bob`, o `AIOX pm` também ganha papel de orquestrador por spawning de outros agentes
- isso o afasta ainda mais do `@pm` atual do AIOSON

Então a pergunta certa aqui não é “qual PM é melhor?”.
A pergunta certa é:

- como reorganizar mentalmente essa comparação para não medir agentes com responsabilidades diferentes?

---

## 2. Como o AIOX pm funciona

Fonte principal usada:

- https://github.com/SynkraAI/aiox-core/blob/main/.claude/commands/AIOX/agents/pm.md

Quando alguma conclusão abaixo assume comportamento além do arquivo principal, isso deve ser lido como **inferência baseada na fonte**.

### 2.1. É um PM de produto de verdade, não só refinador de backlog

O `AIOX pm` cobre explicitamente:

- PRD creation
- product strategy and vision
- feature prioritization
- roadmap planning
- business case development
- go/no-go decisions
- scope definition
- success metrics
- stakeholder communication
- epic creation and management

Isso o coloca muito mais perto do dono da visão de produto.

### 2.2. Ele tem superfície de comandos ampla

Entre os comandos presentes no arquivo:

- `*create-prd`
- `*create-brownfield-prd`
- `*create-epic`
- `*create-story`
- `*research {topic}`
- `*execute-epic`
- `*gather-requirements`
- `*write-spec`
- `*toggle-profile`
- `*session-info`
- `*guide`
- `*yolo`
- `*exit`

Ou seja, ele mistura documentação de produto, breakdown, pesquisa, execução e sessão.

### 2.3. Ele é explicitamente colaborativo e delegador

O `AIOX pm` colabora com:

- `@analyst` para research
- `@architect` para decisões técnicas
- `@sm` para stories
- `@po` para validação/backlog
- `@aiox-master` para course correction

O agente já nasce pensando em handoff de trabalho entre especialistas.

### 2.4. Ele pode operar em dois modos muito diferentes

Esse é um detalhe importante.
Pelo próprio arquivo, existe uma distinção entre:

- `advanced` → PM padrão
- `bob` → PM que opera como orquestrador, usando `TerminalSpawner` para chamar outros agentes em terminais separados

Isso significa que o AIOX pm não é apenas um PM documental.
Em um perfil específico, ele vira uma camada de coordenação multiagente.

### 2.5. Ele participa da execução, não só do planejamento

O comando `*execute-epic` e a lógica descrita de wave-based parallel development mostram que ele não fica restrito à escrita do PRD.
Ele também aciona execução estruturada.

### 2.6. Ele tem continuidade operacional mais forte

Assim como outros agentes do AIOX analisados, ele traz:

- ativação ritualizada
- leitura de handoff não consumido
- sugestão de próximo comando
- `session-info`
- suporte a retomada de sessão no modo Bob

---

## 3. Como o AIOSON pm funciona hoje

Fontes principais no AIOSON:

- `template/.aioson/agents/pm.md`
- `template/.aioson/locales/pt-BR/agents/pm.md`
- `template/.aioson/agents/product.md`
- `template/.aioson/locales/pt-BR/agents/product.md`
- `src/commands/workflow-next.js`

### 3.1. O `@pm` do AIOSON é um refinador de PRD, não o autor principal do produto

A missão do `@pm` é explícita:

- enriquecer o PRD vivo
- adicionar priorização
- adicionar sequenciamento
- adicionar critérios de aceite
- sem reescrever a intenção de produto

Ele não é o agente que conduz a conversa principal de descoberta do produto.

### 3.2. O dono do PRD base no AIOSON é o `@product`

No AIOSON, quem realmente cumpre a função de product conversation e criação do PRD base é o `@product`.
Ele é quem:

- conduz a descoberta natural com o usuário
- define visão, problema, usuários, fluxos e métricas
- cria `prd.md` ou `prd-{slug}.md`
- registra features
- faz a conversa de escopo de produto
- capta identidade visual e design skill
- roteia o próximo agente

Isso aproxima o `@product` do núcleo do `AIOX pm` muito mais do que o `@pm` do AIOSON.

### 3.3. O `@pm` do AIOSON entra tarde e só em projeto MEDIUM

Pelo workflow default do AIOSON:

- `@pm` só aparece em projeto `MEDIUM`
- entra depois de `@architect` e `@ux-ui`
- não faz parte do fluxo padrão de feature
- não aparece em `MICRO`
- não aparece em `SMALL`

Isso já mostra que ele não é o PM central do sistema.
Ele é um estágio especializado de preparação para execução mais controlada.

### 3.4. O `@pm` do AIOSON tem escopo muito restrito e bem definido

Ele pode mexer apenas em:

- `## MVP scope`
- `## Out of scope`
- `## Delivery plan`
- `## Acceptance criteria`

E explicitamente não é dono de:

- visão
- problema
- usuários
- fluxos
- métricas
- perguntas em aberto
- identidade visual

Isso o coloca mais como um planner ou delivery refiner do que como PM estratégico.

### 3.5. O AIOSON divide o papel “PM de produto” em dois agentes

Na prática, o AIOSON separa o que o AIOX concentra em um único PM:

- `@product` → descoberta, intenção, escopo, PRD base
- `@pm` → priorização, sequencing, critérios de aceite e plano de entrega

Essa divisão é intencional e importante.

### 3.6. O AIOSON não tem equivalentes oficiais de `@po` e `@sm`

No catálogo oficial atual do AIOSON, não há agentes `po` ou `sm`.
Então parte da malha de colaboração do AIOX pm simplesmente não existe aqui como papéis separados.

Isso reforça que o `@product` absorve uma parcela do trabalho de produto que, no AIOX, passa pelo `pm`.

### 3.7. O `@pm` do AIOSON é mais um estágio de clareza para QA/execução

Ele já pensa em:

- bullets `🔴` no MVP
- tabela de `AC-01`
- ordem de entrega
- preservação do que o `@product` e `@ux-ui` definiram

Ou seja, ele ajuda a tornar o PRD mais consumível por execução e QA.

---

## 4. Onde o AIOX pm está à frente em relação ao `@pm` do AIOSON

## 4.1. Escopo de produto muito mais amplo

O AIOX pm é dono de visão, PRD, épicos, estratégia e priorização.
O `@pm` do AIOSON é dono apenas de refinamento tardio do PRD.

## 4.2. Command UX muito melhor

O AIOX pm oferece uma superfície clara de ações:

- PRD
- brownfield PRD
- épicos
- stories
- research
- execute epic
- spec pipeline
- toggle-profile

O `@pm` do AIOSON não tem nada semelhante como command pack explícito.

## 4.3. Delegação e colaboração formalizadas

O AIOX pm já nasce com mapa de delegation/handoff.
No AIOSON, essa separação existe mais pelo workflow e pelos prompts individuais do que por um protocolo explícito dentro do `@pm`.

## 4.4. Modo Bob adiciona orquestração real

Esse é talvez o maior gap comportamental.
Em `bob`, o AIOX pm consegue:

- spawnar outros agentes
- esperar retorno
- coordenar execução sem emular o outro agente

O `@pm` do AIOSON não tem nada parecido hoje.

## 4.5. Epic execution e parallel development

O AIOX pm parece participar diretamente da execução de épicos com waves paralelas.
No AIOSON, isso está mais próximo de `@orchestrator`, squads e runtime, não do `@pm`.

---

## 5. Onde o AIOSON pm está à frente em relação ao AIOX pm

## 5.1. Escopo mais contido e menos ambíguo

O `@pm` do AIOSON é muito claro sobre o que pode e não pode alterar.
Isso reduz o risco de um agente de produto sobrescrever intenção, UX ou arquitetura sem necessidade.

## 5.2. Melhor preservação do PRD base

O agente protege explicitamente:

- visão
- problema
- usuários
- fluxos
- métricas
- identidade visual

Essa disciplina evita erosão do documento de produto ao longo do workflow.

## 5.3. Melhor integração com QA automation

O `@pm` do AIOSON já pensa no consumo downstream por automações e por `@qa`, por exemplo:

- bullets `🔴`
- tabela de aceitação compacta
- foco em observabilidade de escopo

## 5.4. Menor risco de PM virar meta-agente genérico

O AIOX pm é poderoso, mas concentra muita coisa.
O `@pm` do AIOSON tem menos superfície e menos risco de poluir o papel com responsabilidades demais.

---

## 6. Onde o AIOSON `@product` está mais próximo do AIOX pm

Esta é a seção mais importante da análise.

### 6.1. Descoberta e conversa de produto

Assim como o AIOX pm, o `@product` do AIOSON é quem conduz a conversa de produto e cria o PRD base.

### 6.2. Dono da visão e do problema

No AIOSON, visão, problema, usuários, escopo inicial e métricas nascem no `@product`, não no `@pm`.

### 6.3. Roteamento do workflow seguinte

O `@product` do AIOSON decide o próximo agente com base em classificação e complexidade da feature.
Isso lembra mais a centralidade operacional do AIOX pm do que o `@pm` do AIOSON.

### 6.4. Captura de requisitos visuais e design skill

Essa é outra diferença relevante.
O `@product` do AIOSON já captura identidade visual, direção estética e design skill no PRD base.
O `@pm` do AIOSON explicitamente preserva isso, mas não cria.

### 6.5. Conversa natural estruturada

O `@product` do AIOSON tem regras conversacionais fortes:

- batches de perguntas
- triggers proativos
- integridade do registry de features
- modo feature / creation / correction / enrichment

Esse é o agente do AIOSON que realmente faz o trabalho de product discovery semelhante ao coração do AIOX pm.

---

## 7. O que valeria trazer do AIOX pm para o AIOSON

## 7.1. Command UX para produto e planejamento

No AIOSON, isso poderia ser distribuído entre `@product` e `@pm`, por exemplo:

- `@product prd`
- `@product brownfield-prd`
- `@product research`
- `@pm delivery-plan`
- `@pm acceptance`
- `@pm epic`
- `@pm session-info`

## 7.2. Clarificar o mapa de equivalência entre `@product` e `@pm`

Hoje a separação é boa, mas o nome `@pm` pode induzir leitura errada.
Seria útil documentar melhor que:

- `@product` é o PM estratégico / discovery owner
- `@pm` é o planner de delivery / refinement

## 7.3. Introduzir algum conceito de epic planning

O AIOX pm cobre épicos com muito mais clareza.
No AIOSON, isso ainda não aparece como responsabilidade explícita de `@product` ou `@pm`.

## 7.4. Melhor protocolo de handoff entre `@product` e `@pm`

O AIOSON já faz a passagem por workflow.
Mas poderia explicitar melhor:

- o que o `@product` entregou para o `@pm`
- o que o `@pm` acrescentou
- o que está pronto para `@orchestrator`, `@dev` e `@qa`

## 7.5. Sessão e continuidade operacional mais fortes

O AIOX pm mostra valor em:

- `session-info`
- retomada de sessão
- sugestão de próximo comando
- comando de execução associado ao estado atual

## 7.6. Uma camada opcional de PM-orchestrator

Não necessariamente dentro do `@pm` atual.
Mas a ideia do AIOX de um PM que, em certo perfil, coordena outros agentes, pode inspirar:

- um modo assistido para founders
- um agente de produto-orquestração
- ou integração melhor entre `@product`, `@pm` e `@orchestrator`

---

## 8. O que NÃO vale copiar cegamente do AIOX pm

## 8.1. Não fundir `@product` e `@pm` sem critério

Hoje a separação do AIOSON faz sentido.
Se fundir tudo, o sistema pode perder clareza de responsabilidade.

## 8.2. Não transformar o `@pm` atual em dono de visão, UX e arquitetura

Isso quebraria o desenho atual do workflow.
O `@pm` do AIOSON funciona porque entra depois e não reescreve o que veio antes.

## 8.3. Não copiar orquestração para dentro do `@pm` sem desenho sistêmico

No AIOX isso existe por causa do modo Bob e de um ecossistema de spawning.
No AIOSON, se algo assim surgir, precisa conversar com runtime, orchestrator, squads e workflow.

---

## 9. Melhor evolução recomendada para o AIOSON

## 9.1. Assumir explicitamente que existem dois papéis hoje

O AIOSON deveria documentar melhor a sua própria arquitetura de produto:

- `@product` = product discovery + PRD ownership
- `@pm` = prioritization + acceptance + delivery refinement

## 9.2. Enriquecer `@product` com algumas ideias do AIOX pm

O maior overlap está aqui, não no `@pm`.
As melhores ideias a absorver seriam:

- command UX leve
- research mode mais explícito
- artefatos de epic planning
- session-info / suggested next step

## 9.3. Enriquecer `@pm` como delivery planner, não como PM genérico

O `@pm` poderia evoluir para:

- planejamento de épicos
- refinamento de milestones
- readiness para orquestração
- handoff claro para `@orchestrator`, `@dev` e `@qa`

Sem invadir o território do `@product`.

## 9.4. Avaliar um terceiro papel no futuro, se necessário

Se o AIOSON quiser se aproximar de certas capacidades do AIOX pm, talvez o melhor caminho não seja inflar `@pm`, mas criar algo como:

- `product-ops`
- `delivery-manager`
- ou um modo de orquestração assistida para produto

---

## 10. Síntese final

### O que o AIOX pm tem que o AIOSON ainda não tem no `@pm`

- ownership amplo de produto
- command UX
- épicos e execução de épicos
- delegation protocol mais explícito
- session continuity mais forte
- modo assistido/orquestrador (`bob`)

### O que o AIOSON `@pm` já faz melhor

- papel mais restrito e sem ambiguidade
- proteção do PRD base
- melhor disciplina sobre o que não pode ser reescrito
- saída mais orientada para QA e execução

### O ponto mais importante desta comparação

O equivalente funcional principal do `AIOX pm` no AIOSON não é o `@pm` sozinho.
É a combinação de:

- `@product` para descoberta, visão e PRD base
- `@pm` para priorização, critérios de aceite e plano de entrega

---

## 11. Veredito

Se a pergunta for:

- “o `AIOX pm` se parece mais com o `@pm` do AIOSON?”
  Resposta: não

- “o `AIOX pm` se parece mais com o `@product` do AIOSON?”
  Resposta: sim, em grande parte

- “então o paralelo correto é qual?”

Resposta:

- `AIOX pm` ≈ `AIOSON @product` + parte do `AIOSON @pm`

Se a pergunta for:

- “o que o AIOSON deveria aprender com o AIOX aqui?”

Resposta:

- clarificar melhor a arquitetura `@product` vs `@pm`
- enriquecer command UX
- introduzir epic planning
- melhorar handoff de produto para delivery
- considerar um modo assistido de coordenação, mas sem destruir a separação atual
