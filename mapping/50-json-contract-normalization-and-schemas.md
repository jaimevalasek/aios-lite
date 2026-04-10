# 50 - JSON Contract Normalization + Schema Expansion

Date: 2026-03-01

## Scope
Stabilize newly JSON-enabled command contracts and document them with formal schemas for automation.

## Changes
- Normalized command JSON payloads to include `ok: true` and command context fields where applicable:
  - `init`
  - `install`
  - `update`
  - `agents`
  - `agent:prompt`
  - `locale:apply`
  - `setup:context`
  - `i18n:add`
- Added new schema files under `docs/en/schemas/`:
  - `init.schema.json`
  - `install.schema.json`
  - `update.schema.json`
  - `agents.schema.json`
  - `agent-prompt.schema.json`
  - `locale-apply.schema.json`
  - `setup-context.schema.json`
  - `i18n-add.schema.json`
- Updated schema catalog index (`docs/en/schemas/index.json`) and schema guide (`docs/en/json-schemas.md`).

## Validation
- Extended `tests/json-output.test.js` assertions for normalized `ok` payloads.
- Extended `tests/json-schema-files.test.js` expected IDs and schema count.
- `npm run ci` passed.
