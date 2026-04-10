# Phantom — Dynamic MCP Tool Creation (Análise Profunda)

**Fonte:** https://github.com/ghostwright/phantom
**Data:** 2026-03-30
**Módulo:** `src/mcp/`

---

## O que é

Sistema que permite a qualquer cliente MCP (incluindo um agente AI) **criar, registrar e persistir novas ferramentas MCP em runtime** — sem restart, sem deploy. Ferramentas sobrevivem a restarts via SQLite.

---

## Arquitetura

### 3 Camadas

```
DynamicToolRegistry (dynamic-tools.ts)
    ↕ SQLite (bun:sqlite)
    ↕ In-memory Map<string, DynamicToolDef>

DynamicHandlers (dynamic-handlers.ts)
    ↕ Subprocess seguro (bash ou bun script)

Management Tools (tools-dynamic.ts)
    → phantom_register_tool
    → phantom_unregister_tool
    → phantom_list_dynamic_tools
```

---

## Schema do DB (`dynamic_tools`)

```sql
CREATE TABLE IF NOT EXISTS dynamic_tools (
  name TEXT PRIMARY KEY,           -- /^[a-z][a-z0-9_]*$/, max 100 chars
  description TEXT NOT NULL,
  input_schema TEXT NOT NULL,      -- JSON do schema de input
  handler_type TEXT NOT NULL DEFAULT 'inline',  -- 'shell' | 'script'
  handler_code TEXT,               -- bash inline ou null
  handler_path TEXT,               -- path para script ou null
  registered_at TEXT NOT NULL DEFAULT (datetime('now')),
  registered_by TEXT
)
```

---

## Fluxo de Registro

1. Agente (ou cliente MCP) chama `phantom_register_tool` com name, description, input_schema, handler_type, handler_code/handler_path
2. `DynamicToolRegistry.register()` valida via Zod, faz `INSERT OR REPLACE` no DB
3. Adiciona ao `Map` in-memory
4. **Sessões existentes precisam reconectar** para ver o novo tool (limitação documentada no código)
5. Na próxima inicialização: `registerAllOnServer()` carrega todos do DB automaticamente

---

## Execução Segura (dynamic-handlers.ts)

### Shell handler
```bash
bash -c "<handler_code>"
# Env: PATH, HOME, LANG, TERM, TOOL_INPUT=<json>
# NUNCA passa API keys ou secrets
```

### Script handler
```bash
bun --env-file= run <handler_path>
# --env-file= previne auto-load de .env/.env.local
# Input via stdin como JSON
```

Ambos capturam stdout/stderr, verificam exit code, retornam `CallToolResult`.

---

## Meta-Tools Expostos

### `phantom_register_tool`
- Registra nova ferramenta dinâmica (persistida no DB)
- Retorna confirmação JSON com nota sobre reconexão de sessão

### `phantom_unregister_tool`
- Remove ferramenta. Protege as `phantom_*` built-ins

### `phantom_list_dynamic_tools`
- Retorna count + lista (name, description, handlerType)

---

## Segurança

- Execução via subprocess separado (não inline)
- Env stripped — nunca passa `ANTHROPIC_API_KEY` ou secrets
- `--env-file=` no Bun previne vazamento via .env automático
- Proteção dos tools built-in contra unregister

---

## Relevância para AIOSON

### O gap que preenche
Do `project_superpowers_analysis.md`: gap de "subagent-per-task" — agentes que precisam de ferramentas específicas para um contexto precisam criá-las on-demand.

### Cenários AIOSON concretos

1. **Dev agent** trabalhando num projeto Node.js descobre que precisa de uma ferramenta para rodar os testes com coverage — registra um tool `run_tests_with_coverage` que persiste para a sessão
2. **QA agent** precisa consultar um endpoint específico repetidamente — registra `check_api_health` como shell tool
3. **Squad** num projeto com DB cria `query_staging_db` como script tool

### O que adaptar

**Não precisa de MCP completo** para aproveitar o conceito. AIOSON pode implementar uma versão mais simples:

1. **Tool Registry em arquivo** (mais simples que SQLite para o contexto AIOSON):
   - `.aioson/tools/<project>/registry.json` com nome, descrição, handler
   - Carregado pelo agente no início da sessão

2. **Handlers via shell** (já funciona com Bash tool do Claude Code):
   - Agente escreve um script, registra no registry, usa via Bash
   - Sem overhead de subprocess sandboxing

3. **MCP completo** (caminho longo — só se AIOSON virar servidor MCP):
   - Usar o código do Phantom como base (Apache 2.0)
   - Requer Bun/Node server rodando como daemon

### Arquivos chave para referência
- `src/mcp/dynamic-tools.ts` — DynamicToolRegistry (5360 bytes, bem legível)
- `src/mcp/tools-dynamic.ts` — Management tools (3959 bytes)
- `src/mcp/dynamic-handlers.ts` — Execução segura (2990 bytes)
- `src/mcp/server.ts` — Wiring completo (6932 bytes)

### Dependências necessárias (se implementar o MCP completo)
```json
"@modelcontextprotocol/sdk": "^1.28.0",
"zod": "^3.24.0",
"zod-to-json-schema": "^3.25.1"
```
(SQLite via Bun nativo — sem dependência extra)
