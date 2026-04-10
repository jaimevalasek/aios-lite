# Project Brief — aios-artisan

> Interface visual para orquestrar AIOS Forge, squads e runtime com o mesmo resultado estrutural do terminal
> Status: visão definida — candidata forte para evolução do dashboard

---

## O que é

`aios-artisan` é a ideia de uma camada visual que permita operar o ecossistema
do `aios-forge` sem depender exclusivamente do terminal, mas preservando o
mesmo contrato de projeto:

- `.aios-forge/`
- `output/`
- `aios-logs/`
- runtime local / SQLite
- squads, manifests, pipelines e artifacts

O usuário pode continuar usando terminal, mas também pode iniciar e acompanhar
operações por interface.

---

## Insight principal

O produto precisa separar claramente duas dimensões:

- `LLM provider`
  Ex.: OpenAI, Anthropic, Gemini API, DeepSeek, Groq, Mistral, Ollama
- `Executor`
  Ex.: Codex CLI, Claude Code, Gemini CLI

Provider não substitui executor.
Provider serve para recursos first-party do produto.
Executor serve para trabalho operacional real no projeto: arquivos, comandos,
sessões, execução assistida e geração concreta de artefatos.

---

## Visão do produto

O dashboard pode evoluir de observabilidade para plano de controle local.

Fluxo desejado:

```text
Usuário seleciona um projeto no dashboard
    ↓
Dashboard detecta contexto local (.aios-forge, squads, runtime, outputs)
    ↓
Usuário escolhe uma ação visual
    ├─ scan:project
    ├─ setup:context
    ├─ criar / operar squads
    ├─ rodar pipeline
    └─ acompanhar runtime
    ↓
Camada de orquestração aciona o core do aios-forge
    ↓
Se a ação for first-party, usa provider configurado
Se a ação exigir execução real, usa executor configurado
    ↓
Resultado é gravado no mesmo contrato do terminal
```

Meta do produto:

- funcionar por interface
- continuar funcionando por terminal
- produzir os mesmos arquivos e estados do projeto
- evitar criar dois sistemas paralelos incompatíveis

---

## Problema que resolve

Hoje o AIOS Forge depende majoritariamente de CLIs externos:

- Codex CLI
- Claude Code
- Gemini CLI

Isso funciona para usuários técnicos, mas cria fricção para:

- usuários que preferem interface
- times que querem operar squads visualmente
- observação e disparo centralizado de tarefas
- onboarding de projetos sem depender de prompts soltos no terminal

Ao mesmo tempo, o dashboard já possui:

- seleção de projeto
- settings
- runtime / observabilidade
- contexto de squads
- configuração global de providers

Falta transformar isso em uma interface de execução e orquestração.

---

## Regras de arquitetura

### 1. O core deve ser único

O terminal e a interface não podem implementar lógicas separadas.
O correto é:

- `aios-forge core`
- `CLI adapter`
- `Dashboard adapter`

Ambos chamam a mesma camada central.

### 2. O dashboard não deve apenas "simular terminal"

A interface deve acionar operações estruturadas do core, e não depender de
emular texto de terminal sempre que possível.

### 3. Providers e executores precisam continuar separados

Exemplos:

- `scan:project` pode usar um provider como DeepSeek ou OpenAI
- uma execução real de squad pode exigir Codex CLI ou Claude Code

### 4. O projeto precisa manter configuração local

`aios-forge-models.json` deve existir como configuração por projeto.

O dashboard já possui uma configuração global em `.env.local` para uso do
Artisan e recursos próprios.

Direção recomendada:

- `global`: providers do dashboard / artisan
- `project`: providers do projeto AIOS Forge

O dashboard deve mostrar ambos os escopos quando houver projeto selecionado.

---

## Escopos de configuração

### Configuração global

Usada para:

- Artisan
- recursos globais do dashboard
- automações não vinculadas a um projeto específico

### Configuração do projeto

Usada para:

- `scan:project`
- recursos first-party do `aios-forge` naquele projeto
- futuras automações ligadas ao projeto, squad ou runtime

O arquivo local do projeto deve ser editável pela interface com UX parecida com
`Provedores de LLM`, mas sem remover o escopo global.

---

## Hipótese importante sobre squads

No estado atual, squads não usam diretamente `aios-forge-models.json` como
fonte primária de execução. Elas dependem principalmente de executores e da
estrutura do projeto.

Mas faz sentido que, no futuro, a configuração local do projeto também sirva
para:

- generators first-party
- síntese e análise contextual
- assistentes internos do runtime
- automações complementares da squad

Ou seja:

- `LLMs do projeto` não precisam começar como "motor principal da squad"
- mas devem virar a base dos recursos first-party ligados ao projeto

---

## Componentes sugeridos

```text
Dashboard
  ├─ project selector
  ├─ settings: global + project
  ├─ artisan interface
  ├─ squad orchestration
  ├─ runtime observer
  └─ action launcher

AIOS Forge core
  ├─ install / setup / scan
  ├─ squads
  ├─ pipelines
  ├─ runtime
  └─ manifests / outputs

Provider adapters
  ├─ openai
  ├─ anthropic
  ├─ gemini
  ├─ deepseek
  ├─ groq
  ├─ mistral
  └─ ollama / outros

Executor adapters
  ├─ codex-cli
  ├─ claude-code
  └─ gemini-cli
```

---

## MVP recomendado

### Fase 1 — dashboard como painel operacional de projeto

- detectar projeto selecionado
- ler `aios-forge-models.json`
- editar providers locais do projeto via interface
- disparar `scan:project`
- mostrar logs, status e artefatos gerados

### Fase 2 — AIOS Artisan visual

- interface para ações first-party
- histórico das ações executadas
- seleção explícita de provider por ação
- fallback entre config local e global

### Fase 3 — orquestração de squads por interface

- iniciar tarefas de squad
- acompanhar progresso no runtime
- disparar executores configurados
- visualizar artifacts e outputs no mesmo fluxo

---

## Decisões que precisam ser tomadas

### Nome do produto

Opções:

- `AIOS Artisan`
- `AIOS Forge Dashboard`
- `AIOS Control Plane`

`AIOS Artisan` é bom para comunicar interface de trabalho assistido.

### Fonte de verdade dos providers do projeto

Recomendação:

- manter `aios-forge-models.json`
- evoluir o formato para ficar compatível com a UI do dashboard

### Compatibilidade entre catálogos de providers

Hoje há divergência entre dashboard e CLI.
Antes da unificação de UX, precisa alinhar:

- providers suportados
- modelos default
- campos opcionais
- convenção de base URL

---

## Riscos

- tentar substituir cedo demais os executores CLI por provider API
- criar lógica duplicada entre terminal e dashboard
- misturar config global com config de projeto
- acoplar o CLI ao código interno do dashboard
- prometer "mesmo resultado do terminal" sem compartilhar o mesmo core

---

## Direção recomendada

O dashboard deve virar o plano de controle visual do `aios-forge`.

Mas ele deve fazer isso:

- reaproveitando o core do `aios-forge`
- mantendo terminal e interface como modos equivalentes
- separando provider de executor
- preservando configuração global e configuração local por projeto

Essa abordagem permite suportar os dois mundos sem fragmentar o produto.
