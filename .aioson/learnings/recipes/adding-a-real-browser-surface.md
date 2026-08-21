---
title: Uma superfície de browser real entra pelo resolvedor, é testada com página fake e só vale como evidência quando um gate a lê
scope: src/lib/browser-session.js, src/lib/browser-walkthrough/, src/lib/browser-evidence.js, src/commands/browser-run.js, src/parser.js, src/lib/ac-test-audit.js, src/lib/feature-completeness.js
src: "AIOSON supervised session: pedido de dar ao QA uma metodologia de teste em Chrome real; o smoke do caminho de produção era validado só como forma de prosa"
---

# Uma superfície de browser real entra pelo resolvedor, é testada com página fake e só vale como evidência quando um gate a lê

Três armadilhas apareceram ao ligar o `browser:run`/`browser:snapshot`; a
receita evita as três.

## 1. Nunca `chromium.launch()` direto — `openBrowser()` de `browser-session.js`

O CLI pode estar global/linkado (sem `node_modules` do projeto) e a máquina
pode não ter o Chromium empacotado mas ter o Google Chrome. O resolvedor já
trata as três rotas na ordem de explicitude: `--cdp`/`AIOSON_BROWSER_CDP`/
`aios-qa.config.json → browser.cdp` (conecta ao browser que o operador já
roda; **só desconecta** no fim — `browser.close()` num `connectOverCDP` é
desconexão), `--browser=chrome|msedge` (canal instalado, sem download),
e o empacotado (padrão quando existe). Todo comando de browser (`qa:run`,
`qa:scan`, `qa:doctor`, walkthroughs) passa por ele; um `launch` solto volta
a dar o erro "chromium missing" para quem tem Chrome instalado.

No modo CDP, abra páginas no `browser.contexts()[0]` — é a sessão viva do
operador (perfil, extensões, login). Um `newContext()` seria um perfil anônimo,
que é exatamente o que o attach existe para evitar.

## 2. O motor é testado com uma página fake no formato `Page` do Playwright

`runWalkthrough({ open })` recebe o opener injetado; a suíte não abre browser.
A página fake precisa responder ao subconjunto que o runner usa
(`getByRole/getByLabel/getByText/locator`, `click/fill/isVisible/
allTextContents/count/waitFor`, `on('request'|'response'|'console')`,
`url()/title()/evaluate/screenshot`). Duas lições do live-fire que a fake não
mostraria sozinha:

- `textContent()` em locator que casa vários elementos (`role=row`) lança em
  modo estrito — `contains` lê `allTextContents()` e procura em qualquer um;
- com `clock.wait` no-op, um `expect` que nunca satisfaz vira hot-loop pelo
  `timeout` inteiro — scripts de teste fixam `timeout: 50`.

A prova real fica fora da suíte: app-fixture mínimo (`POST` real) servido
local + `browser:run` nos três modos (empacotado, `--browser=chrome`, Chrome
com `--remote-debugging-port` + `--cdp`). Repita ao mexer no runner.

## 3. Flag bare documentada no help precisa estar em `BOOLEAN_FLAGS`

`tests/parser-core.test.js` varre todo `help_*` do `en.js`: qualquer
`--flag` sem `=` precisa existir em `src/parser.js → BOOLEAN_FLAGS`, senão
`--prototype .` engole o positional do caminho. `--prototype`, `--continue`,
`--no-persist` entraram por isso.

## Onde a evidência vale

Relatório em `.aioson/context/features/{slug}/browser/{name}.json` (scope
`delivery`) é lido por `ac:test-audit` (AC coberta quando o último passo
tagueado passou), pelo gate de completude (`qa_pass_contradicts_browser_evidence`
quando o QA escreve PASS e o último walkthrough falhou a mesma AC) e pelo
`feature:trace` (`browser evidence:`). Walkthrough de protótipo (`--prototype`
ou arquivo sob `.aioson/briefings/`) grava em `.aioson/briefings/{slug}/browser/`
e **nunca** conta como AC entregue — o guard de escopo é automático pelo caminho.

Ferramental: `.md` é LF (gitattributes) — o Write do harness grava CRLF no
Windows, normalize antes de commitar; heredoc Python come `\b`/`\w` em regex —
use Edit para essas linhas.
