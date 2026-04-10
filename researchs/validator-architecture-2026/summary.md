---
searched_at: 2026-04-10
agent: sheldon
prd: prd-harness-driven-aioson.md
query: "AI agent validator separate process vs skill dynamic 2025 2026 multi-agent validation architecture LLM"
verdict: confirmed
---

# Research: Validator Architecture Patterns 2026

## Veredicto
✓ Hybrid layering (schema guard + dedicated validator agent) is the 2026 industry consensus.

## Findings
- **Isolation beats self-evaluation** — validator must be architecturally independent (separate context window, separate role). A compromised validator is worse than no validator.
- **Hybrid layering (best practice):** Schema guard (Pydantic/structured output, zero cost) → LLM-as-judge inline tool → Dedicated Validator agent node (high-stakes/semantic) → HITL spot check.
- **Framework consensus:** LangGraph uses validator as conditional graph node (best for debuggable production); CrewAI uses dedicated agent role; AutoGen uses GroupChat debating agents (expensive but highest reliability).
- **Self-justification mitigation:** Multi-agent debate + outcome-based grading + human calibration. Grade WHAT was produced, not HOW (path-based tests are brittle).
- **OpenAI Agents SDK:** Built-in Guardrails primitive — inline, low-latency.

## Recomendação para AIOSON
Skill rápida (schema/lint, zero LLM cost) para validação determinística + agente `@validator` separado para validação semântica/complexa. Isolamento de contexto é obrigatório.

## Fontes consultadas
- [gurusup.com — Multi-Agent Frameworks 2026](https://gurusup.com/blog/best-multi-agent-frameworks-2026)
- [Anthropic Engineering — Equipping agents with Agent Skills](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills)
- [Anthropic Engineering — Demystifying evals for AI agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)
- [DataCamp — CrewAI vs LangGraph vs AutoGen](https://www.datacamp.com/tutorial/crewai-vs-langgraph-vs-autogen)
- [arXiv — When AIs Judge AIs](https://arxiv.org/html/2508.02994v1)
