# Analysis — AIOX architect vs AIOSON architect

> Data: 2026-03-21
> Escopo: comparar o agente `architect` do AIOX com o agente `@architect` do AIOSON

---

## 1. Resumo executivo

Os dois agentes compartilham o nome, mas ocupam posições diferentes no sistema.

### AIOX architect

Funciona como um arquiteto mais amplo e mais acima na pilha de decisão, cobrindo:

- arquitetura full-stack
- arquitetura backend e frontend
- seleção de stack e escolhas técnicas
- API design
- segurança e performance
- infraestrutura e deployment
- análise estrutural de projeto brownfield
- planejamento e contexto para execução

### AIOSON architect

Funciona como um arquiteto de workflow, voltado para converter discovery em arquitetura executável para o projeto atual, cobrindo:

- leitura disciplinada de `discovery.md`
- produção de `architecture.md`
- estrutura de pastas por stack e classificação
- sequência de implementação para `@dev`
- integração com `design-doc.md` e `readiness.md`
- handoff técnico para `@ux-ui` e `@dev`

### Leitura mais importante

- o `AIOX architect` é mais forte em **amplitude arquitetural, command UX, validação/review e colaboração com especialistas**
- o `AIOSON architect` é mais forte em **disciplina de workflow, proportionalidade por classificação e output arquitetural diretamente acionável pelo projeto**

Então a pergunta útil aqui não é “qual é o melhor arquiteto?”.
A pergunta útil é:

- o que do `AIOX architect` enriqueceria o `@architect` do AIOSON sem enfraquecer o contrato rígido de `architecture.md`?

---

## 2. Como o AIOX architect funciona

Fonte principal usada:

- https://github.com/SynkraAI/aiox-core/blob/main/.claude/commands/AIOX/agents/architect.md

Quando alguma conclusão abaixo extrapola o arquivo principal e assume o comportamento do ecossistema AIOX, isso deve ser lido como **inferência baseada na fonte**.

### 2.1. É um arquiteto orientado por comandos

O `AIOX architect` expõe uma superfície operacional mais rica do que um prompt estático.
Entre os comandos presentes no próprio arquivo estão:

- `*create-full-stack-architecture`
- `*create-backend-architecture`
- `*create-front-end-architecture`
- `*create-brownfield-architecture`
- `*document-project`
- `*execute-checklist`
- `*research {topic}`
- `*analyze-project-structure`
- `*validate-tech-preset`
- `*assess-complexity`
- `*create-plan`
- `*create-context`
- `*map-codebase`
- `*doc-out`
- `*shard-prd`
- `*session-info`
- `*guide`
- `*yolo`
- `*exit`

Isso faz o agente parecer um posto de trabalho arquitetural, não só uma persona textual.

### 2.2. Ele atua antes, durante e depois do desenho arquitetural

O AIOX architect não fica restrito a “desenhar a arquitetura”.
Pelo arquivo, ele também participa de:

- análise de estrutura existente
- validação de presets técnicos
- avaliação de complexidade
- criação de plano
- criação de contexto para execução
- documentação do projeto

Ou seja, ele cobre descoberta técnica, design e pré-execução.

### 2.3. O escopo dele é mais amplo que o do AIOSON architect

O AIOX architect assume temas como:

- system architecture
- technology stack selection
- infrastructure planning
- API design
- security architecture
- frontend architecture
- backend architecture
- observability e cross-cutting concerns
- integration patterns
- performance optimization

No AIOSON, parte desse escopo existe, mas o `@architect` é bem mais moldado pelo fluxo já decidido em `@setup` + `@product` + `@analyst`.

### 2.4. Ele tem delegação especializada explícita

O arquivo define colaboração e fronteiras com outros agentes, por exemplo:

- `@data-engineer` para schema, queries e modelagem de banco
- `@ux-design-expert` para UX/UI e fluxos de interface
- `@github-devops` para push, PR e CI/CD
- `@pm` como consumidor/colaborador de direção estratégica

Esse contrato de colaboração é mais explícito do que no `@architect` do AIOSON.

### 2.5. Ele incorpora validação e review arquitetural

O AIOX architect inclui:

- checklist arquitetural
- validação de tech presets
- integração com CodeRabbit para review de padrões, segurança e anti-patterns

Isso é relevante porque transforma o arquiteto em um agente que não apenas propõe, mas também revisa.

### 2.6. Ele oferece continuidade de sessão mais madura

Assim como o `aiox-master`, o `architect` do AIOX possui:

- ritual de ativação forte
- leitura de handoff não consumido
- sugestão de próximo comando
- awareness de branch/estado do git
- `session-info`

Isso cria uma UX mais operacional entre sessões.

---

## 3. Como o AIOSON architect funciona hoje

Fontes principais no AIOSON:

- `template/.aioson/agents/architect.md`
- `template/.aioson/locales/pt-BR/agents/architect.md`
- `src/commands/workflow-next.js`
- `template/.aioson/agents/dev.md`
- `template/.aioson/locales/pt-BR/agents/setup.md`

### 3.1. É um arquiteto de transformação de discovery em execução

A missão do `@architect` no AIOSON é muito objetiva:

- transformar `discovery.md` em `architecture.md`
- definir estrutura de pastas e módulos
- mapear relacionamentos e sequência de implementação
- deixar a direção pronta para `@dev`

Isso já mostra a diferença principal.
O AIOSON architect não é um arquiteto “generalista de plataforma” por padrão.
Ele é um arquiteto de entrega dentro do workflow do projeto.

### 3.2. Ele depende de uma cadeia documental bem definida

O `@architect` do AIOSON trabalha com entrada explícita:

- `project.context.md`
- `design-doc.md` quando existir
- `readiness.md` quando existir
- `discovery.md`

Além disso, ele trata `design-doc.md` como documento de decisão do escopo atual e `readiness.md` como freio operacional quando a base ainda não está pronta.

### 3.3. Ele é forte em brownfield disciplinado

No AIOSON, brownfield não é “olhar o código e improvisar”.
O fluxo esperado é:

- scanner local gera artefatos
- `@analyst` consolida isso em `discovery.md`
- só então `@architect` trabalha

O agente ainda deixa explícito que não deve arquitetar diretamente a partir dos mapas brutos do scan.
Isso é uma disciplina importante.

### 3.4. Ele tem regras fortes de contenção de escopo

O `@architect` do AIOSON impõe regras como:

- não redesenhar entidades produzidas por `@analyst`
- manter arquitetura proporcional à classificação
- evitar complexidade especulativa
- documentar decisões adiadas
- devolver bloqueios se `readiness.md` apontar baixa prontidão
- carregar docs e skills sob demanda

Isso reduz bastante a chance de overengineering.

### 3.5. Ele é muito concreto por stack e por tamanho

O AIOSON architect já traz templates operacionais de estrutura para:

- Laravel / TALL Stack
- Node / Express
- Next.js App Router
- dApps

E ainda separa isso por:

- `MICRO`
- `SMALL`
- `MEDIUM`

Esse nível de proporcionalidade é um diferencial forte.

### 3.6. O contrato de output é bem mais executável

O agente define exatamente o que deve entrar em `.aioson/context/architecture.md`:

- visão geral
- estrutura de pastas/modulos
- ordem de migrations
- models e relacionamentos
- arquitetura de integração
- preocupações transversais
- sequência de implementação para `@dev`
- não-objetivos e adiamentos

Quando frontend importa, ele ainda adiciona um handoff para `@ux-ui`.

### 3.7. Ele está acoplado ao workflow do sistema

Pelo `workflow-next`, o `@architect` no AIOSON:

- é obrigatório em projetos `SMALL` e `MEDIUM`
- não entra no fluxo padrão de `MICRO`
- não entra no fluxo padrão de feature
- é considerado concluído quando `architecture.md` existe

Isso significa que o agente está modelado como estágio formal do projeto, não como utilitário aberto.

### 3.8. Há um pequeno gap entre setup e prompt do architect

O `@setup` documenta que, quando `framework_installed=false`, `@architect` e `@dev` devem incluir comandos de instalação no output.

Mas o prompt do `@architect` não reforça isso explicitamente.
Não é um problema de conceito do agente, mas é uma lacuna de alinhamento operacional que o AIOX costuma tratar melhor com contratos mais explícitos.

---

## 4. Onde o AIOX architect está à frente

## 4.1. Command UX muito melhor

O AIOX architect oferece uma superfície clara de ações:

- arquitetura full-stack
- backend
- frontend
- brownfield
- research
- checklist
- plan
- context
- map-codebase
- validation

No AIOSON, o uso do `@architect` ainda é muito mais implícito e dependente do workflow global.

## 4.2. Escopo arquitetural mais amplo

O AIOX architect cobre explicitamente:

- stack selection
- API design
- deployment strategy
- infrastructure planning
- security architecture
- performance optimization

O AIOSON architect cobre parte disso, mas com menos explicitação e menos submodos dedicados.

## 4.3. Melhor suporte para arquitetura incremental e análise de estrutura

O AIOX architect já exibe comandos como:

- `*create-brownfield-architecture`
- `*analyze-project-structure`
- `*assess-complexity`
- `*create-plan`
- `*create-context`

Isso o torna mais forte em cenários de mudança incremental.
No AIOSON, o architect atual está muito mais centrado na arquitetura do projeto como fase do fluxo principal.

## 4.4. Fronteiras colaborativas mais explícitas

AIOX deixa claro:

- quando chamar outro especialista
- o que permanece com o arquiteto
- o que deve ser delegado

No AIOSON, o handoff para `@ux-ui` e `@dev` existe, mas a matriz de colaboração é bem menos explícita.

## 4.5. Review arquitetural e validação integrada

Checklist, presets e CodeRabbit dão ao AIOX architect uma camada de crítica e validação que o AIOSON architect ainda não mostra como capacidade própria.

---

## 5. Onde o AIOSON architect está à frente

## 5.1. Output muito mais amarrado à execução real

No AIOSON, a arquitetura não é só discussão conceitual.
Ela vira um artefato concreto consumido pelo resto do fluxo.

## 5.2. Proporcionalidade por classificação

Esse é um ponto muito forte.
O AIOSON architect evita inflar projetos `MICRO` com padrões `MEDIUM`.
O arquivo deixa isso explícito e operacional.

## 5.3. Brownfield com memória comprimida e cadeia documental

O AIOSON força uma disciplina saudável:

- scan local
- consolidação por `@analyst`
- arquitetura a partir de `discovery.md`

Isso reduz decisões frágeis baseadas em leitura parcial do código.

## 5.4. Melhor acoplamento ao workflow do projeto

O `@architect` do AIOSON é parte real do pipeline:

- entra no momento certo
- gera o artefato certo
- desbloqueia o próximo estágio

Isso diminui ambiguidade entre arquitetura e implementação.

## 5.5. Melhor contrato para `@dev`

O output do AIOSON architect já pensa diretamente no consumo por `@dev`.
Isso é muito valioso porque reduz interpretação livre no próximo estágio.

## 5.6. Integração com design-doc e readiness

O AIOX architect é mais amplo.
O AIOSON architect é mais disciplinado com o estado do projeto atual.
`design-doc.md` e `readiness.md` funcionam como mecanismos de contenção e foco.

---

## 6. O que valeria trazer do AIOX architect para o AIOSON architect

## 6.1. Superfície de comandos própria do `@architect`

Sem abandonar a linguagem natural, o AIOSON ganharia muito com comandos como:

- `@architect fullstack`
- `@architect backend`
- `@architect frontend`
- `@architect api`
- `@architect infra`
- `@architect brownfield`
- `@architect review`
- `@architect session-info`

## 6.2. Modo de arquitetura incremental para feature/brownfield

Hoje o workflow padrão de feature no AIOSON não inclui `@architect`.
Inspirado no AIOX, faria sentido existir uma trilha opcional para:

- impacto arquitetural de feature
- mudanças estruturais em projeto existente
- análise de integração antes do `@dev`

Sem obrigar esse passo para toda feature.

## 6.3. Checklist e validação arquitetural

O AIOSON poderia ganhar algo como:

- checklist de arquitetura por stack
- review de anti-patterns
- revisão de segurança/performance
- validação de consistência entre `discovery.md`, `architecture.md` e `design-doc.md`

## 6.4. Mapa explícito de colaboração e delegação

O `@architect` do AIOSON poderia declarar melhor:

- quando parar e chamar `@ux-ui`
- quando a questão ainda é de `@analyst`
- quando a execução deve seguir para `@dev`
- quando o problema exige orquestração entre módulos

## 6.5. Sessão com continuidade operacional melhor

Sugestão de enriquecimento inspirada no AIOX:

- mostrar artefatos consumidos
- mostrar artefatos produzidos
- sugerir próximo comando
- registrar lacunas arquiteturais remanescentes

## 6.6. Cobertura mais explícita de API, infra e segurança

Hoje essas áreas estão presentes no contrato do AIOSON architect, mas de forma mais comprimida.
O AIOX mostra que vale a pena destacá-las como capacidades próprias e reconhecíveis.

## 6.7. Fechar o gap de `framework_installed=false`

Como o `@setup` já delega ao `@architect` parte da responsabilidade por instruções de instalação, o prompt do `@architect` deveria tornar esse comportamento explícito.
Esse tipo de alinhamento contratual é algo que o AIOX faz melhor.

---

## 7. O que NÃO vale copiar cegamente do AIOX architect

## 7.1. Não transformar o architect em meta-agente genérico demais

Se o AIOSON absorver toda a amplitude do AIOX architect sem delimitação, o `@architect` pode perder o foco de produzir um `architecture.md` claro e executável.

## 7.2. Não enfraquecer a cadeia `@analyst -> @architect -> @dev`

Essa cadeia é um dos pontos fortes do AIOSON.
Command UX não deve virar bypass da disciplina documental.

## 7.3. Não misturar papel de arquiteto com papel de data-engineer ou devops sem fronteira

O AIOX tem especialistas explícitos para isso.
Se o AIOSON copiar as capacidades sem explicitar fronteiras, pode gerar ambiguidade de responsabilidade.

## 7.4. Não inflar projetos pequenos com camadas de revisão desnecessárias

Checklists, reviews e submodos são úteis, mas precisam respeitar a mesma lógica de classificação que o AIOSON já usa bem.

---

## 8. Melhor evolução recomendada para o AIOSON architect

## 8.1. Manter o núcleo atual como “Execution Architect”

Preservar o que já funciona muito bem:

- consumo disciplinado de `discovery.md`
- geração de `architecture.md`
- proporcionalidade por classificação
- sequência de implementação para `@dev`
- brownfield passando por memória consolidada

## 8.2. Adicionar uma camada “Strategy / Review Architect”

Inspirada no AIOX, mas sem substituir o núcleo atual:

- revisão de impacto arquitetural
- arquitetura incremental de feature
- checklist de arquitetura
- API/infra/security review
- session-info e handoff melhorado

## 8.3. Introduzir command pack leve

Algo como:

- `@architect review`
- `@architect feature-impact`
- `@architect api`
- `@architect infra`
- `@architect security`
- `@architect brownfield`

## 8.4. Tornar colaboração e saída mais explícitas

Toda saída do `@architect` poderia informar:

- artefatos lidos
- artefatos gerados
- lacunas remanescentes
- próximo agente recomendado
- se a arquitetura está pronta para `@dev`

## 8.5. Dar ao architect um modo opcional de arquitetura de feature

Não para todo caso.
Mas para features com impacto estrutural, o AIOSON poderia prever:

- um delta arquitetural
- uma seção de impacto em `spec-{slug}.md`
- ou um `architecture-{slug}.md` quando a mudança justificar

A ideia importante é habilitar o caso incremental sem burocratizar o caso simples.

---

## 9. Síntese final

### O que o AIOX architect tem que enriqueceria o AIOSON

- command UX
- arquitetura incremental mais explícita
- checklist e review arquitetural
- cobertura mais forte de API/infra/security
- delegação e colaboração melhor desenhadas
- continuidade de sessão com próximo passo sugerido

### O que o AIOSON architect já faz melhor

- arquitetura como artefato executável do workflow
- proportionalidade por classificação
- brownfield com memória consolidada
- handoff direto para `@dev`
- integração com `design-doc.md` e `readiness.md`
- menor risco de deriva arquitetural

### Melhor direção para o AIOSON

Não copiar o `AIOX architect` inteiro.
O melhor caminho é:

- manter o `@architect` atual como núcleo de execução
- adicionar uma camada leve de review/impact/commands inspirada no AIOX
- habilitar arquitetura incremental quando a feature realmente exigir

---

## 10. Veredito

Se a pergunta for:

- “qual dos dois é melhor para desenho arquitetural amplo, stack decision e validação técnica?”
  Resposta: `AIOX architect`

- “qual dos dois é melhor para transformar discovery em arquitetura pronta para o fluxo real do projeto?”
  Resposta: `AIOSON architect`

Se a pergunta for:

- “o que o AIOSON deveria aprender com o AIOX aqui?”

Resposta:

- command UX
- arquitetura incremental de feature
- checklist/review arquitetural
- colaboração explícita
- melhor camada de continuidade operacional

Sem abrir mão do que já é diferencial no AIOSON:

- disciplina de workflow
- `architecture.md` como artefato central
- proporcionalidade por classificação
- brownfield via memória consolidada
- handoff claro para `@dev`
