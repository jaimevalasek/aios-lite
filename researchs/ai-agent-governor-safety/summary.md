---
searched_at: 2026-04-10
agent: sheldon
prd: prd-harness-driven-aioson.md
query: "AI agent governor safety policies token limits rate limiting LLM autonomous agent guardrails 2025 2026"
verdict: confirmed
---

# Research: Governor Safety Policies — Multi-Agent Systems 2026

## Veredicto
✓ Financial Circuit Breaker + Hybrid middleware/orchestrator é o padrão de produção 2026.

## Findings
- **Financial Circuit Breaker (3 condições):** step limit (infinite loops) + cost ceiling (expensive runs) + error streak after N consecutive errors (stuck agents). Rate limits ALONE do not solve spiral costs.
- **Políticas obrigatórias:** token limit per request/session, dollar cap per session/day, max tool-call count per run, retry budget (max 3, min gap, skip non-retryable), wall-clock duration limit, kill switch.
- **Microsoft Agent Governance Toolkit (Abril 2026, MIT):** middleware pre-execution hooks, deterministic policy engine, sub-millisecond latency. Addresses all 10 OWASP agentic AI risks.
- **Hybrid pattern recomendado:** middleware per-agent (PreToolUse/PostToolUse hooks para security/token/step) + thin orchestrator-level aggregator (cross-agent cost ceiling + kill switch).
- **budgetctl (Python):** formalizes CLOSED/OPEN/HALF_OPEN state transitions com 3 loop-detection strategies.
- **Custo real de falhas:** $16k–$50k overnight (Claude Code recursion loop, July 2025); $47k em 11 dias (LangChain retry loop).

## Recomendação para AIOSON
Governor como middleware em execution-gateway.js (não novo agente). Policies configuradas em harness-contract.json. Circuit breaker como feature obrigatória do MVP.

## Fontes consultadas
- [Microsoft Agent Governance Toolkit (April 2026)](https://opensource.microsoft.com/blog/2026/04/02/introducing-the-agent-governance-toolkit-open-source-runtime-security-for-ai-agents/)
- [OpenAI Agentic Governance Cookbook](https://developers.openai.com/cookbook/examples/partners/agentic_governance_guide/agentic_governance_cookbook)
- [The Cost Circuit Breaker — 9 AI Agents](https://dev.to/sebastian_chedal/the-cost-circuit-breaker-how-we-prevent-runaway-spending-across-9-ai-agents-4i5k)
- [7 Patterns That Stop Your Agent Going Rogue](https://dev.to/pockit_tools/7-patterns-that-stop-your-ai-agent-from-going-rogue-in-production-5hb1)
- [Token-Based Rate Limiting for AI Agents (Zuplo, 2026)](https://zuplo.com/learning-center/token-based-rate-limiting-ai-agents)
