---
generated: "2026-04-10T20:15:00Z"
framework: "Node.js"
test_runner: "node:test"
---

# Test Inventory

## Resumo
- Total de arquivos fonte críticos escaneados: 5
- Arquivos com cobertura completa: 1
- Arquivos com cobertura parcial: 2
- Arquivos sem cobertura: 2

## Mapa de cobertura

| Arquivo fonte | Arquivo de teste | Status |
|---|---|---|
| src/harness/circuit-breaker.js | tests/harness/circuit-breaker.test.js | ✓ coberto |
| src/commands/gate-check.js | tests/gate-check.test.js | ◑ parcial (sem suporte a contract) |
| src/commands/harness.js | — | ✗ faltando |
| src/squad/verify-gate.js | tests/gate-check.test.js | ◑ parcial (lógica core testada, bridge contrato não) |
| src/agents.js | tests/agents.test.js | ◑ parcial (logica geral, sem validador especializado) |

## Prioridades de risco

1. **Risco Crítico (C1):** `harness:validate` e `verify:gate --contract`. Se o contrato for ignorado ou validado incorretamente, o `circuit-breaker` não atuará e o framework perderá governança.
2. **Risco Alto (C2):** `harness:init` e idempotência. Criar contratos malformados ou sobrescrever progresso do usuário causa perda de dados e estados de erro no workflow.
3. **Risco Médio (C3):** Integração com `@validator`. O output JSON do agente deve ser parseado corretamente para que o `consecutive_errors` seja incrementado.
4. **Risco Baixo (C4):** Mensagens de i18n para os novos comandos.
