---
description: "AIOSON — Optional coordination for genuinely parallel or cross-cutting execution (all sizes)"
---

If $ARGUMENTS is exactly "--help" or starts with "--help":
Do NOT activate the agent. Instead, display this help and stop:

@orchestrator — Optional coordination for genuinely parallel or cross-cutting execution (all sizes)
Usage: /aioson:agent:orchestrator [task description]
Requires:
  .aioson/context/project.context.md
  .aioson/context/prd.md or .aioson/context/prd-{slug}.md
  .aioson/context/implementation-plan.md or .aioson/context/implementation-plan-{slug}.md
Produces: bounded lane ownership and merge order + optional dossier entry — coordination state returns to @dev; creates no standalone documents
Instruction file: .aioson/agents/orchestrator.md
CLI help: aioson agent:help orchestrator

Otherwise: Read `.aioson/agents/orchestrator.md` and follow all instructions. $ARGUMENTS
