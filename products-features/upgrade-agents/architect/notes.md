# Notes — architect

## Fontes usadas

### Externa
- AIOX architect: https://github.com/SynkraAI/aiox-core/blob/main/.claude/commands/AIOX/agents/architect.md

### Internas do AIOSON
- `template/.aioson/agents/architect.md`
- `template/.aioson/locales/pt-BR/agents/architect.md`
- `src/commands/workflow-next.js`
- `template/.aioson/agents/dev.md`
- `template/.aioson/locales/pt-BR/agents/setup.md`

## Observações

- O `@architect` do AIOSON aparece como etapa formal do workflow de projeto `SMALL` e `MEDIUM`, mas não do fluxo padrão de feature.
- O AIOX architect cobre mais claramente stack selection, API, infra, segurança, validação e review arquitetural.
- Existe um pequeno desalinhamento local: `@setup` diz que `@architect` deve incluir comandos de instalação quando `framework_installed=false`, mas o prompt do `@architect` não explicita isso.
- As conclusões sobre checklists, planning/context e ecossistema de validação do AIOX foram tratadas como inferência quando dependem de tasks e tools referenciados pelo arquivo principal.

## Hipóteses de backlog futuro

- `@architect review`
- `@architect feature-impact`
- `@architect api`
- `@architect infra`
- `@architect security`
- `architect checklist`
- `architect handoff card`
- `architecture delta` para features com impacto estrutural
- alinhamento explícito de `framework_installed=false` no prompt do `@architect`
