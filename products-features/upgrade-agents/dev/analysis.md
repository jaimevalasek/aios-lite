# Analysis — AIOX dev vs AIOSON dev

> Data: 2026-03-21
> Escopo: comparar o agente `dev` do AIOX com o agente `@dev` do AIOSON

---

## 1. Resumo executivo

Aqui a diferença de filosofia é muito clara.

### AIOX dev

O `AIOX dev` funciona como um executor orientado por story engine, cobrindo:

- implementação guiada por story
- execução por tarefas e subtarefas
- modos de desenvolvimento (`interactive`, `yolo`, `preflight`)
- verificação de subtarefas
- recovery / rollback
- worktree isolation
- autonomous build loop
- gotchas memory
- validação forte antes de marcar a story como concluída

### AIOSON dev

O `@dev` do AIOSON funciona como um executor orientado por cadeia de contexto do projeto, cobrindo:

- implementação a partir de `prd`, `discovery`, `architecture`, `spec` e `ui-spec`
- feature mode vs project mode
- brownfield com memória consolidada
- convenções por stack
- integração com design skills e framework skills
- execução atômica em pequenos passos
- atualização de `spec` e `skeleton-system`
- implementação direta no projeto, sem depender de story files externos

### Leitura mais importante

- o `AIOX dev` é mais forte em **engine de execução, automação, recovery e disciplina story-driven**
- o `AIOSON dev` é mais forte em **contexto de projeto, brownfield real, integração com artefatos do workflow e implementação multi-stack com memória viva**

A melhor pergunta aqui não é “qual dev é melhor?”.
A melhor pergunta é:

- o que o AIOSON pode absorver da engine do `AIOX dev` sem perder a simplicidade e o encaixe com o seu workflow baseado em contexto?

---

## 2. Como o AIOX dev funciona

Fonte principal usada:

- https://github.com/SynkraAI/aiox-core/blob/main/.claude/commands/AIOX/agents/dev.md

Quando alguma conclusão abaixo depende dos tasks, scripts e módulos citados pelo arquivo principal, isso deve ser lido como **inferência baseada na fonte**.

### 2.1. É um dev fortemente story-driven

O arquivo deixa isso explícito.
O `AIOX dev` trabalha com a suposição de que:

- a story contém tudo que ele precisa
- ele não deve sair carregando PRD, arquitetura ou outros docs livremente
- ele só deve começar quando a story não estiver em draft
- ele deve seguir o comando de desenvolvimento da story passo a passo

Essa é uma filosofia bem diferente da do AIOSON.

### 2.2. Ele tem superfície de comandos muito ampla

Entre os comandos presentes no arquivo estão:

- `*develop`
- `*develop-yolo`
- `*develop-interactive`
- `*develop-preflight`
- `*execute-subtask`
- `*verify-subtask`
- `*track-attempt`
- `*rollback`
- `*build-resume`
- `*build-status`
- `*build-log`
- `*build-cleanup`
- `*build-autonomous`
- `*build`
- `*gotcha`
- `*gotchas`
- `*gotcha-context`
- `*worktree-create`
- `*worktree-list`
- `*worktree-cleanup`
- `*worktree-merge`
- `*create-service`
- `*waves`
- `*apply-qa-fixes`
- `*fix-qa-issues`
- `*run-tests`
- `*backlog-debt`
- `*load-full`
- `*clear-cache`
- `*session-info`

Isso faz o agente parecer quase um mini execution platform.

### 2.3. Ele é centrado em tarefa, não em contexto documental amplo

O AIOX dev explicitamente diz para não sair lendo PRD, arquitetura e outros documentos a menos que a story mande ou o usuário peça.

Isso indica um modelo em que:

- upstream já condensou a informação em uma story
- o dev trabalha com contexto mínimo e altamente controlado

### 2.4. Ele possui guardrails operacionais muito fortes

O agente define coisas como:

- não começar enquanto a story estiver em draft
- atualizar apenas seções específicas do arquivo da story
- seguir ordem rígida: implementar → testar → validar → só depois marcar checklist
- halt para ambiguidade, falha repetida, dependência não aprovada ou regressão

Isso reduz bastante deriva de execução.

### 2.5. Ele incorpora recovery, rollback e build loop

Esse é um dos maiores diferenciais do AIOX dev.
Pelo próprio arquivo, ele já prevê:

- tracking de tentativas
- stuck detection
- rollback para último estado bom
- autonomous build com retries
- build orchestrator completo
- retomada de builds interrompidos

Isso vai muito além de um prompt de desenvolvimento comum.

### 2.6. Ele trabalha com worktree isolation

O arquivo inclui comandos e scripts para:

- criar worktree isolada
- listar worktrees
- limpar worktrees antigas
- fazer merge de worktree de volta para a base

Isso é bem avançado como disciplina operacional.

### 2.7. Ele usa CodeRabbit como parte do completion loop

O `AIOX dev` não trata code review automático como opcional periférico.
Ele coloca CodeRabbit no loop antes de considerar a story pronta, inclusive com tentativa de auto-fix para issues críticas.

### 2.8. Ele possui memória de gotchas

Outro diferencial forte:

- registrar gotchas
- consultar gotchas relevantes para o contexto
- reutilizar aprendizado operacional

Isso aponta para um dev mais orientado a aprendizado de execução repetível.

---

## 3. Como o AIOSON dev funciona hoje

Fontes principais no AIOSON:

- `template/.aioson/agents/dev.md`
- `template/.aioson/locales/pt-BR/agents/dev.md`
- `src/commands/workflow-next.js`

### 3.1. É um dev orientado por cadeia de contexto do projeto

O `@dev` do AIOSON não assume que uma story condensou tudo.
Ele assume que a verdade está distribuída em artefatos do projeto, como:

- `project.context.md`
- `prd.md` ou `prd-{slug}.md`
- `discovery.md`
- `architecture.md`
- `spec.md` ou `spec-{slug}.md`
- `ui-spec.md`
- `design-doc.md`
- `readiness.md`
- `skeleton-system.md`

Ou seja, ele trabalha mais como executor do sistema operacional do projeto.

### 3.2. Ele distingue project mode e feature mode

Esse é um diferencial importante.
No AIOSON, o `@dev` sabe operar em:

- `project mode`
- `feature mode`

No modo feature ele lê PRD, requirements e spec da feature e atualiza `spec-{slug}.md` ao longo da implementação.

### 3.3. Ele é muito melhor para brownfield real

O `@dev` do AIOSON tem comportamento explícito para base existente:

- checa `framework_installed=true`
- exige `discovery.md` para não implementar no escuro
- alerta o usuário quando discovery está faltando
- usa `skeleton-system.md` como índice leve
- trata `discovery.md` e `spec.md` como duas metades da memória do projeto

Isso é um fluxo brownfield mais maduro do que apenas “abra a story e implemente”.

### 3.4. Ele combina convenções de implementação com stack awareness

O AIOSON dev já traz:

- convenções Laravel detalhadas
- regras de UI/UX
- design skill isolation
- motion guidance para React/Next.js
- convenções Web3
- framework skill mapping estático e dinâmico
- reuse de skills instaladas e skills de squad

Isso faz o agente ser mais consciente do ecossistema técnico do projeto.

### 3.5. Ele tem atomicidade explícita no fluxo de implementação

O `@dev` do AIOSON exige:

- declarar o próximo passo
- implementar só aquele passo
- validar antes de avançar
- commitar cada passo funcional
- parar se houver estado quebrado

Isso é um bom guardrail, mesmo sem a engine pesada do AIOX.

### 3.6. Ele mantém artefatos vivos do projeto

O AIOSON dev atualiza:

- `spec-{slug}.md`
- `spec.md` quando necessário
- `skeleton-system.md`

Isso é importante porque ele deixa memória útil para os próximos agentes, não apenas um diff de código.

### 3.7. Ele está profundamente integrado ao workflow do projeto

Pelo `workflow-next`:

- `@dev` é obrigatório
- aparece em todos os workflows padrão
- não pode ser pulado
- recebe a saída de `@product`, `@analyst`, `@architect`, `@ux-ui`, `@pm` e `@orchestrator` dependendo do caso

Isso o coloca como executor central do AIOSON.

### 3.8. Ele não é story-file-driven

Esse é talvez o maior contraste funcional.
No AIOSON, o `@dev` não depende de:

- story file como centro absoluto
- editar apenas certas seções de story
- draft gating por story status

O centro aqui é o estado documental do projeto, não uma unidade narrativa única de trabalho.

---

## 4. Onde o AIOX dev está à frente

## 4.1. Execution engine muito mais forte

O AIOX dev já embute:

- subtask execution
- subtask verification
- attempt tracking
- rollback
- autonomous build loop
- worktree orchestration
- gotchas memory

O AIOSON dev ainda não tem uma engine desse nível dentro do próprio agente.

## 4.2. Command UX muito melhor

O AIOX dev oferece uma superfície operacional enorme para execução e recuperação.
O AIOSON dev hoje depende mais de linguagem natural e das regras do prompt.

## 4.3. Recovery e resiliência operacional

Build-resume, stuck detection, rollback e retry loop são capacidades fortes que o AIOSON ainda não mostra de forma equivalente no `@dev`.

## 4.4. Worktree isolation como recurso nativo

No AIOX, isso já está no pacote do dev.
No AIOSON, a ideia de isolamento e paralelo existe mais em `@orchestrator`, `parallel:*` e squads do que no `@dev` em si.

## 4.5. Story discipline mais rígida

Para times que trabalham fortemente por backlog e story lifecycle, o AIOX dev parece mais pronto para operação disciplinada e repetível.

## 4.6. Code review automatizado integrado ao completion loop

O uso de CodeRabbit com auto-fix de issues críticas é uma capacidade concreta que enriqueceria o AIOSON.

## 4.7. Memória de gotchas

O AIOX dev parece mais maduro em capturar aprendizados de execução e reusar isso depois.

---

## 5. Onde o AIOSON dev está à frente

## 5.1. Brownfield e contexto real de projeto

O AIOSON dev é mais preparado para implementar em código existente com base em memória consolidada do projeto, não apenas em uma story isolada.

## 5.2. Integração muito melhor com discovery, architecture e spec

O AIOX dev tenta minimizar contexto documental.
O AIOSON dev assume corretamente que, em muitos projetos reais, a implementação depende da cadeia:

- produto
- discovery
- arquitetura
- decisões vivas
- memória da feature

## 5.3. Feature mode forte

O AIOSON dev já tem um modo de feature bastante coerente com:

- PRD da feature
- requirements da feature
- spec da feature
- memória do projeto

Isso é muito valioso e não aparece desse jeito no AIOX dev analisado.

## 5.4. Multi-stack + design-skill awareness melhores

O AIOSON dev já integra:

- skills por framework
- skills dinâmicas
- skills de squad
- design skills com isolamento rígido
- guidance de motion e UI

Isso o torna mais sensível à realidade da stack e da experiência do produto.

## 5.5. `skeleton-system.md` como índice vivo

Esse é um diferencial importante.
O AIOSON dev mantém um índice estrutural do projeto para os próximos agentes.
O AIOX dev, nessa fonte, não mostra um equivalente tão explícito.

## 5.6. Menor acoplamento a story file específico

Isso pode parecer menos disciplinado à primeira vista, mas em vários cenários é vantagem.
O AIOSON dev consegue operar bem sem forçar a existência de uma story unit formal para cada mudança.

---

## 6. O que valeria trazer do AIOX dev para o AIOSON dev

## 6.1. Command pack de execução do `@dev`

Sem copiar o modelo inteiro, o AIOSON poderia ganhar comandos como:

- `@dev preflight`
- `@dev verify-step`
- `@dev fix-qa`
- `@dev resume`
- `@dev status`
- `@dev gotchas`

## 6.2. Verificação formal de subtarefas

O AIOSON já pede validação a cada passo, mas poderia formalizar melhor:

- critérios de conclusão por step
- comando de verificação por step
- registro de falhas e tentativas

## 6.3. Recovery leve

Sem trazer toda a complexidade do AIOX, já valeria adicionar:

- checkpoints de execução
- retomada após interrupção
- rollback assistido do último passo local
- detector simples de execução travada

## 6.4. Gotchas memory

Isso combinaria bem com o AIOSON.
Uma memória de problemas recorrentes por stack, skill ou squad enriqueceria bastante a execução.

## 6.5. Melhor handoff entre `@dev` e `@qa`

O AIOX dev já parece mais preparado para um loop de correção e verificação.
O AIOSON poderia enriquecer isso com:

- resumo do que foi implementado
- verificações rodadas
- riscos remanescentes
- comando sugerido para `@qa`

## 6.6. Modo opcional de isolamento de trabalho

Não necessariamente worktree para todo caso.
Mas um modo opcional de branch/worktree/checkpoint para tarefas maiores seria útil.

## 6.7. Build / execution status

Uma camada leve de status de execução ajudaria bastante em sessões mais longas.

---

## 7. O que NÃO vale copiar cegamente do AIOX dev

## 7.1. Não transformar o `@dev` do AIOSON em agente dependente de story file

Isso quebraria uma das forças atuais do AIOSON, que é trabalhar a partir da cadeia de contexto do projeto.

## 7.2. Não importar toda a complexidade de build engine para casos simples

O AIOX dev é poderoso, mas pesado.
No AIOSON, isso só faria sentido como camada opcional, não como requisito universal.

## 7.3. Não enfraquecer a leitura de contexto amplo

O AIOX dev minimiza o contexto por design.
O AIOSON não deveria abandonar `discovery`, `architecture`, `spec` e `skeleton` como base real de implementação.

## 7.4. Não empurrar worktree/recovery para todo projeto MICRO

Essas capacidades precisam respeitar a mesma lógica de proporcionalidade do restante do sistema.

---

## 8. Melhor evolução recomendada para o AIOSON dev

## 8.1. Preservar o núcleo atual como “Context-Driven Dev”

O AIOSON já tem algo muito valioso:

- execução baseada em artefatos do projeto
- feature mode
- brownfield com discovery consolidada
- integração com skills
- atomicidade de implementação
- memória viva em `spec` e `skeleton-system`

## 8.2. Adicionar uma camada opcional “Execution Engine Lite”

Inspirada no AIOX, mas sem substituir o núcleo atual:

- status da execução atual
- checkpoints leves
- verificação de step
- retomada após interrupção
- fix loop com QA
- memória de gotchas

## 8.3. Introduzir command UX mínima

Algo como:

- `@dev preflight`
- `@dev step-status`
- `@dev verify`
- `@dev resume`
- `@dev qa-fixes`
- `@dev gotcha`

## 8.4. Melhorar observabilidade de execução

O AIOSON já tem runtime por baixo.
O `@dev` poderia expor melhor isso em forma de UX:

- passo atual
- último checkpoint válido
- validações executadas
- pendências restantes

## 8.5. Criar um modo opcional para tarefas grandes

Para demandas maiores, poderia existir um modo avançado com:

- isolamento de trabalho
- checkpoints
- recovery
- plano de execução por subtarefa

Sem obrigar isso em tarefas pequenas.

---

## 9. Síntese final

### O que o AIOX dev tem que enriqueceria o AIOSON

- execution engine
- subtask verification
- rollback / recovery
- worktree isolation opcional
- gotchas memory
- command UX para execução
- loop mais formal de correção com QA

### O que o AIOSON dev já faz melhor

- contexto brownfield real
- feature mode integrado ao workflow
- cadeia documental mais rica
- multi-stack + skill awareness
- design skill isolation
- memória viva em `spec` e `skeleton-system`
- menor dependência de story unit formal

### Melhor direção para o AIOSON

Não copiar o `AIOX dev` inteiro.
O melhor caminho é:

- manter o `@dev` como executor guiado por contexto do projeto
- adicionar uma camada opcional de engine leve inspirada no AIOX
- melhorar verificações, checkpoints e handoff para QA sem abandonar a cadeia `prd -> discovery -> architecture -> spec`

---

## 10. Veredito

Se a pergunta for:

- “qual dos dois é melhor como executor automatizado e resiliente de subtarefas?”
  Resposta: `AIOX dev`

- “qual dos dois é melhor para implementar dentro de um projeto real com memória documental e brownfield?”
  Resposta: `AIOSON dev`

Se a pergunta for:

- “o que o AIOSON deveria aprender com o AIOX aqui?”

Resposta:

- execution engine leve
- verificação formal de steps
- recovery/checkpoints
- gotchas memory
- melhor UX operacional do `@dev`

Sem abrir mão do que já é diferencial no AIOSON:

- feature mode
- brownfield discipline
- integração com skills e squads
- memória viva do projeto
- execução guiada por contexto, não por story isolada
