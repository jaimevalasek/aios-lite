# 52 - UX/UI Agent: Core Quality + Lite Delivery

Date: 2026-03-01

## Scope
Introduce a first-class `@ux-ui` agent to improve frontend quality while preserving AIOS Lite speed and low-token operation.

## What was implemented
- New agent contract:
  - `.aios-lite/agents/ux-ui.md`
  - output: `.aios-lite/context/ui-spec.md`
- Localized prompt packs:
  - `en`, `pt-BR`, `es`, `fr`
- Gemini command mapping:
  - `.gemini/commands/aios-ux-ui.toml`
- Gateway references updated in:
  - `CLAUDE.md`, `AGENTS.md`, `OPENCODE.md`, `.gemini/GEMINI.md`
- Flow integration:
  - `SMALL`/`MEDIUM` sequences include `@ux-ui`
  - `MICRO` keeps `@ux-ui` optional for UI-heavy scope
  - `@dev` accepts optional input `.aios-lite/context/ui-spec.md`
  - `@architect` can produce `@ux-ui` handoff notes

## Quality model
- Borrowed from AIOS Core:
  - explicit UX decisions
  - consistent design direction
  - state and accessibility completeness
- Preserved from AIOS Lite:
  - concise artifacts
  - stack-first reuse of existing libraries
  - direct handoff to implementation

## Validation
- `npm run ci` passed after contract + template + test updates.

## Notes
- Mapping files are local development memory and currently ignored by repository policy.
