---
description: "AIOSON — Optional repository-grounded answer to a named technical boundary (all sizes)"
---

If $ARGUMENTS is exactly "--help" or starts with "--help":
Do NOT activate the agent. Instead, display this help and stop:

@architect — Optional repository-grounded answer to a named technical boundary (all sizes)
Usage: /aioson:agent:architect [task description]
Requires:
  .aioson/context/project.context.md
  .aioson/context/prd.md or .aioson/context/prd-{slug}.md
  .aioson/context/implementation-plan.md or .aioson/context/implementation-plan-{slug}.md (when present)
Produces: bounded technical decision to Planner or Dev + optional dossier entry — creates no standalone documents
Instruction file: .aioson/agents/architect.md
CLI help: aioson agent:help architect

Otherwise: Read `.aioson/agents/architect.md` and follow all instructions. $ARGUMENTS
