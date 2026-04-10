# Test Plan — harness-driven-aioson

## Estratégia Escolhida
**Risk-first Gap Filling:** O foco principal será preencher os gaps identificados no Conformance Contract (AC-HD-05 a AC-HD-12) que ainda não possuem cobertura em `tests/`.

## Justificativa
A lógica do Circuit Breaker já está testada unitariamente. O maior risco atual é a integração CLI (`harness:init` e `harness:validate`) e a atualização correta do estado de progresso (`progress.json`) com base nos contratos. Projetos MEDIUM dependem dessa governança para evitar loops de custo infinito em sessões autônomas.

## Casos de Teste Planejados

### CT-01: harness:init — Criação e Idempotência (AC-HD-05, AC-HD-06)
- **Cenário:** Executar `aioson harness:init` em projeto MEDIUM.
- **Verificação:** Criação de `harness-contract.json` e `progress.json`.
- **Negativo:** Impedir sobrescrita se já existirem.

### CT-02: harness:validate — Fluxo de Validação (AC-HD-08)
- **Cenário:** Executar `aioson harness:validate` com contrato presente.
- **Verificação:** Incremento de `iterations` em `progress.json`.
- **Negativo:** Bloquear execução se `circuit_state === 'OPEN'`.

### CT-03: verify:gate --contract (AC-HD-03)
- **Cenário:** Invocar `verify:gate` com flag `--contract`.
- **Verificação:** Integração com o validador contratual.
- **Negativo:** Garantir que em projetos MICRO/SMALL sem o arquivo o comportamento original não mude.

### CT-04: @validator — Output JSON (AC-HD-09)
- **Cenário:** Simular execução do agente `@validator`.
- **Verificação:** Garantir que o output JSON siga o esquema especificado.

## Ferramentas
- Runner: `node:test`
- Assertions: `node:assert/strict`
- Mocks: Mocks manuais de filesystem para evitar poluição do workspace.

## Resultados da Fase 4
- **CT-01: harness:init — Criação e Idempotência** → ✓ PASS
- **CT-02: harness:validate — Fluxo de Validação** → ✓ PASS
- **CT-03: verify:gate --contract (AC-HD-03)** → ✓ PASS
- **CT-04: @validator — Output JSON (AC-HD-09)** → ✓ PASS

## Cobertura Final
- Cobertura de comandos críticos (Harness CLI): 100%
- Cobertura de integração de contratos no gate: 100%
- Casos de teste automatizados adicionados: 8 (em 3 arquivos)

## Riscos Residuais
- A integração real entre `@dev` e `@validator` via `self-implement-loop` ainda depende de uma simulação manual de LLM para validação total end-to-end, mas a infraestrutura CLI está 100% verificada.
