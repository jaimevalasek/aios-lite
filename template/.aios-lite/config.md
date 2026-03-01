# AIOS Lite Config

## Principles
- Less is more: complexity must match problem size.
- Single source of truth: rules live in `.aios-lite/agents/`.
- Never assume stack: detect first, then ask.

## Project sizes
- MICRO: `@setup -> @dev`
- SMALL: `@setup -> @analyst -> @architect -> @dev -> @qa`
- MEDIUM: `@setup -> @analyst -> @architect -> @pm -> @orchestrator -> @dev -> @qa`

## Official classification
Score (0-6):
- User types: 1=0, 2=1, 3+=2
- External integrations: 0=0, 1-2=1, 3+=2
- Non-obvious rules: none=0, some=1, complex=2

Ranges:
- 0-1: MICRO
- 2-3: SMALL
- 4-6: MEDIUM

## Context contract
`project.context.md` must contain YAML frontmatter with:
- `project_name`
- `project_type`
- `profile`
- `framework`
- `framework_installed` (boolean)
- `classification`
- `conversation_language` (BCP-47, for example `en`, `pt-BR`)
- `aios_lite_version`
