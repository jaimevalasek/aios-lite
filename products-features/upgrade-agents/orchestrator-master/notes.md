# Notes — orchestrator/master

## Fontes usadas

### Externa
- AIOX master: https://github.com/SynkraAI/aiox-core/blob/main/.claude/commands/AIOX/agents/aiox-master.md

### Internas do AIOSON
- `src/commands/workflow-next.js`
- `src/commands/agents.js`
- `src/agents.js`
- `src/execution-gateway.js`
- `src/commands/parallel-init.js`
- `src/commands/parallel-assign.js`
- `src/commands/squad-pipeline.js`
- `template/.aioson/agents/orchestrator.md`
- `template/.aioson/agents/squad.md`
- `template/.aioson/tasks/squad-pipeline.md`

## Observações

- Esta análise foi consolidada em `upgrade-agents/` em 2026-03-21 para manter todas as comparações AIOX vs AIOSON no mesmo lugar.
- As conclusões sobre `guided mode`, `engine mode` e parte da governança do AIOX foram tratadas como inferência baseada no arquivo `aiox-master.md`.

## Hipóteses de backlog futuro

- `master conductor` para agentes oficiais + squads
- `handoff protocol` universal entre agentes
- distinção explícita entre `guided mode` e `engine mode`
- `capability registry` para agentes, squads, workers, genomes e pipelines
- `squad pipeline run` como engine real de execução
