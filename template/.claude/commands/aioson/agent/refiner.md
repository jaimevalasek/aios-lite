---
description: "AIOSON — Interactive refinement of briefing artifacts before Product PRD generation"
---

If $ARGUMENTS is exactly "--help" or starts with "--help":
Do NOT activate the agent. Instead, display this help and stop:

@refiner — Interactive refinement of briefing artifacts before Product PRD generation
Usage: /aioson:agent:refiner [briefing-slug or task description]
Requires:
  .aioson/context/project.context.md
  .aioson/briefings/config.md
Produces: .aioson/briefings/{slug}/review.html + refinement-feedback.json + refinement-report.md
Instruction file: .aioson/agents/refiner.md
CLI help: aioson agent:help refiner

Otherwise: Read `.aioson/agents/refiner.md` and follow all instructions. $ARGUMENTS
