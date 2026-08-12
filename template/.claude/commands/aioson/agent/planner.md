---
description: "AIOSON — Executable vertical implementation planning from the approved PRD"
---

If $ARGUMENTS is exactly "--help" or starts with "--help":
Do NOT activate the agent. Instead, display this help and stop:

@planner — Executable vertical implementation planning from the approved PRD
Usage: /aioson:agent:planner [task description]
Requires:
  .aioson/context/project.context.md
  .aioson/context/prd.md or .aioson/context/prd-{slug}.md
  .aioson/briefings/{slug}/prototype.html + prototype-manifest.md (when referenced by the PRD)
Produces: .aioson/context/implementation-plan.md or .aioson/context/implementation-plan-{slug}.md
Instruction file: .aioson/agents/planner.md
CLI help: aioson agent:help planner

Otherwise: Read `.aioson/agents/planner.md` and follow all instructions. $ARGUMENTS
