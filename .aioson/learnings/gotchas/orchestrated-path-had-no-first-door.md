---
title: "O caminho orquestrado só perguntava depois de destravado — e nada o destravava"
scope: src/lib/plan-scale.js, src/lib/execution-roles.js, src/commands/execution.js, src/commands/workflow-next.js, template/.aioson/agents/planner.md
src: "AIOSON supervised session: plano de 77 arquivos em 4 fases encadeadas saiu para um único DEV sequencial; o dono perguntou por que ninguém ofereceu o orquestrador com sub-agentes por modelo"
---

# A opção existia inteira e era invisível

Toda a máquina de execução orquestrada estava pronta — tabela de faixas,
`execution:compile`, motor de ondas, spawner, painel do cliente desktop — e
tinha **um único gatilho**: `execution:offer` respondendo `available: true`,
o que exige `.aioson/config/execution-roles.json` presente, habilitado e
assinado. O contrato do `@planner` mandava perguntar "DEV único ou faixas?"
**só** nesse caso. Nenhum agente criava o arquivo; o único escritor era uma
tela que o dono nunca abriu. Resultado: no primeiro uso de qualquer projeto a
resposta era sempre "não", o planner ficava em silêncio por contrato, e o
plano ia inteiro para um contexto só — sem que ninguém medisse o tamanho dele.

O erro de desenho: o gate media **destravamento**, nunca **escala**. Um plano
de 77 arquivos e um de 5 passavam pelo mesmo caminho verde.

## O que fecha o buraco

- `src/lib/plan-scale.js` mede o plano (arquivos distintos entre Delta, Plano
  de Entrega e Execution Sequence; fases; ondas; fases em paralelo; áreas por
  prefixo de caminho) e carrega `split_candidate` em **um** número: arquivos
  no piso de 12 (`AIOSON_EXECUTION_SPLIT_MIN_FILES`). A pergunta nasce da
  medida, não do arquivo.
- `execution:offer` nunca mais é beco sem saída: `onboarding.next` nomeia o
  passo que move o estado (`execution:seed` → ligar → `--confirm-defaults` →
  assinar → compilar) e `hosts.installed` diz quais CLIs existem na máquina.
- `execution:seed` grava o arquivo **desligado**, em host instalado, no modelo
  padrão, nunca por cima de um existente. O framework semeia; ligar, escolher
  modelo e assinar continuam atos de pessoa.
- Planner: pergunta uma vez quando `split_candidate` (esteja destravado ou
  não) e **registra** a resposta — `execution: single` no frontmatter ou a
  tabela de faixas. `workflow:next --complete=planner` imprime
  `[Execution Scale]` quando um candidato não tem resposta registrada
  (advisory: DEV único pode ser certo; cobra-se o registro).

## Armadilhas registradas

- O leitor do cliente desktop recusa **qualquer** chave de raiz desconhecida
  no arquivo de papéis (`roles_invalid:field:<key>`) — inclusive `execution`,
  que o framework já aceita. Estado novo (a confirmação de modelos padrão)
  mora em arquivo irmão (`execution-roles.confirmed.json`), nunca dentro.
- `fs.mkdir` recursivo sobre um caminho que é **arquivo** dá `EEXIST` no
  Windows: tratar `EEXIST` como "já existia" só no `writeFile` com `wx`,
  nunca no `mkdir` — senão falha de escrita vira `already_present`.
- Kernel do planner: orçamento medido em **chars** (14592); trocar a tabela
  `Lane | Host | Model | …` pela de três colunas pagou o texto novo.
- A pinagem "ativação do planner byte a byte igual sem o arquivo" era o
  desenho que causou o incidente; ela vale agora só para MICRO/SMALL — a
  lane enxuta nunca carrega a linha de estado.
