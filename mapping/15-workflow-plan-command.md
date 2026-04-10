# 15 - Workflow Plan Command

Date: 2026-03-01

## Scope completed
- Added command: `aios-lite workflow:plan [path] [--classification=MICRO|SMALL|MEDIUM] [--json]`.
- Generates recommended agent sequence by classification:
  - MICRO: `@setup -> @dev`
  - SMALL: `@setup -> @analyst -> @architect -> @dev -> @qa`
  - MEDIUM: `@setup -> @analyst -> @architect -> @pm -> @orchestrator -> @dev -> @qa`
- Reads `project.context.md` when available and adds notes for:
  - framework not installed
  - dApp/web3 context
- Added JSON output contract coverage and unit tests.

## Validation
- `npm run ci` passed.
