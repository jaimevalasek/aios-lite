# Sistema de Skills do AIOSON

O AIOSON possui um sistema de skills que fornece convenções, padrões e referências específicas por framework, design system ou domínio técnico. As skills são carregadas sob demanda pelos agentes conforme o contexto do projeto.

## Tipos de skills

### Skills gerenciadas (`.aioson/skills/`)

Distribuídas automaticamente pelo CLI durante `aioson init` ou `aioson update`. São **gitignored** — não versionadas com o projeto, pois o CLI as mantém atualizadas.

Estrutura:

```
.aioson/skills/
├── static/          ← convenções e padrões por framework
│   ├── laravel-conventions.md
│   ├── tall-stack-patterns.md
│   ├── jetstream-setup.md
│   ├── filament-patterns.md
│   ├── flux-ui-components.md
│   ├── django-patterns.md
│   ├── fastapi-patterns.md
│   ├── rails-conventions.md
│   ├── nextjs-patterns.md
│   ├── react-motion-patterns.md
│   ├── node-express-patterns.md
│   ├── node-typescript-patterns.md
│   ├── web3-ethereum-patterns.md
│   ├── web3-solana-patterns.md
│   ├── web3-cardano-patterns.md
│   └── web3-security-checklist.md
├── dynamic/         ← referências consultadas via web quando necessário
│   ├── laravel-docs.md
│   ├── flux-ui-docs.md
│   ├── npm-packages.md
│   ├── ethereum-docs.md
│   ├── solana-docs.md
│   └── cardano-docs.md
├── design/          ← design systems visuais
│   ├── cognitive-core-ui/
│   ├── interface-design/
│   └── premium-command-center-ui/
└── process/         ← metodologia de fluxo e contratos entre agentes
    └── aioson-spec-driven/
```

**Carregamento condicional:** O agente `@dev` carrega apenas as skills que correspondem ao valor de `framework` em `project.context.md`. Exemplo: se `framework=Laravel`, carrega `laravel-conventions.md` e opcionalmente `tall-stack-patterns.md` se o stack for TALL.

**Process skills** são carregadas pelos agentes de spec (`@product`, `@analyst`, `@architect`, `@sheldon`, `@dev`, `@deyvin`) no início de sessões de especificação, requirements e design — nunca todas de uma vez. Cada agente carrega o `SKILL.md` central e depois apenas o arquivo de `references/` relevante para sua fase atual.

### Skills instaladas (`.aioson/installed-skills/`)

Skills de terceiros instaladas pelo usuário. São **versionadas com o projeto** (não gitignored), permitindo que toda a equipe use as mesmas skills.

Cada skill instalada contém um `SKILL.md` com frontmatter YAML descrevendo quando usá-la.

## Instalando skills

### Via npm (pacotes públicos)

```bash
aioson skill:install @tech-leads-club/agent-skills --skill coupling-analysis
```

Isso:
1. Baixa o pacote npm temporariamente
2. Copia a skill para `.aioson/installed-skills/{nome}/`
3. Distribui para ferramentas nativas (`.claude/skills/`, `.cursor/skills/`, `.windsurf/skills/`)
4. Registra a skill na seção "Installed skills" do `AGENTS.md`

### Via aioson.com (registry cloud)

```bash
aioson skill:install cloud:nome-da-skill
```

Requer autenticação com `aioson auth:login`. Busca skills publicadas no marketplace do aioson.com.

### Via arquivo local

```bash
aioson skill:install ./caminho/para/skill/
```

Copia o diretório da skill diretamente para `.aioson/installed-skills/`.

## Gerenciando skills

### Listar skills instaladas

```bash
aioson skill:list
```

Mostra todas as skills em `.aioson/installed-skills/` com nome, descrição e fonte.

### Remover uma skill

```bash
aioson skill:remove nome-da-skill
```

Remove de `.aioson/installed-skills/` e de todos os diretórios de ferramentas (`.claude/skills/`, `.cursor/skills/`, `.windsurf/skills/`).

## Compatibilidade com ferramentas

As skills instaladas são distribuídas automaticamente para as ferramentas de IA suportadas:

| Ferramenta | Diretório | Como acessa |
|------------|-----------|-------------|
| Claude Code | `.claude/skills/` | Acesso direto por path |
| Cursor | `.cursor/skills/` | Acesso direto por path |
| Windsurf | `.windsurf/skills/` | Acesso direto por path |
| Codex | `AGENTS.md` | Via referência `@slug` no arquivo AGENTS.md |
| Gemini CLI | `.aioson/installed-skills/` | Acesso direto por path |

### Nota sobre gitignore

Mesmo que `.aioson/skills/` esteja no gitignore, todas as ferramentas (Claude Code, Gemini CLI, Codex) conseguem ler os arquivos via path direto no filesystem. O gitignore afeta apenas a descoberta automática do Codex via `@` — mas como as skills são referenciadas por path explícito nos agentes, isso não é um problema.

## Mapeamento framework → skill

O agente `@dev` usa o valor de `framework` do `project.context.md` para decidir quais skills carregar:

| Framework | Skill estática | Referência dinâmica |
|-----------|---------------|---------------------|
| Laravel | `laravel-conventions.md` | `laravel-docs.md` |
| Laravel + TALL | + `tall-stack-patterns.md` | |
| Laravel + Jetstream | + `jetstream-setup.md` | |
| Laravel + Filament | + `filament-patterns.md` | |
| Laravel + Flux UI | + `flux-ui-components.md` | `flux-ui-docs.md` |
| Django | `django-patterns.md` | |
| FastAPI | `fastapi-patterns.md` | |
| Rails | `rails-conventions.md` | |
| Next.js | `nextjs-patterns.md` | `npm-packages.md` |
| React | `react-motion-patterns.md` | `npm-packages.md` |
| Express / Fastify | `node-express-patterns.md` | `npm-packages.md` |
| Node.js + TypeScript | `node-typescript-patterns.md` | `npm-packages.md` |

Para projetos Web3, skills adicionais são carregadas conforme `web3_networks`:

| Rede | Skill estática | Referência dinâmica |
|------|---------------|---------------------|
| Ethereum | `web3-ethereum-patterns.md` | `ethereum-docs.md` |
| Solana | `web3-solana-patterns.md` | `solana-docs.md` |
| Cardano | `web3-cardano-patterns.md` | `cardano-docs.md` |

## Skills de design

Skills de design são especiais — apenas **uma** pode estar ativa por projeto, definida pelo campo `design_skill` em `project.context.md`. O agente `@dev` aplica exclusivamente o design system selecionado, sem misturar padrões de outros sistemas.

Skills de design disponíveis:
- `cognitive-core-ui` — UI com foco cognitivo
- `interface-design` — Design de interfaces (dashboards, apps, ferramentas)
- `premium-command-center-ui` — UI premium para command centers

## Skills de processo

Skills de processo ensinam os agentes **como as fases do AIOSON se conectam** — não o que implementar, mas como sequenciar, quando aprofundar e como fazer handoff limpo entre agentes.

Diferente das skills de framework (que são por stack) e das skills de design (que são por sistema visual), process skills são transversais: carregadas por qualquer agente de spec conforme a fase em que ele se encontra.

### `aioson-spec-driven`

Localização: `.aioson/skills/process/aioson-spec-driven/`

A skill central de metodologia do AIOSON. Cobre:

- **Sequência de fases** — quais fases existem, quais artefatos cada uma produz e quem é o agente responsável
- **Profundidade por classificação** — MICRO usa fluxo mínimo, SMALL usa fluxo padrão, MEDIUM usa pacote completo
- **Gates de aprovação** — Gate A (requirements), Gate B (design), Gate C (plan) — critérios do que deve estar pronto antes de avançar para a próxima fase
- **Hardening lane** — como identificar quando um input ainda está em modo "exploratório/vibe" e o que fazer para convertê-lo em spec executável
- **Manutenção e estado** — como escrever checkpoints úteis em `spec-{slug}.md` para que qualquer agente ou sessão futura possa retomar sem redescobrir o que já foi decidido

**Estrutura:**

```
.aioson/skills/process/aioson-spec-driven/
├── SKILL.md                          ← entry point curto — carregue sempre primeiro
└── references/
    ├── artifact-map.md               ← qual artefato fica onde e quem é o dono
    ├── classification-map.md         ← profundidade de fase por MICRO/SMALL/MEDIUM
    ├── approval-gates.md             ← critérios dos Gates A, B e C
    ├── hardening-lane.md             ← quando endurecer vs quando explorar
    └── maintenance-and-state.md      ← como escrever spec e checkpoints úteis
```

**Carregamento:** Os agentes `@product`, `@analyst`, `@architect`, `@sheldon`, `@dev` e `@deyvin` verificam automaticamente se esta skill está disponível e carregam `SKILL.md` + apenas o arquivo de `references/` relevante para a fase atual. Nunca carregam a pasta inteira de uma vez.

## Skills de squad

Squads podem ter suas próprias skills em `.aioson/squads/{squad-slug}/skills/`. Essas são carregadas automaticamente quando a tarefa pertence ao escopo do squad.

## Criando skills

Uma skill é um diretório com pelo menos um arquivo `SKILL.md` contendo:

```markdown
---
name: nome-da-skill
description: Descrição curta do que a skill faz
triggers:
  - quando usar esta skill
  - outro cenário de uso
---

# Nome da Skill

Conteúdo da skill com convenções, padrões, exemplos de código, etc.
```

O frontmatter `description` e `triggers` são usados pelos agentes para decidir se devem carregar a skill para a tarefa atual.
