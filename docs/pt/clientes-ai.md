# Usando AIOSON com diferentes CLIs de IA

O AIOSON funciona com **Claude Code**, **Codex CLI** e **Gemini CLI**. Cada um tem uma forma diferente de ativar agentes — este guia explica como usar cada um sem confusão.

---

## Comparativo rápido

| | Claude Code | Codex CLI | Gemini CLI |
|---|---|---|---|
| Arquivo de config | `CLAUDE.md` | `AGENTS.md` | `.gemini/GEMINI.md` |
| Comandos personalizados | `.claude/commands/` | ❌ não suporta | `.gemini/commands/*.toml` |
| Autocomplete de agentes | `/aioson/` + Tab | ❌ não suporta | `/aios-` + Tab |
| Como ativar agente | `/aioson/setup` | linguagem natural | `/aios-setup` |
| Lê contexto automático | Sim (CLAUDE.md injeta) | Sim (AGENTS.md injeta) | Sim (GEMINI.md injeta) |

---

## Claude Code

### Como funciona

O Claude Code lê `CLAUDE.md` automaticamente ao iniciar. Os agentes do AIOSON ficam em `.claude/commands/aioson/` — isso cria o namespace `/aioson/*` no autocomplete.

### Ativando agentes

Digite `/` para abrir o autocomplete e depois `aioson/`:

```
/aioson/setup
/aioson/analyst
/aioson/architect
/aioson/ux-ui
/aioson/pm
/aioson/dev
/aioson/qa
/aioson/orchestrator
```

### Exemplos de uso

```
/aioson/setup
```
> O agente @setup detecta o framework, faz as perguntas de onboarding e gera o `project.context.md`.

```
/aioson/dev implementar autenticação JWT com refresh token
```
> O agente @dev recebe o argumento como contexto extra e começa a implementação em steps atômicos.

```
/aioson/qa
```
> O agente @qa lê o contexto e sugere um plano de testes para as features implementadas.

### Primeira vez no projeto

Se `project.context.md` não existir, o CLAUDE.md instrui o Claude a rodar `/aioson/setup` automaticamente antes de qualquer outra ação.

---

## Codex CLI (OpenAI)

### Como funciona

O Codex não suporta slash commands personalizados nem autocomplete de comandos. Em vez disso, o AIOSON usa o `AGENTS.md` para injetar contexto — o Codex lê esse arquivo automaticamente e entende quais agentes existem.

**Não espere `/` para aparecer agentes AIOS no Codex** — isso não acontece. Os agentes são invocados via linguagem natural.

### Ativando agentes

Descreva o que você quer e mencione o agente. O Codex lê o `AGENTS.md`, localiza o arquivo do agente correspondente e segue as instruções:

```
use o agente @setup para iniciar o projeto
```

```
ative o @dev para implementar o módulo de autenticação
```

```
use @architect para desenhar a estrutura de pastas do projeto
```

```
activate the @qa agent to write tests for the auth module
```

### Exemplos completos

**Iniciar projeto novo:**
```
use the @setup agent to onboard this project
```

**Implementar feature:**
```
use @dev to implement user registration with email verification, atomic steps
```

**Revisar plano:**
```
use @analyst to analyze the requirements in prd.md and identify gaps
```

**Orquestrar sessão:**
```
activate @orchestrator to plan this session — I want to implement the checkout flow
```

### Como o Codex encontra os agentes

O `AGENTS.md` na raiz do projeto mapeia cada `@agente` para o caminho do arquivo:

```markdown
- @setup → `.aioson/agents/setup.md`
- @dev → `.aioson/agents/dev.md`
...
```

Quando você menciona `@setup`, o Codex lê o arquivo correspondente e segue todas as instruções do agente.

### Dicas para Codex

- **Seja explícito**: `use @dev` funciona melhor que apenas "implemente"
- **Passe contexto**: `use @dev to implement X — read spec.md first`
- **Comece sempre com @setup** se `project.context.md` não existir
- O Codex também lê o contexto do agente selecionado automaticamente via `AGENTS.md`

---

## Gemini CLI

### Como funciona

O Gemini CLI lê `.gemini/GEMINI.md` ao iniciar e reconhece comandos definidos em `.gemini/commands/*.toml`. Os agentes do AIOSON são registrados com o prefixo `aios-`.

### Ativando agentes

Digite `/aios-` para ver os comandos disponíveis no autocomplete:

```
/aios-setup
/aios-analyst
/aios-architect
/aios-ux-ui
/aios-pm
/aios-dev
/aios-qa
/aios-orchestrator
```

### Exemplos de uso

```
/aios-setup
```
> Inicia o onboarding do projeto.

```
/aios-dev
```
> Ativa o agente de desenvolvimento.

```
/aios-orchestrator
```
> Inicia a orquestração da sessão atual.

### Estrutura dos comandos Gemini

Cada arquivo `.gemini/commands/aios-*.toml` aponta para o agente correspondente:

```toml
name = "aios-setup"
description = "Project onboarding"
instruction_file = ".aioson/agents/setup.md"
```

---

## Qual CLI usar?

Não há uma resposta única — depende do seu fluxo de trabalho. Algumas considerações:

| Cenário | Recomendação |
|---|---|
| Quer autocomplete preciso com namespace isolado | Claude Code — `/aioson/*` |
| Prefere conversa natural sem memória de comandos | Codex — `use @dev to...` |
| Já usa Gemini CLI como ferramenta principal | Gemini — `/aios-*` |
| Projeto em equipe com múltiplos CLIs | Todos funcionam — o contexto em `.aioson/` é compartilhado |

### O contexto é o mesmo independente do CLI

Independente de qual CLI você usa, todos leem os mesmos arquivos:

```
.aioson/
  config.md              ← configuração global
  agents/                ← agentes (lidos por qualquer CLI)
  context/
    project.context.md   ← gerado pelo @setup, lido por todos
    spec.md              ← documento vivo, atualizado pelo @orchestrator
```

Você pode começar um projeto com Claude Code, continuar com Codex no dia seguinte, e o contexto persiste — todos os agentes leem o mesmo `project.context.md`.

---

## Atualizar para nova versão

Após `npx @jaimevalasek/aioson@latest update` no projeto, os arquivos de configuração de todos os CLIs são atualizados:

```bash
npx @jaimevalasek/aioson@latest update
```

Isso atualiza:
- `CLAUDE.md` e `.claude/commands/aioson/`
- `AGENTS.md`
- `.gemini/GEMINI.md` e `.gemini/commands/`
- Todos os agentes em `.aioson/agents/`
