# Hardening do Motor AIOSON — Resumo da Implementação

> **Data**: 2026-04-16  
> **Agente**: @dev  
> **Documento fonte**: [Claude Code Insights Report](../.claude/usage-data/report.html) — análise de 1.412 mensagens em 163 sessões (25 Mar – 16 Abr 2026)

---

## Contexto

O relatório de uso do Claude Code apontou 7 fricções recorrentes nas sessões de desenvolvimento do AIOSON:

1. **Código quebrado passando adiante** — erros de TS/Rust só pegos manualmente depois
2. **Acidentes de git** — `node_modules`, `dev.db`, build artifacts comitados por engano
3. **Testes falhando por textos de UI errados** — `getByText` com strings inexistentes
4. **Handoffs incompletos** — agentes terminavam sem artefatos ou gates obrigatórios
5. **Arquivos no lugar errado** — `docs/` vs `.aioson/docs/`, bootstrap na raiz
6. **Loops manuais de debug** — re-prompts mecânicos para corrigir erros de compilação
7. **Mesmos erros se repetindo** — falta de hardening preventivo

Esta implementação adiciona **7 camadas de proteção** no motor de orquestração do AIOSON para eliminar essas fricções.

---

## 1. Gates Técnicos Obrigatórios após @dev

### Problema
23 eventos de "buggy code" no relatório — código com erros de TypeScript, Rust ou JSX passava para `@qa` sem verificação.

### Solução implementada
- **Módulo**: `src/workflow-gates.js`
- Ao finalizar `@dev` (ou antes de `@qa`), o motor detecta a stack e roda:
  - `npx tsc --noEmit` (TypeScript)
  - `cargo check` / `cargo test` (Rust)
  - `npm test` / `npm run test:unit` / `npm run test:ci` (Node.js)
  - `pytest` (Python)
- Se falhar, o workflow é **bloqueado** com `[Technical Gate BLOCKED]` e o stderr completo.

### Uso
```bash
aioson workflow:next . --complete=dev
# ou forçar (não recomendado):
aioson workflow:next . --complete=dev --force
```

---

## 2. Guardrails de Git antes do @committer

### Problema
O relatório conta que o `@committer` chegou a comitar acidentalmente `node_modules/` e build artifacts.

### Solução implementada
- Ao ativar `@committer` via `workflow:next`, o motor inspeciona o stage com `git-commit-guard`.
- **Bloqueia imediatamente** se:
  - Não houver arquivos no stage
  - Houver arquivos proibidos (`node_modules/`, `dist/`, `.next/`, `*.db`, secrets, etc.)

### Uso
```bash
# Sempre rode antes de ativar @committer
aioson commit:prepare .
```

---

## 3. Test Briefing Automático para @qa / @tester

### Problema
Mocks desordenados e textos de UI incorretos (`"Confirmar"` vs `"Vincular"`) causavam loops de debug.

### Solução implementada
- **Módulo**: `src/test-briefing.js`
- Sempre que `@qa` ou `@tester` são ativados, o motor injeta automaticamente no prompt um briefing com:
  - Shared mock helpers encontrados (`tests/helpers/mocks.ts`, `__mocks__/`, etc.)
  - Arquivos de teste recentes para usar como template
  - Padrões comuns de mock (`vi.mock`, `vi.fn`)
  - Strings de UI extraídas dos componentes recentemente modificados
  - Convenções de teste do projeto

### Efeito
O agente recebe os textos exatos da UI e os padrões de mock do projeto, reduzindo adivinhação.

---

## 4. Contratos de Handoff Verificados por Máquina

### Problema
Handoffs quebrados — gates não setados, `@sheldon` não passando para `@dev`, artefatos faltando.

### Solução implementada
- **Módulo**: `src/handoff-contract.js`
- Cada agente tem um contrato que define:
  1. **Artefatos obrigatórios** que deve produzir
  2. **Gates** que devem estar aprovados
  3. **Context updates** recomendados
- Antes de qualquer transição de estágio, o motor valida o contrato.
- Se faltar algo, bloqueia com `[Handoff Contract BLOCKED]` e lista o que está pendente.

### Contratos por agente
| Agente | Artefatos | Gates |
|---|---|---|
| `@setup` | `project.context.md` | — |
| `@product` | `prd.md` / `prd-{slug}.md` | — |
| `@analyst` | `requirements-{slug}.md`, `spec-{slug}.md` | A |
| `@architect` | `architecture.md` | B |
| `@ux-ui` | `ui-spec.md` | B |
| `@pm` | `implementation-plan-{slug}.md` | — |
| `@dev` | (código) | C |
| `@qa` | (testes/relatório) | D |

---

## 5. Resolução Canônica de Caminhos

### Problema
Agentes criavam arquivos no lugar errado (`docs/` sendo interpretado como `.aioson/docs/`, bootstrap na raiz).

### Solução implementada
- **Artefato**: `.aioson/context/project-map.md` (e no template)
- **Módulo**: `src/path-guard.js`
- O mapa define os caminhos canônicos do projeto (root `docs/`, `.aioson/context/`, etc.)
- É injetado automaticamente nos prompts de `@dev`, `@architect`, `@ux-ui`, `@qa`, `@tester` e `@committer`.

### Regras enforçadas
- `docs/` = raiz `docs/`, **nunca** `.aioson/docs/`
- Confirmar paths ambíguos com o usuário
- Nunca sobrescrever `.gitignore` ou logs sem pedido explícito

---

## 6. Auto-Cura (Self-Healing) — `workflow:heal` e `--auto-heal`

### Problema
O relatório mostra que o usuário gastava muito tempo em re-prompts manuais para corrigir erros de compilação.

### Solução implementada
- **Módulos**: `src/self-healing.js`, `src/commands/workflow-heal.js`
- **Modo manual**:
  ```bash
  aioson workflow:heal . --stage=dev
  ```
  Reativa o agente com o último erro injetado no prompt, dando até 3 retries.
- **Modo automático** (`--auto-heal`):
  ```bash
  aioson workflow:next . --complete=dev --auto-heal
  ```
  Se um gate técnico ou contrato falhar, o motor **não propaga o erro**.
  Em vez disso:
  1. Loga o erro
  2. Incrementa o retry counter (máx 3)
  3. Reconstrói o prompt do agente com seção `Self-Healing Context`
  4. Reativa o agente automaticamente
  5. Se depois passar, reseta o contador

---

## 7. Hardening Autônomo de Fricção — `workflow:harden`

### Problema
Os mesmos padrões de erro se repetiam ao longo das sessões.

### Solução implementada
- **Módulos**: `src/friction-scanner.js`, `src/commands/workflow-harden.js`
- Lê `.aioson/context/workflow.errors.jsonl`
- Classifica padrões recorrentes (TS compile, mock ordering, git staging, etc.)
- Gera recomendações com prioridade
- Aplica **auto-fixes** quando seguro:
  - Atualiza `.gitignore` com `node_modules/`, `dist/`, `.next/`, `*.db`
  - Instala pre-commit hook do `git:guard`
  - Cria stub de `tests/helpers/mocks.ts`

### Uso
```bash
aioson workflow:harden .
aioson workflow:harden . --dry-run
```

---

## Documentação Criada

- **`docs/pt/motor-hardening.md`** — guia completo em português com:
  - Explicação das 7 melhorias
  - Tabela de comandos e flags
  - 10 exemplos práticos de uso
- **`docs/pt/comandos-cli.md`** — atualizado com `workflow:heal`, `workflow:harden`, `--auto-heal`
- **`docs/pt/README.md`** — link adicionado na tabela de guias
- **`docs/pt/inicio-rapido.md`** — link adicionado nos próximos passos
- **`products-features/upgrade-agents/parallel-workflow-orchestration.md`** — documentação da feature futura (orquestração paralela)

---

## Prompts de Agentes Atualizados

Os arquivos de agente (workspace + template) foram atualizados para refletir as novas capacidades do motor:

- **`.aioson/agents/dev.md`** — instruções sobre gates técnicos, auto-heal e `project-map.md`
- **`.aioson/agents/qa.md`** — instruções sobre test briefing injetado, `getByRole`, mock helpers
- **`.aioson/agents/committer.md`** — reforço do gate embutido antes de ativar `@committer`

---

## Testes Criados

| Arquivo | Tipo | Cobertura |
|---|---|---|
| `tests/workflow-engine-hardening.test.js` | Integração unitária | 8 testes de gates, contratos, briefing, path guard, auto-heal |
| `tests/workflow-heal.test.js` | Unitário | 4 testes de retry counter e healing prompt |
| `tests/workflow-harden.test.js` | Integração | 4 testes de friction scanner e auto-fixes |
| `tests/workflow-engine-e2e.test.js` | **End-to-end** | 3 cenários de fluxo completo ponta a ponta |

### Suite total
- **1353 testes** executados
- **1341 passando**
- 12 falhas pré-existentes (não relacionadas a esta implementação)

---

## Arquivos Novos no Repositório

```
src/workflow-gates.js
src/handoff-contract.js
src/test-briefing.js
src/path-guard.js
src/self-healing.js
src/friction-scanner.js
src/commands/workflow-heal.js
src/commands/workflow-harden.js

.aioson/context/project-map.md
template/.aioson/context/project-map.md

docs/pt/motor-hardening.md
products-features/upgrade-agents/parallel-workflow-orchestration.md

tests/workflow-engine-hardening.test.js
tests/workflow-heal.test.js
tests/workflow-harden.test.js
tests/workflow-engine-e2e.test.js
```

---

## Links

- **Documento fonte da análise**: `file:///home/jaime/.claude/usage-data/report.html` (ou `../.claude/usage-data/report.html` relativo a este arquivo)
- **Guia completo em pt-BR**: [`docs/pt/motor-hardening.md`](../docs/pt/motor-hardening.md)
- **Documentação do parallel workflow (futuro)**: [`products-features/upgrade-agents/parallel-workflow-orchestration.md`](../products-features/upgrade-agents/parallel-workflow-orchestration.md)
