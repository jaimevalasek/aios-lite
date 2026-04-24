# Arquitetura — Harness-Driven AIOSON

## Visão Geral da Arquitetura
A evolução para o Harness-Driven adota o padrão **Nautilus** (Implementador vs. Validador). A arquitetura é estritamente **aditiva** e **injetável**. O AIOSON permanece um CLI Node.js stateful via arquivos (Markdown/JSON). Toda a inteligência de validação e state machine (Circuit Breaker) opera lendo do disco (`progress.json` e `harness-contract.json`), garantindo amnésia zero entre sessões sem a necessidade de um daemon rodando em background.

Se o `harness-contract.json` não estiver presente, as chaves de injeção retornam silêncio, preservando o fluxo SDD original com impacto zero de latência (via `fs.existsSync`).

---

## Estrutura de Pastas e Módulos (CLI Node.js)

```text
aioson/
├── src/
│   ├── cli.js                  ← (Alterado) Registro da rota 'harness:*'
│   ├── commands/
│   │   ├── harness.js          ← (Novo) Controlador de init e validate
│   │   ├── verify-gate.js      ← (Alterado) Injeção de args: --contract
│   │   └── self-implement-loop.js ← (Alterado) Injeção de args: --contract
│   ├── harness/                ← (Novo) Domínio isolado
│   │   └── circuit-breaker.js  ← (Novo) Módulo puro state-machine
│   └── i18n/
│       ├── messages/en.js      ← (Alterado) Strings Harness
│       └── messages/pt-BR.js   ← (Alterado) Strings Harness
├── template/
│   ├── .aioson/agents/
│   │   └── validator.md        ← (Novo) Agente de auditoria (Fase 3)
│   └── .aioson/skills/static/
│       └── harness-validate/   ← (Novo) Skill injetada automaticamente
```

---

## Arquitetura de Componentes por Fase

### Fase 1 — Gateway Ativo e Circuit Breaker
- **`src/harness/circuit-breaker.js`**: Desenvolvido como um módulo **PURO** e assíncrono.
  - Não deve depender de contexto do `cli.js` ou variáveis globais.
  - **Entradas:** Paths absolutos para `harness-contract.json` e `progress.json`.
  - **Estado:** Lê, computa transição e escreve de volta no `progress.json`.
  - **Transições de Estado:** `CLOSED` ↔ `OPEN` ↔ `HALF_OPEN`. Abertura acionada por `consecutive_errors >= governor.error_streak_limit` ou `iterations >= max_steps`.
- **Injeção no Gateway (`self-implement-loop.js`)**:
  - Middleware rápido: `if (!fs.existsSync(contractPath)) return runLegacyLoop();`
  - Substituição de constantes hardcoded (ex: iterações fixas) por `contract.governor.*`.

### Fase 2 — Contractual Handshake
- **`src/commands/harness.js`**: Controlador semântico.
  - `harness:init`: Operação I/O idempotente. Cria stubs se não existirem. Não sobrescreve.
  - `harness:validate`: Proxy command. Ele chama diretamente a função exportada por `verify-gate.js` (passando o contrato), lê o JSON resultante e delega a atualização de estado para `circuit-breaker.js`.
- **Skill Estática**: O agente `@dev` deve carregar `harness-validate/SKILL.md` automaticamente se o projeto for `MEDIUM`. A skill ensina o dev a usar o comando `harness:validate` antes do commit.

### Fase 3 — Isolamento do Validador
- **Subprocess Spawn (`aioson agent:prompt validator .`)**: 
  - Para garantir a ausência de contaminação de contexto, o `@validator` **não** pode ser instanciado via API interna passando o array de mensagens do `@dev`. 
  - Ele deve ser instanciado via subprocesso Node (`child_process.exec` ou `spawn`). 
  - O output STDOUT do processo validador deve ser parseado para extrair o JSON `{ criteria_results }`, que então é processado pelo Circuit Breaker.

---

## Relacionamentos e Fluxo de Dados (I/O)

1. `harness:init` → Escreve → `progress.json` + `harness-contract.json`
2. `@dev` (loop) → Invoca CLI → `self:loop --contract`
3. `self:loop` → Lê → `progress.json` → Se `OPEN`, aborta. Se `CLOSED`, prossegue.
4. `@validator` → Lê → `completed_steps` (arquivos criados) + `harness-contract.json`.
5. `@validator` → STDOUT JSON → `verify:gate` → Circuit Breaker → `progress.json`.

---

## Preocupações Transversais

- **Tratamento de Erros:** O Circuit Breaker não "crasha" (throw Node.js Fatal). Ele retorna objetos `{ allowed: false, reason: 'string' }` para que o CLI possa traduzir (i18n) e exibir avisos amigáveis ao usuário.
- **Corrupção de JSON:** Todo parse de `progress.json` e `harness-contract.json` deve usar um `try/catch` robusto. Se o `progress.json` estiver corrompido, criar um novo com estado de recuperação (`session_count: estimado`).
- **Segurança:** O comando `harness:validate` nunca executa código de strings arbitrárias. Ele chama verificadores preexistentes do sistema.

---

## Sequência de Implementação para `@dev`

Para garantir estabilidade, o `@dev` deve implementar estritamente nesta ordem:

1. **(Fase 1) `circuit-breaker.js`**: Criar a state-machine pura com testes unitários locais.
2. **(Fase 1) `self-implement-loop.js`**: Injetar as travas do Circuit Breaker. Validar backward-compatibility (zero impacto sem arquivo).
3. **(Fase 2) `harness.js` (CLI)**: Implementar `harness:init` e registro no `cli.js`.
4. **(Fase 2) Template e Skill**: Criar o agente `@validator` e a skill `harness-validate`.
5. **(Fase 3) `verify-gate.js`**: Injetar `--contract` e o parse de `criteria_results`.

---

## Itens Adiados / Não Objetivos
- Painel UI para acompanhamento visual do Circuit Breaker (fora de escopo).
- Migração em massa de features SDD para Harness (apenas projetos novos ou por opt-in manual).
- Integração de limitação por "Custos em USD" (rastreio mantido puramente em token_count para esta versão).

---
## Constitution check
- [x] Article I: Artefato de spec precedeu a arquitetura (`requirements-harness-driven-aioson.md` e schema de entidades lido).
- [x] Article II: Profundidade proporcional à classificação (MEDIUM).
- [x] Article VI: Sem camadas desnecessárias. Injeção de lógica via flags e submódulos, sem reescrita de core engine.

> **Gate B:** Arquitetura aprovada — @dev pode prosseguir com o plano de implementação.