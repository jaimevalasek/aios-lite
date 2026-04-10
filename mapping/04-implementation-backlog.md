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
- [x] npm release checklist completion.

## Sprint 5 - Usability and language contract
- [x] `agents` command to list agent contracts.
- [x] `agent:prompt` command to generate copy-paste prompts per tool.
- [x] `context:validate` command for explicit context checks.
- [x] Localized agent packs (`en`, `pt-BR`) with selection flow.
- [x] Optional interactive CLI onboarding for `project.context.md` generation (`setup:context`).
- [x] `locale:apply` command and setup auto-activation based on `conversation_language`.

## Sprint 6 - Reliability and self-healing
- [x] `doctor --fix` safe remediation flow.
- [x] `doctor --fix --dry-run` planning mode.
- [x] `test:smoke` command for automated end-to-end checks.
- [x] Automated tests for remediation and smoke flow.

## Sprint 7 - Web3 and JS/TS expansion
- [x] Web3 framework detection (Hardhat, Foundry, Truffle, Anchor, Solana Web3, Cardano signals).
- [x] Context contract expanded with `project_type=dapp`.
- [x] `setup:context` Web3 fields (`web3_enabled`, `web3_networks`, `contract_framework`, `wallet_provider`, `indexer`, `rpc_provider`).
- [x] Web3 static and dynamic skill templates (Ethereum, Solana, Cardano, security checklist).
- [x] Web3 documentation (`docs/en/web3.md`) and README updates.
- [x] Detector/context test coverage for Web3 paths.

## Sprint 8 - Web3 reliability
- [x] `test:smoke --web3=ethereum|solana|cardano` profiles.
- [x] Smoke assertions for chain-specific framework detection.
- [x] Smoke assertions for dApp/Web3 context frontmatter integrity.

## Sprint 9 - Automation and CI output
- [x] `--json` output for `info`.
- [x] `--json` output for `doctor`.
- [x] `--json` output for `context:validate`.
- [x] `--json` output for `test:smoke`.
- [x] Structured JSON error output for CLI unknown command/runtime failures.
- [x] Automated tests for JSON output contracts.

## Future Optional Features (Out of Current Core Scope)
- [ ] External Makopy MCP server implementation (feature-future, optional).
- [ ] Pipeline marketplace platform (feature-future, optional).

Scope note:
- Primary focus remains making `aios-lite` core functionality stable and production-ready.
- Makopy/Marketplace are intentionally deferred and should not block core releases.
