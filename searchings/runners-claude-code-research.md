# Research — Runners para Claude Code e AI Agents

> **Data:** 2026-04-02
> **Origem:** pesquisa web + análise do vídeo do Alan (IOX) + leak do Claude Code
> **Propósito:** embasar decisão de implementação de runners no AIOSON

---

## O que é um "runner"?

Um runner é qualquer script, processo ou framework que **executa um agente de IA de forma autônoma** — tipicamente em background, em loop, em fila ou em paralelo — sem interação humana constante.

É a camada entre "o humano digita um prompt" e "o agente trabalha até terminar". Ele gerencia:
- Lançar `claude -p "..."` como subprocess (headless mode)
- Alimentar o agente com context/prompts de uma fila ou arquivo
- Coletar output (stdout, stream-json)
- Decidir se a tarefa terminou ou se deve retry/loop/escalar
- Gerenciar worktrees, locks e paralelismo opcionalmente

O runner mais simples é um script bash com `while` loop. O mais complexo são plataformas de orquestração multi-agente.

---

## Primitivos do Claude Code para runners

### Headless mode (`-p` / `--print`)
```bash
claude -p "Fix auth.py" --allowedTools "Read,Edit,Bash"
claude -p "Summarize this" --output-format stream-json
cat error.log | claude -p "explain this error"
```
Este é o primitivo core de todos os runners.

### `--dangerously-skip-permissions` (YOLO mode)
- Bypassa todos os prompts de permissão — execução totalmente sem supervisão
- Todos os subagentes herdam esse setting (não pode ser overridden por subagente)
- Hooks `PreToolUse` ainda disparam — recomendado como guardrail
- **Bug conhecido**: não bypassa o prompt de write em `~/.claude/` (GitHub issue #35718)
- Anthropic recomenda usar apenas em containers isolados/throwaway VMs

### Auto Mode (lançado 24 março 2026)
- Meio-termo mais seguro: classificador baseado em modelo avalia cada ação antes de executar
- Defesa de 2 camadas: probe de prompt injection (input) + classificador de transcript (output)
- Escalação: 3 negativas consecutivas OU 20 totais → processo termina em headless mode
- **Esta é a abordagem recomendada para runners em 2026**

### `--output-format stream-json`
- Output machine-parseable como stream de JSON
- Permite ao runner detectar `TASK_COMPLETE`, erros, tool calls, etc.

---

## Agent Teams / Swarm Mode (oficial desde fev 2026)

**Habilitando:**
```bash
export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1
# ou em settings.json:
{ "env": { "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1" } }
```
Requer Claude Code v2.1.32+. Disponível em planos Team e Enterprise.

**Arquitetura:**
- **Team lead**: cria time, atribui tasks, sintetiza resultados
- **Teammates**: instâncias independentes de Claude Code, cada uma com 1M tokens de contexto próprio
- **Shared task list** com rastreamento de dependências e auto-desbloqueio
- **Mailbox system**: mensagens diretas entre agentes via caixa de entrada
- Storage: `~/.claude/teams/{team-name}/` e `~/.claude/tasks/{team-name}/`

**Backends de spawn:**
```bash
CLAUDE_CODE_SPAWN_BACKEND=in-process   # mais rápido, padrão
CLAUDE_CODE_SPAWN_BACKEND=tmux         # panes visíveis no terminal
```

**Limitações:**
- Sem session resumption (teammates perdidos no `/resume`)
- Sem nested teams (teammates não podem spawn sub-teams)
- Um time por sessão
- Alto consumo de tokens — melhor para tasks complexas de alto valor

**Env vars:** `CLAUDE_CODE_TEAM_NAME`, `CLAUDE_CODE_AGENT_ID`, `CLAUDE_CODE_AGENT_TYPE`

---

## Projetos open source relevantes (abril 2026)

### Runners / Loop Orchestrators

| Projeto | URL | Descrição |
|---|---|---|
| **ralph-orchestrator** | github.com/mikeyobrien/ralph-orchestrator | Rust, 7 backends de AI, Hat System para personas, TUI, `--max-iterations`, `--max-cost`, usa `TASK_COMPLETE` como marker |
| **ralphex** | github.com/umputun/ralphex | CLI para git repos; roda Claude Code contra implementation plan; cada task em sessão fresca |
| **ralph-ai-tui** | github.com/syntax-syndicate/ralph-ai-tui | TUI loop orchestrator conectando Claude Code, OpenCode, Factory Droid a task trackers |
| **awesome-ralph** | github.com/snwfdhmp/awesome-ralph | Lista curada do ecossistema Ralph loop |

O **"Ralph loop"** é um padrão onde o runner chama o agente continuamente contra um task file até aparecer um completion marker ou atingir limites. Tem ecossistema próprio crescendo.

### Multi-Agent Farm / Parallel Runners

| Projeto | URL | Descrição |
|---|---|---|
| **claude_code_agent_farm** | github.com/Dicklesworthstone/claude_code_agent_farm | 20–50 agentes Claude Code em paralelo, coordenação por lock files, monitoramento tmux em tempo real, 34 stacks |
| **1code** | github.com/21st-dev/1code | Message queue para prompts, execução em background, worktree isolation por sessão |
| **ruflo** | github.com/ruvnet/ruflo | Multi-agent swarm platform; integração nativa de Agent Teams; context autopilot; integração com LiteLLM para 100+ providers |
| **OpenSwarm** | github.com/Intrect-io/OpenSwarm | Múltiplas instâncias de Claude Code como agentes autônomos pegando issues do Linear; pipelines Worker/Reviewer; reporting via Discord; memória com LanceDB |

### Multi-LLM Cascade / Fallback / Routers

| Projeto | URL | Descrição |
|---|---|---|
| **claude-code-router** | github.com/musistudio/claude-code-router | Rota requests para diferentes modelos/providers (OpenRouter, DeepSeek, Ollama, Gemini, etc.) |
| **claude-router** | github.com/0xrdan/claude-router | Roteia para modelo Claude ótimo (Haiku/Sonnet/Opus) por complexidade; classificação baseada em regras sem latência; redução de custo alegada de 80% |
| **claude-code-agent-sdk-router** | github.com/sarukas/claude-code-agent-sdk-router | Router mínimo e auditável para Anthropic + OpenRouter + Gemini + OpenAI + Groq + Mistral + Ollama |
| **claude-code-open** | github.com/Davincible/claude-code-open | Go-based production proxy; drop-in replacement suportando OpenRouter, Gemini, Kimi K2 |
| **CLIProxyAPI** | github.com/router-for-me/CLIProxyAPI | Encapsula Gemini CLI, Claude Code, Codex, Qwen Code como API compatível com OpenAI; load balancing, fallback, retries |
| **ruflo + LiteLLM** | github.com/ruvnet/ruflo/wiki/litellm-integration | LiteLLM como gateway universal; chains de fallback em 100+ providers |

### Reimplementações open source do Claude Code (pós-leak, abril 2026)

| Projeto | URL | Descrição |
|---|---|---|
| **nano-claude-code** | github.com/SafeRL-Lab/nano-claude-code | ~2000 linhas Python; Claude, GPT, Gemini, DeepSeek, Qwen, Ollama |
| **openclaude** | github.com/Gitlawb/openclaude | Shim compatível com OpenAI; 200+ modelos; todas as tools do Claude Code preservadas |
| **learn-claude-code** | github.com/shareAI-lab/learn-claude-code | "Bash is all you need" — harness mínimo construído do zero |

### Recursos de descoberta

- **awesome-claude-code**: github.com/hesreallyhim/awesome-claude-code — lista curada autoritativa de skills, hooks, orchestrators, plugins
- **wshobson/agents**: github.com/wshobson/agents — 112 agentes especializados, 16 orchestrators, 146 skills

---

## Padrões técnicos chave para implementação de runners

**Completion signaling**: runners usam um marker `TASK_COMPLETE` no output do Claude para detectar conclusão — não precisam só de contagem de iterações.

**Context management**: `autoCompact()` roda automaticamente; `MAX_CONSECUTIVE_AUTOCOMPACT_FAILURES = 3` previne retries infinitos.

**Worktree isolation**: git worktrees são o padrão para runners de agentes paralelos evitarem conflitos de arquivo.

**Lock files**: usados por runners estilo agent_farm para prevenir dois agentes escrevendo o mesmo arquivo simultaneamente.

**Hook-based guardrails**: hooks `PreToolUse` disparam mesmo em modo `bypassPermissions` — é o net de segurança recomendado para runners.

**KAIROS mode**: feature flag não lançada encontrada no código vazado, descrita como modo de agente autônomo com skill `/dream` para destilação noturna de memória.

---

## Env vars e flags chave

| Parâmetro | Propósito |
|---|---|
| `claude -p "..."` | Execução headless/não-interativa (primitivo core do runner) |
| `--dangerously-skip-permissions` | Bypass de todos os prompts de permissão |
| `--permission-mode bypassPermissions` | Equivalente ao acima |
| `--output-format stream-json` | Output machine-parseable |
| `--allowedTools "Read,Edit,Bash"` | Restringir acesso a tools por invocação |
| `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` | Habilitar Agent Teams / swarm mode |
| `CLAUDE_CODE_SPAWN_BACKEND=tmux` | Usar tmux para panes visíveis |

---

## Fontes

- Claude Code Docs: headless mode, auto mode, agent teams, permission modes
- github.com/Dicklesworthstone/claude_code_agent_farm
- github.com/21st-dev/1code
- github.com/ruvnet/ruflo
- github.com/mikeyobrien/ralph-orchestrator
- github.com/musistudio/claude-code-router
- github.com/hesreallyhim/awesome-claude-code
- VentureBeat, Engineers Codex, MindStudio — análises do leak de março 2026
- Boris Cherny (Anthropic) — anúncio Agent Teams fev 2026
