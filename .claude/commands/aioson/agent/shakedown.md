---
description: "AIOSON — Spec-independent post-delivery completeness walkthrough and bug hunt (opt-in, all sizes)"
---

If $ARGUMENTS is exactly "--help" or starts with "--help":
Do NOT activate the agent. Instead, display this help and stop:

@shakedown — Spec-independent post-delivery completeness walkthrough and bug hunt (opt-in, all sizes)
Usage: /aioson:agent:shakedown [feature-slug | module/screen/path | task description]
Requires:
  .aioson/context/project.context.md
Produces: .aioson/context/shakedown-{slug}.md punch list (bug / incomplete / polish + coverage proof) — finds and lists, never fixes
Instruction file: .aioson/agents/shakedown.md
CLI help: aioson agent:help shakedown

Otherwise: Read `.aioson/agents/shakedown.md` and follow all instructions. $ARGUMENTS
