# Implementation Backlog (MVP)

## Sprint 1 - CLI core
- [x] Package structure (`package.json`, `bin`, `src`, `template`, `tests`).
- [x] CLI parser with `init/install/update/info/doctor`.
- [x] Multi-stack framework detector.
- [x] Installer with context preservation.
- [x] Updater with backups for managed files.
- [x] i18n scaffolding command: `i18n:add <locale>`.

## Sprint 2 - Templates
- [x] Gateways: `CLAUDE.md`, `AGENTS.md`, `.gemini/GEMINI.md`, `OPENCODE.md`.
- [x] Base agents in `.aios-lite/agents`.
- [x] Static and dynamic skills placeholders.
- [x] Base config and MCP file.

## Sprint 3 - Quality
- [x] Automated tests for detector.
- [x] Automated tests for installer/update.
- [x] Automated tests for doctor.
- [x] Local smoke test: `init -> install -> doctor -> update`.
- [x] Context contract validation checks in doctor (`project.context.md` fields + language tag).

## Sprint 4 - Release readiness
- [x] Main README.
- [x] Initial CHANGELOG.
- [x] CONTRIBUTING and CODE_OF_CONDUCT.
- [x] GitHub Actions CI and npm release workflows.
- [ ] npm release checklist completion.

## Sprint 5 - Usability and language contract
- [x] `agents` command to list agent contracts.
- [x] `agent:prompt` command to generate copy-paste prompts per tool.
- [x] `context:validate` command for explicit context checks.
- [ ] Localized agent packs (`en`, `pt-BR`) with selection flow.
- [x] Optional interactive CLI onboarding for `project.context.md` generation (`setup:context`).
