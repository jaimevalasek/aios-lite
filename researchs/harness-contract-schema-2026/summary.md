---
searched_at: 2026-04-10
agent: sheldon
prd: prd-harness-driven-aioson.md
query: "harness contract JSON schema AI agents human readable machine readable definition of done test contract 2025 2026"
verdict: confirmed
---

# Research: Harness Contract Schema Design 2026

## Veredicto
✓ JSON Schema + strict validation gates é o padrão industry 2026. COINE 2026 formaliza contratos de agente com resource bounds.

## Findings
- **JSON Schema com strict: true** é o mecanismo canônico de "done/not-done" binário. OpenAI GPT-4o: <40% → 100% compliance com strict mode.
- **Schema Gate Pattern:** validator entre LLM output e tool execution. No match = no pass. Isso é o "0/1 definition of done" mais adotado.
- **COINE 2026 Agent Contracts (arxiv):** contratos recebem token budget, max iteration count, contract mode (URGENT/ECONOMICAL/BALANCED). CONTRACTED vs UNCONTRACTED: 90% redução de tokens, 525x menor variância.
- **Formato dual recomendado:** JSON Schema (machine validation) + Markdown narrative (human acceptance scenarios). Em um único arquivo: `{id, description, assertion, binary}` por critério.
- **Scope creep prevention:** `additionalProperties: false` bloqueia qualquer agente de introduzir outputs não declarados.

## Recomendação para AIOSON
Estrutura por critério: `{id, description, assertion, binary: true}`. Contract mode mapeado para classificação MICRO/SMALL/MEDIUM. Pre-implementation consensus: ambos os agentes referenciam o mesmo schema antes de iniciar.

## Fontes consultadas
- [Agent Contracts — COINE 2026 (arxiv)](https://arxiv.org/html/2601.08815v3)
- [Output format enforcement for agents (DEV)](https://dev.to/dowhatmatters/output-format-enforcement-for-agents-json-schema-or-it-didnt-happen-1pbi)
- [Stop blaming the LLM — JSON Schema (Medium)](https://medium.com/@Micheal-Lanham/stop-blaming-the-llm-json-schema-is-the-cheapest-fix-for-flaky-ai-agents-00ebcecefff8)
- [Red Hat Developer — Harness Engineering (April 2026)](https://developers.redhat.com/articles/2026/04/07/harness-engineering-structured-workflows-ai-assisted-development)
