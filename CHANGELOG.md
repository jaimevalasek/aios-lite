# Changelog

All notable changes to this project will be documented in this file.

## [0.1.8] - Unreleased
### Added
- Full `pt-BR` CLI dictionary at `src/i18n/messages/pt-BR.js`.
- Localized agent prompt packs for:
  - `es` at `template/.aios-lite/locales/es/agents/*.md`
  - `fr` at `template/.aios-lite/locales/fr/agents/*.md`
- New package installation validation command:
  - `aios-lite test:package [source-path] [--keep] [--dry-run] [--json]`
- New workflow planning command:
  - `aios-lite workflow:plan [path] [--classification=MICRO|SMALL|MEDIUM] [--json]`
- `mcp:init` tool presets generation under `.aios-lite/mcp/presets/`:
  - `claude.json`
  - `codex.json`
  - `gemini.json`
  - `opencode.json`
- New MCP validation command:
  - `aios-lite mcp:doctor [path] [--strict-env] [--json]`
- New parallel orchestration bootstrap command:
  - `aios-lite parallel:init [path] [--workers=2..6] [--force] [--dry-run] [--json]`
- New parallel diagnosis/remediation command:
  - `aios-lite parallel:doctor [path] [--workers=2..6] [--fix] [--force] [--dry-run] [--json]`
- New parallel scope assignment command:
  - `aios-lite parallel:assign [path] [--source=auto|prd|architecture|discovery|<file>] [--workers=2..6] [--force] [--dry-run] [--json]`
- New parallel consolidated status command:
  - `aios-lite parallel:status [path] [--json]`
- Optional `mcp:init` tool filter:
  - `--tool=claude|codex|gemini|opencode`
- `test:smoke` mixed monorepo profile:
  - `--profile=mixed` for combined Web2 + Web3 workspace validation
- `test:smoke` parallel orchestration profile:
  - `--profile=parallel` to validate `parallel:init/assign/status/doctor` in one flow
- Formal JSON schema documentation for automation:
  - `docs/en/json-schemas.md`
  - `docs/en/schemas/index.json`
  - `docs/en/schemas/*.schema.json` for each JSON command contract
  - includes `docs/en/schemas/mcp-doctor.schema.json`
  - includes `docs/en/schemas/parallel-init.schema.json`
  - includes `docs/en/schemas/parallel-doctor.schema.json`
  - includes `docs/en/schemas/parallel-assign.schema.json`
  - includes `docs/en/schemas/parallel-status.schema.json`

### Changed
- Locale resolution now supports canonical fallback for Portuguese:
  - `pt-BR` -> `pt-br`
  - `pt_br` -> `pt-br`
  - `pt` -> `pt-br`
- Locale resolution now also supports regional fallback for:
  - `es-*` -> `es`
  - `fr-*` -> `fr`
- Agent locale resolution now supports:
  - `es-*` -> `es`
  - `fr-*` -> `fr`
- `update` now reapplies active agent prompts from `conversation_language` in context, preventing locale reset after template refresh.
- `mcp:init` now writes both shared plan and tool-specific preset templates.
- `mcp:init` Context7/Database presets now default to remote-endpoint bridge templates (`mcp-remote`) with URL env vars instead of generic command placeholders.
- `mcp:init` invalid `--tool` errors are now localized via i18n dictionaries.
- `mcp:doctor` human-readable check messages and summary are now fully localized.
- `workflow:plan` advisory notes are now localized from i18n keys instead of hardcoded English.
- `setup:context` onboarding notes are now localized (including beginner recommendation notes and stack-option notes).
- `test:package` failure messages are now localized via i18n dictionaries.
- `parallel:doctor` check/hint messages are now fully localized (including severity labels).
- Internal validation failures inside `test:smoke` are now localized instead of hardcoded English.
- `parallel:status` human-readable status rows and lane summaries are now localized (including status labels).
- `mcp:doctor` severity prefixes are now localized per locale (`OK/WARN/FAIL` equivalents).
- `test:package` now localizes fallback command failure detail when stderr/stdout are empty.
- `parallel:assign` lane scope summary lines are now localized in human-readable output.
- Parallel commands now localize fallback `unknown` classification labels in human-readable errors.
- `mcp:init` now avoids hardcoded fallback text for invalid `--tool` and uses i18n-backed messaging.
- `mcp:init` now localizes generated server `reason` fields and preset `notes` content via i18n.
- Removed remaining hardcoded `unknown` fallbacks in `parallel:doctor` check messages and `context:validate` parse-reason output.
- `context:validate` now localizes known frontmatter parse reason codes into human-readable locale messages.
- `mcp:doctor` now localizes context frontmatter parse reason codes using the same i18n mapping as `context:validate`.
- Setup templates now default `aios_lite_version` to `0.1.8`.
- Expanded automated coverage:
  - `tests/i18n-cli.test.js`
  - `tests/locales.test.js`
  - `tests/agent-contracts.test.js`
  - `tests/smoke.test.js` now verifies active agent prompt locale application for `--lang=es` and `--lang=fr`
  - `tests/mcp-doctor.test.js`
  - `tests/mcp-init.test.js` now covers invalid `--tool` handling
  - `tests/setup-context.test.js` now validates localized onboarding notes
  - `tests/parallel-doctor.test.js` now validates localized check messages
  - `tests/parallel-init.test.js`
  - `tests/parallel-doctor.test.js`
  - `tests/parallel-assign.test.js`
  - `tests/parallel-status.test.js`
  - `tests/json-output.test.js` now covers `mcp:doctor --json`
  - `tests/package-test.test.js`
  - `tests/workflow-plan.test.js`
  - extended `tests/mcp-init.test.js` and `tests/json-output.test.js`
  - smoke JSON e2e checks for `--locale=es` and `--locale=fr`
  - smoke coverage for `--profile=parallel`

## [0.1.7] - 2026-03-01
### Added
- JSON output mode (`--json`) for:
  - `aios-lite info`
  - `aios-lite doctor`
  - `aios-lite context:validate`
  - `aios-lite test:smoke`
- New JSON output test suite: `tests/json-output.test.js`.

### Changed
- CLI now returns structured JSON errors for unknown commands and runtime failures when `--json` is enabled.
- `setup:context` and setup templates now default `aios_lite_version` to `0.1.7`.

## [0.1.6] - 2026-03-01
### Added
- `test:smoke` now supports chain-specific Web3 profiles:
  - `--web3=ethereum`
  - `--web3=solana`
  - `--web3=cardano`
- Web3 smoke workflow now verifies:
  - framework detection per chain profile
  - `project.context.md` dApp/Web3 frontmatter consistency.

### Changed
- CLI help and docs updated for `test:smoke --web3`.
- `setup:context` and setup templates now default `aios_lite_version` to `0.1.6`.

## [0.1.5] - 2026-03-01
### Added
- Web3 framework detection:
  - Ethereum: `Hardhat`, `Foundry`, `Truffle`
  - Solana: `Anchor`, `Solana Web3`
  - Cardano: `Cardano` (Aiken/Cardano SDK signals)
- New Web3 skill templates:
  - static: `web3-ethereum-patterns`, `web3-solana-patterns`, `web3-cardano-patterns`, `web3-security-checklist`, `node-typescript-patterns`
  - dynamic: `ethereum-docs`, `solana-docs`, `cardano-docs`
- New documentation page: `docs/en/web3.md`.

### Changed
- `project_type` now accepts `dapp`.
- `setup:context` now supports Web3 context fields (`web3_enabled`, `web3_networks`, `contract_framework`, `wallet_provider`, `indexer`, `rpc_provider`).
- `setup:context` and setup templates now default `aios_lite_version` to `0.1.5`.

## [0.1.4] - 2026-03-01
### Added
- New command:
  - `aios-lite test:smoke [workspace-path] [--lang=en|pt-BR] [--keep]`
- New smoke test suite: `tests/smoke.test.js`.

### Changed
- `doctor` now supports safe remediation mode:
  - `aios-lite doctor --fix`
  - `aios-lite doctor --fix --dry-run`
- `setup:context` and setup templates now default `aios_lite_version` to `0.1.4`.

## [0.1.3] - 2026-03-01
### Added
- Localized agent prompt packs:
  - `.aios-lite/locales/en/agents/*.md`
  - `.aios-lite/locales/pt-BR/agents/*.md`
- New command:
  - `aios-lite locale:apply [path] [--lang=en|pt-BR] [--dry-run]`
- Agent path resolution now supports locale-aware prompts with fallback to active agent paths.
- New locale test suite: `tests/locales.test.js`.

### Changed
- `setup:context` now applies localized agent prompts based on `conversation_language`.
- Documentation updated for locale pack workflow.

## [0.1.2] - 2026-03-01
### Added
- New commands:
  - `aios-lite agents`
  - `aios-lite agent:prompt <agent> [--tool=...]`
  - `aios-lite context:validate [path]`
  - `aios-lite setup:context [path]` (interactive or defaults mode)
- New modules:
  - `src/context.js` for frontmatter parsing and context contract validation
  - `src/agents.js` for agent metadata and prompt generation
  - `src/context-writer.js` for context rendering and classification scoring
- New test suites:
  - `tests/context.test.js`
  - `tests/agents.test.js`
  - `tests/context-writer.test.js`

### Changed
- `doctor` now validates `project.context.md` frontmatter and required fields, including `conversation_language` format.

## [0.1.1] - 2026-03-01
### Changed
- Converted remaining template files to English (`.aios-lite` agents/config and Gemini command descriptions).
- Hardened `@setup` instructions to prevent silent defaults for `project_type`, `profile`, `classification`, and language.
- Added explicit `conversation_language` to context contract so agent interaction language can be enforced.

## [0.1.0] - 2026-03-01
### Added
- Initial CLI commands: init, install, update, info, doctor
- Multi-IDE template gateways (Claude, Codex, Gemini, OpenCode)
- Framework detector and installer/updater core
- i18n message system with English default
- Automated tests for detector, installer, doctor, i18n
- `i18n:add <locale>` command to scaffold new locale dictionaries
- GitHub Actions CI and tag-based npm release workflows

### Changed
- Project-facing content standardized to English
- CLI i18n upgraded with dynamic locale loading and fallback behavior
