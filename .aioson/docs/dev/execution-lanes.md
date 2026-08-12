---
description: "Optional development execution lanes — dispatching enabled host/model lanes from agent-execution-{slug}.json while DEV keeps integration ownership."
agents: [dev]
task_types: [execution-lanes, multi-model-dispatch]
triggers: [development_lanes, split execution, agent:execution:dispatch, lane]
---

# Optional Development Execution Lanes

Development lanes are an execution mechanism, not new canonical agents or specification stages. Use them only when `development_lanes.strategy: split` and the individual lane is explicitly enabled in `agent-execution-{slug}.json`; classification never enables them.

For each enabled lane:

1. Confirm its `host`, `model`, exact `write_paths`, and configured prompt path.
2. Create the short runtime prompt at that path from the approved PRD/plan and repository evidence. It must name the assigned phase/CAPs, allowed paths, focused verification, and what the lane must leave for DEV integration. It is not another spec.
3. Dispatch enabled lanes sequentially in the shared worktree:

   ```bash
   aioson agent:execution:dispatch . --feature={slug} --lane={lane} --json
   ```

4. If dispatch returns unavailable host/model/capability, stop. Fallback is allowed only when the lane declares it, including the reason:

   ```json
   {
     "fallbacks": [
       { "host": "codex", "model": "configured-default", "on": ["unavailable", "capacity"] }
     ]
   }
   ```

5. Inspect and integrate the lane changes, resolve cross-lane boundaries, run the complete planned verification, and retain ownership of the production result.

`host` selects a registered CLI adapter; `model` selects that host's model/provider identifier. A provider model such as Grok may therefore be used through a compatible registered host. Absence of a dedicated agent file is irrelevant because the lane runtime prompt is the bounded execution contract.

If no development lane is enabled, implement directly in the current DEV session. Do not create frontend/backend lanes merely because both surfaces exist.
