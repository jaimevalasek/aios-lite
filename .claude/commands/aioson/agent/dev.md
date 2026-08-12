---
description: "AIOSON — Feature implementation (any stack)"
---

If $ARGUMENTS is exactly "--help" or starts with "--help":
Do NOT activate the agent. Instead, display this help and stop:

@dev — Feature implementation (any stack)
Usage: /aioson:agent:dev [task description]
Requires:
  .aioson/context/project.context.md
  .aioson/context/prd.md or .aioson/context/prd-{slug}.md
  .aioson/context/implementation-plan.md or .aioson/context/implementation-plan-{slug}.md
  .aioson/briefings/{slug}/prototype.html + prototype-manifest.md (when referenced by the PRD)
Produces: code changes
Instruction file: .aioson/agents/dev.md
CLI help: aioson agent:help dev

Otherwise: Read `.aioson/agents/dev.md` and follow all instructions. $ARGUMENTS
