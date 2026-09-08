---
title: "O carry-forward guardava contra a ausência da seção, não contra a ausência da medição — um browser que não abriu apagava o que não conseguiu repetir"
scope: [verify-artifact, visual-evidence, runtime-telemetry, evidence-carry-forward]
kind: gotcha
captured: 2026-09-07
src: "AIOSON supervised session: audit of one uncommitted wave of eight simple plans"
---

## O que o consumidor sentiria

Uma feature com 17 rotas medidas em runtime chega ao gate de aprovação lida como "runtime não medido". Basta a segunda execução rodar numa máquina sem Chromium — um CI, um clone novo, um `npx playwright install` que faltou. O protótipo não mudou um byte; a evidência sumiu.

## Por que o framework deixou passar

O carry-forward foi escrito contra um caso concreto e verdadeiro: a re-medição estática (o auto-disparo do `agent:done`, um `--advisory`) sobrescrevia a seção `runtime` medida um minuto antes. A guarda virou `if (!result.metrics.runtime)` — a **forma** daquela ausência.

Só que a ausência tem duas formas. Uma execução que pediu `--runtime` e não conseguiu abrir o browser escreve `runtime = { available: false, reason }`: a seção **existe** e não carrega medição nenhuma. A guarda via a seção e concluía que havia medição. Epistemicamente as duas execuções valem o mesmo — zero evidência renderizada — e só uma era protegida.

Nenhum gate reclamou porque a evidência sobrescrita continuava sendo um JSON válido, com `available: false` e um motivo verdadeiro sobre *aquela* execução.

## O que impede agora

- A condição do carry passou a ser sobre a medição, não sobre a seção: `!(measured && measured.available)`. Fingerprint de entrada igual ⇒ herda; entrada mudada ⇒ derruba com o motivo certo.
- O aviso de queda deixou de mentir: com `--runtime` pedido, ele nomeia a falha do browser em vez de mandar rodar com a flag que já foi passada.
- `tests/visual-runtime.test.js` pina o launcher que estoura: seção carregada, achados carregados, veredito igual ao da execução medida, e o aviso da falha desta execução ainda presente.

## Regra de bolso

Guarda de fallback se escreve contra o **estado** ("esta execução tem evidência?"), nunca contra a **forma** que aquele estado teve no incidente ("o campo está ausente?"). Antes de fechar, liste as outras formas do mesmo estado: campo ausente, campo presente com `available: false`, campo presente com array vazio, campo herdado de outra execução. Se alguma delas passa pela guarda, a guarda mede a forma errada.
