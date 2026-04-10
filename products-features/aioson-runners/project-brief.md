# Feature Brief — AIOSON Runners

> **Status:** Proposta para análise futura
> **Data:** 2026-04-02
> **Origem:** análise do vídeo IOX sobre leak do Claude Code + pesquisa web
> **Research completa em:** `searchings/runners-claude-code-research.md`

---

## O que é um Runner

Um runner é a camada de execução autônoma entre "o usuário configura uma task" e "o agente conclui sem supervisão constante". Ele:

- Lança o CLI de AI (`claude -p "..."`, `codex -p "..."`, etc.) como subprocess headless
- Gerencia uma fila de prompts/tasks
- Detecta conclusão via marker (`TASK_COMPLETE`) ou critérios de qualidade
- Implementa retry, fallback de modelo, e cascade de qualidade
- Pode rodar em paralelo com worktrees isolados

Hoje no AIOSON: `squad:daemon`, `squad:worker`, `squad:autorun` são protótipos funcionais mas não têm cascade de modelo, não têm fila configurável pelo usuário, e não suportam multi-LLM por design.

---

## Problema que resolve

O usuário precisa:
1. Configurar tasks (stories, epics) e se ausentar enquanto elas executam
2. Controlar custo rodando tasks simples com modelos baratos e escalando apenas quando necessário
3. Usar o melhor modelo para cada tipo de task (Claude para planejamento/criatividade, Gemini para volume, etc.)
4. Ter um pipeline que não trava quando o agente pede permissão interativa

---

## Escopo proposto

### Primitivo: `aioson runner:run`

```bash
# Roda uma task única headless
aioson runner:run . --task="Fix the auth modal" --agent=dev --tool=claude

# Roda fila de tasks de um arquivo
aioson runner:run . --queue=tasks.md --agent=dev

# Com cascade de modelo (mais barato primeiro)
aioson runner:run . --task="..." --cascade=haiku,sonnet,opus

# Multi-LLM (usa o CLI disponível no sistema)
aioson runner:run . --task="..." --tool=auto  # detecta claude, codex, gemini disponíveis
```

### Fila de execução: `aioson runner:queue`

```bash
# Adiciona tasks à fila
aioson runner:queue add . "Implement the stock modal"
aioson runner:queue add . "Add unit tests for auth"
aioson runner:queue add . "Write migrations for users table"

# Visualiza fila atual
aioson runner:queue list .

# Executa fila toda (autônomo)
aioson runner:queue run . --agent=dev

# Exporta fila como arquivo para revisão antes de executar
aioson runner:queue export . > tasks-$(date +%Y%m%d).md
```

### Modo background: `aioson runner:daemon`

```bash
# Roda como daemon, processando fila continuamente
aioson runner:daemon start . --agent=dev --tool=claude

# Status em tempo real
aioson runner:daemon status .

# Para
aioson runner:daemon stop .
```

---

## Cascade de modelos

O cascade permite testar com modelo barato primeiro e escalar só se a qualidade falhar.

```yaml
# .aioson/config.md ou como flag CLI
cascade:
  - model: haiku       # ou gemini-flash, codex-mini
    attempts: 3
    quality_gate: basic   # checks mínimos
  - model: sonnet      # ou gemini-pro, codex
    attempts: 2
    quality_gate: standard
  - model: opus        # fallback de qualidade máxima
    attempts: 1
    quality_gate: strict
```

Integração com `verify:gate` existente no AIOSON: o quality gate já sabe o que verificar, o cascade decide qual modelo tenta quando o gate falha.

---

## Multi-LLM routing

O AIOSON é model-agnostic — usa o CLI que o usuário configurou. Um runner pode:
1. Detectar quais CLIs estão disponíveis no sistema (`which claude`, `which codex`, `which gemini`)
2. Rotear por tipo de task com base em configuração do projeto
3. Usar proxy local (como `claude-code-router` ou `CLIProxyAPI`) quando disponível

```yaml
# .aioson/config.md — configuração opcional de routing
runner_routing:
  planning: claude      # Claude para planejamento
  implementation: auto  # qualquer disponível
  review: claude        # Claude para revisão
  volume: gemini        # Gemini para tasks de volume
```

**Importante**: o routing é opt-in e declarativo. O padrão é sempre usar o CLI ativo da sessão.

---

## Integração com estrutura existente do AIOSON

| Existente | Como integra com Runners |
|---|---|
| `squad:daemon` | Runner é a generalização do daemon para qualquer agente, não só squads |
| `squad:autorun` | Runner absorve esse comportamento com adição de cascade e fila |
| `implementation-plan.md` | Phases do plano viram tasks na fila do runner automaticamente |
| `verify:gate` | Quality gate nativo que o cascade usa para decidir retry/escalada |
| `context:health` | Runner checa saúde do contexto antes de iniciar cada task |
| `squad:worktrees` | Runner usa worktrees para isolamento em execuções paralelas |
| `runtime:emit` | Runner emite eventos para o dashboard a cada task completada |

---

## Comparação com ecossistema open source

| Projeto | O que AIOSON teria a mais |
|---|---|
| ralph-orchestrator | Integração com implementation-plan, verify:gate, e dashboard nativo |
| claude_code_agent_farm | Awareness de contexto AIOSON (spec, gates, phases) |
| ruflo | Sem dependência de LiteLLM externo — funciona com CLIs já instalados |
| 1code | Queue persistente em SQLite (consistente com store existente do AIOSON) |

---

## Riscos e considerações

**Bypass de permissões**: runners precisam de `--dangerously-skip-permissions` ou Auto Mode. Anthropic recomenda containers isolados. Para uso local, hooks `PreToolUse` são o guardrail recomendado.

**Consumo de tokens**: sem context hygiene, um runner com muitas skills/agents instalados multiplica o custo por task. A limpeza de contexto (via `context:health`, `context:trim`) deve rodar antes de iniciar runners de longa duração.

**Debugging**: tasks que falham silenciosamente em background são difíceis de debuggar. O runner deve sempre escrever logs estruturados em `.aioson/runner-logs/` e emitir eventos para o dashboard.

**Timeout e recovery**: runners de longa duração podem perder sessão (timeout do CLI, queda de network). Precisam de mecanismo de resume via `last_checkpoint` do spec existente.

---

## Dependências de implementação

Para implementar runners de forma robusta, o AIOSON precisa ter:

1. `context:health` operacional (plan 62 — `aioson context:health`)
2. `verify:gate` como módulo invocável externamente (já existe como skill)
3. `implementation-plan.md` com fases bem definidas (já existe — Fase 10)
4. SQLite store para queue e logs (já existe — runtime-store)

Runners podem ser construídos incrementalmente: começar com `runner:run` simples (single task headless) e adicionar fila, cascade e multi-LLM progressivamente.

---

## Referências

- `searchings/runners-claude-code-research.md` — pesquisa detalhada
- `plans/62-PLAN-token-economy-scripts.md` — context:health
- `plans/60-PLAN-background-agent-status.md` — background agent status
- `plans/67-PLAN-squad-scripts-and-meta-intelligence.md` — scripts de squad
- Claude Code Docs: headless mode, agent teams, auto mode
