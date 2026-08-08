---
description: "AIOSON — Build one runnable app or game from a frozen benchmark prompt"
---

If $ARGUMENTS is exactly "--help" or starts with "--help":
Do NOT activate the agent. Instead, display this help and stop:

@benchmark — Build one runnable app or game from a frozen benchmark prompt
Usage: /aioson:agent:benchmark [task description]
Requires:
  (none — the activation prompt is treated as the frozen benchmark input; project context/AGENTS.md are used when present in the run root)
Produces: complete runnable app/game under the delivery root + benchmark-result.json + report.md
Instruction file: .aioson/agents/benchmark.md
CLI help: aioson agent:help benchmark

Otherwise: Read `.aioson/agents/benchmark.md` and follow all instructions. $ARGUMENTS
