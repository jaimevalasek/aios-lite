# Mapping 32 - i18n fallback hardening for classification and mcp:init

Date: 2026-03-01

## Scope
- Remove remaining hardcoded fallback wording in command errors.
- Ensure fallback classification label is localized for parallel commands.
- Ensure `mcp:init` invalid `--tool` fallback path still uses i18n even when no translator function is provided.

## Changes
- `src/commands/parallel-init.js`
  - `requires_medium` now uses `parallel_init.classification_unknown` instead of hardcoded `unknown`.
- `src/commands/parallel-assign.js`
  - `requires_medium` now uses `parallel_assign.classification_unknown` instead of hardcoded `unknown`.
- `src/commands/parallel-doctor.js`
  - `--fix` medium-classification guard now uses `parallel_doctor.classification_unknown` instead of hardcoded `unknown`.
- `src/commands/mcp-init.js`
  - Added i18n fallback for `resolveToolDefinitions` when `t` is not passed:
    - defaults to `createTranslator('en').t`
  - Removed hardcoded English string branch for invalid `--tool`.

## i18n keys added
- `parallel_init.classification_unknown`
- `parallel_assign.classification_unknown`
- `parallel_doctor.classification_unknown`

Added in all dictionaries:
- `src/i18n/messages/en.js`
- `src/i18n/messages/pt-BR.js`
- `src/i18n/messages/es.js`
- `src/i18n/messages/fr.js`

## Tests added
- `tests/parallel-init.test.js`
  - PT-BR unknown-classification fallback check.
- `tests/parallel-assign.test.js`
  - PT-BR unknown-classification fallback check.
- `tests/parallel-doctor.test.js`
  - PT-BR unknown-classification fallback check for `--fix`.
- `tests/mcp-init.test.js`
  - invalid tool check in PT-BR.
  - invalid tool check without translator argument (English i18n fallback).

## Validation
- `npm run ci` passed (25/25).
