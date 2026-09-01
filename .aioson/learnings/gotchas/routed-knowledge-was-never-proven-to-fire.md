# O conhecimento roteado nunca foi provado — 169 artefatos declaravam triggers e dois testes de incidente provavam sete

**Data:** 2026-09-01 · **Src:** AIOSON supervised session: onda de trigger-evals (context:evals + skills como superfície do seletor)

## O que aconteceu

O roteamento por frontmatter (`triggers`/`task_types`/`entities`/`paths`) era rico e testado apenas onde um incidente já tinha doído (`design-docs-reachability`, `context-guard-corpus`). Skills nem entravam no seletor: 15 `SKILL.md` alcançáveis só por prosa de kernel e recall advisory. Nada media se um doc reescrito continuava chegando a quem precisava dele.

## O que a onda encontrou ao medir (cada um era invisível antes)

- **Filename vira binding de feature em qualquer superfície:** `inferContextMetadata` inferia `feature_slug` de `prd-*.md`/`spec-*.md` em TODAS as superfícies — as rules shipped `prd-section-ownership` e `spec-level-ownership` eram **excluídas em produção** (filtro de feature corta antes do score) a menos que a feature ativa coincidisse com o rabo do próprio filename. Fix: inferência só na superfície `context`.
- **`task_type` hifenizado nunca casava com o texto:** `landing-page` era token opaco; todo doc sobrevivia duplicando a forma com espaço em `triggers`. Fix no matcher: `-`/`/` achatam para espaço nos dois lados, disciplina de palavra inteira intacta.
- **Autorar a lei disparava a lei:** editar um `SKILL.md` que diz "boards, cards, forms" injetava as rules de kanban/form via guard (observado ao vivo nesta sessão). Fix: árvore de governança só aceita injeção de regra que a declarou em `paths:`.
- Triggers fracos medidos: `site qa` (token de 2 chars filtrado → vira "site" genérico); 6 docs legacy `load_tier: archive` sem triggers (deliberado — são consultados por caminho direto).

## A receita

1. Cenário = tarefa realista (8–20 palavras, pt-BR e en, nunca a lista de triggers colada) + `expect`/`absent` por seção (`must_load`/`skills`/`selected`).
2. O runner roda o motor REAL (`buildContextBrief`) e, num expect vermelho, o canal `explain` do seletor nomeia a causa (`agent_filter`/`mode_filter`/`feature_filter`/`below_threshold` com score/threshold) e sugere o frontmatter — o diagnóstico achou os 3 bugs acima sozinho.
3. Cobertura = todo artefato com sinal de roteamento nomeado por ≥1 expect; deprecated não roteia (doutrina pinada: `simplify` sem triggers de propósito).
4. Alvo ausente em install filtrado por profile = SKIP visível, nunca falha; a suíte full-install pina `skipped === 0` (typo não se esconde).
5. Skills = superfície advisory própria no brief (`skills`), nunca lei, nunca guard, só sinal duro — consumidor pré-frontmatter vê zero mudança.

## Armadilhas de execução

- `compactPathItem` do brief descarta `size` — orçamento de bytes soma via `stat`, não via item.
- Cenário que "passa" colando trigger verbatim na task é proibido — mede o eco, não o alcance.
- Sub-agentes autoram e validam contra o harness, mas problemas de frontmatter eles REPORTAM (a decisão de editar motor/artefato fica com quem conhece a doutrina) — os dois workarounds que inventaram (`feature:` espúrio, self-path) viravam falso-verde do bug de motor e foram removidos após o fix.
