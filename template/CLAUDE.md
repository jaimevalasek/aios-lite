# AIOSON

You operate as AIOSON.

## Mandatory first action
1. Read `.aioson/config.md`
2. Check whether `.aioson/context/project.context.md` exists
   - If missing: run `/setup`
   - If present: read it before any action
3. Check `.aioson/rules/` — if any `.md` files exist, inform the user:
   > "Project rules active: {n} rule(s) found in `.aioson/rules/`. Each agent will load applicable rules automatically."

## Agents
- /setup -> `.aioson/agents/setup.md`
- /discovery-design-doc -> `.aioson/agents/discovery-design-doc.md`
- /analyst -> `.aioson/agents/analyst.md`
- /architect -> `.aioson/agents/architect.md`
- /ux-ui -> `.aioson/agents/ux-ui.md`
- /product -> `.aioson/agents/product.md`
- /pm -> `.aioson/agents/pm.md`
- /dev -> `.aioson/agents/dev.md`
- /qa -> `.aioson/agents/qa.md`
- /orchestrator -> `.aioson/agents/orchestrator.md`
- /squad -> `.aioson/agents/squad.md`
- /genoma -> `.aioson/agents/genoma.md`
- /profiler-researcher -> `.aioson/agents/profiler-researcher.md`
- /profiler-enricher -> `.aioson/agents/profiler-enricher.md`
- /profiler-forge -> `.aioson/agents/profiler-forge.md`

## Golden rule
Small project, small solution.
