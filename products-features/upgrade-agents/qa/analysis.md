# Analysis — AIOX qa vs AIOSON qa

> Data: 2026-03-21
> Escopo: comparar o agente `qa` do AIOX com o agente `@qa` do AIOSON

---

## 1. Resumo executivo

Aqui os dois agentes se aproximam no objetivo geral, mas divergem bastante na forma de operar.

### AIOX qa

O `AIOX qa` funciona como um arquiteto de testes e conselheiro de qualidade, cobrindo:

- review estruturado de story
- gate decision
- risk profiling
- NFR assessment
- traceabilidade de requisitos
- security e migration checks
- review assistido por CodeRabbit
- fix request para `@dev`
- governança de backlog ligada ao review

### AIOSON qa

O `@qa` do AIOSON funciona como um revisor de risco de produção com papel mais operacional, cobrindo:

- leitura de PRD, requirements, spec e discovery
- checklist risk-first
- escrita de testes para achados críticos/altos
- relatório estruturado por severidade
- integração com `aios-qa-report.md`
- fechamento de feature com atualização de `spec-{slug}.md` e `features.md`

### Leitura mais importante

- o `AIOX qa` é mais forte em **governança de quality gate, traceabilidade, comandos de review e papel advisory**
- o `AIOSON qa` é mais forte em **QA operacional integrada ao projeto, browser QA nativo, escrita de testes e fechamento real de feature**

A melhor pergunta aqui não é “qual QA é melhor?”.
A melhor pergunta é:

- o que o AIOSON pode absorver do modelo de governança do `AIOX qa` sem perder a sua força atual de QA prática e integrada ao workflow real do projeto?

---

## 2. Como o AIOX qa funciona

Fonte principal usada:

- https://github.com/SynkraAI/aiox-core/blob/main/.claude/commands/AIOX/agents/qa.md

Quando alguma conclusão abaixo depende de tasks, templates ou integração mais ampla citados pelo arquivo principal, isso deve ser lido como **inferência baseada na fonte**.

### 2.1. É um QA mais advisory do que executor direto

O próprio arquivo define o agente como:

- Test Architect & Quality Advisor
- quality advisory authority
- advisory only

Ou seja, o papel principal dele não é “sair consertando tudo”.
Ele avalia, decide gate, documenta e orienta.

### 2.2. Ele é fortemente story-driven

O `AIOX qa` gira em torno de:

- story review
- gate por story
- atualização apenas da seção `QA Results` da story
- leitura de story pronta para review

Isso o aproxima bastante de uma operação baseada em backlog/story lifecycle.

### 2.3. Ele tem command UX muito forte

Entre os comandos presentes no arquivo:

- `*code-review`
- `*review`
- `*review-build`
- `*gate`
- `*nfr-assess`
- `*risk-profile`
- `*create-fix-request`
- `*validate-libraries`
- `*security-check`
- `*validate-migrations`
- `*evidence-check`
- `*false-positive-check`
- `*console-check`
- `*test-design`
- `*trace`
- `*create-suite`
- `*critique-spec`
- `*backlog-add`
- `*backlog-update`
- `*backlog-review`
- `*session-info`

Isso dá ao agente uma superfície muito madura para revisão e governança de qualidade.

### 2.4. Ele trabalha com gate decisions explícitas

O AIOX qa modela decisões como:

- PASS
- CONCERNS
- FAIL
- WAIVED

Esse tipo de decisão formal é uma camada de governança que vai além de “achei alguns bugs”.

### 2.5. Ele enfatiza traceabilidade e NFR

O arquivo destaca explicitamente:

- requirements traceability
- Given-When-Then mapping
- risk assessment
- NFR validation
- quality attributes
- testability assessment

Isso mostra um QA mais arquitetural e de governança do que apenas revisão de código.

### 2.6. Ele integra CodeRabbit no fluxo de review

O AIOX qa coloca CodeRabbit como parte do review e, pelo arquivo, ainda tenta um self-healing loop para issues críticas/altas antes de concluir o processo.

Isso sugere uma camada de automação forte em torno do review.

### 2.7. Ele tem ligação com backlog e suite ownership

Comandos como:

- `*create-suite`
- `*backlog-add`
- `*backlog-update`
- `*backlog-review`

mostram que o AIOX qa participa de uma malha maior de gestão da qualidade ao longo do ciclo da story.

---

## 3. Como o AIOSON qa funciona hoje

Fontes principais no AIOSON:

- `template/.aioson/agents/qa.md`
- `template/.aioson/locales/pt-BR/agents/qa.md`
- `src/commands/qa-init.js`
- `src/commands/qa-run.js`
- `src/commands/qa-scan.js`
- `src/commands/qa-report.js`
- `src/commands/qa-doctor.js`
- `src/commands/workflow-next.js`

### 3.1. É um QA risk-first e não um simples checker de testes

A missão do `@qa` no AIOSON é muito objetiva:

- avaliar risco de produção
- produzir achados objetivos
- não inventar finding
- não omitir risco só para evitar atrito

Isso já dá um perfil bem pragmático.

### 3.2. Ele é orientado por cadeia de contexto do projeto

O `@qa` do AIOSON lê:

- `project.context.md`
- `prd.md` ou `prd-{slug}.md`
- `requirements-{slug}.md`
- `spec-{slug}.md`
- `discovery.md`
- código implementado e testes existentes

Ou seja, assim como outros agentes do AIOSON, ele trabalha a partir da memória viva do projeto e não de um story file central.

### 3.3. Ele distingue project mode e feature mode

Esse é um diferencial importante.
No AIOSON, o `@qa` sabe quando está validando:

- o projeto
- uma feature específica

Em feature mode ele foca o review no PRD, requirements e spec daquela feature, não no projeto inteiro.

### 3.4. Ele escreve testes para achados críticos e altos

Esse ponto é muito relevante.
O AIOSON `@qa` não fica apenas no advisory.
Ele manda explicitamente:

- para cada achado crítico/alto sem cobertura, escrever o teste
- não apenas listar o que está faltando

Isso o torna mais operacional do que o AIOX qa em muitos cenários.

### 3.5. Ele tem integração nativa com browser QA do CLI

Esse é um grande diferencial do AIOSON.
Além do prompt do agente, o ecossistema já tem:

- `qa:doctor`
- `qa:init`
- `qa:run`
- `qa:scan`
- `qa:report`

Esses comandos produzem:

- `aios-qa-report.md`
- `aios-qa-report.json`
- screenshots
- opcionalmente HTML report

E o `@qa` consegue incorporar esse relatório de browser no review principal, elevando severidade quando browser e static review apontam o mesmo problema.

### 3.6. Ele tem feature closure real

No modo feature, quando os achados críticos/altos são resolvidos, o `@qa` do AIOSON:

- atualiza `spec-{slug}.md` com aprovação QA
- marca a feature como `done` em `features.md`
- fecha o ciclo e orienta a próxima feature via `@product`

Isso é uma integração de workflow muito forte.

### 3.7. Ele é forte em brownfield com discovery como fonte de verdade

O AIOSON QA deixa explícito que, em base existente:

- `discovery.md` é a fonte de verdade das regras e relações
- se `discovery.md` faltar, mas houver scan local, deve passar por `@analyst` antes do QA de projeto

Isso é melhor alinhado a brownfield real do que um QA centrado apenas em story.

### 3.8. O workflow do AIOSON não infere conclusão de QA por artefato próprio

Esse é um detalhe importante.
No `workflow-next`, há inferência explícita para:

- `setup`
- `product`
- `analyst`
- `architect`
- `ux-ui`
- `orchestrator`

Mas não existe um artefato específico usado para inferir conclusão do `qa`.
Isso sugere que a etapa existe fortemente no fluxo, mas sem um gate materializado pelo workflow engine no mesmo nível das etapas anteriores.

---

## 4. Onde o AIOX qa está à frente

## 4.1. Gate governance mais explícita

PASS / CONCERNS / FAIL / WAIVED é um modelo muito claro de decisão.
O AIOSON hoje produz review e achados, mas não tem esse vocabulário formal como primeira classe no agente.

## 4.2. Command UX muito melhor

O AIOX qa oferece um menu muito mais rico de operações:

- gate
- risk profile
- NFR assess
- trace
- fix request
- console check
- critique spec
- backlog review

No AIOSON, boa parte disso existe implicitamente no processo, mas não como superfície de comando bem definida.

## 4.3. Traceabilidade e NFR como capacidades explícitas

No AIOX, esses temas não estão apenas implícitos; eles são comandos e responsabilidades centrais.

## 4.4. Ligação melhor com backlog de qualidade

O AIOX qa parece mais preparado para criar backlog de dívida, follow-up e itens de qualidade ao longo do review.

## 4.5. Story gate mais formal para times de backlog forte

Para ambientes muito disciplinados por story workflow, o AIOX qa parece mais maduro na governança do review.

---

## 5. Onde o AIOSON qa está à frente

## 5.1. Browser QA nativo no ecossistema

Esse é talvez o maior diferencial.
O AIOSON não depende apenas do prompt do agente: ele já tem um mini sistema de QA no CLI com Playwright, personas, security probes, screenshots e relatórios estruturados.

## 5.2. QA mais operacional

O `@qa` do AIOSON manda escrever testes para achados críticos/altos.
Isso o torna menos “advisory only” e mais útil para fechamento real.

## 5.3. Feature closure integrada ao workflow

Atualizar `spec-{slug}.md` e marcar `features.md` como `done` é uma integração muito prática e mais próxima do estado real do projeto do que apenas atualizar uma seção de story.

## 5.4. Melhor aderência a brownfield

O QA do AIOSON herda a lógica de `discovery.md`, `spec` e `requirements`, o que o deixa mais integrado ao projeto já existente.

## 5.5. Menor dependência de story file

O AIOSON QA consegue operar com base no estado documental do projeto, o que é mais compatível com a forma como o framework já organiza memória e workflow.

## 5.6. Fusão de revisão estática com teste no browser

A regra de elevar severidade quando browser e revisão estática concordam é uma ideia boa e bastante operacional.

---

## 6. O que valeria trazer do AIOX qa para o AIOSON qa

## 6.1. Gate decision explícito

O AIOSON ganharia muito com um vocabulário formal de gate, algo como:

- PASS
- CONCERNS
- FAIL
- WAIVED

Isso ajudaria especialmente em projetos `SMALL` e `MEDIUM`.

## 6.2. Command pack de QA mais rico

Sem copiar tudo, o AIOSON poderia ganhar comandos como:

- `@qa gate`
- `@qa risk-profile`
- `@qa nfr`
- `@qa trace`
- `@qa fix-request`
- `@qa browser-merge`

## 6.3. Risk profile e traceability como artefatos explícitos

Hoje isso está parcialmente embutido no review.
Poderia virar saídas formais como:

- `qa-gate.md`
- `qa-risk-profile.md`
- `qa-traceability.md`

## 6.4. Melhor protocolo de fix request para `@dev`

O AIOX qa é mais explícito em gerar pedido de correção.
No AIOSON isso poderia virar um artefato claro com:

- finding
- impacto
- teste escrito
- fix esperado
- prioridade

## 6.5. Backlog de dívida técnica de QA

Em vez de deixar Medium/Low espalhados só no relatório, o AIOSON poderia opcionalmente gerar um backlog de follow-up.

## 6.6. NFR assessment como submodo oficial

Security, performance, reliability e observability poderiam ganhar uma camada mais explícita dentro do `@qa`.

---

## 7. O que NÃO vale copiar cegamente do AIOX qa

## 7.1. Não transformar o `@qa` do AIOSON em agente puramente advisory

A força atual do AIOSON é justamente ser mais operacional e integrado ao fechamento da feature.

## 7.2. Não tornar QA dependente de story file

Isso iria contra a arquitetura geral do AIOSON, que gira em torno da cadeia de contexto do projeto.

## 7.3. Não substituir browser QA real por review de documento

O AIOSON já tem `qa:run` e `qa:scan`. Isso é um ativo forte e não deve ser diluído.

## 7.4. Não criar governança pesada demais para projetos MICRO

Gate formal e backlog de dívida são úteis, mas precisam respeitar proporcionalidade.

---

## 8. Melhor evolução recomendada para o AIOSON qa

## 8.1. Preservar o núcleo atual como “Operational QA”

O AIOSON já tem algo muito valioso:

- review risk-first
- escrita de testes para achados altos/críticos
- browser QA nativo
- feature closure
- integração com PRD, requirements, spec e discovery

## 8.2. Adicionar uma camada “Governed QA” inspirada no AIOX

Sem substituir o núcleo atual:

- gate decision formal
- risk profile explícito
- NFR assessment
- traceabilidade mais visível
- fix request formal para `@dev`

## 8.3. Introduzir command UX mínima

Algo como:

- `@qa gate`
- `@qa risk`
- `@qa nfr`
- `@qa trace`
- `@qa fix-request`
- `@qa merge-browser-report`

## 8.4. Criar artefatos opcionais de governança

Para projetos maiores, poderia haver:

- `.aioson/context/qa-gate.md`
- `.aioson/context/qa-risk-profile.md`
- `.aioson/context/qa-traceability.md`

## 8.5. Fechar o gap do workflow engine

Seria útil o AIOSON definir melhor qual artefato materializa a conclusão de `@qa` no workflow, em vez de deixar isso implícito.

---

## 9. Síntese final

### O que o AIOX qa tem que enriqueceria o AIOSON

- gate governance explícita
- command UX de review
- risk profile formal
- NFR assessment explícito
- traceability mais estruturada
- fix request/backlog de qualidade melhor definidos

### O que o AIOSON qa já faz melhor

- browser QA nativo com CLI
- escrita de testes para issues sérios
- feature closure integrada
- melhor brownfield awareness
- integração com PRD, requirements, spec e discovery
- menos dependência de story unit formal

### Melhor direção para o AIOSON

Não copiar o `AIOX qa` inteiro.
O melhor caminho é:

- manter o `@qa` como QA operacional e integrada ao projeto
- adicionar uma camada de governança inspirada no AIOX
- fortalecer gate, trace e NFR sem perder browser QA e feature closure

---

## 10. Veredito

Se a pergunta for:

- “qual dos dois é melhor como quality governor e gate advisor?”
  Resposta: `AIOX qa`

- “qual dos dois é melhor como QA prática integrada ao projeto real, incluindo browser QA e fechamento de feature?”
  Resposta: `AIOSON qa`

Se a pergunta for:

- “o que o AIOSON deveria aprender com o AIOX aqui?”

Resposta:

- gate decision formal
- risk/NFR/trace como capacidades explícitas
- fix request e backlog de qualidade mais estruturados
- melhor UX operacional do `@qa`

Sem abrir mão do que já é diferencial no AIOSON:

- browser QA nativo
- escrita de testes para issues sérios
- feature closure real
- integração com a memória viva do projeto
