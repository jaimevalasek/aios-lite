# Proposta de Implementação: Conceitos do Phantom → AIOSON

**Data:** 2026-03-30
**Contexto:** Node.js/CommonJS, better-sqlite3 já presente, sem servidor persistente
**Baseado em:** ghostwright/phantom (Apache 2.0)

---

## Estado atual do AIOSON (o que já existe)

### Sistema de Learning (já implementado)
- Tabelas `squad_learnings` e `project_learnings` no SQLite
- Campos: `learning_id`, `squad_slug`, `type`, `title`, `signal`, `confidence`, `frequency`, `status` (active/stale/archived/promoted), `promoted_to`
- Comandos: `list`, `stats`, `archive`, `promote`, `export`, `reinforce`
- **Gap crítico:** extração e promoção são **manuais** — o agente precisa chamar `upsertSquadLearning()` explicitamente. Não há pipeline automático.

### Sistema MCP (já implementado)
- `squad-mcp` com conectores built-in (GitHub, Slack, etc.)
- Conectores predefinidos via `mcp-connectors/registry`
- **Gap:** sem criação dinâmica de tools em runtime por agentes

---

## Feature 1: Evolution Pipeline (Learning → Config)

### O que falta fazer

O AIOSON tem o **armazenamento** mas não tem o **pipeline**. O que o Phantom faz e o AIOSON não faz:

| Etapa | Phantom | AIOSON atual | Gap |
|-------|---------|-------------|-----|
| Extração de observações | Automático (LLM judge lê transcrição) | Manual (agente chama upsert) | Pipeline de extração |
| Geração de deltas | Automático (ConfigDelta objects) | Não existe | Conversor learning→delta |
| Validação | 5 gates automáticos | Não existe | Gates mínimos |
| Aplicação | Automático em phantom-config/ | Manual via `promote` | Auto-apply com aprovação |
| Consolidação | A cada 10 sessões | Não existe | Consolidation run |

### Proposta de implementação

#### Novo comando: `aioson learning:evolve <project-dir>`

**Arquivo:** `src/commands/learning-evolve.js`

```
aioson learning:evolve .
aioson learning:evolve . --squad=backend --dry-run
aioson learning:evolve . --auto-apply
```

**Pipeline simplificado (4 etapas para o contexto AIOSON):**

**Etapa 1 — Agregação**
- Lê learnings com `frequency >= 2` e `status = 'active'` do SQLite
- Agrupa por `type` (correction, preference, domain-fact, error-pattern)
- Fonte: tabela `squad_learnings` ou `project_learnings`

**Etapa 2 — Geração de deltas**
- Cada grupo de learnings gera um `ConfigDelta`:
  ```javascript
  {
    file: '.aioson/context/project.context.md',  // ou squad config
    type: 'append' | 'replace' | 'remove',
    content: '...',
    rationale: learning.signal,
    tier: 'free',          // context/ é editável
    source_ids: [...]      // learning_ids que originaram este delta
  }
  ```
- Mapeamento de tipo:
  - `correction` → append em `domain-knowledge` section
  - `preference` → append em `agent-preferences` section (arquivo livre)
  - `error-pattern` → append em `.aioson/rules/` (novo arquivo)
  - `domain-fact` → append em `project.context.md`

**Etapa 3 — 2 Gates mínimos (sem LLM, heurístico)**
1. **Constitution gate:** verifica que o delta não toca arquivos em `.aioson/agents/` (imutáveis)
2. **Size gate:** rejeita se o arquivo alvo ultrapassaria 300 linhas

*Gate com LLM (opcional, via flag `--llm-gates`):*
- Chama Claude API com prompt de constitution + safety judge
- Requer `ANTHROPIC_API_KEY` no ambiente

**Etapa 4 — Aplicação ou Dry-run**
- `--dry-run`: imprime deltas propostos no terminal, não escreve nada
- `--auto-apply`: aplica diretamente (para uso em hooks pós-sessão)
- Sem flag: gera arquivo `.aioson/evolution/pending-TIMESTAMP.json` para revisão manual + comando `aioson learning:apply <file>`

**Após aplicação:**
- Marca learnings aplicados como `promoted` com `promoted_to = file_path`
- Cria entrada em `.aioson/evolution/log.jsonl`

---

#### Novo comando: `aioson learning:apply <pending-file>`

Aplica um arquivo de deltas pendentes com confirmação interativa:

```
aioson learning:apply .aioson/evolution/pending-2026-03-30T12-00-00.json
```

---

#### Golden Suite (simplificado)

Arquivo: `.aioson/evolution/golden-cases.jsonl`

Cada linha: `{ "description": "...", "signal": "...", "blocked_patterns": ["..."] }`

Adicionado automaticamente quando um learning é promovido com sucesso.

Verificado no Gate 2 (constitution): deltas que contradizem padrões bloqueados são rejeitados.

---

#### Integração com `live:close`

Em `src/commands/live.js`, no handler do subcomando `close`:

```javascript
// Após fechar sessão, sugerir evolução
if (learningsCount > 0) {
  logger.log(`  ${learningsCount} learnings collected. Run: aioson learning:evolve . --dry-run`);
}
```

---

#### Schema adicional no SQLite (migration)

```sql
-- Em runtime-store.js, adicionar na migração
CREATE TABLE IF NOT EXISTS evolution_log (
  id TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL,
  delta_file TEXT,
  deltas_count INTEGER,
  squad_slug TEXT,
  source_learning_ids TEXT  -- JSON array
);
```

---

### Esforço estimado

| Arquivo | Operação | Complexidade |
|---------|----------|-------------|
| `src/commands/learning-evolve.js` | Criar | Média |
| `src/commands/learning-apply.js` | Criar | Baixa |
| `src/runtime-store.js` | Adicionar `evolution_log` schema + 2 funções | Baixa |
| `src/commands/live.js` | Adicionar sugestão no close | Mínima |
| `src/cli.js` | Registrar 2 novos comandos | Mínima |

**Pode ser feito em uma sessão de /dev.**

---

---

## Feature 2: Dynamic Tool Registry

### O que falta fazer

O `squad-mcp` atual é para conectar squads a **serviços externos predefinidos** (GitHub API, Slack, etc.). O que falta é um registry de **ferramentas arbitrárias criadas pelos próprios agentes** durante o trabalho.

### Proposta de implementação

#### Novo schema SQLite: `dynamic_tools`

Adicionar em `src/runtime-store.js`:

```sql
CREATE TABLE IF NOT EXISTS dynamic_tools (
  name TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  input_schema TEXT NOT NULL,       -- JSON: { "param": "string|number|boolean" }
  handler_type TEXT NOT NULL,       -- 'shell' | 'script'
  handler_code TEXT,                -- bash inline (para shell)
  handler_path TEXT,                -- path relativo ao projeto (para script)
  squad_slug TEXT,                  -- null = global do projeto
  registered_at TEXT NOT NULL DEFAULT (datetime('now')),
  registered_by TEXT                -- agent slug que registrou
)
```

#### Novo arquivo: `src/tool-registry.js`

Funções puras de CRUD sobre `dynamic_tools`:

```javascript
registerTool(db, { name, description, inputSchema, handlerType, handlerCode, handlerPath, squadSlug, registeredBy })
unregisterTool(db, name)
getTool(db, name)
listTools(db, squadSlug = null)
```

#### Novo arquivo: `src/tool-executor.js`

Execução segura via `child_process.spawnSync`:

```javascript
// Shell handler
// Env seguro: PATH, HOME, LANG, TERM, TOOL_INPUT=JSON
// NUNCA passa ANTHROPIC_API_KEY ou outros secrets

executeTool(toolDef, inputJson) → { ok, stdout, stderr, exitCode }
```

#### Novos comandos: `aioson tool:*`

```
aioson tool:register .               # interativo
aioson tool:register . --name=run_tests --type=shell --cmd="npm test"
aioson tool:list .
aioson tool:list . --squad=backend
aioson tool:call . --name=run_tests --input='{"filter":"auth"}'
aioson tool:unregister . --name=run_tests
```

**Arquivo:** `src/commands/tool-registry-cmd.js`

#### Segurança (adaptada do Phantom)

- Env stripped — lista explícita de variáveis permitidas (PATH, HOME, LANG, TERM, TOOL_INPUT)
- Script handler: `node --env-file= <path>` para impedir auto-load de .env
- Shell handler: `bash -c "<cmd>"` com env restrito
- Timeout: 30s por padrão (configurável via `--timeout`)
- Nomes: `/^[a-z][a-z0-9_]*$/`, máx 64 chars

#### Como os agentes usariam

No contexto do Claude Code, um agente do AIOSON poderia:

1. Criar um script em `.aioson/tools/<projeto>/run_tests.sh`
2. Registrar: `aioson tool:register . --name=run_tests --type=script --path=.aioson/tools/run_tests.sh`
3. Usar via Bash tool: `aioson tool:call . --name=run_tests --input='{"filter":"auth"}'`
4. O tool persiste entre sessões — na próxima sessão, o agente pode listar com `aioson tool:list .`

#### Integração com squad-mcp

O `squad-mcp` atual é para conectores externos (com autenticação, health checks). O `tool:*` seria complementar — ferramentas locais simples sem auth.

Diferença clara:
- `aioson squad:mcp` → integração com APIs externas (GitHub, Slack, Linear)
- `aioson tool:*` → ferramentas locais criadas pelo agente para o projeto específico

---

### Esforço estimado

| Arquivo | Operação | Complexidade |
|---------|----------|-------------|
| `src/runtime-store.js` | Adicionar `dynamic_tools` schema + CRUD | Baixa |
| `src/tool-executor.js` | Criar executor seguro | Baixa-Média |
| `src/commands/tool-registry-cmd.js` | Criar comandos | Média |
| `src/cli.js` | Registrar comandos | Mínima |

**Pode ser feito em uma sessão de /dev.**

---

## Priorização recomendada

| Feature | Impacto | Esforço | Prioridade |
|---------|---------|---------|-----------|
| Evolution Pipeline (learning:evolve) | Alto — fecha o loop do squad learning | Média | **1** |
| Dynamic Tool Registry (tool:*) | Médio — novo capability para agentes | Baixa-Média | **2** |
| Gates com LLM (--llm-gates) | Médio — mais segurança na evolução | Média | **3** (futuro) |

---

## Arquivos de referência do Phantom

Para implementação, os seguintes arquivos do Phantom são as melhores referências:

| Conceito | Arquivo Phantom | Equivalente AIOSON |
|----------|----------------|-------------------|
| Pipeline de extração | `src/evolution/reflection.ts` | `src/commands/learning-evolve.js` |
| Gates de validação | `src/evolution/validation.ts` | Inline em learning-evolve.js |
| Aplicação de deltas | `src/evolution/application.ts` | `src/commands/learning-apply.js` |
| Tool registry SQLite | `src/mcp/dynamic-tools.ts` | `src/tool-registry.js` |
| Execução segura | `src/mcp/dynamic-handlers.ts` | `src/tool-executor.js` |
| Management tools | `src/mcp/tools-dynamic.ts` | `src/commands/tool-registry-cmd.js` |
