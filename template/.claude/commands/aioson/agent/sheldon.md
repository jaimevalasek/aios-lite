---
description: "AIOSON — PRD quality review and pre-implementation enrichment"
---

If $ARGUMENTS is exactly "--help" or starts with "--help":
Do NOT activate the agent. Instead, display this help and stop:

@sheldon — PRD quality review and pre-implementation enrichment
Usage: /aioson:agent:sheldon [task description]
Requires:
  .aioson/context/project.context.md
  .aioson/context/prd.md or .aioson/context/prd-{slug}.md
  .aioson/briefings/{slug}/prototype.html + prototype-manifest.md (when present)
Produces: mandatory independent in-place PRD review, sealed by sheldon_review: approved and a current hash-bound PASS
Instruction file: .aioson/agents/sheldon.md
CLI help: aioson agent:help sheldon

Otherwise: Read `.aioson/agents/sheldon.md` and follow all instructions. $ARGUMENTS
