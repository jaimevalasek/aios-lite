# Analysis — AIOX analyst vs AIOSON analyst

> Data: 2026-03-21
> Escopo: comparar o agente `analyst` do AIOX com o agente `@analyst` do AIOSON

---

## 1. Resumo executivo

Os dois agentes têm o mesmo nome, mas não cumprem exatamente o mesmo papel.

### AIOX analyst

Funciona como um analista mais amplo, voltado para:

- market research
- competitor analysis
- brainstorming
- ideation workshops
- project brief
- handoff de insights para PM/PO

### AIOSON analyst

Funciona como um analista mais técnico e estrutural, voltado para:

- discovery de projeto
- discovery de feature
- requisitos detalhados
- modelagem de entidades e campos
- regras de negócio
- artefatos prontos para `@architect` ou `@dev`

### Leitura mais importante

- o `AIOX analyst` é mais forte em **pesquisa, descoberta aberta, command UX e colaboração orientada por handoff**
- o `AIOSON analyst` é mais forte em **disciplina de workflow, brownfield discovery e output técnico acionável para implementação**

Então a pergunta certa não é “qual é melhor?”.
A pergunta certa é:

- o que do `AIOX analyst` enriqueceria o `AIOSON analyst` sem destruir a especialização técnica que o AIOSON já tem?

---

## 2. Como o AIOX analyst funciona

A análise abaixo usa como fonte principal o arquivo público:

- https://github.com/SynkraAI/aiox-core/blob/main/.claude/commands/AIOX/agents/analyst.md

Para evitar ambiguidade: algumas conclusões abaixo são **inferência baseada no próprio arquivo**, especialmente quando ele cita workflows, handoffs, tasks e tools do ecossistema AIOX sem abrir todos esses arquivos auxiliares.

### 2.1. É um agente orientado por comando

O `AIOX analyst` não é só um prompt com missão textual.
Ele expõe uma interface operacional com comandos como:

- `*perform-market-research`
- `*create-competitor-analysis`
- `*brainstorm {topic}`
- `*create-project-brief`
- `*research-prompt {topic}`
- `*elicit`
- `*research-deps`
- `*extract-patterns`
- `*doc-out`
- `*session-info`
- `*guide`
- `*yolo`
- `*exit`

Isso muda bastante a UX. O agente não é só “ativado”; ele oferece uma mini superfície de produto.

### 2.2. Tem ativação com ritual forte e contexto de sessão

O arquivo define:

- greeting padronizado
- leitura de handoff não consumido em `.aiox/handoffs/`
- sugestão automática de próximo comando a partir de `workflow-chains.yaml`
- awareness de branch/status do projeto
- lista de comandos disponíveis

Isso faz o agente parecer mais operacional e contínuo entre sessões.

### 2.3. É mais research-first do que implementation-first

Pelo próprio `whenToUse` e pelos comandos, o foco principal dele está em:

- pesquisa de mercado
- análise competitiva
- facilitação de brainstorming
- discovery aberta
- geração de briefing

Ele explicitamente empurra outros tipos de trabalho para outros agentes:

- PRD → `@pm`
- arquitetura → `@architect`
- story/sprint → `@sm` ou `@po`

### 2.4. Usa dependencies externas como workflow executável

O arquivo referencia tasks, templates, scripts, data e tools.
Exemplos citados no próprio agent file:

- `facilitate-brainstorming-session.md`
- `create-deep-research-prompt.md`
- `create-doc.md`
- `advanced-elicitation.md`
- `document-project.md`
- `pattern-extractor.js`
- templates YAML de project brief, market research, competitor analysis
- tools como `exa`, `google-workspace`, `context7`

Isso sugere uma arquitetura em que o agente funciona como um router para workflows reutilizáveis.

### 2.5. Tem protocolo de colaboração explícito

O arquivo diz diretamente:

- com quem colabora
- quem consome seu output
- quando chamar outro agente

Esse detalhe é simples, mas poderoso. Ele reduz ambiguidade de handoff.

### 2.6. Tem UX forte de elicitation e numbered options

O `AIOX analyst` impõe:

- numbered options protocol
- tarefas com `elicit=true` não podem ser puladas
- `*guide` para uso completo

Isso melhora a experiência para sessões exploratórias e para perfis menos técnicos.

---

## 3. Como o AIOSON analyst funciona hoje

Fontes principais no AIOSON:

- `template/.aioson/agents/analyst.md`
- `template/.aioson/locales/pt-BR/agents/analyst.md`
- `src/commands/workflow-next.js`
- `src/commands/agents.js`
- `src/agents.js`

### 3.1. É um agente de discovery técnica com saída implementável

A missão do `@analyst` no AIOSON é objetiva:

- em modo projeto: gerar `discovery.md`
- em modo feature: gerar `requirements-{slug}.md` e `spec-{slug}.md`

Isso já mostra uma diferença grande em relação ao AIOX.
O AIOSON analyst não é primariamente um agente de market research.
Ele é um agente de descoberta estrutural para software.

### 3.2. Ele é fortemente acoplado ao workflow do projeto

No AIOSON, o analyst não atua solto.
Ele está acoplado ao fluxo do projeto por:

- `workflow-next`
- classificação `MICRO / SMALL / MEDIUM`
- artefatos de contexto obrigatórios
- handoff para `@architect` ou `@dev`

Ou seja, ele é muito menos “agente utilitário universal” e muito mais “estágio do sistema operacional de desenvolvimento”.

### 3.3. Ele é muito melhor para brownfield

Esse é um diferencial importante.
O AIOSON analyst já sabe operar com:

- `framework_installed`
- `discovery.md`
- `spec.md`
- `skeleton-system.md`
- `scan-index.md`
- `scan-folders.md`
- `scan-<folder>.md`
- `scan-aioson.md`

Isso é forte porque transforma o analyst em um agente capaz de consolidar contexto de base instalada sem depender só de entrevista manual.

### 3.4. Ele tem integridade de contexto e reparo de metadata

O AIOSON analyst tem regras explícitas para:

- verificar inconsistência de `project.context.md`
- reparar o que for objetivamente inferível
- devolver para `@setup` quando o contexto estiver bloqueado e não inferível

Isso não aparece com esse nível de rigor no AIOX analyst analisado.

### 3.5. Ele tem detecção clara de modo projeto vs modo feature

Esse talvez seja o maior diferencial funcional do AIOSON analyst.

Ele separa:

- `project mode`
- `feature mode`

E no modo feature ele produz exatamente os artefatos que alimentam a implementação:

- `requirements-{slug}.md`
- `spec-{slug}.md`

Isso o torna mais integrado à entrega real do software.

### 3.6. Ele tem contrato de output muito mais rígido

O AIOSON analyst já especifica seções obrigatórias para `discovery.md`, incluindo:

- usuários e permissões
- escopo do MVP
- entidades e campos
- relacionamentos
- ordem de migrations
- índices recomendados
- regras críticas
- riscos
- fora de escopo

Além disso, em modo feature ele já define skeleton de `spec-{slug}.md` para continuidade do fluxo com `@dev`.

### 3.7. Ele é mais implementation-ready do que insight-ready

Resumo honesto:

- AIOX analyst: melhor para descobrir e explorar
- AIOSON analyst: melhor para transformar descoberta em especificação de implementação

---

## 4. Onde o AIOX analyst está à frente

## 4.1. Command UX muito melhor

O AIOX analyst oferece uma interface de uso mais rica:

- comandos explícitos
- `*guide`
- `*session-info`
- numbered options protocol
- `*yolo`

O AIOSON analyst hoje depende muito mais de instrução natural e do workflow global do sistema.

## 4.2. Modo de pesquisa mais amplo

O AIOX analyst cobre coisas que o AIOSON analyst hoje não cobre bem como responsabilidade primária:

- market research
- competitor analysis
- brainstorming facilitado
- elicitation avançada
- project brief como artefato de exploração

## 4.3. Handoff operacional melhor desenhado na UX

A leitura de handoffs não consumidos e a sugestão de próximo comando melhoram muito a continuidade da sessão.

No AIOSON, o analyst depende mais do workflow do projeto e menos de uma UX própria de continuidade.

## 4.4. Colaboração explícita com outros agentes

No AIOX analyst, a colaboração com PM/PO está descrita como parte do contrato do agente.
No AIOSON, a passagem para `@architect` e `@dev` existe, mas a colaboração não é tão “narrada” no próprio agente.

## 4.5. Arquitetura de workflows reutilizáveis por task/template

O AIOX analyst parece mais modular em torno de:

- tasks
- templates
- scripts
- data
- tools

O AIOSON analyst ainda está mais concentrado em um prompt robusto do que em um menu de micro-workflows reutilizáveis.

---

## 5. Onde o AIOSON analyst está à frente

## 5.1. Descoberta técnica muito mais disciplinada

O AIOSON analyst é mais forte em:

- modelagem de entidade
- definição de campos
- enums
- relacionamentos
- migration order
- índices recomendados
- regras críticas

Isso é muito mais próximo da implementação real.

## 5.2. Brownfield de verdade

O AIOX analyst analisado não mostra nada equivalente à integração do AIOSON com:

- scanner local
- `skeleton-system.md`
- compressed memory de brownfield
- atualização guiada de `discovery.md`

## 5.3. Integração real com o workflow do sistema

O AIOSON analyst já está acoplado ao pipeline do projeto, não apenas ao papel conceitual de analista.
Isso reduz deriva e desalinhamento entre descoberta e execução.

## 5.4. Projeto vs feature

Essa separação é excelente e muito prática.
O AIOX analyst analisado parece mais amplo, mas menos orientado à distinção entre:

- descoberta de todo o produto
- descoberta incremental de uma feature específica

## 5.5. Context repair

O AIOSON analyst já sabe lidar com inconsistência de contexto.
Isso é um ganho grande em operação real.

## 5.6. Atalho para projetos MICRO

O AIOSON analyst evita overkill em projetos simples com um atalho explícito.
Esse tipo de adaptação operacional é muito valioso.

---

## 6. O que valeria trazer do AIOX analyst para o AIOSON analyst

## 6.1. Superfície de comandos específica do analyst

Sem abandonar linguagem natural, o AIOSON poderia ganhar um menu explícito para o `@analyst`, algo como:

- `@analyst brainstorm <tema>`
- `@analyst project-brief`
- `@analyst competitor-scan`
- `@analyst research-prompt <tema>`
- `@analyst feature-elicitation <slug>`
- `@analyst session-info`

Isso enriqueceria muito a UX de descoberta aberta.

## 6.2. Modo de research/strategy separado do modo technical discovery

Hoje o `@analyst` do AIOSON é muito discovery técnico.
Uma boa evolução seria adicionar dois submodos explícitos:

- `discovery mode` — o atual, forte em requisitos e modelagem
- `research mode` — inspirado no AIOX, forte em mercado, benchmark e insight

Sem misturar tudo no mesmo fluxo padrão.

## 6.3. Handoff UX melhor entre `@analyst` e próximos agentes

O AIOSON já faz handoff estrutural via workflow.
Mas poderia enriquecer isso com:

- “próximo comando sugerido”
- “artefatos produzidos”
- “bloqueios remanescentes”
- “qual agente consome este output”

## 6.4. Numbered options protocol para sessões exploratórias

Especialmente quando o usuário está em fase de descoberta aberta, brainstorming ou escolha de caminhos.

## 6.5. Catálogo de micro-workflows do analyst

Inspirado no AIOX, o AIOSON poderia modularizar melhor tarefas como:

- workshop de brainstorming
- competitive snapshot
- project brief
- elicitação avançada
- research prompt

Hoje isso tudo ainda está muito concentrado no prompt base do analyst.

---

## 7. O que NÃO vale copiar cegamente do AIOX analyst

## 7.1. Não transformar o analyst em um agente genérico demais

Se o AIOSON copiar toda a amplitude do AIOX analyst sem cuidado, ele pode perder o que hoje é seu ponto forte:

- discovery técnica disciplinada
- outputs prontos para arquitetura e desenvolvimento

## 7.2. Não enfraquecer o workflow do projeto

O `@analyst` do AIOSON funciona bem porque está dentro do fluxo do sistema.
Adicionar command UX não deve virar bypass do workflow.

## 7.3. Não misturar market research com feature discovery sem separação

Esses dois trabalhos têm ritmos e outputs muito diferentes.
O ideal é criar camadas ou subcomandos, não um único comportamento ambíguo.

---

## 8. Melhor evolução recomendada para o AIOSON analyst

## 8.1. Reposicionar o analyst em duas camadas

### Camada 1 — Technical Analyst

Preservar o que já existe hoje:

- project discovery
- feature discovery
- entities
- requirements
- spec
- brownfield consolidation

### Camada 2 — Research Analyst

Adicionar capacidades inspiradas no AIOX:

- market research
- competitor analysis
- brainstorm facilitation
- project brief
- elicitation mode

A chave é não destruir a especialização atual.

## 8.2. Adicionar command pack leve ao `@analyst`

Algo como:

- `@analyst research`
- `@analyst brainstorm`
- `@analyst brief`
- `@analyst feature`
- `@analyst brownfield`

## 8.3. Integrar handoff explícito para `@architect` e `@dev`

Saída desejada do analyst no AIOSON poderia sempre incluir:

- artefatos gerados
- lacunas restantes
- agente seguinte sugerido
- comando sugerido
- status de prontidão

## 8.4. Criar templates auxiliares sem mover a lógica principal para fora do agent

O AIOX parece bem modular, mas o AIOSON não precisa copiar tudo de uma vez.
Pode começar com:

- templates de briefing
- template de benchmark competitivo
- template de brainstorming
- template de handoff do analyst

---

## 9. Síntese final

### O que o AIOX analyst tem que enriqueceria o AIOSON

- command UX
- brainstorm/elicitation mais formalizados
- market research / competitor analysis como capacidades explícitas
- handoff de continuidade com sugestão de próximo passo
- colaboração mais explícita com agentes consumidores

### O que o AIOSON analyst já faz melhor

- discovery técnica pronta para implementação
- brownfield real com scanner local
- project mode vs feature mode
- context repair
- output contract muito mais rígido
- integração real com workflow do sistema

### Melhor direção para o AIOSON

Não copiar o `AIOX analyst` inteiro.
O melhor caminho é:

- manter o coração técnico atual do `@analyst`
- adicionar uma camada `research/discovery UX` inspirada no AIOX
- introduzir comandos, handoff explícito e micro-workflows sem perder disciplina estrutural

---

## 10. Veredito

Se a pergunta for:

- “qual dos dois é melhor para pesquisa e ideação aberta?”
  Resposta: `AIOX analyst`

- “qual dos dois é melhor para alimentar implementação real de software?”
  Resposta: `AIOSON analyst`

Se a pergunta for:

- “o que o AIOSON deveria aprender com o AIOX aqui?”

Resposta:

- UX de comandos
- research mode
- handoff de continuidade
- micro-workflows de discovery

Sem abrir mão do que já é o diferencial do AIOSON:

- rigor técnico
- integração com workflow
- brownfield discovery
- outputs prontos para `@architect` e `@dev`
