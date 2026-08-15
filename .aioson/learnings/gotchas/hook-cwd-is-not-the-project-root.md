---
title: O `$PWD` de um hook não é a raiz do projeto
scope: src/commands/hooks-*.js, src/commands/context-guard.js, src/commands/runtime.js
src: "AIOSON supervised session: hook criou .aioson/runtime/ órfão em subdiretório durante edição de docs"
---

# O `$PWD` de um hook não é a raiz do projeto

Os hooks do harness são instalados como `aioson <cmd> "$PWD" ...`. O `$PWD` é o
cwd **do shell** no momento em que o hook dispara — qualquer `cd` durante a
sessão o move. Resolver `.aioson/` contra ele cria um store de runtime órfão no
subdiretório que por acaso estava atual: o repositório ganha SQLite não
rastreado e o estado de runtime da sessão se parte em dois stores que nunca
reconciliam.

**Regra:** `$PWD` é ponto de partida para descoberta, nunca a raiz. Use
`src/lib/project-root.js`:

- `resolveProjectRoot(dir)` — sobe até a raiz real, `null` fora de projeto.
  Obrigatório em qualquer hook que **escreve**: fora de projeto ele vira no-op,
  nunca cria `.aioson/`.
- `resolveProjectRootOrSelf(dir)` — mesma subida, com fallback para o `dir`.
  Para comandos invocados pelo usuário, onde criar projeto do zero é intenção
  legítima.

## A armadilha dentro da armadilha

Um marcador que só testa "existe um diretório `.aioson/`" **não serve**. O store
global do operador vive em `~/.aioson/` (`config.json`, `operators/`, `search/`,
`shards/`) e a maioria dos projetos mora em algum lugar abaixo do home — então a
subida escapa do projeto e aterrissa no store global compartilhado por todas as
máquinas do usuário. Pior que o subdiretório que se queria evitar.

A raiz precisa carregar uma entrada que só projeto tem: `config.md`,
`constitution.md`, `context/` ou `agents/`.

Provado em `tests/hook-project-root.test.js`, incluindo o replay do incidente e
o caso do store global.
