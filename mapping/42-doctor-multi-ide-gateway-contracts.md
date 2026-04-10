# 42 - Doctor Multi-IDE Gateway Contracts

Date: 2026-03-01

## Scope
Harden compatibility checks for Claude Code, Codex CLI, Gemini CLI, and OpenCode by extending doctor validation.

## Changes
- Expanded `REQUIRED_FILES` with multi-IDE gateway files:
  - `OPENCODE.md`
  - `.gemini/GEMINI.md`
  - all `.gemini/commands/aios-*.toml`
- Added gateway contract checks in `doctor` for file-content markers:
  - CLAUDE gateway points to shared `.aios-lite` files
  - AGENTS gateway points to shared `.aios-lite` files
  - Gemini gateway points to `.gemini/commands/` and `.aios-lite/agents/`
  - OpenCode gateway points to shared `.aios-lite` files
- Added localized doctor messages/hints for these contract checks in:
  - `en`, `pt-BR`, `es`, `fr`

## Validation
- Added tests:
  - missing OpenCode/Gemini required files are reported by doctor
  - broken Codex gateway content markers are detected by doctor
  - i18n keys for new doctor gateway checks exist across locales
- `npm run ci` passed.
