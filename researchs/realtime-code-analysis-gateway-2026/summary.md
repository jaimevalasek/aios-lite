---
searched_at: 2026-04-10
agent: sheldon
prd: prd-harness-driven-aioson.md
query: "real-time code analysis gateway LLM agent write stream inline linting Node.js performance 2025 2026"
verdict: confirmed
---

# Research: Active Gateway & Real-Time Code Analysis 2026

## Veredicto
✓ PreToolUse hook pattern + layered enforcement é o padrão de produção. Mid-stream token interception ainda não é maduro.

## Findings
- **Nenhum interceptor maduro de mid-stream token existe ainda.** O boundary prático é post-generation/pre-write — validar o output completo ANTES do tool execute.
- **AIOSON já tem a infraestrutura certa:** `PreToolUse` hook em `.claude/settings.json` com exit code 2 = exatamente o padrão correto para bloquear writes que violam invariantes.
- **invariant-gateway (open-source):** LLM proxy que envolve OpenAI/Anthropic calls, loga runtime traces, e habilita real-time invariant checking em cada ação do agente.
- **Performance:** ~11µs por request (Bifrost, 5k RPS) para gateways leves. Guardrails Galileo Luna-2: sub-200ms. Fast checks sync (<50ms) no PreToolUse; análise profunda async no proxy.
- **Enforcement stack em camadas:** PreToolUse hook (sync, <50ms) → invariant proxy (async policy) → ESLint/TypeScript (post-write, static) → pre-commit/Husky (staged diff) → CI (uncircumventable gate).
- **Agentic Gatekeeper (OpenAI community):** AI agent que lê regras markdown locais, avalia staged diffs, auto-patcha violações — captura violações de lógica de negócio que ESLint/TypeScript não capturam.

## Recomendação para AIOSON
Upgrade do execution-gateway.js em 2 layers: (1) PreToolUse hook sync para invariantes rápidas (<50ms), (2) post-write async para ESLint/TypeScript/tsc. Não criar novo processo separado — usar hooks existentes do Claude Code.

## Fontes consultadas
- [invariant-gateway (GitHub)](https://github.com/invariantlabs-ai/invariant-gateway)
- [Agentic Gatekeeper (OpenAI community)](https://community.openai.com/t/agentic-gatekeeper-an-autonomous-pre-commit-hook-powered-by-openai/1374788)
- [Best LLM Gateways 2025 — getmaxim.ai](https://www.getmaxim.ai/articles/best-llm-gateways-in-2025-features-benchmarks-and-builders-guide/)
- [Pre-commit hooks guide 2025 — gatlenculp](https://gatlenculp.medium.com/effortless-code-quality-the-ultimate-pre-commit-hooks-guide-for-2025-57ca501d9835)
- [LLM coding workflow 2026 — Addy Osmani](https://medium.com/@addyosmani/my-llm-coding-workflow-going-into-2026-52fe1681325e)
