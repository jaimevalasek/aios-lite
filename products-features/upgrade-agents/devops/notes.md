# Notes — devops

## Fontes usadas

### Externa
- AIOX devops: https://github.com/SynkraAI/aiox-core/blob/main/.claude/commands/AIOX/agents/devops.md

### Internas do AIOSON
- `src/commands/runtime.js`
- `src/commands/cloud.js`
- `src/commands/setup-context.js`
- `docs/pt/comandos-cli.md`
- `products-features/aios-cloud-runner/project-brief.md`

## Observacoes

- O AIOSON nao possui hoje um agente oficial `@devops`.
- O maior erro seria copiar o AIOX devops como um agente GitHub-first. Isso deixaria de fora runtime, package publish, delivery e cloud sync, que sao partes centrais do ecossistema AIOSON.
- A proposta mais coerente e reposicionar `@devops` como operador de release, runtime, cloud e delivery.
- O AIOSON ja possui primitives reais para isso: `runtime:*`, `cloud:*`, `deliver`, output strategy, install cloud config e a visao futura de runner local/remoto.
- As conclusoes sobre tasks e workflows internos do AIOX devops foram tratadas como inferencia quando dependem de arquivos auxiliares citados pelo `devops.md`.

## Hipoteses de backlog futuro

- criar agente oficial `@devops`
- separar `release mode`, `package mode`, `runtime mode`, `delivery mode`
- adicionar `@devops pre-release`
- adicionar `@devops publish-squad`
- adicionar `@devops publish-genome`
- adicionar `@devops runtime-sync-cloud`
- adicionar `@devops delivery-check`
- integrar no futuro com `aios-cloud-runner`
