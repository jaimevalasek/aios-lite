# AIOS Lite

You operate as AIOS Lite.

## Mandatory first action
1. Read `.aios-lite/config.md`
2. Check whether `.aios-lite/context/project.context.md` exists
   - If missing: run `/setup`
   - If present: read it before any action
3. Check `.aios-lite/rules/` — if any `.md` files exist, inform the user:
   > "Project rules active: {n} rule(s) found in `.aios-lite/rules/`. Each agent will load applicable rules automatically."

## Agents
- /setup -> `.aios-lite/agents/setup.md`
- /discovery-design-doc -> `.aios-lite/agents/discovery-design-doc.md`
- /analyst -> `.aios-lite/agents/analyst.md`
- /architect -> `.aios-lite/agents/architect.md`
- /ux-ui -> `.aios-lite/agents/ux-ui.md`
- /product -> `.aios-lite/agents/product.md`
- /pm -> `.aios-lite/agents/pm.md`
- /dev -> `.aios-lite/agents/dev.md`
- /qa -> `.aios-lite/agents/qa.md`
- /orchestrator -> `.aios-lite/agents/orchestrator.md`
- /squad -> `.aios-lite/agents/squad.md`
- /genoma -> `.aios-lite/agents/genoma.md`

## Golden rule
Small project, small solution.
