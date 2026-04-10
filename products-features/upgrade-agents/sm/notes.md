# Notes — sm

## Fontes usadas

### Externa
- AIOX sm: https://github.com/SynkraAI/aiox-core/blob/main/.claude/commands/AIOX/agents/sm.md

### Internas do AIOSON
- `template/.aioson/agents/product.md`
- `template/.aioson/agents/pm.md`
- `template/.aioson/agents/orchestrator.md`
- `src/commands/workflow-next.js`
- `docs/pt/agentes.md`

## Observacoes

- O AIOSON hoje nao tem um `@sm` oficial nem um artefato de execution readiness equivalente.
- O papel do `AIOX sm` esta mais proximo de story slicing e handoff para dev do que de estrategia de produto.
- No AIOSON, esse espaco hoje fica distribuido entre `@product`, `@pm`, `@orchestrator` e a autonomia do `@dev`.
- O melhor encaixe nativo para `@sm` no AIOSON e como ponte entre planejamento e execucao, nao como dono de backlog/PRD.
- O repositorio nao mostrou referencias existentes a `scrum`, `@sm` ou um agente equivalente.
- A gestao local de branches aparece no `AIOX sm`, mas isso nao parece ser o melhor eixo inicial para um `@sm` no AIOSON.
- O valor mais forte de um `@sm` no AIOSON tende a aparecer em workstreams `SMALL`/`MEDIUM`, squads e execucao multi-agente.

## Hipoteses de backlog futuro

- `@sm plan`
- `@sm split`
- `@sm ready`
- `@sm unblock`
- `@sm replan`
- `@sm qa-wave`
- `.aioson/context/execution-plan.md`
- `.aioson/context/execution-{slug}.md`
- integracao leve com `workflow-next` como detour oficial
- consumo do execution plan por `@orchestrator`
- uso de `@sm` para empacotar trabalho de squads/agentes gerados

