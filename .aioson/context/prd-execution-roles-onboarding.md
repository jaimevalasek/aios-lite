---
feature: execution-roles-onboarding
classification: MEDIUM
feature_completeness: required
product_scope: approved
prd_ready: approved
sheldon_review: approved
prototype: null
prototype_status: none
prototype_feature: null
identity: null
identity_status: none
---

# PRD — Execução dividida: o arquivo de papéis chega pronto

## Vision

Quem pede execução dividida recebe do planner um arquivo de execução **já pronto para rodar**: um papel por faixa, apontando uma CLI que existe naquela máquina, no modelo padrão do harness. Escolher modelo vira melhoria, não pré-requisito. E, na hora de rodar, o orquestrador pergunta uma vez sobre os papéis que continuam no padrão — em vez de recusar quem nem sabia que havia o que escolher.

## Problem and users

O caminho orquestrado (faixas rodando em paralelo, uma CLI por papel) só destranca com `.aioson/config/execution-roles.json`. Hoje esse arquivo:

1. **Não tem quem o crie.** Nenhum agente o escreve e nenhuma instrução de agente sequer o menciona — `grep` por `execution-roles` em `.aioson/agents/` e `.aioson/docs/` não devolve nada. O único escritor é a tela do Play. Quem usa o aioson no próprio projeto e pede execução dividida não descobre que precisa de `backend_dev`, nem quais CLIs contam como host.
2. **Recusa em vez de orientar.** Sem o arquivo, `execution:offer` responde `lane_without_role` e o caminho fica indisponível. A mensagem está correta e é inútil para quem chegou agora.
3. **Tem dois donos nomeando o modelo.** O planner preenche colunas `Host | Model` na tabela de faixas do plano; o arquivo de papéis é que decide. O motor já concilia (`lane_role_mismatch`, "the roles file wins"), o que prova que a duplicidade existe e incomoda.

**Usuários:**

- **Quem usa o aioson no próprio projeto, pelo Play, e pede execução dividida.** Não conhece o formato, não sabe quais CLIs servem, e não deveria precisar saber para dar a primeira rodada.
- **Dono de um projeto que já sabe o que quer.** Precisa que o arquivo nasça com os papéis certos para só trocar os modelos, sem montar estrutura à mão.
- **Quem roda só a CLI, sem Play.** Precisa que a semeadura e a confirmação existam fora da tela.

## Feature Capability Map

| CAP | Promised outcome | Actor / trigger | Scope decision | Rationale |
|---|---|---|---|---|
| CAP-execution-roles-onboarding-seed | Ao fechar um plano com execução dividida, o planner grava `.aioson/config/execution-roles.json` com um papel por faixa mais o revisor, cada um apontando uma CLI presente na máquina e o modelo padrão do harness, e o arquivo nasce desligado | planner conclui o plano com faixas declaradas | required | É o planner que acabou de decidir as faixas; ninguém mais sabe quais papéis existem antes de a implementação começar |
| CAP-execution-roles-onboarding-reviewer-differs | Havendo mais de uma CLI de execução instalada, o revisor nasce apontando para uma diferente da do implementador da faixa | mesma gravação | required | O motor já avisa quando implementador e revisor são o mesmo modelo; entregar o arquivo com esse aviso aceso é entregar algo que já pede conserto |
| CAP-execution-roles-onboarding-confirm | Antes de rodar, o orquestrador nomeia os papéis que continuam no modelo padrão e pede uma confirmação; confirmado, o caminho fica disponível e a pergunta não volta | dono pede execução orquestrada | required | Não ter escolhido modelo é o caso comum e não é erro. Recusar por isso trava exatamente quem a feature quer atender |
| CAP-execution-roles-onboarding-plan-owns-lanes-only | A tabela de faixas do plano declara faixa, caminhos e dono da integração — e deixa de declarar host e modelo | planner escreve o plano | required | Dois lugares nomeando o modelo é a origem do aviso de divergência; o arquivo de papéis é o dono e o plano não deveria opinar |

## Current System Fit

| CAP | Existing behavior / evidence | Fit decision | Required product delta |
|---|---|---|---|
| CAP-execution-roles-onboarding-seed | `src/lib/execution-roles.js` só lê e valida — exporta `readExecutionRoles`, `validateExecutionRoles`, `offerExecution` e nenhuma função de escrita; o cabeçalho do módulo declara literalmente que o framework nunca escreve o arquivo. O único escritor é a tela do Play | new | Passa a existir um escritor no framework, restrito a gravar o arquivo **desligado**. A propriedade que o módulo protege é "o framework não destranca execução sozinho", e ela continua inteira: ligar segue sendo ato de pessoa |
| CAP-execution-roles-onboarding-reviewer-differs | `src/agent-execution/execution-plan.js:361` já emite `self_review_same_model`; `listExecutionHosts()` em `src/lib/tool-capabilities.js:141` já responde quais CLIs servem como host de execução | reuse | Nenhum dado novo: a semeadura consome as duas leituras que já existem |
| CAP-execution-roles-onboarding-confirm | `offerExecution` (`src/lib/execution-roles.js:310`) decide em três degraus, nesta ordem: ligado → assinaturas → disponível; devolve `available: false` com motivo (`roles_disabled`, `signature_*`). `execution-plan.js:340-346` trata faixa sem papel como erro duro. Existe mecanismo de pergunta (`decision_required` + `execution:decide`, `execution-run.js:797`) mas só **durante** a corrida, para host que caiu | extend | A oferta ganha um degrau **entre ligado e assinaturas**: pendente de confirmação, nomeando papel, host e o modelo que seria usado. A posição importa — papel semeado nunca tem assinatura, então a ordem de hoje mandaria a pessoa assinar um modelo que ela estava prestes a trocar |
| CAP-execution-roles-onboarding-plan-owns-lanes-only | `.aioson/agents/planner.md:130` e `template/.aioson/agents/planner.md` mandam escrever `\| Lane \| Host \| Model \| Exact write paths \| Integration owner \|`; `execution-plan.js:364` já trata as duas colunas como informativas e avisa quando divergem do arquivo | extend | As colunas saem da instrução do planner e da doc pt. Planos antigos continuam legíveis: o motor já sabe ignorar as colunas |

O valor `configured-default` **já é aceito hoje** no campo de modelo (`validateExecutionRoles` exige apenas string não-vazia) e já é o padrão da assinatura de host (`normalizeModel`, `src/lib/host-signature.js:57`). A feature não inventa um estado novo de "sem modelo": usa o que já significa "o que o harness usar".

## MVP scope

- Gravação do arquivo pelo planner ao fechar um plano com faixas: um papel `{faixa}_dev` por faixa, mais o revisor `qa`, com `enabled` desligado.
- Host de cada papel escolhido entre as CLIs de execução presentes na máquina; revisor diferente do implementador quando houver mais de uma.
- Modelo de cada papel no padrão do harness.
- O arquivo gravado diz de onde veio, para quem o abre saber que foi o planner e que mexer nele é esperado.
- Uma pergunta do orquestrador quando algum papel continua no padrão, nomeando papel, host e modelo, com desfecho registrado para não se repetir.
- Tabela de faixas do plano sem host e sem modelo — na instrução do planner (repositório e `template/`) e na doc pt.
- Recusa nomeada quando a máquina não tem nenhuma CLI de execução: o arquivo não é gravado e o planner diz o porquê.

## Out of scope

- **Escolher o modelo por conta própria** — ranking, custo, "esse é melhor para frontend". A escolha é do dono; a feature só entrega o arquivo pronto para receber a escolha.
- **Ligar a execução orquestrada sem pessoa.** O arquivo nasce desligado e nada no framework o liga.
- **Assinar host durante a semeadura.** Assinar roda a CLI de verdade; fazer isso no meio do planejamento gasta tempo e cota do dono sem ele ter pedido.
- **Mudar a tela do Play.** O painel já lê o arquivo e já marca papel sem assinatura. O acerto fino de lá é trabalho seguinte, no repositório do Play.
- **Esforço de raciocínio por papel na semeadura.** Só um host aceita esforço hoje; nascer com esforço seria nascer inválido nos demais.
- **Faixa fora do par backend/frontend** continua livre, sem tratamento especial nem lista fechada.

## User flows

**Caminho feliz — primeira vez**

1. O dono pede execução dividida ao planejar. O planner corta a implementação em `backend` e `frontend` e escreve o plano com os caminhos de cada faixa.
2. Ao fechar, o planner grava o arquivo de papéis: `backend_dev`, `frontend_dev` e `qa`, cada um com uma CLI presente na máquina e o modelo padrão do harness. O arquivo está desligado. O planner diz onde ficou e que trocar modelo é opcional.
3. O dono liga a execução orquestrada. O orquestrador vê que os três papéis continuam no padrão e pergunta uma vez, nomeando os três — **antes** de cobrar assinatura de host, para não mandar assinar um modelo que ele estava prestes a trocar.
4. O dono confirma. Só então a oferta cobra o que falta assinar, se faltar, e a corrida começa.

**Esqueceu de escolher, e depois escolhe**

1. Mesma pergunta do passo 3. O dono responde que quer escolher.
2. Ele troca o modelo de `backend_dev` e deixa os outros dois no padrão.
3. Na próxima oferta, a pergunta cita apenas os dois que continuam no padrão.

**Já escolheu tudo**

O orquestrador não pergunta nada: papel com modelo escolhido pelo dono nunca entra na pergunta.

**Máquina sem CLI de execução**

O planner não grava o arquivo, entrega o plano normalmente e diz, em uma linha, que nenhuma CLI de execução foi encontrada e qual instalar. O caminho de DEV único segue intocado.

**Não deu para gravar**

Pasta somente-leitura, permissão negada, disco cheio: o plano é entregue do mesmo jeito e a falha é dita com a causa. Nunca silêncio — o dono não deveria descobrir que o arquivo não existe só na hora de rodar.

**Arquivo já existe**

A semeadura não toca em arquivo existente. O planner diz que o arquivo já estava lá e quais papéis das faixas novas faltam nele.

## Success metrics

- Um dono que nunca configurou execução dividida vai do plano à primeira corrida orquestrada **sem abrir documentação**.
- `lane_without_role` deixa de aparecer em plano novo com faixas.
- `lane_role_mismatch` deixa de ter o que conciliar em plano novo, porque o plano não nomeia mais modelo.
- A oferta de execução nunca mais responde "indisponível" por um motivo que uma confirmação resolveria.

## Prototype contract

`status: none`. A feature não tem superfície visual própria: o planner escreve um arquivo e o orquestrador devolve um desfecho a mais. A tela que exibe o arquivo é do AIOSON Play e não é alterada aqui. Nenhum protótipo histórico foi considerado ou excluído.

## Open questions

- **Onde fica registrado que a confirmação já foi dada** — campo no próprio arquivo, comando próprio, ou estado da corrida. É decisão técnica do `@planner`: nenhuma das três muda o comportamento prometido ("a pergunta não volta depois de confirmada"). **Não bloqueante.**

## Acceptance Criteria

| AC | CAP | Observable behavior | Evidence |
|---|---|---|---|
| AC-execution-roles-onboarding-seed-writes | CAP-execution-roles-onboarding-seed | Fechado um plano com as faixas `backend` e `frontend`, o arquivo `.aioson/config/execution-roles.json` passa a existir com os papéis `backend_dev`, `frontend_dev` e `qa`, sem que nenhuma assinatura de host seja rodada no caminho (RULE-execution-roles-onboarding-05) | Teste que semeia a partir de uma lista de faixas e afirma as chaves gravadas |
| AC-execution-roles-onboarding-seed-disabled | CAP-execution-roles-onboarding-seed | O arquivo gravado pela semeadura tem a execução desligada, e a oferta de execução sobre ele responde que está desligada — nunca disponível (RULE-execution-roles-onboarding-01) | Teste que semeia e chama a oferta sobre o arquivo recém-gravado |
| AC-execution-roles-onboarding-seed-valid | CAP-execution-roles-onboarding-seed | O arquivo gravado passa na própria validação do formato, sem nenhum reparo à mão | Teste que semeia e valida o documento gravado pela validação existente |
| AC-execution-roles-onboarding-seed-installed-host | CAP-execution-roles-onboarding-seed | Todo papel gravado aponta para uma CLI de execução presente na máquina (RULE-execution-roles-onboarding-03) | Teste com registro de hosts controlado, afirmando que o host de cada papel está na lista |
| AC-execution-roles-onboarding-seed-default-model | CAP-execution-roles-onboarding-seed | Todo papel gravado nasce no modelo padrão do harness | Teste afirmando o valor do modelo de cada papel gravado |
| AC-execution-roles-onboarding-seed-preserves | CAP-execution-roles-onboarding-seed | Com o arquivo já existente, a semeadura não altera uma única linha dele e informa quais papéis das faixas faltam (RULE-execution-roles-onboarding-02) | Teste que semeia duas vezes e compara o conteúdo do arquivo entre as duas |
| AC-execution-roles-onboarding-seed-no-host | CAP-execution-roles-onboarding-seed | Sem nenhuma CLI de execução na máquina, nada é gravado e a recusa nomeia a causa e o que instalar | Teste com registro de hosts vazio |
| AC-execution-roles-onboarding-seed-source | CAP-execution-roles-onboarding-seed | O arquivo gravado declara que foi o planner que o semeou, e para qual feature | Teste afirmando o campo de origem do documento gravado |
| AC-execution-roles-onboarding-seed-write-failure | CAP-execution-roles-onboarding-seed | Quando a gravação falha, o plano é entregue mesmo assim e a falha é relatada com a causa — nunca em silêncio | Teste com destino de escrita recusado |
| AC-execution-roles-onboarding-reviewer-differs | CAP-execution-roles-onboarding-reviewer-differs | Com duas ou mais CLIs de execução instaladas, o revisor gravado não é a mesma CLI do implementador da faixa; com apenas uma, é a mesma e a semeadura registra que a revisão não é independente | Teste nos dois cenários de registro de hosts |
| AC-execution-roles-onboarding-offer-asks | CAP-execution-roles-onboarding-confirm | Com o arquivo ligado e todos os papéis no modelo padrão, a oferta responde pendente de confirmação — nunca indisponível — e nomeia papel, host e modelo de cada pendência | Teste da oferta sobre um arquivo ligado com papéis no padrão |
| AC-execution-roles-onboarding-offer-before-signature | CAP-execution-roles-onboarding-confirm | Com papéis no modelo padrão e nenhuma assinatura de host na máquina, a oferta devolve a pendência de confirmação, e não a cobrança de assinatura (RULE-execution-roles-onboarding-06) | Teste da oferta sobre arquivo semeado e ligado, com o registro de assinaturas vazio |
| AC-execution-roles-onboarding-offer-partial | CAP-execution-roles-onboarding-confirm | Com um papel no modelo escolhido pelo dono e outro no padrão, a pendência cita só o que está no padrão | Teste da oferta com o arquivo misto |
| AC-execution-roles-onboarding-offer-silent | CAP-execution-roles-onboarding-confirm | Com todos os papéis em modelo escolhido pelo dono, a oferta não devolve nenhuma pendência de confirmação (RULE-execution-roles-onboarding-04) | Teste da oferta com o arquivo inteiro preenchido |
| AC-execution-roles-onboarding-confirm-sticks | CAP-execution-roles-onboarding-confirm | Depois de confirmada, a mesma oferta não devolve a pendência de novo enquanto os papéis não mudarem | Teste que confirma e reconsulta a oferta |
| AC-execution-roles-onboarding-plan-table | CAP-execution-roles-onboarding-plan-owns-lanes-only | A instrução do planner, no repositório e em `template/`, descreve a tabela de faixas sem as colunas de host e de modelo, e a doc pt acompanha | Teste que lê os arquivos de instrução e afirma a ausência das colunas |
| AC-execution-roles-onboarding-plan-legacy | CAP-execution-roles-onboarding-plan-owns-lanes-only | Um plano antigo, com as colunas de host e modelo, continua sendo lido sem erro novo | Teste do leitor de plano sobre um plano com a tabela antiga |

## Business Rules

| Rule | Statement | Kind | Applies to | Source |
|---|---|---|---|---|
| RULE-execution-roles-onboarding-01 | O framework grava o arquivo de papéis apenas com a execução desligada; ligar a execução orquestrada é sempre ato de pessoa | invariant | feature-wide | Preserva a propriedade declarada em `src/lib/execution-roles.js` — o framework não destranca execução sozinho |
| RULE-execution-roles-onboarding-02 | A semeadura nunca sobrescreve nem altera um arquivo de papéis existente | invariant | CAP-execution-roles-onboarding-seed | O arquivo carrega escolha do dono; regravar apagaria trabalho dele |
| RULE-execution-roles-onboarding-03 | Papel semeado aponta apenas para CLI de execução presente na máquina | invariant | CAP-execution-roles-onboarding-seed | Semear host ausente entrega um arquivo que só falha na hora de rodar |
| RULE-execution-roles-onboarding-04 | Papel com modelo escolhido pelo dono nunca gera pergunta de confirmação | rule | CAP-execution-roles-onboarding-confirm | Perguntar sobre o que já foi decidido é atrito, e ensina o dono a confirmar sem ler |
| RULE-execution-roles-onboarding-05 | A semeadura não assina host: assinar roda a CLI de verdade e é ato do dono | invariant | CAP-execution-roles-onboarding-seed | Gastar cota do dono no meio do planejamento, sem pedido dele |
| RULE-execution-roles-onboarding-06 | A pendência de confirmação de modelo é avaliada antes do veredito de assinatura | invariant | CAP-execution-roles-onboarding-confirm | Papel semeado nunca tem assinatura; cobrar assinatura primeiro manda a pessoa gastar uma rodada de CLI num modelo que ela ia trocar |

## Decision Branches

| Branch | Condition | Expected behavior | AC |
|---|---|---|---|
| BR-execution-roles-onboarding-01 | Plano com faixas e arquivo de papéis ausente | Arquivo gravado, desligado, com um papel por faixa mais o revisor | AC-execution-roles-onboarding-seed-writes; AC-execution-roles-onboarding-seed-disabled |
| BR-execution-roles-onboarding-02 | Plano com faixas e arquivo de papéis já existente | Nada é alterado; a resposta nomeia os papéis das faixas que faltam nele | AC-execution-roles-onboarding-seed-preserves |
| BR-execution-roles-onboarding-03 | Nenhuma CLI de execução presente na máquina | Nada é gravado; a recusa nomeia a causa e o que instalar | AC-execution-roles-onboarding-seed-no-host |
| BR-execution-roles-onboarding-04 | Uma única CLI de execução presente | Implementador e revisor nascem na mesma CLI, com o registro de que a revisão não é independente | AC-execution-roles-onboarding-reviewer-differs |
| BR-execution-roles-onboarding-05 | Arquivo ligado com todos os papéis no modelo padrão | Oferta pendente de confirmação, nomeando cada papel | AC-execution-roles-onboarding-offer-asks |
| BR-execution-roles-onboarding-06 | Arquivo ligado com parte dos papéis no modelo padrão | Pendência cita só os que continuam no padrão | AC-execution-roles-onboarding-offer-partial |
| BR-execution-roles-onboarding-07 | Arquivo ligado com todos os modelos escolhidos pelo dono | Oferta segue direto, sem pendência | AC-execution-roles-onboarding-offer-silent |
| BR-execution-roles-onboarding-08 | Confirmação já dada e papéis inalterados | Oferta não pergunta de novo | AC-execution-roles-onboarding-confirm-sticks |
| BR-execution-roles-onboarding-09 | Plano antigo, com colunas de host e modelo na tabela de faixas | Lido sem erro novo; as colunas seguem informativas | AC-execution-roles-onboarding-plan-legacy |
| BR-execution-roles-onboarding-10 | Arquivo semeado e ligado, sem nenhuma assinatura de host | Pendência de confirmação de modelo vem primeiro; a cobrança de assinatura só depois | AC-execution-roles-onboarding-offer-before-signature |
| BR-execution-roles-onboarding-11 | Gravação do arquivo recusada pelo sistema de arquivos | Plano entregue; falha relatada com a causa | AC-execution-roles-onboarding-seed-write-failure |
