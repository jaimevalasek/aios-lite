---
description: "AIOSON — Beginner-friendly guide to AIOSON concepts, workflows, commands, and next steps"
---

If $ARGUMENTS is exactly "--help" or starts with "--help":
Do NOT activate the agent. Instead, display this help and stop:

@help — Beginner-friendly guide to AIOSON concepts, workflows, commands, and next steps
Usage: /aioson:agent:help [question]
Requires:
  No project context for general questions; reads local AIOSON documentation when available
Produces: beginner-friendly explanation in chat + one safe next action
Instruction file: .aioson/agents/help.md
CLI help: aioson agent:help help

Otherwise: Read `.aioson/agents/help.md` and follow all instructions. $ARGUMENTS
