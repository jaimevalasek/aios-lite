---
description: "AIOSON — Optional evidence-backed analysis of a named ambiguity (all sizes)"
---

If $ARGUMENTS is exactly "--help" or starts with "--help":
Do NOT activate the agent. Instead, display this help and stop:

@analyst — Optional evidence-backed analysis of a named ambiguity (all sizes)
Usage: /aioson:agent:analyst [task description]
Requires:
  .aioson/context/project.context.md
Produces: bounded recommendation to Product or Planner + optional dossier entry — creates no standalone documents
Instruction file: .aioson/agents/analyst.md
CLI help: aioson agent:help analyst

Otherwise: Read `.aioson/agents/analyst.md` and follow all instructions. $ARGUMENTS
