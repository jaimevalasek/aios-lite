---
description: "AIOSON — Optional evidence-based review of a named scope-drift concern"
---

If $ARGUMENTS is exactly "--help" or starts with "--help":
Do NOT activate the agent. Instead, display this help and stop:

@scope-check — Optional evidence-based review of a named scope-drift concern
Usage: /aioson:agent:scope-check [--scope-mode=pre-dev|post-dev|post-fix|final] [task description]
Requires:
  .aioson/context/project.context.md
  .aioson/context/prd.md or .aioson/context/prd-{slug}.md
  .aioson/context/implementation-plan.md or .aioson/context/implementation-plan-{slug}.md
Optional for post modes:
  git diff, QA/tester/pentester findings, last handoff
Produces: bounded alignment verdict + optional dossier entry — never a scope-check artifact file
Instruction file: .aioson/agents/scope-check.md
CLI help: aioson agent:help scope-check

Otherwise: Read `.aioson/agents/scope-check.md` and follow all instructions. $ARGUMENTS
