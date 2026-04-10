# 75. AIOS Lite Dashboard + Agent OS

> Blueprint de arquitetura para um painel separado do `aios-lite`, com foco em observabilidade, squads como apps e evolução futura para integração com Makopy.

---

## Objetivo

Criar um projeto separado chamado `aios-lite-dashboard` para observar o que o `aios-lite` já produz localmente:

- squads
- agentes oficiais e dinâmicos
- sessões
- outputs HTML
- logs
- status paralelo
- genomas

O dashboard **não executa** os agentes. Ele:

- indexa artefatos do projeto
- apresenta estado e histórico
- oferece navegação visual por apps
- abre outputs e logs
- prepara o terreno para sync remoto de genomas

---

## Princípio central

Seguir a mesma lógica que aparece no ecossistema AIOX:

- CLI first
- observability second
- UI third

No `aios-lite`, isso significa:

- o CLI continua leve
- o dashboard nasce como projeto separado
- a UI observa o filesystem e o índice local

---

## Nome recomendado

Projeto:

```text
../aios-lite-dashboard
```

Nome de produto:

```text
AIOS Lite Dashboard
```

Direção visual:

```text
Agent OS
```

---

## O que é Agent OS

`Agent OS` não é uma cópia literal de macOS.

É uma metáfora de workspace com:

- apps
- busca global
- área de trabalho operacional
- navegação por contexto
- sensação de sistema vivo

Sem copiar:

- Finder
- barras exageradas
- animações desnecessárias
- chrome excessivo

O foco é:

- clareza
- densidade útil
- visão operacional
- acesso rápido a squads, agentes e outputs

---

## Modelo de navegação

### Apps fixos

- `Overview`
- `Squads`
- `Agents`
- `Outputs`
- `Logs`
- `Genomes`
- `Settings`

### Apps dinâmicos

Cada squad criado pelo usuário vira um app.

Exemplos:

- `Youtube Creator`
- `Prospecção B2B`
- `Lançamento de Curso`

Ao abrir um app de squad, o usuário entra no workspace daquele squad.

---

## Estrutura interna do app de squad

Cada squad-app deve ter estas seções:

- `Resumo`
- `Agentes`
- `Sessões`
- `Outputs`
- `Logs`
- `Genomas`

### Resumo

Mostra:

- nome do squad
- objetivo
- última sessão
- último output HTML
- quantidade de agentes
- genomas vinculados
- atividade recente

### Agentes

Lista os agentes do squad em cards.

Cada card mostra:

- nome
- papel
- status atual
- último evento
- última execução
- último output
- botões `Output` e `Logs`

### Sessões

Mostra:

- lista de sessões
- timeline resumida
- status por sessão
- data da última atividade

### Outputs

Mostra:

- outputs HTML
- drafts Markdown
- preview
- botão para abrir em nova aba

### Logs

Mostra:

- logs técnicos
- eventos recentes
- execução por agente
- erros e warnings

### Genomas

Mostra:

- genomas aplicados ao squad
- genomas aplicados por agente
- origem local ou remota

---

## Stack recomendada

### MVP

- `Next.js`
- `Tailwind CSS`
- `TypeScript`
- `SQLite`
- `better-sqlite3`
- `zod`
- `chokidar`

### Posterior

- `ws` ou `SSE`
- auth local se necessário
- sync remoto com Makopy

### Não usar no MVP

- Bun obrigatório
- server separado para eventos
- engine de janelas complexa
- microfrontends

O MVP deve rodar com:

```text
Node.js + Next.js + SQLite
```

---

## Estrutura sugerida do projeto

```text
aios-lite-dashboard/
  app/
    (shell)/
      page.tsx
      squads/
        page.tsx
        [slug]/
          page.tsx
      agents/
        page.tsx
      outputs/
        page.tsx
      logs/
        page.tsx
      genomes/
        page.tsx
      settings/
        page.tsx
  components/
    shell/
    cards/
    charts/
    squads/
    agents/
    outputs/
  lib/
    db/
      schema.ts
      client.ts
      queries.ts
    indexer/
      filesystem.ts
      ingest.ts
      watch.ts
    domain/
      squads.ts
      agents.ts
      outputs.ts
      genomes.ts
  public/
  data/
    dashboard.sqlite
  package.json
```

---

## Modelo SQLite inicial

### Tabela `projects`

- `id`
- `name`
- `root_path`
- `created_at`
- `updated_at`

### Tabela `squads`

- `id`
- `project_id`
- `slug`
- `name`
- `goal`
- `metadata_path`
- `agents_dir`
- `output_dir`
- `logs_dir`
- `latest_html`
- `created_at`
- `updated_at`

### Tabela `agents`

- `id`
- `project_id`
- `squad_id` nullable
- `slug`
- `name`
- `role`
- `source_type` (`official` | `squad`)
- `file_path`
- `status`
- `last_event`
- `last_output_path`
- `updated_at`

### Tabela `sessions`

- `id`
- `project_id`
- `squad_id`
- `session_key`
- `title`
- `status`
- `started_at`
- `updated_at`

### Tabela `outputs`

- `id`
- `project_id`
- `squad_id` nullable
- `agent_id` nullable
- `session_id` nullable
- `kind` (`html` | `markdown`)
- `title`
- `file_path`
- `created_at`

### Tabela `logs`

- `id`
- `project_id`
- `squad_id` nullable
- `agent_id` nullable
- `session_id` nullable
- `level`
- `message`
- `file_path`
- `created_at`

### Tabela `events`

- `id`
- `project_id`
- `squad_id` nullable
- `agent_id` nullable
- `session_id` nullable
- `event_type`
- `payload_json`
- `created_at`

### Tabela `genomes`

- `id`
- `project_id` nullable
- `slug`
- `name`
- `source` (`local` | `makopy`)
- `file_path` nullable
- `remote_id` nullable
- `updated_at`

### Tabela `squad_genomes`

- `id`
- `squad_id`
- `genome_id`

### Tabela `agent_genomes`

- `id`
- `agent_id`
- `genome_id`

---

## O que indexar do projeto

O dashboard deve observar:

```text
agents/
output/
aios-logs/
.aios-lite/squads/
.aios-lite/genomas/
.aios-lite/context/parallel/
```

### Fontes principais

- `agents/` → agentes dinâmicos e squads
- `.aios-lite/squads/` → metadata do squad
- `output/` → outputs HTML e drafts
- `aios-logs/` → logs e histórico
- `.aios-lite/context/parallel/` → lanes e status
- `.aios-lite/genomas/` → genomas locais

---

## Estratégia de indexação

### Boot

No startup:

1. localizar o projeto alvo
2. ler diretórios principais
3. popular SQLite
4. montar estado inicial do dashboard

### Watch

Depois:

1. observar alterações com `chokidar`
2. reindexar apenas o necessário
3. atualizar SQLite
4. refletir no dashboard

### Regra

O filesystem é a fonte primária.
O SQLite é um índice local para busca, histórico e renderização rápida.

---

## Visão geral das telas

### 1. Overview

Mostra:

- total de squads
- total de agentes
- sessões recentes
- outputs recentes
- logs recentes
- genomas disponíveis
- atividade em andamento

### 2. Squads

Grid de squads.

Cada card mostra:

- nome
- objetivo
- quantidade de agentes
- última atividade
- último output
- botão `Abrir`

### 3. Squad Page

Página central do Agent OS.

Mostra:

- resumo
- cards de agentes
- sessões recentes
- outputs
- logs
- genomas

### 4. Agents

Lista de agentes:

- oficiais
- de squads

Filtro por:

- tipo
- squad
- status

### 5. Outputs

Lista/timeline dos artefatos:

- HTML
- Markdown
- recente
- por squad
- por agente

### 6. Logs

Visão de:

- logs recentes
- erros
- warnings
- atividade por agente

### 7. Genomes

Biblioteca de genomas:

- locais
- remotos
- vinculados a squads
- vinculados a agentes

---

## Direção visual do Agent OS

### Posição

Não copiar macOS literalmente.

Usar:

- shell inspirado em desktop
- dock ou launcher discreto
- busca global
- painéis ricos
- dark premium sóbrio

### Linguagem visual

- fundo grafite
- superfícies em 2 ou 3 níveis
- bordas suaves
- contraste controlado
- 1 acento principal
- motion curto e sutil

### Evitar

- neon
- glow forte
- arco-íris de cards
- blur excessivo
- dock caricata
- janelas flutuantes sem necessidade

---

## Integração futura com Makopy

Makopy entra como fonte remota de genomas.

### Cenário

- projeto A cria genoma local
- usuário publica ou sincroniza no Makopy
- projeto B conecta no mesmo Makopy
- projeto B reaproveita o genoma remoto

### Regra de modelagem

Genoma deve ter origem:

- `local`
- `makopy`

O dashboard precisa exibir:

- nome
- origem
- squads que usam
- agentes que usam
- data da última sync

---

## Integração com o CLI do aios-lite

O `aios-lite` não deve incorporar dependências pesadas do dashboard.

Em vez disso, pode ganhar comandos opcionais:

```bash
aios-lite dashboard:init
aios-lite dashboard:dev
aios-lite dashboard:open
```

### Comportamento esperado

#### `dashboard:init`

- instala ou clona o dashboard
- cria config
- aponta para o projeto atual

#### `dashboard:dev`

- inicia servidor local
- usa porta `3000`

#### `dashboard:open`

- abre `http://localhost:3000`

---

## Fases recomendadas

### Fase 1 — MVP observável

- projeto separado
- SQLite local
- leitura de filesystem
- telas `Overview`, `Squads`, `Squad Page`, `Outputs`

### Fase 2 — atividade viva

- watcher
- atualização automática
- logs e eventos recentes

### Fase 3 — genomas remotos

- sync com Makopy
- biblioteca remota
- vínculos locais/remotos

### Fase 4 — Agent OS expandido

- busca global
- command palette
- notificações
- multitarefa visual melhor

---

## Decisões importantes

### 1. Squad como app

Sim. Cada squad vira um app.

Isso torna a navegação:

- útil
- intuitiva
- coerente com a estrutura real do sistema

### 2. Dashboard separado do core

Sim. Isso mantém o `aios-lite` leve.

### 3. SQLite no dashboard, não no core

Sim. O core continua baseado em arquivos.
O dashboard usa SQLite como índice local.

### 4. Mac-like só como referência

Sim. Inspiração, não cópia.

---

## Próximo passo de implementação

Depois deste blueprint, a sequência recomendada é:

1. criar `../aios-lite-dashboard`
2. subir stack `Next.js + Tailwind + SQLite`
3. implementar indexador do projeto
4. criar `Overview`
5. criar `Squads`
6. criar a página de um squad-app
7. só depois adicionar watcher e Makopy

---

## Conclusão

O `aios-lite-dashboard` deve nascer como:

- observador do `aios-lite`
- painel operacional
- shell de navegação por apps
- base para Agent OS

E não como:

- clone de macOS
- substituto do CLI
- app pesado que complica a fundação do produto

Esse desenho é forte, escalável e mantém o core limpo.
