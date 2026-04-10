# Notes — ux-ui

## Fontes usadas

### Externa
- AIOX ux-design-expert: https://github.com/SynkraAI/aiox-core/blob/main/.claude/commands/AIOX/agents/ux-design-expert.md

### Internas do AIOSON
- `template/.aioson/agents/ux-ui.md`
- `template/.aioson/locales/pt-BR/agents/ux-ui.md`
- `docs/pt/agentes.md`
- `src/commands/workflow-next.js`
- `template/.aioson/skills/design/cognitive-core-ui/SKILL.md`
- `template/.aioson/skills/design/interface-design/SKILL.md`
- `template/.aioson/skills/design/premium-command-center-ui/SKILL.md`

## Observacoes

- O `AIOX ux-design-expert` e um agente muito mais proximo de um mini sistema de design ops do que de um simples gerador de UI.
- O `@ux-ui` do AIOSON e mais focado em direcao visual, output final e handoff dentro do workflow oficial.
- No AIOSON, a qualidade visual nao depende apenas do agente base; depende muito da `design_skill` selecionada e do handoff para `@dev`.
- O AIOSON ja tem um mecanismo forte de isolamento visual por skill, o que e valioso para consistencia.
- O gargalo atual parece menos “UX e UI estao juntos” e mais “faltam submodos e artefatos de pesquisa, sistema e validacao”.
- Para o caso comum do AIOSON, manter um unico `@ux-ui` ainda parece a melhor escolha.

## Hipoteses de backlog futuro

- `@ux-ui research`
- `@ux-ui audit-system`
- `@ux-ui tokens`
- `@ux-ui component-map`
- `@ux-ui a11y`
- `@ux-ui handoff`
- `.aioson/context/ui-research.md`
- `.aioson/context/ui-tokens.md`
- `.aioson/context/ui-component-map.md`
- `.aioson/context/ui-a11y.md`
- validacao de aderencia a `design_skill`
- modo de continuidade visual para multiplas telas

