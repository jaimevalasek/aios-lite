# Notes — dev

## Fontes usadas

### Externa
- AIOX dev: https://github.com/SynkraAI/aiox-core/blob/main/.claude/commands/AIOX/agents/dev.md

### Internas do AIOSON
- `template/.aioson/agents/dev.md`
- `template/.aioson/locales/pt-BR/agents/dev.md`
- `src/commands/workflow-next.js`

## Observações

- O `AIOX dev` e fortemente orientado por story file, task engine e automacao de execucao; o `AIOSON @dev` e fortemente orientado por cadeia de contexto do projeto.
- O `@dev` do AIOSON aparece como etapa obrigatoria em todos os workflows padrao e nao pode ser pulado.
- O AIOSON dev ja tem brownfield discipline, feature mode, design skill isolation e reuse de skills de projeto/squad.
- O AIOX dev mostra capacidades fortes de recovery, rollback, worktree isolation, gotchas memory e CodeRabbit no completion loop.
- As conclusoes sobre build orchestration, autonomous build loop, stuck detection e verification workflows foram tratadas como inferencia quando dependem dos scripts/tasks citados pelo arquivo principal.

## Hipoteses de backlog futuro

- `@dev preflight`
- `@dev verify-step`
- `@dev resume`
- `@dev status`
- `@dev qa-fixes`
- `@dev gotcha`
- checkpoints leves de execucao
- recovery assistido do ultimo passo
- handoff card de `@dev` para `@qa`
- modo opcional de isolamento de trabalho para tarefas grandes
