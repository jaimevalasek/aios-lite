---
title: "Um termo semântico casava dentro da palavra — observers era server, stable era table — e a verificação focada do plano não rodou o corpus"
scope: [context-selector, context-evals, routed-docs, simple-plan-verification]
kind: gotcha
captured: 2026-09-07
src: "AIOSON supervised session: audit of one uncommitted wave of eight simple plans"
---

## O que o consumidor sentiu

Nada ainda — o corpus de evals pegou antes de publicar. Mas o mecanismo já estava vivo: qualquer doc roteado que crescesse até conter `observers`, `stable`, `unverified` e trinta `that` passava a ser injetado num handler de webhook de pagamentos, com `must_load` gastando os tokens do dev em coreografia de scroll.

## Por que o framework deixou passar

- `matchSemanticTerms` usava `haystack.includes(term)`: substring, não palavra. `server` ⊂ `observers`, `table` ⊂ `stable`, `verifie` ⊂ `unverified`. O mínimo de quatro termos para docs era atingido só por infixos.
- `that` não era stop word; aparece em todo corpo de doc e contava como vocabulário.
- O plano que reescreveu `visual-effects.md` (direção cinematográfica) listou quatro suítes na verificação e não a `context-evals-shipped` — a única que replica o corpus contra o template. A suíte completa acusou; a verificação focada não.

## O que impede agora

- Termo casa só no início de palavra (`(?:^| )term`), mantendo o stem por prefixo (`verifie` acha `verifies`/`verified`).
- Demonstrativos, relativos e auxiliares em inglês e pt-BR entram em `SEMANTIC_STOP_WORDS`.
- `tests/routing-precision.test.js` pina o par infix-only × prefix-hits; o corpus de 191 cenários segue verde com zero skips.

## Regra de bolso

Mexeu em qualquer arquivo com frontmatter de roteamento (`triggers`, `task_types`, `paths`) — rule, doc, design-doc ou SKILL router — a verificação do plano inclui `node --test tests/context-evals-shipped.test.js` ou `aioson context:evals . --strict`. Prosa nova muda o que o seletor vê, mesmo sem tocar o frontmatter.
