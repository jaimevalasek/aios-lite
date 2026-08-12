---
description: "AIOSON — Proportional delivery review with bounded focused verification (all sizes)"
---

If $ARGUMENTS is exactly "--help" or starts with "--help":
Do NOT activate the agent. Instead, display this help and stop:

@qa — Proportional delivery review with bounded focused verification (all sizes)
Usage: /aioson:agent:qa [task description]
Requires:
  .aioson/context/prd.md or .aioson/context/prd-{slug}.md
  .aioson/context/implementation-plan.md or .aioson/context/implementation-plan-{slug}.md
Produces: .aioson/context/qa-report-{slug}.md — the independent Gate D delivery verdict
Instruction file: .aioson/agents/qa.md
CLI help: aioson agent:help qa

Otherwise: Read `.aioson/agents/qa.md` and follow all instructions. $ARGUMENTS
