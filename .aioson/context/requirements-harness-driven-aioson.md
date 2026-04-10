# Requirements — Harness-Driven AIOSON

> Gerado por: @analyst | Feature: harness-driven-aioson | Data: 2026-04-10

## Resumo da feature

Evolução additive do SDD: adiciona uma camada Harness Engineering ao AIOSON sem quebrar workflows existentes. Entrega em 3 fases independentes: gateway ativo com circuit breaker (Fase 1), contractual handshake + memória de sessão (Fase 2), e loop de validação multi-agente (Fase 3). MEDIUM obrigatório; SMALL apenas `progress.json`; MICRO inalterado.

---

## Novas entidades e arquivos

### `harness-contract.json` (por feature em `.aioson/plans/{slug}/`)

Schema obrigatório:

| Campo | Tipo | Nulável | Restrições |
|-------|------|---------|------------|
| `feature` | string | não | slug da feature; deve corresponder ao slug em `features.md` |
| `contract_mode` | enum | não | `ECONOMICAL` \| `BALANCED` \| `URGENT`; default `BALANCED` |
| `governor.max_steps` | integer | não | número máximo de iterações do loop; 0 = desabilitado; default 50 |
| `governor.error_streak_limit` | integer | não | máximo de erros consecutivos antes de abrir circuit; 0 = desabilitado; default 5 |
| `governor.cost_ceiling_tokens` | integer | sim | máximo de tokens rastreados via `runtime_store.token_count`; null = desabilitado |
| `criteria` | array | não | lista de critérios; pode ser vazia (= sem bloqueio) |
| `criteria[].id` | string | não | identificador único dentro do contrato (ex: `C1`) |
| `criteria[].description` | string | não | texto legível por humano para revisão em PR |
| `criteria[].assertion` | string | não | expressão verificável pela máquina (ex: `"all tests pass"`, `"lint clean"`) |
| `criteria[].binary` | boolean | não | sempre `true` no MVP — resultado é pass ou fail |

### `progress.json` (por feature em `.aioson/plans/{slug}/`)

| Campo | Tipo | Nulável | Restrições |
|-------|------|---------|------------|
| `feature` | string | não | slug da feature |
| `phase` | integer | não | fase atual (1, 2, 3...) |
| `status` | enum | não | `in_progress` \| `waiting_validation` \| `done` \| `circuit_open` |
| `completed_steps` | string[] | não | lista de passos já concluídos; pode ser vazia |
| `last_error` | string\|null | sim | último erro do validador com critério específico |
| `session_count` | integer | não | número de sessões nesta feature; inicia em 1 |
| `last_updated` | string | não | ISO-8601 |
| `circuit_state` | enum | não | `CLOSED` \| `OPEN` \| `HALF_OPEN`; inicia em `CLOSED` |
| `iterations` | integer | não | contador de iterações do loop nesta sessão; inicia em 0 |
| `consecutive_errors` | integer | não | contador de erros consecutivos; reseta a 0 em cada sucesso |

### `src/commands/harness.js` (novo comando CLI)

Subcomandos:

| Subcomando | Flags | Comportamento |
|------------|-------|---------------|
| `harness:init` | `--slug` (obrigatório), `--mode` (ECONOMICAL\|BALANCED\|URGENT, default BALANCED), `--phase` (integer, default 1) | Cria `harness-contract.json` + `progress.json` em `.aioson/plans/{slug}/` |
| `harness:validate` | `--slug` (obrigatório), `--artifact` (opcional, path a verificar) | Invoca `verify:gate --contract` + atualiza `progress.json` |

### `src/harness/circuit-breaker.js` (novo módulo puro)

Interface pública (sem side effects internos — persiste estado via `progress.json`):

| Função | Assinatura | Descrição |
|--------|-----------|-----------|
| `createCircuitBreaker` | `(contractPath, progressPath) → CircuitBreaker` | Carrega contrato e estado atual |
| `cb.check()` | `() → { allowed: boolean, reason: string\|null }` | Verifica se nova iteração é permitida |
| `cb.recordSuccess()` | `() → Promise<void>` | Reseta `consecutive_errors`, incrementa `iterations`, persiste |
| `cb.recordError(msg)` | `(string) → Promise<void>` | Incrementa `consecutive_errors`, verifica limites, abre se necessário |
| `cb.getState()` | `() → 'CLOSED'\|'OPEN'\|'HALF_OPEN'` | Retorna estado atual sem I/O |

### `template/.aioson/agents/validator.md` (novo agente)

Especificação do agente — ver seção "Regras de negócio REQ-HD-08" para restrições de contexto.

### `template/.aioson/skills/static/harness-validate/SKILL.md` (nova skill)

Skill estática (carregada automaticamente para projetos MEDIUM). Instrui o @dev a invocar `aioson harness:validate . --slug={slug}` ao finalizar cada fase, antes de marcar como done.

---

## Alterações em entidades existentes

### `src/commands/verify-gate.js`

| Alteração | Detalhes |
|-----------|---------|
| Nova flag `--contract` | `--contract=.aioson/plans/{slug}/harness-contract.json` — quando presente, carrega `criteria[]` como fonte de requisitos adicionais |
| Backward-compatible | sem `--contract` → comportamento atual exato, zero impacto |
| Output JSON estendido | quando `--contract` está presente, adiciona `criteria_results: [{id, passed, reason}]` ao JSON de output |

### `src/commands/self-implement-loop.js`

| Alteração | Detalhes |
|-----------|---------|
| Nova flag `--contract` | carrega `harness-contract.json`; substitui defaults de `max-iterations` por `governor.max_steps`; substitui limite de erros por `governor.error_streak_limit` |
| Persistência em `progress.json` | quando `--contract` está presente, escreve estado de iteração/erro no `progress.json` do contrato após cada loop |
| Backward-compatible | sem `--contract` → comportamento atual exato (incluindo limite de 5 iterações) |

### `src/i18n/messages/en.js` + `src/i18n/messages/pt-BR.js`

Adicionar strings para comandos `harness:init` e `harness:validate` (seguir padrão do `briefing.js`).

### `src/cli.js`

| Alteração | Detalhes |
|-----------|---------|
| Require no topo | `const { runHarnessInit, runHarnessValidate } = require('./commands/harness');` |
| Registro no array de comandos válidos | adicionar `'harness:init'`, `'harness-init'`, `'harness:validate'`, `'harness-validate'` |
| else-if na cadeia de dispatch | seguir padrão do `briefing` (linhas 1172–1175) |

---

## Relacionamentos com entidades existentes

| Entidade nova | Relação | Entidade existente |
|---|---|---|
| `circuit-breaker.js` | lê e escreve | `progress.json` |
| `harness.js` | cria | `harness-contract.json`, `progress.json` |
| `harness.js (harness:validate)` | invoca | `verify-gate.js --contract` |
| `verify-gate.js (--contract)` | lê | `harness-contract.json` |
| `self-implement-loop.js (--contract)` | carrega e delega | `circuit-breaker.js`, `progress.json` |
| `@validator` | lê | `harness-contract.json`, arquivos listados em `progress.json.completed_steps` |
| `harness-validate skill` | instrui @dev a invocar | `harness:validate` CLI |
| `harness-contract.json` | coexiste com | `.aioson/plans/{slug}/plan-*.md` (sem conflito) |

---

## Regras de negócio

### REQ-HD-01 — Ativação por classificação
- MEDIUM: harness completo obrigatório (`harness-contract.json` + `progress.json` + circuit breaker + @validator)
- SMALL: apenas `progress.json` (memória de sessão); sem contrato, sem circuit breaker
- MICRO: SDD puro; nenhum artefato de harness criado ou esperado
- Detecção: via campo `classification` em `project.context.md`; downstream agents verificam antes de usar harness

### REQ-HD-02 — Idempotência do harness:init
- Se `harness-contract.json` ou `progress.json` já existirem no path destino: exibir aviso com path do arquivo existente e encerrar sem modificar
- Não sobrescrever silenciosamente; não lançar erro fatal (exit 0 com aviso)

### REQ-HD-03 — Persistência de estado do circuit breaker
- `circuit_state`, `iterations`, `consecutive_errors` e `last_updated` em `progress.json` são a única fonte de verdade do estado do circuit
- Nenhum estado interno do circuit breaker pode ser mantido apenas em memória entre execuções do CLI
- Leitura do progress.json ao iniciar; escrita após cada `recordSuccess()` ou `recordError()`

### REQ-HD-04 — Condições de abertura do circuit (→ OPEN)
O circuit abre quando qualquer uma das condições for verdadeira:
- `iterations >= governor.max_steps` (e `max_steps > 0`)
- `consecutive_errors >= governor.error_streak_limit` (e `error_streak_limit > 0`)
- `token_count_session >= governor.cost_ceiling_tokens` (se `cost_ceiling_tokens` estiver definido no contrato e o runtime SQLite rastrear o valor)
- Ao abrir: escrever `circuit_state: "OPEN"` e `status: "circuit_open"` em `progress.json`; registrar razão em `last_error`

### REQ-HD-05 — Comportamento com circuit OPEN
- `circuit-breaker.js check()` retorna `{ allowed: false, reason: "circuit_open: <razão>" }`
- `self:loop --contract` checa antes de iniciar cada iteração; se OPEN, retorna `{ ok: false, reason: 'circuit_open' }` sem chamar o agente
- Mensagem para o usuário deve indicar: razão da abertura, estado atual do `progress.json`, e que intervenção humana é necessária antes de retomar

### REQ-HD-06 — Comportamento HALF_OPEN
- Estado HALF_OPEN é setado manualmente (via CLI ou @dev) após HITL confirmar retomada
- Permite exatamente 1 tentativa: sucesso → `CLOSED`; falha → `OPEN` (sem incrementar `consecutive_errors` novamente)

### REQ-HD-07 — verify:gate --contract
- Quando `--contract` está presente: carregar `criteria[]` do JSON como requisitos de verificação
- Cada `criteria[].assertion` deve ser mapeado para checagens determinísticas suportadas pelo verify-gate (patterns, file checks, test runs)
- Output JSON quando `--contract`: incluir `criteria_results: [{id, passed, reason}]` para consumo pelo circuit-breaker

### REQ-HD-08 — Isolamento do @validator
- @validator é invocado via `aioson agent:prompt validator .` (nova sessão isolada)
- Contexto carregado pelo @validator: `harness-contract.json` + arquivos explicitamente listados em `progress.json.completed_steps`
- Proibido passar: histórico de conversa do @dev, arquivos além dos completed_steps, outros PRDs ou specs
- Output obrigatório do @validator: JSON com `{phase, validation_at, results: [{id, passed, reason}], overall_score, ready_for_done_gate}`

### REQ-HD-09 — harness:validate
- Executa: `verify:gate --contract={harness-contract.json} [--artifact={artifact}]`
- Atualiza progress.json: incrementa `iterations`; se PASS → `recordSuccess()`; se FAIL → `recordError(last_error_msg)`
- Exibe resultado por critério ao usuário no terminal

### REQ-HD-10 — Done gate
- Antes de marcar feature como `done` em `features.md`, verificar: `progress.json.circuit_state === 'CLOSED'` E último resultado de validação sem critérios com `passed: false`
- Se gate não passar: exibir critérios bloqueantes e impedir a marcação de done

### REQ-HD-11 — self:loop --contract
- Carrega `governor.*` do harness-contract.json e usa como políticas do loop nessa execução
- `governor.max_steps` substitui o default de 3 iterações do self:loop (remove o hardcap de 5 quando --contract está presente)
- Persiste estado no `progress.json` do contrato após cada iteração

### REQ-HD-12 — Invocação do @validator
- @validator sempre invocado como processo externo isolado via `aioson agent:prompt validator`
- Nunca invocado como tool call ou subagente dentro da sessão atual
- O @validator não tem acesso à sessão de contexto do @dev que o invocou

---

## Critérios de aceite

### Fase 1 — Gateway Ativo

| AC | Critério | REQ relacionado |
|---|---|---|
| AC-HD-01 | Dado projeto MEDIUM com `harness-contract.json` em `.aioson/plans/{slug}/`, quando `circuit-breaker.check()` é chamado, retorna `allowed: true` se dentro dos limites do governor | REQ-HD-04 |
| AC-HD-02 | Dado `iterations >= max_steps` em `progress.json`, quando `circuit-breaker.check()` é chamado, retorna `allowed: false` com `reason: "max_steps"` | REQ-HD-04 |
| AC-HD-03 | Dado projeto sem `harness-contract.json` (MICRO ou SMALL), quando qualquer comando existente é executado, o comportamento é idêntico ao pré-harness | REQ-HD-01 |
| AC-HD-04 | Dado `consecutive_errors >= error_streak_limit`, quando `recordError()` é chamado, `progress.json.circuit_state` muda para `"OPEN"` e `status` para `"circuit_open"` | REQ-HD-03, REQ-HD-04 |

### Fase 2 — Contractual Handshake

| AC | Critério | REQ relacionado |
|---|---|---|
| AC-HD-05 | Dado `aioson harness:init . --slug=my-feature`, quando executado em projeto MEDIUM, cria `.aioson/plans/my-feature/harness-contract.json` (template válido) e `.aioson/plans/my-feature/progress.json` (estado inicial: CLOSED, session_count=1) | REQ-HD-02 |
| AC-HD-06 | Dado `harness:init` executado com `--slug` de feature já existente com arquivos presentes, quando executado, exibe aviso com path e encerra sem modificar os arquivos | REQ-HD-02 |
| AC-HD-07 | Dado `progress.json` com `session_count: 2` e `completed_steps: ["step-1"]`, quando @dev inicia nova sessão lendo o arquivo, retoma a partir do `completed_steps` sem precisar re-analisar o codebase inteiro | REQ-HD-03 |
| AC-HD-08 | Dado `aioson harness:validate . --slug=my-feature`, quando executado com `harness-contract.json` presente, invoca `verify:gate --contract` e atualiza `progress.json` com resultado | REQ-HD-09 |

### Fase 3 — Multi-Agent Validation Loop

| AC | Critério | REQ relacionado |
|---|---|---|
| AC-HD-09 | Dado `aioson agent:prompt validator .` invocado com contexto limitado a `harness-contract.json` + `completed_steps`, quando @validator executa, retorna JSON com `criteria_results` por critério do contrato | REQ-HD-08 |
| AC-HD-10 | Dado resultado de @validator com critério C1 `passed: false`, quando `progress.json` é atualizado, `last_error` contém o ID do critério e a `reason` específica | REQ-HD-08 |
| AC-HD-11 | Dado todos os `criteria[]` com `passed: true`, quando done gate é verificado, `progress.json.circuit_state === 'CLOSED'` e nenhum critério bloqueante — feature pode ser marcada como `done` | REQ-HD-10 |
| AC-HD-12 | Dado `consecutive_errors >= error_streak_limit` durante loop de validação, quando circuit abre, nenhuma nova iteração é iniciada e usuário recebe mensagem com razão + estado de `progress.json` | REQ-HD-05 |

---

## Garantia de Integração (SDD + HD) — "Somar sem Subtrair"

Esta feature é estritamente **aditiva**. Para garantir a integridade do workflow atual:

1. **Gate de Silêncio:** O código em `execution-gateway.js` e `self-implement-loop.js` deve realizar um "early return" caso o arquivo `harness-contract.json` não seja encontrado. 
2. **Impacto de Performance:** A verificação de existência do contrato em projetos MICRO deve ser feita via `fs.existsSync` (ou equivalente assíncrono leve) para garantir que não haja latência perceptível no ciclo de ferramentas existente.
3. **Zero Mudança de Estado:** Projetos sem Harness não devem ter seus arquivos `.aioson/context/` ou `features.md` alterados por nenhuma lógica nova.

## Notas de Validação (Sheldon)

De acordo com o `sheldon-validation.md`, os seguintes pontos devem ser observados na implementação:

- **Isolamento Estrito (Fase 3):** O processo do `@validator` não deve compartilhar memória, variáveis de ambiente ou instâncias de agents com o processo do `@dev`. A comunicação é feita exclusivamente via arquivos em disco e exit codes.
- **Teste de Regressão MICRO:** O QA deve incluir um teste de fumaça em um projeto sem Harness para garantir que o workflow SDD permanece 100% funcional e rápido.

---

## Casos extremos e modos de falha

| Caso | Comportamento esperado |
|------|----------------------|
| `harness:init` em projeto MICRO | Avisa que harness é opcional para MICRO; cria os arquivos se o usuário usar a flag `--force`; sem `--force`, encerra com aviso (exit 0) |
| `harness-contract.json` com `criteria: []` | `harness:validate` retorna PASS automaticamente; circuit nunca abre por critérios |
| `progress.json` com JSON corrompido | Reiniciar: criar novo `progress.json` com `session_count` incrementado (lido do arquivo corrompido se possível, ou default 2), `circuit_state: "CLOSED"`, log de aviso ao usuário |
| `self:loop --contract` com arquivo não encontrado | Erro claro com path esperado e exit 1; não iniciar o loop |
| `governor.max_steps: 0` ou `governor.error_streak_limit: 0` | Tratar como desabilitado — aquela condição nunca abre o circuit |
| @validator retorna JSON malformado | Contar como falha: chamar `recordError("validator: malformed output")`; incrementar `consecutive_errors` |
| `verify:gate --contract` com `assertion` desconhecida | Log de aviso por critério não mapeável; não bloquear os demais critérios válidos |
| `harness:validate` com circuit OPEN | Exibir estado atual do circuit e razão da abertura; não executar verify:gate; instruir usuário a usar HALF_OPEN antes de retomar |

---

## Fora do escopo desta feature

- **UI/dashboard** para visualizar estado do circuit breaker em tempo real
- **Sincronização de `progress.json`** entre múltiplas sessões paralelas do mesmo feature (para parallel mode — resolver no squad paralelo)
- **`cost_ceiling_usd`** (moeda) — MVP usa `cost_ceiling_tokens` (rastreado pelo SQLite existente)
- **`bootstrap.sh` e `smoke-tests/` automáticos** via `harness:init` — planejados para Fase 3 no plano, não são gerados automaticamente pelo MVP
- **Integração com CI/CD externo** (GitHub Actions, etc.)
- **Migração de features existentes** para harness — opt-in apenas para novas features
- **Modificação do @sheldon** para gerar `harness-contract.json` automaticamente — isso é scope do @sheldon em sessão separada
