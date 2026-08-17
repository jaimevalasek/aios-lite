---
description: "AIOSON — Conduct one measured AIOSON traversal: route detection, unattended agent chain, honest run artifacts"
---

If $ARGUMENTS is exactly "--help" or starts with "--help":
Do NOT activate the agent. Instead, display this help and stop:

@benchmark — Conduct one measured AIOSON traversal: route detection, unattended agent chain, honest run artifacts
Usage: /aioson:agent:benchmark [frozen prompt or run assignment]
Requires:
  .aioson/context/project.context.md
Produces: runnable app/game + benchmark-result.json + report.md in the assigned run root
Instruction file: .aioson/agents/benchmark.md
CLI help: aioson agent:help benchmark

Otherwise: Read `.aioson/agents/benchmark.md` and follow all instructions. $ARGUMENTS
