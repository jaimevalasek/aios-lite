# Analysis — AIOX ux-design-expert vs AIOSON ux-ui

> Data: 2026-03-21
> Escopo: comparar o agente `ux-design-expert` do AIOX com o agente `@ux-ui` do AIOSON e responder se UX + UI juntos em um unico agente sao suficientes para resultados excelentes

---

## 1. Resumo executivo

Os dois agentes tratam de interface, mas ocupam posicoes bem diferentes no sistema.

### AIOX ux-design-expert

O `AIOX ux-design-expert` e um agente muito mais amplo que um simples designer de telas.
Ele funciona como um pacote de:

- UX research
- wireframing
- design system audit
- consolidacao de padroes
- extracao de design tokens
- build de componentes atomicos
- documentacao de pattern library
- accessibility check
- ROI de design system

Em outras palavras, ele mistura:

- designer de produto
- design system architect
- auditor de brownfield
- coordenador de qualidade visual

### AIOSON ux-ui

O `@ux-ui` do AIOSON e muito mais focado em:

- definir direcao visual intencional
- evitar output generico
- transformar contexto em `ui-spec.md`
- produzir `index.html` quando `project_type=site`
- auditar UI existente quando o usuario pede audit
- enriquecer `Visual identity` no PRD
- fazer handoff claro para `@dev`
- respeitar uma `design_skill` unica por projeto

### Leitura mais importante

- o `AIOX ux-design-expert` e mais forte em **cobertura de workflow de design de ponta a ponta, design systems, brownfield audit e command UX**
- o `AIOSON @ux-ui` e mais forte em **disciplina de fluxo, isolamento de sistema visual, craft de output final e integracao direta com o workflow do projeto**

A pergunta util aqui nao e apenas:

- “qual dos dois faz UI mais bonita?”

A pergunta util e:

- “o que o AIOSON deveria absorver para elevar maturidade de UX/UI sem perder a simplicidade e o foco do `@ux-ui`?”
- “UX + UI no mesmo agente basta, ou esse modelo comeca a quebrar em certos cenarios?”

### Resposta curta sobre UX + UI juntos

Sim, **pode ser suficiente** para resultados excelentes no AIOSON.
Mas isso e verdade apenas quando o agente esta apoiado por:

- `@product` capturando intencao e identidade visual cedo
- `@architect` definindo estrutura e restricoes
- `design_skill` bem escolhida
- `@dev` implementando com fidelidade
- um minimo de audit e QA visual depois

Ou seja:

- o problema nao e UX e UI estarem juntos
- o problema e se o agente combinado nao tiver modos e artefatos suficientes para ir alem de “fazer uma tela bonita”

---

## 2. Como o AIOX ux-design-expert funciona

Fonte principal usada:

- https://github.com/SynkraAI/aiox-core/blob/main/.claude/commands/AIOX/agents/ux-design-expert.md

Quando alguma conclusao abaixo depende das tasks e do ecossistema AIOX citado no arquivo, isso deve ser lido como **inferencia baseada na fonte**.

### 2.1. E um agente de workflow completo, nao apenas uma persona visual

O arquivo posiciona o agente como:

- UX/UI Designer
- Design System Architect
- complete design workflow

Ele cobre explicitamente da pesquisa ate a qualidade final.

### 2.2. Ele opera em 5 fases muito claras

O prompt organiza o trabalho em fases:

1. UX research e wireframes
2. audit de design system brownfield
3. tokens e setup do sistema
4. build atomico de componentes
5. documentacao e quality checks

Esse desenho e muito mais proximo de um mini sistema de design ops do que de um agente de UI comum.

### 2.3. Ele e fortemente orientado por comandos

Entre os comandos expostos pelo arquivo:

- `*research`
- `*wireframe`
- `*generate-ui-prompt`
- `*create-front-end-spec`
- `*audit`
- `*consolidate`
- `*shock-report`
- `*tokenize`
- `*setup`
- `*migrate`
- `*build`
- `*compose`
- `*extend`
- `*document`
- `*a11y-check`
- `*calculate-roi`

Isso da ao agente uma UX operacional muito madura.

### 2.4. O centro metodologico dele e Atomic Design

O agente assume Brad Frost de forma explicita:

- atoms
- molecules
- organisms
- templates
- pages

Essa metodologia conecta design e implementacao de componentes de forma muito forte.

### 2.5. Ele trata brownfield como audit e consolidacao real

O AIOX agent nao para em “refinar a tela atual”.
Ele propoe:

- inventario de redundancias
- clustering de padroes
- shock report visual
- extracao de design tokens
- migracao do sistema visual

Isso e bem mais forte do que apenas gerar um `ui-spec` novo.

### 2.6. Ele traz design system como primeira classe

No AIOX, temas como:

- zero hardcoded values
- design tokens
- DTCG export
- component library
- migration strategy
- documentation

aparecem como parte nativa do trabalho, nao como detalhe opcional.

### 2.7. Ele mede valor do trabalho de design

O comando `*calculate-roi` mostra algo incomum:

- custo da redundancia
- reducao de variacoes
- savings operacionais

Isso posiciona o agente como argumento de negocio tambem, nao so de craft.

### 2.8. Ele tem estado persistido do workflow

O arquivo descreve um `.state.yaml` com fases, auditoria, tokens, componentes e qualidade.
Isso indica um nivel de continuidade operacional superior ao de um prompt estatico.

---

## 3. Como o AIOSON ux-ui funciona hoje

Fontes principais no AIOSON:

- `template/.aioson/agents/ux-ui.md`
- `template/.aioson/locales/pt-BR/agents/ux-ui.md`
- `docs/pt/agentes.md`
- `src/commands/workflow-next.js`
- `template/.aioson/skills/design/cognitive-core-ui/SKILL.md`
- `template/.aioson/skills/design/interface-design/SKILL.md`
- `template/.aioson/skills/design/premium-command-center-ui/SKILL.md`

### 3.1. E um agente de craft visual com workflow bem amarrado

O `@ux-ui` do AIOSON entra como etapa oficial em projetos com interface:

- `SMALL`: `@setup -> @product -> @analyst -> @architect -> @ux-ui -> @dev -> @qa`
- `MEDIUM`: `@setup -> @product -> @analyst -> @architect -> @ux-ui -> @pm -> @orchestrator -> @dev -> @qa`

Ou seja, ele nao trabalha no vazio.
Ele recebe contexto de produto e arquitetura antes de desenhar.

### 3.2. O agente foi desenhado para evitar output generico

A missao ja deixa isso explicito:

- output generico e fracasso

E o prompt reforca isso com testes como:

- swap test
- squint test
- signature test
- wow test para landing pages

### 3.3. O gate de `design_skill` e parte central do modelo

Esse e um dos maiores diferenciais do AIOSON.
O `@ux-ui` nao deveria inventar um sistema visual solto.
Ele deve:

- ler `design_skill` de `project.context.md`
- carregar apenas a skill escolhida
- nao misturar sistemas visuais
- enriquecer o PRD com essa decisao

Isso torna o agente menos “solto” e mais governado.

### 3.4. O AIOSON separa produto, arquitetura e visual melhor que o AIOX nessa fonte

No AIOSON:

- `@product` captura intencao, usuarios e `Visual identity`
- `@architect` define estrutura e limites
- `@ux-ui` define direcao visual e handoff de interface
- `@dev` implementa

Essa separacao reduz o risco de o agente de UI ter que inventar sozinho o produto e a arquitetura.

### 3.5. O `@ux-ui` tem modo de criacao e modo de audit

Isso e importante.
O agente nao serve apenas para criar algo novo.
Ele tambem consegue:

- detectar UI existente
- perguntar se o usuario quer audit, refine spec ou rebuild
- gerar `.aioson/context/ui-audit.md`
- apontar fixes concretos sem sair mudando tudo de imediato

### 3.6. Ele e forte em sites e landing pages

Para `project_type=site`, o prompt e bastante especifico:

- hero law
- tecnicas “wow” obrigatorias
- copy real
- URLs reais de imagens
- estrutura HTML completa
- CSS moderno com tokens
- motion com `prefers-reduced-motion`

Aqui o AIOSON tem uma camada muito pratica de entrega final.

### 3.7. Para apps e dashboards ele trabalha como especificador visual

Quando nao e site, o output principal e:

- `.aioson/context/ui-spec.md`

Esse arquivo deve conter:

- token block
- ownership de tokens
- mapa de telas
- matriz de estados
- responsividade
- notas de handoff para `@dev`

### 3.8. Boa parte da forca real esta nas design skills, nao so no agente base

O AIOSON empacota skills de design como:

- `cognitive-core-ui`
- `interface-design`
- `premium-command-center-ui`

Essas skills trazem:

- direcao visual
- componentes
- patterns
- motion
- validation
- tokens

Isso significa que o `@ux-ui` sozinho nao e a historia inteira.
O modelo real e:

- agente base + skill visual + workflow + handoff

### 3.9. O `workflow-next` reconhece `@ux-ui` como etapa formal

No runtime atual, a etapa `ux-ui` e considerada concluida quando existe:

- `.aioson/context/ui-spec.md`

Isso torna o agente parte real do workflow engine, nao apenas uma persona opcional.

---

## 4. Onde o AIOX ux-design-expert esta a frente

## 4.1. Cobre UX research de forma muito mais explicita

No AIOX, user research e wireframing sao parte oficial da superficie do agente.
No AIOSON, a parte UX existe mais embutida em perguntas de intencao e direcao, mas nao como workflow de pesquisa robusto.

## 4.2. Cobre design system e token pipeline de ponta a ponta

O AIOX vai muito mais longe em:

- token extraction
- setup de design system
- migracao
- export DTCG
- documentacao de pattern library

O AIOSON ainda nao mostra isso como capacidade nativa do `@ux-ui`.

## 4.3. Tem brownfield visual mais maduro

O AIOX propoe:

- audit de redundancia
- consolidacao
- shock report
- ROI

No AIOSON, o audit atual e util, mas e mais artesanal e menos sistemico.

## 4.4. Tem command UX muito mais rica

O AIOX oferece um posto de trabalho de design.
O AIOSON ainda depende bem mais de linguagem natural e do contrato fixo do agente.

## 4.5. Tem continuidade de estado mais forte

O `.state.yaml` do AIOX e os seus subestados de workflow vao alem do modelo atual do AIOSON para UX/UI.

## 4.6. Acessibilidade aparece como comando e capacidade explicitamente operacional

No AIOX, `*a11y-check` existe como capacidade separada.
No AIOSON, acessibilidade esta forte nas regras, mas menos operacionalizada como artefato proprio.

## 4.7. O AIOX aproxima design e componente de forma mais direta

Comandos como `*build`, `*compose` e `*extend` encurtam a distancia entre especificacao e sistema de componentes.
No AIOSON, isso cai mais claramente no `@dev`.

---

## 5. Onde o AIOSON ux-ui esta a frente

## 5.1. Melhor disciplina de fronteira com produto e arquitetura

O AIOSON evita que o agente de UI precise carregar o mundo nas costas.
Ele entra depois de:

- produto
- analise
- arquitetura

Isso e uma vantagem real em projetos de software, porque reduz improviso visual desconectado do contexto.

## 5.2. Sistema de `design_skill` isolada e forte

O AIOSON tem uma ideia muito boa aqui:

- uma skill de design por projeto
- isolamento estrito
- sem misturar estilos
- escolha explicita

Isso e um mecanismo importante para consistencia.

## 5.3. Melhor amarracao com o PRD vivo

O `@ux-ui` precisa enriquecer `Visual identity` no PRD.
Isso conecta design com memoria viva do produto, algo muito valioso.

## 5.4. Prompt muito forte para evitar UI generica

Os testes de craft e as regras de composicao do AIOSON sao muito diretos e pragmaticos.
Especialmente em landing pages, o agente tem um padrao de exigencia alto.

## 5.5. Melhor encaixe no fluxo do projeto real

No AIOSON, `@ux-ui` produz o artefato certo para o proximo agente.
Isso e excelente para execucao real, mesmo que seja menos glamouroso do que um design system pipeline completo.

## 5.6. Mais simples de operar no caso comum

O AIOX e muito mais poderoso, mas tambem mais pesado.
O AIOSON `@ux-ui` e mais facil de usar no fluxo padrao do projeto.

## 5.7. O skill layer do AIOSON ja cobre parte do gap

Quando a skill de design escolhida e boa, o resultado sobe bastante sem precisar transformar o agente base em um monstro de 20 comandos.

---

## 6. UX + UI no mesmo agente no AIOSON e suficiente?

## 6.1. Para o alvo atual do AIOSON: sim, na maior parte dos casos

Para:

- projetos `SMALL`
- muitos `MEDIUM`
- sites
- dashboards internos
- apps com uma superficie principal
- features que precisam de direcao visual e handoff claro

um unico agente `@ux-ui` pode, sim, entregar trabalho excelente.

Especialmente porque o AIOSON ja distribui o problema entre varios agentes:

- `@product` cobre intencao e narrativa do produto
- `@architect` cobre estrutura e restricoes
- `@ux-ui` cobre direcao visual e especificacao
- `@dev` implementa

Nesse desenho, juntar UX + UI no mesmo agente nao e um defeito automatico.

## 6.2. O agente unico deixa de ser suficiente quando o problema vira design ops

Ele comeca a ficar curto quando voce precisa de:

- pesquisa de usuario real e recorrente
- inventario de componentes existentes
- tokenizacao e migracao de design system
- documentacao de pattern library
- auditoria quantitativa de redundancia
- governanca entre varias squads ou varias superficies do produto
- QA visual/a11y formal recorrente

A partir daqui, “UX + UI num agente so” ainda pode existir, mas precisa de submodos e artefatos bem mais fortes.

## 6.3. O limite nao esta no nome combinado, mas na profundidade operacional

O problema nao e chamar o agente de `ux-ui`.
O problema seria deixar esse agente sem:

- pesquisa
- audit sistemico
- tokens
- a11y report
- handoff de componente
- continuidade de estado

Em resumo:

- UX + UI juntos podem funcionar muito bem
- UX + UI juntos, mas superficiais, nao sustentam excelencia por muito tempo

---

## 7. O que valeria melhorar no AIOSON sem dividir o agente imediatamente

## 7.1. Adicionar submodos ou command pack leve ao `@ux-ui`

Sem copiar o AIOX inteiro, o AIOSON ganharia muito com modos como:

- `@ux-ui research`
- `@ux-ui audit`
- `@ux-ui tokens`
- `@ux-ui component-map`
- `@ux-ui a11y`
- `@ux-ui handoff`

Isso manteria um agente unico com maior profundidade operacional.

## 7.2. Criar artefatos opcionais alem do `ui-spec.md`

Exemplos uteis:

- `.aioson/context/ui-research.md`
- `.aioson/context/ui-tokens.md`
- `.aioson/context/ui-component-map.md`
- `.aioson/context/ui-a11y.md`
- `.aioson/context/ui-motion.md`

O `ui-spec.md` continuaria sendo o output central, mas nao precisaria carregar tudo sozinho.

## 7.3. Melhorar o brownfield visual

O modo audit atual e bom, mas ainda pode crescer para incluir:

- inventario de componentes repetidos
- inventario de cores, espacamentos e radius
- detecao de hardcoded values
- mapa de inconsistencias de estados
- plano de consolidacao visual

## 7.4. Tornar tokens e design system mais explicitos

Hoje o AIOSON fala bem de tokens, mas ainda nao os trata como artefato formal do workflow visual.
Poderia haver um modo especifico para:

- gerar token contract
- declarar aliases semanticos
- mapear `:root` vs `[data-theme]`
- preparar handoff mais forte para componentizacao

## 7.5. Dar ao `@ux-ui` uma camada propria de a11y e UI QA

Hoje acessibilidade esta muito bem lembrada no prompt, mas faltam outputs mais claros.
Um enriquecimento bom seria:

- checklist formal
- findings priorizados
- integracao com `@qa`
- separacao entre problema visual, problema de interacao e problema de acessibilidade

## 7.6. Criar um modo de continuidade visual para multiplas telas

O AIOSON ainda poderia ganhar um submodo que garanta continuidade entre:

- tela nova
- tela existente
- componente novo
- variante nova
- dashboard e detalhe

Isso evita que a qualidade dependa apenas do talento do momento.

## 7.7. Integrar melhor `@ux-ui` com squads

Esse e um ponto forte potencial do AIOSON.
Poderia existir um uso de `@ux-ui` para:

- gerar guias visuais de squad
- preparar contratos de componentes para agentes especializados
- validar se multiplos agentes estao respeitando a mesma design skill

---

## 8. O que provavelmente NAO vale fazer agora

## 8.1. Nao quebrar logo em dois agentes obrigatorios: `@ux` e `@ui`

Isso pode burocratizar demais o fluxo padrao do AIOSON.
Para o caso comum, um agente unico ainda e uma escolha boa.

## 8.2. Nao copiar o AIOX inteiro para dentro do prompt

Se o `@ux-ui` virar um mega-agente com 20+ comandos sem encaixe no workflow, ele perde foco.

## 8.3. Nao tratar design system pesado como obrigatorio para todo projeto

Isso seria exagero para muitos `SMALL` e varios `MEDIUM`.

## 8.4. Nao depender so da criatividade do agente base

O AIOSON acerta em usar `design_skill`.
A evolucao deve fortalecer esse ecossistema, nao abandonar a ideia.

---

## 9. Melhor direcao recomendada para o AIOSON

## 9.1. Manter `@ux-ui` como agente oficial unico no fluxo padrao

Para o AIOSON de hoje, isso ainda faz sentido.

## 9.2. Evoluir o agente para um modelo “core + modos”

Sugestao:

- `@ux-ui` continua sendo o agente oficial
- ganha modos opcionais de research, audit, tokens, a11y e handoff
- `ui-spec.md` continua central
- artefatos complementares aparecem so quando o caso pede

## 9.3. Fortalecer as design skills como sistemas visuais reais

O AIOSON ja tem uma boa fundacao aqui.
O proximo salto nao e so mudar o prompt do agente.
E melhorar o pacote inteiro:

- skill
- referencias
- contrato de tokens
- handoff para `@dev`
- validacao posterior

## 9.4. Criar uma camada opcional de design-system / UI governance

Sem mexer no fluxo basico, o AIOSON poderia adicionar algo como:

- `@ux-ui audit-system`
- `@ux-ui tokens`
- `@ux-ui validate-skill`

Isso cobrira melhor os casos em que um agente unico hoje fica curto.

---

## 10. Veredito

Se a pergunta for:

- “qual dos dois cobre mais do ciclo completo de design?”
  Resposta: `AIOX ux-design-expert`

- “qual dos dois esta melhor encaixado no workflow real do AIOSON para entregar software sem inflar o processo?”
  Resposta: `AIOSON @ux-ui`

- “UX + UI juntos em um unico agente no AIOSON e suficiente para ter excelentes resultados?”
  Resposta: **sim, muitas vezes e suficiente**

Mas com a condicao correta:

- o agente nao pode operar sozinho no vazio
- precisa de `@product`, `@architect`, `design_skill`, `@dev` e uma camada minima de validacao visual

### O que mais enriqueceria o AIOSON aqui

- research mode
- audit brownfield mais sistemico
- token/system mode
- a11y/output mais formal
- command UX leve
- melhor integracao com squads e continuidade visual

### Recomendacao final

Nao separar `UX` e `UI` de forma obrigatoria agora.
O melhor caminho e:

- manter `@ux-ui` como agente unico
- enriquecer o agente com submodos e artefatos opcionais
- fortalecer a combinacao `design_skill + ui-spec + handoff + validacao`

Esse caminho preserva simplicidade no caso comum e aumenta profundidade quando o projeto exigir.

