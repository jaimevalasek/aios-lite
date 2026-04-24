---
feature: harness-driven-aioson
status: in_progress
started: 2026-04-10
spec_version: 1
phase_gates:
  requirements: approved      # Sincronizado com Sheldon Mode C (Somar/Additive)
  design: approved            # Arquitetura definida com Circuit Breaker isolado
  plan: pending
last_checkpoint: "Sheldon Validation: READY"
---

# Spec — Harness-Driven AIOSON

## O que foi construído
[A ser preenchido pelo @dev durante a implementação]

## Entidades adicionadas

### Novos arquivos por feature (em `.aioson/plans/{slug}/`)
- `harness-contract.json` — contrato de sucesso binário entre @dev e @validator
- `progress.json` — memória de sessão + estado do circuit breaker

### Novos módulos de código
- `src/commands/harness.js` — CLI: `harness:init` + `harness:validate`
- `src/harness/circuit-breaker.js` — módulo puro; estados CLOSED/OPEN/HALF_OPEN

### Novos agentes e skills
- `template/.aioson/agents/validator.md` + `.aioson/agents/validator.md` (sincronizado)
- `template/.aioson/skills/static/harness-validate/SKILL.md`

### Modificações em módulos existentes (backward-compatible)
- `src/commands/verify-gate.js` — flag `--contract`
- `src/commands/self-implement-loop.js` — flag `--contract`
- `src/i18n/messages/en.js` + `pt-BR.js` — strings harness
- `src/cli.js` — registro dos novos comandos

## Decisões tomadas

- 2026-04-10 Harness opt-in por classificação (MEDIUM obrigatório, SMALL apenas progress.json, MICRO zero) — usuário confirmou: "implementações que venham somar com o que temos hoje"
- 2026-04-10 Circuit breaker em `src/harness/circuit-breaker.js` (módulo novo), não em `execution-gateway.js` — execution-gateway.js é telemetria SQLite; misturar concerns violaria SRP
- 2026-04-10 `cost_ceiling_tokens` em vez de `cost_ceiling_usd` — runtime-store.js já rastreia `token_count`; conversão para USD depende de modelo e muda; tokens são mais determinísticos
- 2026-04-10 `self:loop --contract` remove hardcap de 5 iterações quando contrato presente — max_steps do contrato é a única fonte de verdade
- 2026-04-10 @validator invocado via `aioson agent:prompt validator` (processo externo) — isolamento de contexto é requisito não-negociável (REQ-HD-08)
- 2026-04-10 verify:gate estendido com --contract (não novo comando separado) — reutilização do parser existente minimiza código novo

## Casos extremos tratados

Ver `requirements-harness-driven-aioson.md` § Casos extremos e modos de falha

## Dependências

- **Lê:** `project.context.md` (classification), `harness-contract.json`, `progress.json`, `features.md`
- **Escreve:** `harness-contract.json` (harness:init), `progress.json` (harness:init + circuit-breaker + harness:validate)
- **Invoca:** `verify-gate.js`, `self-implement-loop.js`, `agent:prompt validator`
- **Registrado em:** `src/cli.js`

## Aprovação QA
- Data: 2026-04-10
- Cobertura de CA: 12/12 totalmente cobertos (Fases 1, 2 e 3)
- Probes Adversariais: 
  - [Done Gate Block] Tentativa de finalizar estágio com ready_for_done_gate: false → ✓ PASS (Bloqueado corretamente)
- Riscos residuais: HITL para HALF_OPEN é manual via JSON no MVP.

## Notas

- **Para @dev:** Antes de qualquer alteração em `verify-gate.js` e `self-implement-loop.js`, ler os arquivos completos. São módulos com lógica existente — enhancement, não reescrita.
- **Para @dev:** `src/harness/` é um novo diretório. Criar com `circuit-breaker.js` como primeiro arquivo. Módulo puro (sem imports do runtime SQLite) — facilita testes unitários.
- **Para @architect:** Decisão pendente — como `harness:validate` invoca o @validator? Via `aioson agent:prompt validator .` (CLI subprocess) ou via API direta? Impacta Fase 3.
- **Para @qa:** Testar backward-compatibility é prioritário. Qualquer feature sem `harness-contract.json` não pode ter comportamento alterado.
