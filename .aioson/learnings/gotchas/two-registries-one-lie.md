---
title: "Dois registros, uma mentira — a ligação do workflow nunca seguia o registro de features"
scope: [workflow, workflow-next, workflow-status, feature-current, pulse, review-cycle]
paths:
  - src/commands/workflow-next.js
  - src/commands/feature-current.js
  - src/commands/review-cycle.js
discovered_at: 2026-09-03
src: "AIOSON supervised session: primeira execução orquestrada real num projeto consumidor — conferindo se o QA de entrega tinha rodado"
status: corrigido no framework
---

# Dois registros, uma mentira

## O que o consumidor sentiu

`feature:current` → `project-deploy-channel` (fonte: pulse). `workflow:status` → `play-online-refoundation`. A feature inteira (product, sheldon, planner, dev, 6 unidades orquestradas) rodou fora do kernel de workflow sem nenhum comando reclamar. `workflow:next --complete=dev` sem `--expect-feature` respondeu `@dev is already completed` — verdade sobre a feature ligada, falso sobre a que estava sendo construída. Com a flag, o guard abortou (certo) e não ofereceu saída. Editar `workflow.state.json` à mão não mudou nada: o CLI regenerou e, ao regenerar, apagou `completed` da feature anterior. `review-cycle:status` da feature nova reportava o orçamento esgotado da anterior.

## Por que todo gate ficou verde

- **Duas fontes da verdade** (superfície descoberta): `feature-current.js` declara o `active_feature` do pulse como fonte única; `detectWorkflowMode` escolhia a feature pelo `last-handoff.json` e pelo último `in_progress` do `features.md`, nunca pelo pulse. Nada comparava os dois.
- **Guard opcional** (misfire): `--expect-feature` protegia só quem o passava; o caminho sem flag respondia pela feature errada com cara de certo.
- **Regeneração destrutiva**: a transição de feature zerava o estado persistido sem arquivar o progresso.
- **Arquivo por rota, não por feature**: `qa-dev-cycle.json` guarda um slug; `status` devolvia o conteúdo sem olhar para qual feature era.

## O que agora impede em todo projeto

- `detectWorkflowMode` liga ao `active_feature` do pulse quando ele está `in_progress` no `features.md` (handoff e último in_progress como fallback); `workflow:next` e `workflow:status` passam a responder pela mesma feature que `feature:current`.
- A transição arquiva o progresso da feature anterior em `.aioson/context/features/<slug>/workflow.state.json` e o restaura quando o registro volta; evento `binding_moved` no `workflow.events.jsonl`; linha `[workflow:next] workflow binding moved: A → B` no terminal.
- A mensagem de mismatch do `--expect-feature` nomeia o registro e o comando que o move (`pulse:update . --feature=<slug>`).
- `review-cycle:status --feature=X` responde só por X (`stale_feature` quando o arquivo é de outra; orçamento inteiro).

## Armadilhas

- O estado do workflow é DERIVADO: mexer no registro (pulse), nunca no JSON.
- Testes que fixam a feature pelo `last-handoff.json` seguem valendo: o pulse só vence quando existe E nomeia uma feature em andamento.
- `detectUnsubstantiatedCompletions` (SF-project-18) avisa sobre `completed` sem telemetria — não confundir com o arquivamento: o aviso é integridade, o arquivamento é transição.

Relacionado: [[the-engine-asked-the-adapter-did-not-deliver]]
