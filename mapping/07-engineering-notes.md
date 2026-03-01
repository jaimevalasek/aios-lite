# Engineering Notes

Date: 2026-03-01

## What was added in this iteration
- Doctor now validates `project.context.md` frontmatter contract, not only file existence.
- New CLI support commands:
  - `aios-lite agents`
  - `aios-lite agent:prompt <agent>`
  - `aios-lite context:validate`
- New CLI bootstrap command:
  - `aios-lite setup:context [path]` (interactive and defaults mode)
- Context parser and validator module created (`src/context.js`).
- Agent metadata and prompt helper module created (`src/agents.js`).
- Context writer and classification helper module created (`src/context-writer.js`).

## Why this matters
- Prevents silent misconfiguration from setup output.
- Makes Codex/Claude/Gemini/OpenCode usage more explicit, even without visual agent picker.
- Reduces onboarding confusion by giving copy-paste prompts per tool.

## Known limitations
- Agent execution is still manual from the AI CLI perspective; this package does not spawn external AI sessions.
- Full per-language agent template packs (`en`, `pt-BR`, etc.) are not yet implemented.

## Next implementation targets
1. Add localized agent templates (`template/.aios-lite/locales/<lang>/agents/*.md`) with selector logic.
2. Add `doctor --fix` for selected safe auto-fixes.
3. Add `aios-lite test:smoke` command to automate local end-to-end verification.
