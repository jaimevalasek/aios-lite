# Notes — pm

## Fontes usadas

### Externa
- AIOX pm: https://github.com/SynkraAI/aiox-core/blob/main/.claude/commands/AIOX/agents/pm.md

### Internas do AIOSON
- `template/.aioson/agents/pm.md`
- `template/.aioson/locales/pt-BR/agents/pm.md`
- `template/.aioson/agents/product.md`
- `template/.aioson/locales/pt-BR/agents/product.md`
- `src/commands/workflow-next.js`

## Observações

- O `@pm` do AIOSON nao e o equivalente funcional principal do `AIOX pm`; o papel mais proximo esta distribuido entre `@product` e `@pm`.
- No workflow default do AIOSON, `@pm` so aparece em projeto `MEDIUM`, depois de `@architect` e `@ux-ui`.
- O catalogo oficial atual do AIOSON nao inclui agentes `po` ou `sm`, o que reforca a concentracao do discovery de produto em `@product`.
- O `AIOX pm` possui um modo `bob` com orquestracao por spawning de agentes, algo sem equivalente no `@pm` atual do AIOSON.
- As conclusoes sobre `bob`, `TerminalSpawner`, session-resume e epic execution foram tratadas como inferencia quando dependem de modulos/tasks citados pelo arquivo principal.

## Hipoteses de backlog futuro

- documentar explicitamente `@product` vs `@pm`
- `@product research`
- `@pm epic-plan`
- `@pm delivery-readiness`
- `product -> pm handoff card`
- `session-info` para agentes de produto
- camada opcional de product-ops ou delivery-manager
