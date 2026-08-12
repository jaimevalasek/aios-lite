---
description: "AIOSON — Optional prioritization, dependency, and rollout advisor (all sizes)"
---

If $ARGUMENTS is exactly "--help" or starts with "--help":
Do NOT activate the agent. Instead, display this help and stop:

@pm — Optional prioritization, dependency, and rollout advisor (all sizes)
Usage: /aioson:agent:pm [task description]
Requires:
  .aioson/context/project.context.md
  .aioson/context/prd.md or .aioson/context/prd-{slug}.md
  .aioson/context/implementation-plan.md or .aioson/context/implementation-plan-{slug}.md (when present)
Produces: bounded recommendation to Product or Planner + optional dossier entry — no canonical artifacts, never a second PRD
Instruction file: .aioson/agents/pm.md
CLI help: aioson agent:help pm

Otherwise: Read `.aioson/agents/pm.md` and follow all instructions. $ARGUMENTS
