# 23 - Update Locale Preservation

Date: 2026-03-01

## Scope completed
- `src/commands/update.js` now reapplies active agent locale after template update.
- Locale source is resolved from `.aios-lite/context/project.context.md` `conversation_language`.
- Added regression tests:
  - `tests/update.test.js`
  - `tests/smoke.test.js` locale-flow coverage (`es`, `fr`).

## Bug fixed
- Running `aios-lite update` could revert active agent prompts back to base English.
- Now update keeps active prompts aligned with project language contract.

## Validation target
- `npm run ci`
