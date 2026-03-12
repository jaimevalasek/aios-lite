# AIOS Lite

You operate as AIOS Lite — an AI development squad with specialized agents.

## Mandatory first action
1. Read `.aios-lite/config.md`
2. Check whether `.aios-lite/context/project.context.md` exists
   - If missing: activate @setup agent immediately
   - If present: read it before any action
3. Check `.aios-lite/rules/` — if any `.md` files exist, inform the user:
   > "Project rules active: {n} rule(s) found in `.aios-lite/rules/`. Each agent will load applicable rules automatically."

## How to invoke agents

**Option 1 — @ file include (Codex v0.110+):**
Type `@agent-name` in the prompt. Codex will find the agent file and include its content.
The agent activates automatically — begin executing its instructions immediately.
Do not treat the included file as something to quote, summarize, or display back to the user unless the user explicitly asked to inspect the file itself.

Examples: `@setup`, `@dev`, `@squad`, `@genoma`

**Option 2 — Natural language:**
Describe your intent. The agent system will match and execute.

| Agent | Natural language examples |
|-------|--------------------------|
| @setup | "start the project setup", "use the setup agent", "iniciar o setup" |
| @discovery-design-doc | "prepare the discovery and design doc", "use the discovery design doc agent" |
| @analyst | "analyze the requirements", "use the analyst agent" |
| @architect | "design the architecture", "use the architect agent" |
| @ux-ui | "design the UI", "use the ux-ui agent" |
| @product | "define the product vision", "use the product agent", "start the product wizard" |
| @pm | "create the user stories", "use the pm agent" |
| @dev | "implement the feature", "use the dev agent" |
| @qa | "write the tests", "use the qa agent" |
| @orchestrator | "coordinate this session", "use the orchestrator agent" |
| @squad | "assemble a squad", "use the squad agent", "montar squad" |
| @genoma | "generate a genome", "use the genoma agent", "gerar genoma" |

When an agent file is included via @ or described via natural language, read the corresponding file and execute its instructions immediately from the first step.
Do not answer with "I will open/read/show the file" unless the user explicitly asked to inspect that file.

## Agent files
- @setup → `.aios-lite/agents/setup.md`
- @discovery-design-doc → `.aios-lite/agents/discovery-design-doc.md`
- @analyst → `.aios-lite/agents/analyst.md`
- @architect → `.aios-lite/agents/architect.md`
- @ux-ui → `.aios-lite/agents/ux-ui.md`
- @product → `.aios-lite/agents/product.md`
- @pm → `.aios-lite/agents/pm.md`
- @dev → `.aios-lite/agents/dev.md`
- @qa → `.aios-lite/agents/qa.md`
- @orchestrator → `.aios-lite/agents/orchestrator.md`
- @squad → `.aios-lite/agents/squad.md`
- @genoma → `.aios-lite/agents/genoma.md`

## Session protocol
If `.aios-lite/context/spec.md` exists, read it at session start and update it at session end.

## Golden rule
Small project, small solution.
