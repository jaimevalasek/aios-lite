---
title: Renomear um agente é declarar `legacyIds` uma vez — não um sed
scope: src/constants.js, src/agents.js, src/migrations/agent-rename.js, src/preflight-engine.js, src/cli.js
src: "AIOSON supervised session: pedido de renomear @briefing-refiner para @refiner por praticidade"
---

# Renomear um agente é declarar `legacyIds` uma vez — não um sed

O nome de um agente vive em três camadas que envelhecem em ritmos diferentes:

1. **Arquivos do framework** (`template/`, `src/`, `tests/`, `docs/`) — um
   `git mv` + `sed` resolve, mas só aqui. Histórico (`CHANGELOG.md`,
   `.aioson/context/done/`) não se reescreve.
2. **Arquivos que o `aioson update` copia** (`.aioson/agents/*.md`,
   `.claude/commands/aioson/agent/*.md`) — o update copia os novos mas **nunca
   apaga os antigos**: o projeto fica com dois pontos de entrada para um
   agente, o velho congelado no kernel pré-rename.
3. **Arquivos do cliente que o update nunca toca** (`.aioson/rules/*.md` com
   `agents: [briefing-refiner]`, dossiês com `author: briefing-refiner`,
   estado de workflow em voo) — aqui um rename puro é uma regressão
   silenciosa: a regra deixa de bater e ninguém mede.

## Receita

- `constants.js`: `id` novo + `legacyIds: ['nome-antigo']`. **Não** use
  `aliases` — alias é stub vivo com arquivo próprio (`pair.md`); `test:agents`
  exige o arquivo de cada alias e o `update` nunca o remove.
- `src/agents.js` deriva `LEGACY_AGENT_IDS` e expõe `canonicalAgentId()`;
  todo lookup por id compara o canônico: parser do CLI (`--agent/--from/--to/
  --source-agent/--stage`), `appliesToAgent` (regras + seletor de contexto),
  `context-search`, `brain-query`, `artifact-kinds`, perfis de review,
  schema do dossiê, `agent:help`.
- `src/migrations/agent-rename.js` roda no `update` e apaga os arquivos do
  nome antigo **só** quando o template não os embarca mais e o arquivo
  canônico já existe no projeto.
- Prova: `discoverRules(<consumidor>, 'novo-id')` deve incluir a regra do
  cliente que ainda está marcada com o id antigo.

Armadilha medida: `grep tests/` antes — `test:agents`, budgets de kernel
(`kernel-and-skill-size-budgets`), e `agent:help` duplicava o resolvedor em
`cli.js` (sítio de enumeração extra, agora um só).
