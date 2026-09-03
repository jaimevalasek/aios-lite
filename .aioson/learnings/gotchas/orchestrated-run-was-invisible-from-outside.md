---
title: "A run orquestrada era invisível de fora do próprio processo — 81 minutos sem uma linha"
scope: [agent-execution, execution-run, execution-status, orchestrator, dev, supervising-client]
kind: gotcha
captured: 2026-09-03
src: "AIOSON supervised session: the first real orchestrated run, watched from a supervising client session"
---

## O que o consumidor sentiu

O agente supervisor lançou `execution:run` em segundo plano (a ferramenta de shell do cliente limita uma chamada em primeiro plano a dez minutos — uma tentativa anterior de `--resume | head` sob timeout tinha matado o motor com os workers dentro), embrulhou o comando num script que capturava todo o stdout em `$(...)` para esperar a lease, e depois não consultou nada. Entre o lançamento e o fim da run — 81 minutos — o usuário não recebeu uma linha. Nove das dez unidades foram marcadas `stalled` (host em `--print` não transmite nada enquanto trabalha), e o arquivo de estado só mudava nas transições, de dez a vinte e três minutos entre uma e outra: ninguém conseguia distinguir um worker pensando de um processo morto.

## Por que todo gate ficou verde

Superfície descoberta. O único canal ao vivo era o stdout do próprio `execution:run`, e stdout é exatamente o que um wrapper, um arquivo de tarefa em segundo plano ou um `| head` tiram. `execution:status` lia um snapshot que não carregava tempo, nem "desde quando", nem "o processo ainda existe". O kernel mandava "narrar nos checkpoints a partir do `execution:status`", sem dizer como lançar um processo de 80 minutos de um cliente com teto de 10, nem que o usuário precisava ver algo entre os checkpoints.

## O que impede agora, em todo projeto

- O run **pulsa**: a cada 15 s cada estágio em execução é medido no disco (tempo, último arquivo escrito sob os write paths da faixa, arquivos alterados desde o início, flags) para `units.<id>.<stage>.live` no estado; toda escrita carimba `engine.{pid, heartbeat_at, heartbeat_ms}`; uma vez por minuto a medição vira uma linha ao vivo; estágio concluído guarda `activity`.
- `execution:status` diz se o motor está vivo (`engine.state: alive | missing | idle`, medido pelo próprio pulso; `missing` nomeia o `--resume`), lista `running[]` com a linha `▶` de cada estágio, e ganha `--watch[=<segundos>]` (relê até o run sair de `running`; `--json` = uma linha por tick) e `--format=line` (uma linha para painel de status).
- O run imprime o comando de acompanhamento na linha de início e no preflight (`follow_command`); o doc roteado do dev (`execution-lanes.md`) e o kernel do orchestrator carregam o protocolo: lançar em segundo plano (nunca `$(...)`, `| head` ou primeiro plano sob timeout), entregar o `--watch` ao usuário, consultar o ledger a cada 2–5 minutos e relatar o que mudou mais as linhas ao vivo.

## O que o próprio conserto expôs

Passar a escrever o estado a cada 15 s (rename atômico) mais um leitor consultando a cada 5 s criou a janela clássica do Windows: abrir o arquivo durante o rename devolve EPERM/EBUSY. Todo leitor colapsava isso em "não existe run" — o `--watch` fecharia no meio de uma run viva e o `execution:run` começaria uma **segunda** run por cima de uma pausada, descartando as decisões dela. Agora ausente é ausente na hora; ilegível é repetido e depois reportado como ilegível (`state_unreadable` no ledger, `run_state_unreadable` recusando run e decide).

## Armadilhas

- Um `mkdtemp` de teste de run é apagado pelo `t.after` enquanto o SQLite da telemetria ainda fecha handles: `ENOTEMPTY` de teardown no Windows, rotativo entre testes, não é regressão — repita o arquivo.
- `git worktree add` num caminho de scratchpad do Windows falha com "Filename too long" nos relatórios de review da árvore; para comparar com HEAD, use outro diretório curto.
- O tick de `--watch` antes do primeiro heartbeat mostra `no file change yet · 0 file(s)` sem orçamento: um teste que pina a linha completa precisa escolher um tick com `live`.
