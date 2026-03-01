# Changelog

All notable changes to this project will be documented in this file.

## [0.1.8] - Unreleased
### Added
- Full `pt-BR` CLI dictionary at `src/i18n/messages/pt-BR.js`.
- New package installation validation command:
  - `aios-lite test:package [source-path] [--keep] [--dry-run] [--json]`
- New workflow planning command:
  - `aios-lite workflow:plan [path] [--classification=MICRO|SMALL|MEDIUM] [--json]`
- `mcp:init` tool presets generation under `.aios-lite/mcp/presets/`:
  - `claude.json`
  - `codex.json`
  - `gemini.json`
  - `opencode.json`
- Optional `mcp:init` tool filter:
  - `--tool=claude|codex|gemini|opencode`

### Changed
- Locale resolution now supports canonical fallback for Portuguese:
  - `pt-BR` -> `pt-br`
  - `pt_br` -> `pt-br`
  - `pt` -> `pt-br`
- `mcp:init` now writes both shared plan and tool-specific preset templates.
- Setup templates now default `aios_lite_version` to `0.1.8`.
- Expanded automated coverage:
  - `tests/i18n-cli.test.js`
  - `tests/package-test.test.js`
  - `tests/workflow-plan.test.js`
  - extended `tests/mcp-init.test.js` and `tests/json-output.test.js`

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
