---
title: "Uma unidade orquestrada nunca foi medida — uma faixa dona de tudo rodou uma fase inteira por processo"
scope: src/lib/plan-scale.js, src/agent-execution/execution-plan.js, src/commands/execution.js, src/commands/workflow-next.js, template/.aioson/agents/planner.md
src: "AIOSON supervised session: the second orchestrated run of a 28-file plan (2026-08-29)"
---

# Uma unidade orquestrada nunca foi medida

## O que aconteceu

Um plano de 28 arquivos escolheu o caminho orquestrado e saiu com **uma** lane (`entrega`) dona de `src, public, tests, data, package.json`, quatro linhas na `## Execution Sequence` — uma por fase — encadeadas por `after_qa`. O `execution:compile` compilou sem um aviso (`warnings: []`); o `execution:offer` respondeu `available`; a fase 1 rodou num único processo com **15 dos 28 arquivos** (~100 KB escritos), a cadeia crítica era 8 processos em série, `max_concurrent_lanes: 2` era letra morta, e um só papel `entrega_dev` significava um só modelo para backend e frontend — quando a razão de existir das lanes é justamente um `{lane}_dev` com host/modelo por superfície.

## Por que todo gate ficou verde

- **Heurística errada no kernel do planner**: "One row per delivery phase" + "Keep waves few; a solo wave is valid". O kernel prescrevia 1 fase = 1 linha = 1 unidade = 1 contexto; com fatias verticais que cruzam `api.js`/`app.js` em toda fase, a única forma legal sem contrato de interface era uma lane dona de tudo — serial por construção.
- **Superfície descoberta no motor**: nada media a unidade (arquivos, ACs, superfícies, fan-in) nem o paralelismo do grafo. `plan.scale` (onda anterior) media a *feature*; o compile media posse (`phase_mixed_ownership`) e sobreposição (`wave_file_overlap`) — nunca tamanho nem forma. A escolha registrada ("orchestrated") satisfazia o `[Execution Scale]`; o gate media o rótulo, não a forma.
- **Efeito de segunda ordem**: com listas rígidas de arquivos por fase, a fase 1 antecipou CSS/HTML das fases 2–3 (arquivos que só ela e a fase 4 podiam tocar) e despachou 7 mensagens para as unidades seguintes — a primeira unidade engorda com trabalho futuro.

## O que agora impede

- `src/lib/plan-scale.js`: `scale.units[]` (arquivos, ACs, `shared_files`, superfícies, `depth`, `over_budget` + `reasons`), `scale.parallelism` (`max_concurrent_units`, `serial_chain`, `critical_path_processes`, `serial`), `scale.seams[]`, `scale.ceiling` (10 arquivos / 6 ACs; `AIOSON_EXECUTION_UNIT_MAX_FILES` / `AIOSON_EXECUTION_UNIT_MAX_ACS`), `scale.surfaces` (backend/frontend/shared por extensão, diretório ou nome do arquivo; testes à parte; `shared_test_root`), `proposeSplit` (lanes por superfície com write paths derivados + linhas `{fase}-backend`/`{fase}-frontend` + não-alocáveis com motivo).
- `execution:compile`: avisos `unit_over_budget`, `unit_spans_surfaces`, `orchestration_serial`; `summary.parallelism/ceiling/context_bytes_max`; `Depends on` com número puro = todas as linhas daquela fase; `## Interface Contract` lido do plano **ou** do PRD; prompt da unidade embute a própria seção `## Phase N` + contrato de contexto (protótipo só para unidade com arquivos de frontend, regras via `context:brief --paths=<arquivos da unidade>`).
- `execution:offer`: imprime unidades/paralelismo/superfícies/proposta; `onboarding.next` nomeia as lanes medidas antes da tabela existir; `execution:seed` sem `--lanes` e sem tabela semeia por superfície.
- `workflow:next --complete=planner`: `[Execution Scale]` também para plano orquestrado serial por construção ou com unidade acima do teto — mesmo com papéis e compile verdes.
- Kernel do planner: lanes são o eixo de modelo (uma por superfície); uma linha por **unidade**, nunca por fase.

## Armadilhas

- `phase_number` na unidade compilada é **string** (`phaseNumber` devolve `match[0]`); um `Map` com chave inteira não a encontra — converter antes de buscar.
- Um `### Phase 1 notes` dentro de `## Phase 1` casa com a regex de fase: um título de fase só abre seção quando nenhuma está aberta.
- `workflow-next.js` é CRLF; `grep -c $'\r'` do Git Bash responde 0 mesmo assim — normalizar no patch e escrever de volta com o EOL do arquivo.
- Regras que citam `alert`/`confirm`/`prompt` são injetadas pelo `context:guard` em qualquer arquivo que use essas palavras, inclusive testes de compile.
