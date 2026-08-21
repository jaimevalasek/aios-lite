---
title: Uma função passada ao `page.evaluate` não enxerga o módulo que a declarou
scope: src/lib/visual-runtime.js, src/lib/playwright-loader.js, tests/helpers/fake-dom.js
src: "AIOSON supervised session: verify:artifact --runtime devolvia UNVERIFIED em todo projeto por ReferenceError dentro da sonda serializada"
---

# Uma função passada ao `page.evaluate` não enxerga o módulo que a declarou

O Playwright **serializa** a função (`fn.toString()`) e a avalia dentro da
página. Naquele realm não existe nenhum binding do módulo Node: nem constante,
nem helper, nem `require`. Só o corpo da função e os argumentos passados.

Uma sonda que lê `RUNTIME_PROBE_VERSION` do escopo do módulo é `ReferenceError`
em **todo** browser real — e a perna runtime inteira responde `available: false`,
ou seja, `UNVERIFIED` em qualquer projeto, com ou sem Playwright.

**Regra:** o que a sonda precisa do módulo viaja como argumento:
`page.evaluate(pageProbe, RUNTIME_PROBE_VERSION)` e `function pageProbe(probeVersion)`.
Nunca inlinear a constante dentro da sonda — ela diverge do export na próxima
subida de versão.

## Por que a suíte ficou verde

O dublê de browser dos testes devolvia dados enlatados
(`evaluate: async () => raw`) **sem nunca executar a função recebida**, e a sonda
estava isenta de cobertura com um `istanbul ignore`. O único trecho do módulo
que roda num realm estrangeiro tinha zero execuções — self-grading por
construção.

O que segura a classe agora (`tests/visual-runtime.test.js`):

- `tests/helpers/fake-dom.js` — `evaluateInPage` re-executa a sonda como o
  Playwright faz: stringificada, num `vm.createContext` que só tem um DOM mínimo,
  com `structuredClone` na entrada e na saída. Qualquer identificador do módulo
  vira `ReferenceError` no teste. `realmLauncher` é o launcher injetável para
  `collectRuntimeMeasurements`.
- O lint "the probe body names nothing from module scope" cruza as declarações
  de topo do arquivo com o corpo da sonda (comentários removidos) — pega o vazamento
  em qualquer branch, mesmo o que o DOM falso não percorre.
- O stub enlatado agora **afirma** o contrato `(fn, probeVersion)`.
- Uma sonda que responde abaixo do contrato de versão gera warning, nunca silêncio.

## A armadilha ao lado

`require('playwright')` a partir de `src/` resolve na árvore **do CLI**. Com
`aioson` global ou `npm link` (o dogfood), o Playwright instalado no projeto é
invisível — a perna runtime dizia "not installed" enquanto o `doctor` (que já
olhava o projeto primeiro) prometia verde. Foi por isso que ninguém viu o
`ReferenceError` antes da release.

**Regra:** todo comando resolve via `src/lib/playwright-loader.js`
(`loadPlaywright([targetDir])` — projeto primeiro, árvore do CLI depois).
`tests/playwright-loader.test.js` proíbe um `require('playwright')` solto
voltando em `src/`.

Replay read-only do incidente contra um consumidor:
`node bin/aioson.js verify:artifact <root> --kind=visual --file=<prototype.html> --advisory --runtime --no-persist --json`.
