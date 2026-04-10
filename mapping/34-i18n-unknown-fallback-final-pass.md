# Mapping 34 - i18n unknown fallback final pass

Date: 2026-03-01

## Scope
Final cleanup for remaining user-facing hardcoded `unknown` fallback labels.

## Changes
- `src/commands/parallel-doctor.js`
  - Localized `classification` fallback in classification check messages using
    `parallel_doctor.classification_unknown`.
- `src/commands/context-validate.js`
  - Localized parse-reason fallback from hardcoded `unknown` to
    `context_validate.parse_reason_unknown`.

## i18n keys added
- `context_validate.parse_reason_unknown` in all locales:
  - `en`: `unknown`
  - `pt-BR`: `desconhecido`
  - `es`: `desconocido`
  - `fr`: `inconnu`

## Tests
- `tests/parallel-doctor.test.js`
  - Added PT-BR assertion for localized unknown classification in check message.
- `tests/i18n.test.js`
  - Added dictionary presence checks for `context_validate.parse_reason_unknown` across locales.

## Validation
- `npm run ci` passed (25/25).
