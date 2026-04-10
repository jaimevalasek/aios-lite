# Decision Log

## 2026-03-01

### D001 - MVP Scope
- Decision: focus on `init`, `install`, `update`, `info`, `doctor` + base templates.
- Why: ship a functional, publishable product faster.

### D002 - Context contract
- Decision: generate `project.context.md` with YAML frontmatter for parseable fields.
- Why: provide reliable automation across agents and CLIs.

### D003 - Multi-IDE compatibility
- Decision: keep per-IDE gateway files pointing to `.aios-lite/` and include `OPENCODE.md`.
- Why: reduce duplication and keep behavior aligned.

### D004 - Framework detector
- Decision: detect by file presence + content (`package.json`, `composer.json`, `Gemfile`, `requirements`).
- Why: reduce false positives/negatives.

### D005 - Testing strategy
- Decision: use native `node:test`.
- Why: run tests in restricted environments without external test dependencies.

### D006 - Language and localization
- Decision: keep all project-facing content in English and add i18n infrastructure in the CLI.
- Why: enforce a consistent default language while enabling future localization safely.

### D007 - Localization workflow
- Decision: add `i18n:add <locale>` scaffolding and dynamic dictionary loading from `src/i18n/messages`.
- Why: reduce friction for contributors adding new languages and avoid hardcoded locale registration.

### D008 - Release automation
- Decision: add GitHub Actions CI (`ci.yml`) and tag-based npm publish workflow (`release.yml`).
- Why: enforce quality gates before publication and standardize package release execution.

### D009 - Publish naming strategy
- Decision: keep `aios-lite` as the primary npm package name and document fallback names.
- Why: direct and memorable default while preserving alternatives if ownership conflicts happen later.

### D010 - Agent language contract
- Decision: add `conversation_language` to setup output contract and require all agents to follow it.
- Why: i18n should apply to full agent-user interaction, not only CLI messages.

### D011 - Context validation hardening
- Decision: validate `project.context.md` frontmatter and required keys in `doctor` and `context:validate`.
- Why: avoid silent defaults and broken downstream agent behavior.

### D012 - Agent usability commands
- Decision: add `agents` and `agent:prompt` commands.
- Why: users in Codex/other CLIs need explicit guidance because agent pickers are not automatically generated.

### D013 - CLI context bootstrap
- Decision: add `setup:context` command to generate `project.context.md` from CLI questions/defaults.
- Why: unblock users when agent setup flow is not yet fully automated in their AI client.

### D014 - Agent locale packs and activation flow
- Decision: ship localized agent prompt packs under `.aios-lite/locales/<locale>/agents`, add `locale:apply`, and auto-apply locale during `setup:context`.
- Why: ensure end-to-end language consistency (agent instructions + user interaction) across Codex, Claude Code, Gemini CLI, and OpenCode.

### D015 - Safe doctor remediation and built-in smoke pipeline
- Decision: implement `doctor --fix` with strictly safe actions (restore missing managed files and locale sync only), and add `test:smoke` command for end-to-end verification.
- Why: reduce manual recovery friction while avoiding risky auto-edits to user business context or code.

### D016 - Web3-first dApp support
- Decision: extend core context and detection to support `project_type=dapp` with chain-aware metadata for Ethereum, Solana, and Cardano.
- Why: JS/TS-heavy Web3 projects need first-class support without forcing manual context patching.

### D017 - Conservative Web3 scope in MVP+
- Decision: include Web3 framework detection + context + skills/templates, but avoid automatic chain operations or deployment commands.
- Why: keep AIOS Lite lightweight and safe while enabling clear guidance for developer-driven implementation.

### D018 - Chain-specific smoke profiles
- Decision: extend `test:smoke` with `--web3=ethereum|solana|cardano` profiles that seed representative project files and validate dApp context output.
- Why: ensure Web3 support remains regression-safe across releases with one deterministic CLI check.

### D019 - Structured CLI output mode
- Decision: add `--json` machine-readable mode to core verification commands (`info`, `doctor`, `context:validate`, `test:smoke`) and structured JSON errors in CLI.
- Why: unblock CI/CD and automation tooling without parsing localized text output.
