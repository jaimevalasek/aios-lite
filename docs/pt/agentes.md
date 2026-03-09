# Guia de Agentes

> Quando usar cada agente, o que ele entrega e como ativá-lo.

---

## Visão geral

O AIOS Lite tem agentes oficiais de projeto e também pode criar agentes de squad. Você não precisa usar todos — use apenas os que o contexto pede.

```
@setup        ← sempre o primeiro
@product      ← gera o PRD base vivo e roteia o fluxo
@discovery-design-doc ← quando precisa clarear escopo e gerar design doc vivo
@analyst      ← projetos SMALL e MEDIUM
@architect    ← projetos SMALL e MEDIUM
@ux-ui        ← quando há interfaces (SMALL e MEDIUM)
@pm           ← apenas MEDIUM
@orchestrator ← apenas MEDIUM
@dev          ← sempre o último antes do QA
@qa           ← projetos SMALL e MEDIUM
@squad        ← cria squads especializados no projeto
@genoma       ← cria genomas de domínio reutilizáveis
```

> Para o fluxo completo de `@squad` e `@genoma`, veja também [Squad e Genoma](./squad-genoma.md).

---

## @setup

**Quando usar:** Sempre. É o primeiro agente de qualquer projeto.

**O que faz:**
- Lê `.aios-lite/context/project.context.md`
- Confirma stack, classificação e idioma
- Define o plano de execução (quais agentes serão usados)
- Orienta o desenvolvedor sobre os próximos passos
- Recomenda `@discovery-design-doc` quando houver ambiguidade, feature grande ou risco alto, mas sem tornar isso obrigatório

**Como ativar:**
```
/setup
```

**O que ele pergunta:**
- O que o projeto precisa fazer e quem vai usar (sem pressuposições)
- Detecta a stack automaticamente — se não reconhecer, pergunta e registra o que o usuário descrever
- Confirma framework, classificação e idioma antes de finalizar

> **Qualquer stack funciona.** @setup não força um framework da lista. Se você usa Django, Go, Rust,
> FastAPI, SvelteKit ou qualquer outra tecnologia, ele registra o que você descrever.

**Entrega:**
- Confirmação do plano de agentes
- Resumo do contexto do projeto
- Geração opcional do `spec.md` (documento vivo para acompanhar o projeto entre sessões)

**Regra importante:**
- `@setup` continua sendo o primeiro agente
- `@discovery-design-doc` entra como recomendação contextual, não como etapa obrigatória
- se o pedido já estiver claro e pequeno, o fluxo pode seguir direto para `@dev`, `@analyst` ou `@architect`
- se o usuário pedir o painel local do AIOS Lite, o fluxo correto é via CLI:
  - `aios-lite dashboard:init .`
  - `aios-lite dashboard:dev . --port=3000`
  - `aios-lite dashboard:open . --port=3000`

---

## @product

**Quando usar:** Depois do `@setup` em projetos novos. Em features novas de projeto existente, pode entrar direto sem repetir `@setup`.

**O que faz:**
- conduz a conversa de produto e gera o `PRD base`
- registra visão, problema, usuários, escopo inicial e perguntas em aberto
- detecta sinais visuais cedo e preserva a intenção no PRD
- faz classificação preliminar do escopo
- aponta o próximo agente do fluxo

**Como ativar:**
```
/product
```

**Entrega:** Arquivo `.aios-lite/context/prd.md` ou `.aios-lite/context/prd-{slug}.md` com:
- visão e problema do produto
- usuários e escopo inicial do MVP
- fluxos principais
- métricas de sucesso
- perguntas em aberto
- identidade visual inicial, quando houver sinal suficiente

> Se o pedido mencionar explicitamente um command center premium, control tower, tri-rail shell ou estilo AIOS Lite Dashboard, o `@product` deve registrar a skill `premium-command-center-ui` na seção de identidade visual do PRD.

---

## @analyst

**Quando usar:** Projetos SMALL e MEDIUM, antes de @architect.

**O que faz:**
- Fase 1 (Discovery): Faz 6 perguntas de descoberta para entender o domínio
- Fase 2 (Modelagem): Mapeia entidades, atributos e regras de negócio
- Fase 3 (Análise): Produz tabela de entidades com campos e tipos
- Identifica integrações externas e riscos
- Em modo feature, passa a consumir `design-doc.md` e `readiness.md` quando já existirem
- Usa skills e documentos sob demanda para evitar reabrir discovery desnecessária

**Como ativar:**
```
/analyst
```

**Exemplo de perguntas que ele faz:**
```
1. Quem são os usuários e quais são seus objetivos principais?
2. Qual é o fluxo principal que gera valor para o negócio?
3. Existe algum processo manual hoje que este sistema vai substituir?
4. Quais são as regras de negócio mais críticas?
5. Há integrações com sistemas externos?
6. Quais dados são mais sensíveis ou críticos?
```

**Entrega:** Arquivo `.aios-lite/context/discovery.md` com:
- Mapa de entidades e atributos
- Tabela de campos com tipo e restrições
- Integrações mapeadas
- Riscos identificados
- Referências visuais (wireframes, links)

---

## @discovery-design-doc

**Quando usar:** Quando a demanda ainda está vaga, quando você quer um `design-doc.md` vivo antes de implementar, ou quando precisa medir se o contexto já está pronto para planejamento/execução.

**O que faz:**
- transforma briefing bruto em problema claro
- identifica o que já está definido e o que ainda falta
- produz `.aios-lite/context/design-doc.md`
- produz `.aios-lite/context/readiness.md`
- detecta `modo projeto` ou `modo feature`
- recomenda skills e documentos sob demanda para a próxima etapa
- recomenda o próximo agente ou documento do fluxo

**Como ativar:**
```
@discovery-design-doc
```

**Entrega:**
- `design-doc.md` com objetivo, escopo, fora de escopo, módulos afetados, integrações, riscos, decisões e critérios de aceite
- `readiness.md` com score objetivo por dimensão, nível de prontidão e próximo passo recomendado

**Quando preferir este agente ao @analyst:**
- quando o problema ainda está ambíguo
- quando você precisa de um documento vivo de decisão antes de modelar tudo
- quando a dúvida principal é escopo e prontidão, não modelagem profunda de entidades
- quando o projeto já existe e você quer planejar uma feature grande sem sair codando cedo demais

**Quando preferir @analyst:**
- quando o problema principal é domínio, entidades, regras de negócio e modelagem de dados

---

## @architect

**Quando usar:** Após @analyst, em projetos SMALL e MEDIUM.

**O que faz:**
- Escolhe a estrutura de pastas proporcional ao tamanho do projeto
- Documenta decisões técnicas (banco de dados, autenticação, etc.)
- Define padrões de código para o time
- Usa `design-doc.md` como documento de decisão do escopo atual
- Respeita `readiness.md`; se a prontidão ainda estiver baixa, devolve bloqueios em vez de fingir certeza

**Como ativar:**
```
/architect
```

**Estruturas que ele propõe (exemplo Laravel SMALL):**
```
app/
  Actions/          ← lógica de negócio
  Http/Controllers/ ← apenas orquestração
  Models/
  Policies/
resources/views/
database/migrations/
tests/
```

**Entrega:** Arquivo `.aios-lite/context/architecture.md` com:
- Estrutura de pastas (proporcional ao tamanho)
- Stack definitiva
- Decisões técnicas documentadas
- Padrões de código

---

## @ux-ui

**Quando usar:** Quando o projeto tem interfaces (web apps, landing pages com formulários). SMALL e MEDIUM.

**O que faz:**
- Recebe constraints do @architect (componentes-chave, paleta)
- Lê o PRD antes de decidir a direção visual
- Define hierarquia visual e padrões de UI
- Especifica componentes reutilizáveis
- Cria guia de acessibilidade
- Decide dark/light e direção visual de forma autônoma quando o contexto já for suficiente
- Só pergunta preferência estética quando a ambiguidade realmente mudar a solução
- Carrega `premium-command-center-ui` apenas quando houver pedido explícito de interface operacional premium ou quando essa skill já estiver registrada no PRD

**Como ativar:**
```
/ux-ui
```

**Entrega:** Arquivo `.aios-lite/context/ui-spec.md` com:
- Sistema de design (tokens, cores, tipografia)
- Componentes principais e estados
- Fluxos de navegação
- Checklist de acessibilidade
- Enriquecimento da seção `Identidade visual` do PRD, sem reescrever visão, problema ou usuários

> Se o usuário disser para o agente seguir sozinho, o comportamento esperado é decidir a direção visual com base no contexto do produto e continuar sem abrir questionário de estilo.

---

## @pm

**Quando usar:** Apenas projetos MEDIUM. Ative após @architect e @ux-ui.

**O que faz:**
- Enriquece o PRD vivo com priorização e corte por fase
- Define ordem de entrega sem apagar a intenção original de produto
- Adiciona critérios de aceite compactos quando isso trouxer clareza para execução e QA
- Preserva identidade visual, visão, problema, usuários e demais seções já existentes

**Como ativar:**
```
/pm
```

**Regra de ouro do @pm:** O documento deve ter no máximo 2 páginas. Se passar disso, corte funcionalidades do MVP.

**Entrega:** Atualização do `.aios-lite/context/prd.md` com:
- priorização final do MVP
- plano de entrega por fase
- critérios de aceite compactos
- preservação das seções existentes do PRD base

---

## @orchestrator

**Quando usar:** Sempre útil para gerenciar sessões de trabalho, obrigatório em projetos MEDIUM para paralelismo.

**O que faz:**
- Gerencia o **protocolo de sessão** (início, durante, fim) — define objetivo, acompanha progresso, atualiza spec.md
- Em MEDIUM: lê o `prd.md` e `architecture.md`, cria grafo de dependências e divide em lanes paralelas
- Gerencia progresso via arquivos de status e `shared-decisions.md`

**Comando `*update-spec`:** atualiza `.aios-lite/context/spec.md` com features concluídas, novas decisões e blockers da sessão atual.

**Como ativar:**
```
/orchestrator
```

**Ou via CLI para preparar os arquivos:**
```bash
npx aios-lite parallel:init
npx aios-lite parallel:assign --source=prd --workers=3
npx aios-lite parallel:status
```

**Entrega:**
- `.aios-lite/context/parallel/shared-decisions.md`
- `.aios-lite/context/parallel/agent-1.status.md` (e 2, 3...)
- Cada lane tem seu escopo definido

---

## @squad

**Quando usar:** Quando você quer criar um time de agentes especializados para um domínio específico dentro do projeto.

**O que faz:**
- Pergunta o objetivo e o tipo de trabalho
- Consolida um mini pacote de `discovery/design-doc/readiness` antes de compor a squad
- Gera uma squad modular, não apenas uma pasta de agentes
- Cria `.aios-lite/squads/{squad-slug}/agents/agents.md`
- Cria `.aios-lite/squads/{squad-slug}/squad.manifest.json`
- Cria `.aios-lite/squads/{squad-slug}/docs/design-doc.md`
- Cria `.aios-lite/squads/{squad-slug}/docs/readiness.md`
- Cria executores reais em `.aios-lite/squads/{squad-slug}/agents/`
- Cria um `@orquestrador` próprio para esse squad
- Registra metadata em `.aios-lite/squads/{slug}/squad.md`
- Declara `skills`, `MCPs`, política de `subagentes` e diretório `media/`
- Declara `contentBlueprints` quando a squad for orientada a conteúdo
- Trabalha com autonomia alta por padrão e evita perguntas extras quando a inferência já é suficiente
- Detecta se o pedido parece mais `modo projeto` ou `modo feature`
- Recomenda skills e documentos sob demanda em vez de inflar o contexto inteiro
- Reaproveita skills instaladas em `.aios-lite/squads/{slug}/skills/` antes de criar especializações novas
- Materializa o pacote minimo de contexto da squad para o runtime, dashboard e cloud
- Pode organizar entregáveis estruturados como `content.json + index.html` por `content_key`
- Usa `contentBlueprints` como contrato dinâmico do domínio; o framework fixa a casca do conteúdo, não os campos internos
- Quando o usuário pedir painel local da squad, deve apontar para os comandos oficiais `dashboard:*` do AIOS Lite, não procurar um app manualmente no workspace

**Como ativar:**
```
@squad
```

**Entrega:**
- Manifesto textual da squad
- Manifesto JSON da squad
- Executores reais do squad
- Metadata do squad
- Estrutura de output, logs, mídia e sessão

> Guia completo: [Squad e Genoma](./squad-genoma.md)

---

## @genoma

**Quando usar:** Quando você quer criar uma base de conhecimento de domínio reutilizável e aplicá-la a squads ou agentes específicos.

**O que faz:**
- Gera `O que saber`, `Mentes` e `Skills`
- Pode salvar em `.aios-lite/genomas/`
- Pode ser aplicado depois a um squad já existente
- Atua como camada cognitiva do sistema, não como executor

**Como ativar:**
```
@genoma
```

**Entrega:**
- Genoma estruturado
- Opcionalmente, vínculo persistente com um squad

**Não confundir:**
- `skill` = capacidade operacional
- `genoma` = forma de pensar, lentes e repertório
- `executor` = quem faz o trabalho
- `subagente` = investigação temporária

Quando uma skill vier do catálogo online ou de outro pacote, ela deve ser salva em:
- `.aios-lite/squads/{slug}/skills/{dominio}/{skill-slug}.md`

Depois disso, ela passa a ser parte real do pacote local da squad e deve ser considerada pelos agentes sob demanda.

> Guia completo: [Squad e Genoma](./squad-genoma.md)

---

## @dev

**Quando usar:** Sempre — é o agente que escreve o código.

**O que faz:**
- Lê o contexto, `design-doc.md`, `readiness.md`, discovery, arquitetura e (se existir) `ui-spec`
- Implementa os módulos na ordem correta
- Segue as convenções definidas pelo @architect
- Registra decisões em `shared-decisions.md` (MEDIUM)
- Carrega skills e docs detalhados sob demanda, em vez de inflar contexto inteiro
- Não deve seguir para implementação quando `readiness.md` ainda apontar falta de discovery ou de arquitetura

**Como ativar:**
```
/dev
```

**Princípios que ele aplica em qualquer stack:**
- Isolar lógica de negócio dos handlers de requisição
- Validar input na fronteira do sistema (nunca depois)
- Seguir as convenções nativas do framework do projeto
- Verificar skills disponíveis em `.aios-lite/skills/static/` antes de implementar

**Execução atômica** — O @dev trabalha em passos pequenos e validados, nunca implementa uma feature inteira de uma vez:
1. Declara o próximo passo antes de escrever código
2. Implementa apenas aquele passo
3. Valida antes de avançar — se houver dúvida, pergunta
4. Faz commit do passo funcional antes de seguir
5. Para e reporta se algo der errado — não continua em estado quebrado

**Em projetos com Laravel especificamente:**
- Form Requests para validação (nunca inline no controller)
- Actions para lógica de negócio
- Policies para autorização
- N+1 prevenido com eager loading
- Events + Listeners para side effects

**Entrega:** Código implementado seguindo os padrões definidos pelo @architect, para qualquer stack.

---

## @qa

**Quando usar:** Projetos SMALL e MEDIUM, após @dev.

**O que faz:**
- Revisa o código implementado
- Escreve testes unitários e de integração
- Identifica casos de borda não cobertos
- Valida se os critérios de aceite foram atendidos

**Como ativar:**
```
/qa
```

**Entrega:**
- Suite de testes
- Lista de problemas encontrados
- Relatório de cobertura

---

## Resumo: fluxo por tamanho

### MICRO
```
@setup → @dev
```
Duração típica: minutos a horas. Sem análise, sem arquitetura formal.

### SMALL
```
@setup → @product → @analyst → @architect → @ux-ui → @dev → @qa
```
Duração típica: horas a dias. Análise leve, estrutura clara.

### MEDIUM
```
@setup → @product → @analyst → @architect → @ux-ui → @pm → @orchestrator → @dev → @qa
```
Duração típica: dias a semanas. Análise completa, parallelismo, backlog formal.

---

## Veja também

- [Cenários completos com exemplos práticos](./cenarios.md)
- [Início rápido](./inicio-rapido.md)
- [Guia do engenheiro: pair programming com IA](./guia-engineer.md)
