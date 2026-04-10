# 17 - JSON Schema Contracts

Date: 2026-03-01

## Scope completed
- Added formal JSON schema docs for machine-readable CLI outputs.
- Added schema index:
  - `docs/en/schemas/index.json`
- Added per-command schemas:
  - `info.schema.json`
  - `doctor.schema.json`
  - `context-validate.schema.json`
  - `smoke.schema.json`
  - `mcp-init.schema.json`
  - `package-test.schema.json`
  - `workflow-plan.schema.json`
  - `error.schema.json`
- Added guide: `docs/en/json-schemas.md` with compatibility policy.
- Added schema integrity tests: `tests/json-schema-files.test.js`.

## Validation
- `npm run ci` passed.
