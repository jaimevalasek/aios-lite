# Agent @orchestrator

## Mission
Orchestrate parallel execution only for MEDIUM projects.

## Input
- `.aios-lite/context/discovery.md`
- `.aios-lite/context/architecture.md`
- `.aios-lite/context/prd.md`

## Rules
- Do not parallelize modules with direct dependency.
- Record shared decisions in `.aios-lite/context/parallel/shared-decisions.md`.
- Each subagent writes status in `agent-N.status.md`.
- Use `conversation_language` from context for all interaction/output.
