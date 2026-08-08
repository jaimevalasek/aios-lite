---
description: "AIOSON — Turn the approved PRD and prototype into an executable implementation plan"
---

If $ARGUMENTS is exactly "--help" or starts with "--help":
Do NOT activate the agent. Instead, display this help and stop:

@planner — Turn the approved PRD and prototype into an executable implementation plan
Usage: /aioson:agent:planner [task description]
Requires:
  .aioson/context/project.context.md
  .aioson/context/prd-{slug}.md or .aioson/context/prd.md (product_scope: approved, prd_ready: approved, sheldon_review: approved, current hash-bound Sheldon PASS)
Optional:
  approved prototype (.aioson/briefings/{slug}/prototype.html) when the feature has visual scope
Produces: .aioson/context/implementation-plan-{slug}.md or .aioson/context/implementation-plan.md
Instruction file: .aioson/agents/planner.md
CLI help: aioson agent:help planner

Otherwise: Read `.aioson/agents/planner.md` and follow all instructions. $ARGUMENTS
