---
phase: 3
slug: multi-agent-validation-loop
title: Multi-Agent Validation Loop
depends_on: contractual-handshake
status: pending
---

# Fase 3 — Multi-Agent Validation Loop

## Escopo desta fase
Implementar o loop Nautilus completo: Implementador (@dev) → Validador (@validator) → Feedback → Gateway done gate. Entrega:
1. Agente `@validator` com contexto isolado — nunca compartilha contexto com o @dev que avalia
2. Loop de auto-correção com circuit breaker (usa o gateway da Fase 1)
3. Done gate binário: todos os critérios do contrato aprovados = feature pode ser marcada como `done`
4. `bootstrap.sh` e `smoke-tests/` como componentes opcionais do Contract-Driven Directory

Ao final desta fase: o Padrão Nautilus está completo. Zero "One-shot Hero", zero "Premature Victory", zero "Amnesia".

## Entidades novas ou modificadas
- **`template/.aioson/agents/validator.md`** — novo agente; contexto isolado; lê apenas `harness-contract.json` e o output do @dev
- **`.aioson/agents/validator.md`** — sincronizado do template
- **`execution-gateway.js`** — adicionar done gate: verifica se todos os critérios `binary: true` passaram antes de permitir marcação de `done`
- **`template/.aioson/plans/{slug}/bootstrap.sh`** (por feature, opcional) — script para reconstruir contexto de sessão rapidamente
- **`template/.aioson/plans/{slug}/smoke-tests/`** (por feature, opcional) — testes rápidos por fase para verificação imediata pós-implementação
- **`src/commands/harness.js`** — adicionar subcomando `harness:validate` (invoca @validator via `aioson agent:prompt validator`)
- **`src/i18n/messages/en.js` e `pt-BR.js`** — adicionar strings do `harness:validate`

## Fluxos cobertos nesta fase

### Fluxo Nautilus completo
```
@dev implementa fase
    ↓
aioson harness:validate . --slug=feature --phase=N
    ↓
@validator (contexto isolado) lê harness-contract.json + output do @dev
    ↓
Retorna: [{id: "C1", passed: true}, {id: "C2", passed: false, reason: "..."}]
    ↓
score 0 → feedback específico enviado ao @dev via progress.json (last_error)
    ↓
@dev corrige → re-invoca harness:validate
    ↓
score 1 (todos binary: true passaram) → gateway abre done gate
    ↓
Feature marcada como done
```

### Fluxo de circuit breaker (herda Fase 1)
- `error_streak_limit` atingido → OPEN → HITL gate obrigatório
- @dev não pode tentar nova correção sem usuário confirmar retomada

### Fluxo bootstrap (opcional)
- `bootstrap.sh` recria contexto: instala deps, carrega env, valida pre-conditions
- @dev executa antes de iniciar sessão nova em projetos longos

## Acceptance criteria desta fase
| AC | Descrição |
|---|---|
| AC-HD-09 | Dado @dev concluindo fase, quando `aioson harness:validate` é invocado, @validator em contexto separado retorna score `0` ou `1` por critério do contrato |
| AC-HD-10 | Dado score `0`, quando feedback chega ao @dev via `progress.json.last_error`, @dev recebe o critério específico que falhou com razão suficiente para corrigir sem reiniciar |
| AC-HD-11 | Dado todos os critérios `binary: true` com score=1, quando @validator aprova, gateway libera done gate e feature pode ser marcada como `done` em `features.md` |
| AC-HD-12 | Dado `error_streak_limit` atingido, quando circuit breaker abre, o loop para automaticamente e solicita intervenção humana antes de qualquer nova tentativa |

## Agente @validator — especificação

**Missão:** Validar o output do @dev contra os critérios do `harness-contract.json`. Nunca implementar. Nunca sugerir refatorações além do critério que falhou.

**Contexto que carrega (SOMENTE):**
1. `.aioson/plans/{slug}/harness-contract.json` — o contrato
2. Os arquivos entregues pelo @dev nesta fase (listados em `progress.json.completed_steps`)
3. Output de ferramentas: ESLint, tsc, testes unitários

**Contexto que NUNCA carrega:**
- Outros agentes, PRD, requirements, architecture
- Código de outras features
- Histórico de sessões anteriores do @dev

**Output format:**
```json
{
  "phase": 1,
  "validation_at": "ISO-8601",
  "results": [
    {"id": "C1", "passed": true, "reason": null},
    {"id": "C2", "passed": false, "reason": "ESLint: no-unused-vars em src/commands/harness.js:42"}
  ],
  "overall_score": 0,
  "ready_for_done_gate": false
}
```

## Sequência de implementação sugerida
1. Criar `template/.aioson/agents/validator.md` com:
   - Missão, restrições de contexto, output format definido acima
   - Protocolo de invocação: lê contrato → executa ferramentas → compara resultados → retorna JSON
   - Protocolo de feedback: escreve resultado em `progress.json.last_error` em formato consumível pelo @dev
2. Adicionar subcomando `harness:validate` em `src/commands/harness.js`:
   - Invoca `aioson agent:prompt validator . --context=harness` (ou padrão equivalente)
   - Escreve resultado em `progress.json`
   - Atualiza `circuit_state` baseado em `error_streak`
3. Adicionar done gate no `execution-gateway.js`:
   - Quando @dev tenta marcar feature como `done`, verificar se `harness-contract.json` existe
   - Se existe: checar último resultado de validação em `progress.json` — `ready_for_done_gate: true` obrigatório
   - Se `ready_for_done_gate: false`: bloquear com mensagem clara
4. Criar convenção de `smoke-tests/`: arquivos em `.aioson/plans/{slug}/smoke-tests/` executados por `harness:validate` antes do @validator
5. Criar template de `bootstrap.sh` mínimo (comentado) para @dev preencher conforme necessidade
6. Sincronizar: `npm run sync:agents`
7. Testar loop completo end-to-end: harness:init → harness:validate (fail) → corrigir → harness:validate (pass) → done gate abre

## Dependências externas
- Fase 1 concluída (gateway + circuit breaker)
- Fase 2 concluída (harness:init + harness-contract.json + progress.json)
- `aioson agent:prompt` disponível para invocar @validator

## Notas para @dev
- **Isolamento de contexto é a regra mais importante desta fase.** O @validator não pode ter acesso ao histórico do @dev — contexto separado é não-negociável
- O feedback do @validator deve ser escrito em `progress.json.last_error` em formato que o @dev consiga agir diretamente — nunca mensagens genéricas como "código incorreto"
- `smoke-tests/` são opcionais — não bloquear a Fase 3 por ausência deles. @dev cria se o projeto tiver testes unitários configurados
- `bootstrap.sh` é opcional — criar template comentado, @dev decide se usa

## Notas para @qa
- Verificar isolamento: @validator não deve ter acesso a context files além dos especificados
- Testar feedback loop: falha em C2 → feedback → correção → re-validate → pass em C2
- Testar done gate: sem `ready_for_done_gate: true` em progress.json, `features.md` não deve ser atualizado
- Testar circuit breaker no loop: forçar 5 falhas consecutivas → verificar estado OPEN em progress.json

## Fontes de referência desta fase
> Consulte se precisar de mais detalhes durante a implementação.

- [pesquisa] Validator architecture & isolamento — `researchs/validator-architecture-2026/summary.md`
- [pesquisa] Circuit breaker patterns — `researchs/ai-agent-governor-safety/summary.md`
- [arquivo] Multi-Agent Validation Loop (Step 3) — `plans/Harness-Driven/Evolução-AIOSON-Do-Spec-Driven-ao-Harness-Driven.txt` (seção 6)
- [arquivo] PBQ Framework separação de agentes — `plans/Harness-Driven/Harness-Engineering-resumo.txt` (seção 3)
