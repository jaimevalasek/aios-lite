---
description: "AIOSON — Optional prototype-grounded interaction decision (all sizes)"
---

If $ARGUMENTS is exactly "--help" or starts with "--help":
Do NOT activate the agent. Instead, display this help and stop:

@ux-ui — Optional prototype-grounded interaction decision (all sizes)
Usage: /aioson:agent:ux-ui [mode] [task description]
Modes: audit | research | tokens | component-map | a11y (see the agent's mode router)
Requires:
  .aioson/context/project.context.md
  .aioson/context/prd.md or .aioson/context/prd-{slug}.md
  .aioson/context/implementation-plan.md or .aioson/context/implementation-plan-{slug}.md (when present)
Produces: bounded interaction decision to Product or Planner + optional dossier entry
Instruction file: .aioson/agents/ux-ui.md
CLI help: aioson agent:help ux-ui

Otherwise: Read `.aioson/agents/ux-ui.md` and follow all instructions. $ARGUMENTS
