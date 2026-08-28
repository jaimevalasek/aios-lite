---
feature: execution-roles-onboarding
status: approved
source_prd: .aioson/context/prd-execution-roles-onboarding.md
source_briefing: null
sheldon_review: required
prototype: null
prototype_status: none
prototype_feature: null
---

# Implementation Plan — execution-roles-onboarding

## Objective

Quem pede execução dividida recebe do planner um arquivo de papéis já pronto e desligado, e ao ligar a execução é perguntado uma vez sobre os modelos ainda no padrão do harness — nunca recusado por não ter escolhido.

> Esta feature **fala sobre** execução dividida; ela não **usa** execução dividida. Não há `## Development execution lanes` nem `## Execution Sequence` aqui, porque nem o dono nem o PRD pediram hosts/modelos distintos para implementá-la. O caminho é o DEV único.

## Repository evidence

- **Production entry point:** `aioson <comando>` via `src/cli.js` (bin `bin/aioson.js`). Os comandos `execution:*` caem em `src/commands/execution.js:runExecution` pelo prefixo (`src/cli.js:2022`), que despacha por `sub`.
- **Existing patterns to reuse:**
  - `src/lib/execution-roles.js` — dono do formato do arquivo: `validateExecutionRoles` (:67), `readExecutionRoles` (:237), `resolveLaneRoles` (:268), `checkRoleSignatures` (:283), `offerExecution` (:310), `laneRoleKey` (:63), `executionRolesPath` (:58).
  - `src/lib/tool-capabilities.js:141` — `listExecutionHosts()` responde quais CLIs servem como host de execução, lendo o registro; nenhuma lista chumbada.
  - `src/harness/plan-waves.js:130` — `parseDevelopmentLanes` já exige **apenas** `lane` e `write_paths`; `host` e `model` são opcionais (`findIndex` → -1 → string vazia) e os cabeçalhos já aceitam português (`faixa`, `caminhos`, `modelo`, `dono`).
  - `src/agent-execution/execution-plan.js:364` — `lane_role_mismatch` já guarda em `lane.plan_host && …`, então coluna ausente não dispara aviso.
  - `tests/execution-compile.test.js` — já importa `validateExecutionRoles`, `offerExecution` e `laneRoleKey` e já monta projeto temporário com o arquivo de papéis (`:118`, `:483`). É a casa dos testes das fases 1 e 2.
  - `tests/agent-contracts.test.js` — casa do teste que lê instrução de agente.
- **Test runner:** `npm run test:boundaries` (resolvido por `aioson detect:test-runner`; `node:test`). QA reusa este comando exato.

### Duas descobertas que encurtam o trabalho

1. **A forma semeada já é válida hoje.** `validateExecutionRoles` aceita `model: "configured-default"` sobre host do registro; modelo vazio é recusado (`must be a non-empty model id`) e esforço em host que não aceita é recusado (`effort_unsupported_by_host`). Verificado executando o validador real. Nenhuma mudança de contrato do arquivo é necessária para a semeadura.
2. **A tabela de faixas sem host/modelo já parseia.** Só `lane` e `write_paths` são obrigatórias. Tirar as colunas da instrução do planner não exige tocar no parser, e plano antigo continua lendo porque as colunas seguem opcionais nos dois sentidos.

## Engineering Controls

| Concern | Evidence / trigger | Planned control | Verification | Recovery |
|---|---|---|---|---|
| authorization/ownership | `src/lib/execution-roles.js` declara no cabeçalho que o framework nunca escreve o arquivo, porque ele é o que autoriza subir processo externo. A fase 1 passa a escrevê-lo | O escritor grava **sempre** `enabled: false` e nunca aceita ligar; o cabeçalho do módulo é reescrito na mesma edição para dizer a propriedade que continua valendo — o framework prepara, nunca destranca | `npm run test:boundaries` (AC-seed-disabled) + `aioson execution:offer` sobre o arquivo recém-semeado devolvendo `roles_disabled` | Apagar o arquivo semeado; ele não deixa estado fora dele |
| compatibility | O mesmo arquivo é lido pela tela do AIOSON Play (`src/components/features/maintenance/execution-roles-panel.tsx`, outro repositório) e por `execution:compile`. `validateExecutionRoles` recusa chave de raiz desconhecida (`unknown field`) | `models_confirmed` entra em `ROOT_KEYS` junto com o código que a escreve, nunca depois. A tela do Play remonta o documento ao salvar e portanto descarta a chave — comportamento correto e desejado: quem edita papéis pela tela deve reabrir a pergunta | `npm run test:boundaries` (validação aceita o documento com a chave e continua recusando chave inventada) | Remover a chave do arquivo; a ausência dela significa "nunca confirmado", que é o estado inicial |
| idempotency | O planner roda ao fim de cada planejamento e pode rodar de novo na mesma feature | A semeadura nunca sobrescreve: arquivo presente → não escreve e relata quais papéis das faixas faltam nele | `npm run test:boundaries` (AC-seed-preserves), semeando duas vezes e comparando o conteúdo | Nenhuma: a operação não altera arquivo existente |
| failure/retry | Pasta somente-leitura, permissão negada, disco cheio | A falha de escrita é relatada com a causa e nunca engolida; o plano é entregue do mesmo jeito | `npm run test:boundaries` (AC-seed-write-failure) com destino recusado | Nenhum estado parcial: escrita atômica não é exigida porque o arquivo é pequeno e a falha não deixa arquivo meio escrito legível — o leitor recusa JSON inválido (`roles_invalid`) |
| validation | Cada papel semeado precisa passar pela mesma validação que o leitor aplica | O escritor valida o documento com `validateExecutionRoles` **antes** de gravar e recusa gravar um documento inválido | `npm run test:boundaries` (AC-seed-valid) | Nada é gravado quando a validação falha |

Concerns considerados e **não** acionados, com o limite inspecionado: performance (o arquivo tem ordem de dezenas de linhas e é lido uma vez por oferta), concorrência (uma sessão de planner por vez escreve; a semeadura não sobrescreve, então corrida perde para o primeiro), migração de dados (nenhum estado anterior a converter — a chave nova é opcional e ausente significa o estado inicial), acessibilidade/localização (superfície é CLI e já usa o logger existente).

## Implementation Delta

| CAP | Action | Existing evidence | Exact paths | Required change |
|---|---|---|---|---|
| CAP-execution-roles-onboarding-seed | modify | `src/lib/execution-roles.js` é dono do formato e só lê (`readExecutionRoles`, `validateExecutionRoles`, `offerExecution`); nenhuma função de escrita | src/lib/execution-roles.js | Acrescentar `seedExecutionRoles(projectDir, { lanes, feature, hosts })`, que monta o documento, valida antes de gravar, recusa gravar por cima e devolve desfecho nomeado (`seeded`, `already_present`, `no_execution_host`, `write_failed`). Reescrever o cabeçalho do módulo: o framework passa a escrever, e nunca a destrancar |
| CAP-execution-roles-onboarding-reviewer-differs | modify | `listExecutionHosts()` (`src/lib/tool-capabilities.js:141`) já lista as CLIs; `execution-plan.js:361` já avisa quando implementador e revisor coincidem | src/lib/execution-roles.js | Dentro de `seedExecutionRoles`: revisor recebe a segunda CLI da lista quando houver; com uma só, recebe a mesma e o desfecho carrega `independent_review: false` |
| CAP-execution-roles-onboarding-seed | modify | `src/commands/execution.js` despacha por `sub` (`offer`, `compile`, `run`, `decide`, `status`, `graph`) | src/commands/execution.js | Acrescentar `sub === 'seed'`, lendo `--lanes=` (lista separada por vírgula) e `--feature=`, com saída legível e `--json` |
| CAP-execution-roles-onboarding-seed | modify | A lista de comandos de `src/cli.js:705-717` nomeia cada par `execution:x` / `execution-x` | src/cli.js | Registrar `execution:seed` e `execution-seed` |
| CAP-execution-roles-onboarding-confirm | modify | `offerExecution` (`src/lib/execution-roles.js:310`) decide em ligado → assinaturas → disponível; `digest` (:249) é sha256 do **texto inteiro** do arquivo | src/lib/execution-roles.js | Acrescentar `models_confirmed` a `ROOT_KEYS` e à validação; acrescentar `rolesDigest(roles)` — sha256 do mapa de papéis canonizado, **não** do arquivo, porque guardar o digest do arquivo dentro do próprio arquivo é auto-referente; inserir em `offerExecution` o degrau de pendência **entre** ligado e assinaturas; acrescentar `confirmDefaultModels(projectDir)` que grava a confirmação com o digest corrente |
| CAP-execution-roles-onboarding-confirm | modify | O manipulador de `sub === 'offer'` (`src/commands/execution.js:142`) já monta a resposta e a linha legível | src/commands/execution.js | Reportar a pendência com papel, host e modelo; aceitar `--confirm-defaults`, que grava a confirmação e reavalia a oferta na mesma chamada |
| CAP-execution-roles-onboarding-plan-owns-lanes-only | modify | `.aioson/agents/planner.md:130` e o gêmeo em `template/` mandam escrever `\| Lane \| Host \| Model \| Exact write paths \| Integration owner \|` | .aioson/agents/planner.md, template/.aioson/agents/planner.md | Tabela passa a `\| Lane \| Exact write paths \| Integration owner \|`; a instrução ganha o passo de rodar `aioson execution:seed` ao fechar um plano com faixas, e a frase de que escolher modelo é do dono |
| CAP-execution-roles-onboarding-plan-owns-lanes-only | modify | `docs/pt/4-agentes/planner.md` é a doc pt do mesmo agente | docs/pt/4-agentes/planner.md | Acompanhar a instrução |
| CAP-execution-roles-onboarding-plan-owns-lanes-only | modify | `src/agent-execution/execution-plan.js:286` nomeia as colunas antigas na mensagem de tabela ausente | src/agent-execution/execution-plan.js | A mensagem passa a nomear as colunas que o parser realmente exige |
| CAP-execution-roles-onboarding-seed | modify | `tests/execution-compile.test.js` já monta projeto temporário com o arquivo de papéis (`:118`) e já importa o validador (`:12`) | tests/execution-compile.test.js | Testes da semeadura citando `AC-seed-writes`, `AC-seed-disabled`, `AC-seed-valid`, `AC-seed-installed-host`, `AC-seed-default-model`, `AC-seed-preserves`, `AC-seed-no-host`, `AC-seed-source`, `AC-seed-write-failure` |
| CAP-execution-roles-onboarding-reviewer-differs | modify | Mesmo arquivo de teste, mesmo projeto temporário | tests/execution-compile.test.js | Teste citando `AC-reviewer-differs`, nos dois cenários de registro de hosts |
| CAP-execution-roles-onboarding-confirm | modify | `tests/execution-compile.test.js` já importa `offerExecution` (`:12`) | tests/execution-compile.test.js | Testes citando `AC-offer-asks`, `AC-offer-partial`, `AC-offer-silent`, `AC-offer-before-signature`, `AC-confirm-sticks` |
| CAP-execution-roles-onboarding-plan-owns-lanes-only | modify | `tests/agent-contracts.test.js` já lê arquivos de instrução de agente; `tests/execution-compile.test.js` já compila plano de projeto temporário | tests/agent-contracts.test.js, tests/execution-compile.test.js | Teste citando `AC-plan-table` (a instrução, no repositório e em `template/`, não nomeia mais coluna de host nem de modelo) e teste citando `AC-plan-legacy` (plano com a tabela antiga segue compilando) |

## Capability Delivery Plan

| CAP | Phase | Files | Verification |
|---|---|---|---|
| CAP-execution-roles-onboarding-seed | 1 | src/lib/execution-roles.js, src/commands/execution.js, src/cli.js, tests/execution-compile.test.js | `npm run test:boundaries` + `aioson execution:seed <projeto-temporário> --lanes=backend,frontend --feature=exemplo --json` num projeto sem o arquivo |
| CAP-execution-roles-onboarding-reviewer-differs | 1 | src/lib/execution-roles.js, tests/execution-compile.test.js | `npm run test:boundaries` (dois cenários de registro de hosts) |
| CAP-execution-roles-onboarding-confirm | 2 | src/lib/execution-roles.js, src/commands/execution.js, tests/execution-compile.test.js | `npm run test:boundaries` + `aioson execution:offer <projeto> --json` antes e depois de `--confirm-defaults` |
| CAP-execution-roles-onboarding-plan-owns-lanes-only | 3 | .aioson/agents/planner.md, template/.aioson/agents/planner.md, docs/pt/4-agentes/planner.md, src/agent-execution/execution-plan.js, tests/agent-contracts.test.js, tests/execution-compile.test.js | `npm run test:boundaries` + `aioson execution:compile <projeto> --feature=<slug> --dry-run` sobre um plano com a tabela nova e outro com a antiga |

## Phase 1 — O arquivo de papéis nasce pronto e desligado

- **CAP/AC:** CAP-execution-roles-onboarding-seed, CAP-execution-roles-onboarding-reviewer-differs — AC-seed-writes, AC-seed-disabled, AC-seed-valid, AC-seed-installed-host, AC-seed-default-model, AC-seed-preserves, AC-seed-no-host, AC-seed-source, AC-seed-write-failure, AC-reviewer-differs
- **User-visible outcome:** num projeto sem o arquivo, `aioson execution:seed . --lanes=backend,frontend --feature=x` produz `.aioson/config/execution-roles.json` com `backend_dev`, `frontend_dev` e `qa`, desligado, cada papel numa CLI presente na máquina, no modelo padrão do harness, declarando que foi o planner que o semeou. Sem CLI de execução, sem arquivo e com a causa dita. Com o arquivo já lá, nada muda e a resposta diz quais papéis faltam.
- **Implementation:** `seedExecutionRoles` monta o documento a partir de `listExecutionHosts()` (`src/lib/tool-capabilities.js:141`, lido sem alteração) e da lista de faixas, valida com `validateExecutionRoles` antes de gravar, e devolve desfecho nomeado. O escritor nunca produz `enabled: true`. O cabeçalho do módulo é reescrito na mesma edição. O sub `seed` de `src/commands/execution.js` lê `--lanes`/`--feature` e imprime o caminho, os papéis e a frase de que trocar modelo é opcional; `src/cli.js` registra o par de nomes.
- **Create/modify/reuse/retire:**
  - modify `src/lib/execution-roles.js`
  - modify `src/commands/execution.js`
  - modify `src/cli.js`
  - modify `tests/execution-compile.test.js`
- **Verification:** `npm run test:boundaries`; depois, num diretório temporário, `aioson execution:seed <dir> --lanes=backend,frontend --feature=exemplo --json` e `aioson execution:offer <dir> --json` devolvendo `roles_disabled`.
- **Done when:** o arquivo existe, valida, está desligado, e rodar o comando de novo não altera uma linha.

## Phase 2 — A oferta pergunta antes de cobrar assinatura

- **CAP/AC:** CAP-execution-roles-onboarding-confirm — AC-offer-asks, AC-offer-partial, AC-offer-silent, AC-offer-before-signature, AC-confirm-sticks
- **User-visible outcome:** com o arquivo ligado e os papéis no modelo padrão, `aioson execution:offer` responde pendente de confirmação nomeando papel, host e modelo — mesmo sem nenhuma assinatura de host na máquina. `--confirm-defaults` registra a decisão e a oferta segue para o veredito de assinatura. Repetir a oferta não pergunta de novo; trocar um modelo reabre a pergunta.
- **Implementation:** `ROOT_KEYS` ganha `models_confirmed` e a validação a aceita como `{ at, digest }`. `rolesDigest(roles)` calcula sha256 sobre o mapa de papéis canonizado — o `digest` existente é do texto inteiro do arquivo e não serve, porque gravar a confirmação mudaria o próprio valor que ela cita. Em `offerExecution`, entre o degrau de ligado e o de assinaturas, os papéis cujo modelo é o padrão do harness e que não estejam cobertos por uma confirmação de digest corrente viram `pending_confirmation`. `confirmDefaultModels` grava `{ at, digest }` com o digest corrente. O sub `offer` reporta a pendência e aceita `--confirm-defaults`.
- **Create/modify/reuse/retire:**
  - modify `src/lib/execution-roles.js`
  - modify `src/commands/execution.js`
  - modify `tests/execution-compile.test.js`
- **Verification:** `npm run test:boundaries`; depois, sobre o projeto temporário da fase 1 com o arquivo ligado à mão e o registro de assinaturas vazio: `aioson execution:offer <dir> --json` (pendência), `aioson execution:offer <dir> --confirm-defaults --json` (segue), `aioson execution:offer <dir> --json` (não pergunta de novo).
- **Done when:** a pendência aparece antes de qualquer cobrança de assinatura, some depois de confirmada, e volta quando um modelo muda.

## Phase 3 — O plano deixa de nomear modelo, e o planner semeia

- **CAP/AC:** CAP-execution-roles-onboarding-plan-owns-lanes-only — AC-plan-table, AC-plan-legacy
- **User-visible outcome:** a instrução do planner descreve a tabela de faixas com faixa, caminhos e dono da integração, manda rodar `aioson execution:seed` ao fechar um plano com faixas, e diz que escolher modelo é do dono. Um plano escrito nessa forma compila; um plano antigo, com as colunas, também.
- **Implementation:** edição das três instruções (repositório, `template/`, doc pt) e da mensagem de `lanes_table_missing`, que hoje nomeia colunas que o parser não exige. Nenhuma mudança no parser: `parseDevelopmentLanes` (`src/harness/plan-waves.js:130`) já trata host e modelo como opcionais e é lido sem alteração.
- **Create/modify/reuse/retire:**
  - modify `.aioson/agents/planner.md`
  - modify `template/.aioson/agents/planner.md`
  - modify `docs/pt/4-agentes/planner.md`
  - modify `src/agent-execution/execution-plan.js`
  - modify `tests/agent-contracts.test.js`
  - modify `tests/execution-compile.test.js`
- **Verification:** `npm run test:boundaries`; depois `aioson execution:compile <dir> --feature=<slug> --dry-run --json` sobre um plano com a tabela nova e outro com a antiga, sem erro novo em nenhum dos dois.
- **Done when:** as três instruções não nomeiam mais host nem modelo na tabela, o teste de contrato prova isso, e as duas formas de plano compilam.
