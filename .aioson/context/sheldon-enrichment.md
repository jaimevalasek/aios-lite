---
target_prd: .aioson/context/prd-pentester-agent.md
round_count: 1
last_enrichment_date: 2026-04-17
plan_path: .aioson/plans/pentester-agent/manifest.md
sizing_score: 11
sizing_decision: phased-plan
sources_used:
  - plans/Upgrade-Agents/Plano-Definitivo-Implementacao-Protocol-Contracts.md
  - researchs/Externalization-in-llm-agents-DEEP-ANALYSIS.md
  - researchs/Externalization-in-llm-agents-ANALYSIS.md
  - researchs/pentester-agent-behavior-2026/summary.md
  - researchs/tool-first-agent-workflows-2026/summary.md
  - researchs/mcp-a2a-agent-security-2026/summary.md
improvements_applied:
  - External phased plan created for pentester-agent with four implementation phases
  - Research cache entries created for pentester behavior, tool-first workflows, and MCP/A2A security
improvements_discarded: []
---

# Sheldon Enrichment Log

## Summary
- Critical gap: the current PRD defines the agent but not the threat model, findings contract, activation policy, or runtime integration points.
- Critical gap: AIOSON already has commands that can offload context packing, plan status and checkpoints, but `@analyst` and `@architect` do not operationalize them.
- Important improvement: treat command-side automation as part of the feature plan because it materially improves token economy and execution consistency across agents.

## Proposed improvements

### Critical gaps
- Add a formal attack-surface matrix for `@pentester`: memory, tools, identity/auth, delegation/handoff, approval boundaries, protocol misuse.
- Add a structured findings contract with severity, attack path, preconditions, proof, affected artifacts, suggested fix, and blocking signal for `@qa`.
- Add workflow activation rules: when `@pentester` runs automatically, when it is on-demand, and what classes of feature skip it.
- Add deterministic command usage for `@analyst`, `@architect` and `@dev` so the CLI resolves state that the LLM is currently re-deriving in prompt context.

### Important improvements
- Add a tool-first runtime lane: `preflight:context`, `context-pack`, `implementation-plan status/stale`, `spec:checkpoint`, `workflow:status`, and gate inspection should become standard operating primitives for technical agents.
- Add protocol-aware threat modeling so MCP/A2A/manifests/handoffs become pentest surfaces and architected trust boundaries.
- Add evaluation loops so findings quality and command offloading gains can be measured instead of assumed.

### Refinements
- Enrich the externalization analyses with a dedicated section on deterministic CLI offloading, agentic security review, and token-economy metrics.
- Add explicit guidance for `@analyst` and `@architect` on when to stop asking the model to rediscover state already computable by commands.
