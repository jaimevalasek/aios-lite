---
prd: prd-harness-driven-aioson.md
last_enriched: 2026-04-10
enrichment_rounds: 1
plan_path: .aioson/plans/harness-driven-aioson/manifest.md
sizing_score: 10
sizing_decision: phased_external
readiness: ready_for_downstream
readiness_notes: ""
gray_areas_extracted: true
gray_areas_decided: 4
---

# Sheldon Enrichment Log — Harness-Driven AIOSON

## Rodada 1 — 2026-04-10

### MERs utilizados
Nenhum MER disponível.

### Fontes usadas
- [arquivo] plans/Harness-Driven/Evolução-AIOSON-Do-Spec-Driven-ao-Harness-Driven.txt
- [arquivo] plans/Harness-Driven/Harness-Engineering-resumo.txt
- [briefing] .aioson/briefings/harness-driven-aioson/briefings.md
- [cache] researchs/harness-engineering-2026/summary.md (agent: cypher, 2026-04-10, confirmed)
- [web] researchs/validator-architecture-2026/summary.md (2026-04-10, confirmed)
- [web] researchs/ai-agent-governor-safety/summary.md (2026-04-10, confirmed)
- [web] researchs/harness-contract-schema-2026/summary.md (2026-04-10, confirmed)
- [web] researchs/realtime-code-analysis-gateway-2026/summary.md (2026-04-10, confirmed)

### Melhorias aplicadas
- [ACs verificáveis] — seção "Acceptance Criteria" adicionada ao PRD com 12 ACs por fase
- [Regra de classificação] — seção "Regra de ativação por classificação" adicionada (MICRO/SMALL/MEDIUM)
- [Schema progress.json] — schema mínimo obrigatório documentado no PRD
- [Schema harness-contract.json] — estrutura COINE 2026 com {id, description, assertion, binary} documentada
- [Fluxo de Falha] — seção "Fluxo de Falha" com circuit breaker states adicionada
- [Integração SDD] — seção "Integração com SDD existente" com O que não muda + ponto de integração
- [Papel @sheldon expandido] — seção "Papel expandido do @sheldon" como Harness Engineer
- [Fontes de referência] — seção final com todas as fontes listadas

### Melhorias descartadas pelo usuario
- Nenhuma

### Decisão de sizing
Score: 10 → phased_external
Justificativa: 3 fases distintas do roadmap + 7 entidades + 3 integrações externas (linters, type-checkers, pre-commit hooks).

## Decisões tomadas

> Decisões de gray areas confirmadas pelo usuário. Downstream agents devem respeitar estas decisões sem re-perguntar.

| # | Gray Area | Decisão | Razão |
|---|-----------|---------|-------|
| 0 | Backward compatibility | Harness opt-in por classificação: MEDIUM obrigatório, SMALL apenas progress.json, MICRO SDD puro | Usuário confirmou explicitamente — "implementações que venham somar com o que temos hoje" |
| 1 | Interface do Validador | Hybrid faseado: skill harness-validate (Fase 2) + agente @validator isolado (Fase 3) | Não bloqueante; cada fase entrega valor standalone; isolamento de contexto obrigatório |
| 2 | Scope do @governor no MVP | Circuit breaker como middleware em execution-gateway.js; policies em harness-contract.json | Non-blocking, additive; Microsoft AGT pattern; sem novo agente |
| 3 | Formato harness-contract.json | JSON único com {id, description, assertion, binary} por critério (COINE 2026) | Industry consensus 2026; legível em PR review; parseável por máquina |
| 4 | Scope harness:init | Minimal MVP: cria harness-contract.json + progress.json; bootstrap.sh + smoke-tests/ na Fase 3 | Começo-meio-fim sem pontas soltas; Fase 2 é completa por si só |
