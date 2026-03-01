# Test Plan

## Automated

### detector
- Detect Laravel by `artisan`.
- Detect Laravel by `composer.json` with `laravel/framework`.
- Detect Next.js by `next.config.*` or `next` dependency.
- Detect Nuxt by `nuxt.config.*` or `nuxt` dependency.
- Detect Rails by `Gemfile` with rails gem.
- Detect Django by `manage.py` or requirements/pyproject.
- Detect Hardhat by `hardhat.config.*` or `hardhat` dependency.
- Detect Anchor by `Anchor.toml`, `@coral-xyz/anchor`, or `Cargo.toml:anchor-lang`.
- Detect Cardano by `aiken.toml` or Cardano SDK dependencies.
- Fall back to Node when only `package.json` exists.

### installer
- `install` creates `.aios-lite` and gateway files.
- `install` does not overwrite existing context by default.
- `update` creates backups for managed files.

### doctor
- Reports missing required files.
- Reports missing `project.context.md`.
- Validates minimum Node version.
- Validates frontmatter contract and required context fields.
- Validates `conversation_language` format.
- `doctor --fix` restores missing managed files when safe.
- `doctor --fix --dry-run` reports planned changes without writing.
- Accepts `project_type=dapp` in context contract validation.

### agent usability
- `agents` lists known agents and dependencies.
- `agent:prompt` generates tool-specific prompt text.
- `context:validate` reports parse/contract issues directly.
- `resolveAgentLocale` maps base tags (for example `pt` -> `pt-BR`) with safe fallback to `en`.
- `applyAgentLocale` copies localized agent templates into active `.aios-lite/agents` paths.

### smoke
- `test:smoke` runs install -> setup context -> locale apply -> agents -> prompt -> context validate -> doctor -> update.
- Smoke command supports `--keep` to inspect generated workspace.
- Smoke command supports `--web3=ethereum|solana|cardano` with chain-specific seeded workspace checks.

### json output
- `info --json` returns stable machine-readable payload.
- `doctor --json` returns report + fix metadata without human-only text.
- `context:validate --json` returns explicit `reason` for failures.
- `test:smoke --json` returns steps, profile target, and workspace metadata.
- Invalid commands with `--json` return structured error payload and non-zero exit code.

## Manual
- Empty folder: `npx aios-lite init demo`.
- Existing project: `npx aios-lite install`.
- Update: `npx aios-lite update` preserving local customizations.
- Context bootstrap + language flow:
  - `aios-lite setup:context --defaults --language=pt-BR`
  - `aios-lite locale:apply`
  - `aios-lite agent:prompt setup --tool=codex --lang=pt-BR`
- Web3 bootstrap:
  - create `hardhat.config.ts` + `package.json` with `hardhat`
  - run `aios-lite install` and `aios-lite setup:context --defaults`
  - verify `project_type: "dapp"` and Web3 frontmatter fields in `project.context.md`
- Web3 smoke:
  - `aios-lite test:smoke --web3=ethereum`
  - `aios-lite test:smoke --web3=solana`
  - `aios-lite test:smoke --web3=cardano`
- JSON automation checks:
  - `aios-lite info --json`
  - `aios-lite context:validate --json`
  - `aios-lite doctor --json`
  - `aios-lite test:smoke --json`
- Recovery flow:
  - `aios-lite doctor --fix --dry-run`
  - `aios-lite doctor --fix`
