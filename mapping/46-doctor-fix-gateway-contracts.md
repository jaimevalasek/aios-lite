# 46 - Doctor Fix for Gateway Contract Drift

Date: 2026-03-01

## Scope
Extend `doctor --fix` safe remediation beyond missing files to cover broken gateway contract files.

## Changes
- Added gateway check -> managed file mapping in doctor core.
- `applyDoctorFixes` now restores template content for failed gateway checks:
  - `CLAUDE.md`
  - `AGENTS.md`
  - `OPENCODE.md`
  - `.gemini/GEMINI.md`
  - `.gemini/commands/aios-*.toml`
- Restoration only targets managed gateway files; no user business code touched.
- Works with dry-run mode.
- Added i18n key `doctor.fix_action_gateway_contracts` in `en`, `pt-BR`, `es`, `fr`.

## Validation
- Added tests for:
  - fix applies and heals broken gateway contract files
  - dry-run does not mutate files
  - localized action output for gateway-contract fixes in pt-BR
- `npm run ci` passed.
