# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

## [0.1.17] - 2026-03-03
### Added
- `static-html-patterns.md` Section 0 — **Hero Law**: explicit rule that the hero MUST be full-viewport animated background + ONE headline + TWO buttons. Cards in the hero are forbidden.
- `static-html-patterns.md` Section 2a-extra — **Mandatory Wow Techniques** for Bold & Cinematic (three required, not optional):
  - Animated mesh background (`@keyframes meshDrift 20s`) — static gradients replaced
  - Animated gradient text (`@keyframes textGradient 8s`) on headline `<em>` key phrase
  - 3D card tilt on hover (`perspective(700px) rotateX/rotateY` on `mousemove`, skipped on touch + reduced motion)
- `@setup` agent (base + all 4 locales) — **Step 3: Next agent guidance** appended to Post-setup action. Agent now closes by explicitly naming the next `@agent` based on `project_type` + `classification`, using the exact `@name` format so AI clients (Codex, Claude Code, Gemini) can trigger it.
- `@setup` pt-BR/es/fr/en locales — spec.md skip hint for `project_type=site` + MICRO classification.

### Changed
- `@ux-ui` Step 0 (base + en/pt-BR/es/fr locales) — upgraded from "ask one question" to **HARD STOP blocking gate**: agent must not read files, write HTML/CSS, or proceed to Step 1 until user answers the visual style question.
- `@ux-ui` Landing page mode (base + all locales) — added **Hero Law** constraint and **Mandatory Wow Techniques** section explicitly referencing the three required animations.
- `@ux-ui` es/fr locales — **full rewrite** to match the updated base agent: added Step 0 (visual style intake), landing page mode, hero law, mandatory wow techniques, full output contract.

## [0.1.16] - 2026-03-03
### Added
- `template/.aios-lite/skills/static/static-html-patterns.md`: new **Section 14 — Premium Template Patterns (Aigocy-style)** with 10 production patterns extracted from a real AI-agency landing page (ThemeForest #61450410):
  - **14a. effectFade animations**: `fadeUp` and `fadeRotateX` (3D perspective entrance) with `data-delay` stagger pattern for GSAP
  - **14b. Infinite logo marquee**: CSS-only `@keyframes infiniteSlide` with auto-clone JS and hover-pause for accessibility
  - **14c. SVG animated paths**: SMIL `<animateMotion>` hub-and-spoke diagram connecting icons to a center product image
  - **14d. Scroll-to-top with circular progress**: CSS `stroke-dashoffset` progress ring updated by scroll JS
  - **14e. Split Swiper**: synchronized text + image sliders with `effect: 'fade'` and `slideTo()` binding
  - **14f. Swiper progress bar navigation**: thin animated fill bar replacing pagination dots for portfolio sliders
  - **14g. box-white / box-black section alternation**: CSS pseudo-element radial glow replacing decorative PNG images
  - **14h. Accordion FAQ**: native `<details>`/`<summary>` version with `rotate(45deg)` icon transition
  - **14i. Footer with watermark background logo**: faded brand name in `position: absolute` behind 3-column dense footer
  - **14j. Canvas cursor trail**: fading dot trail on `mousemove`, skipped on touch devices and `prefers-reduced-motion`
- Section 13 pre-delivery checklist: added "No placeholder text remains" item

### Changed
- `@setup` agent output template (`aios_lite_version`) bumped to `0.1.16` across all locales (en, pt-BR, es, fr) and base agent file

## [0.1.12] - 2026-03-02
### Added
- New static skill: `template/.aios-lite/skills/static/interface-design.md` — a comprehensive UI/UX craft guide derived from the interface-design project, covering: Intent-First Framework (3 mandatory questions before any layout), Domain Exploration (4 required outputs: domain concepts, color world, signature element, defaults to avoid), 6 design directions with full token specs (Precision & Density, Warmth & Approachability, Data & Analysis, Editorial, Commerce, Minimal & Calm), complete token architecture (foreground/background/border/brand/semantic roles), depth strategy (commit to ONE), component state matrix, 4 quality checks (swap/squint/signature/token tests), self-critique process (composition → craft → content → structure).
- Portuguese documentation at `docs/pt/`:
  - `README.md`: index linking all guides.
  - `inicio-rapido.md`: quick start with install commands, classification scoring, and 3-command setup.
  - `agentes.md`: per-agent reference with when-to-use, activation command, what it delivers, and concrete examples.
  - `cenarios.md`: 4 complete worked examples — MICRO (landing page), SMALL (Laravel clinic API with @analyst output, @architect folder structure, @dev code), MEDIUM (Next.js SaaS with 3-lane parallel orchestration), MEDIUM dApp (Ethereum NFT marketplace with Solidity contract example).
  - `web3.md`: Portuguese Web3 guide covering setup flags for Ethereum/Solana/Cardano, monorepo structure, per-agent Web3 conventions, and skill reference.

### Changed
- `@ux-ui` agent (base + all 4 locales: en/pt-BR/es/fr): mandatory pre-work now references `interface-design.md` skill, adds Intent-First step, Domain Exploration step (4 required outputs), single design direction declaration, 4 quality checks (swap/squint/signature/token tests), and self-critique gate before delivery. Output contract expanded with focal point, reading order, full state matrix, and handoff notes for signature visual moves.
- `workflow:plan` sequences corrected: `@ux-ui` now included in SMALL (`setup → analyst → architect → ux-ui → dev → qa`) and MEDIUM (`setup → analyst → architect → ux-ui → pm → orchestrator → dev → qa`), matching `config.md` and agent documentation.
- 13 static skills expanded from 5–7 stub lines to 200–337 lines of production-grade, code-first references:
  - `laravel-conventions`: controllers as orchestrators, Form Requests, Actions, Policies, Events+queued Listeners, Jobs, API Resources, N+1 prevention, Model conventions, Migrations, Pest tests.
  - `tall-stack-patterns`: Livewire lifecycle + real-time validation, inter-component events, lazy loading, Alpine.js scope rules, Tailwind design system discipline, full Flux UI examples (button/modal/table/dropdown/sidebar).
  - `filament-patterns`: Resource structure (form/table/filters/actions), custom Pages, Stats Widgets, Relation Managers, policy enforcement, advanced form fields (repeater, conditional, file upload), business logic delegation.
  - `flux-ui-components`: full component inventory, buttons (all variants + loading states), form field group, modal with programmatic control, dropdown menus, table with sort + empty state, badges, sidebar navigation.
  - `jetstream-setup`: Inertia vs Blade decision matrix, Teams with roles/permissions, API tokens, profile customization, 2FA, password confirmation middleware, post-install checklist.
  - `git-conventions`: full Conventional Commits spec with type table + examples, Git Flow vs GitHub Flow, branch naming, PR template, tagging, protected history rules.
  - `nextjs-patterns`: Server vs Client mental model, App Router structure, async Server Components, Server Actions with Zod, Client Components (when/why), Route Handlers for webhooks only, metadata/SEO, loading.tsx + error.tsx.
  - `node-express-patterns`: layered architecture (routes/controllers/services/repositories), Zod validation middleware, typed auth + role checking, AppError class hierarchy, centralized error handler, rate limiting, graceful shutdown.
  - `node-typescript-patterns`: strict tsconfig baseline, Zod at all external boundaries, env validation at startup, branded domain types for IDs, const-object enums, repository interface pattern, explicit return types, asyncHandler.
  - `rails-conventions`: Service Objects with Result type, model scopes/enums/validations, Active Record N+1 prevention, async Jobs with retry, Mailer patterns, serializers, Pundit authorization, RSpec request + unit specs.
  - `web3-ethereum-patterns`: CEI pattern, ReentrancyGuard, pull over push, AccessControl roles, gas optimization (struct packing, custom errors), Hardhat test patterns with loadFixture, wagmi v2 frontend integration, deployment scripts.
  - `web3-solana-patterns`: eUTxO/account model, Anchor program structure, account data with LEN, PDA seeds + bump storage, CPI signing, Anchor constraints, compute budget management, full Anchor test suite.
  - `web3-cardano-patterns`: eUTxO mental model, Aiken project structure, datum/redeemer type design, spending validator, minting policy, Aiken tests, off-chain with Lucid, datum versioning strategy, deployment checklist.
  - `web3-security-checklist`: 7 critical vulnerabilities with code examples (reentrancy, access control, integer overflow, oracle manipulation, flash loans, front-running, signature replay), pre-deployment checklist (static analysis/fuzzing/invariant tests/multisig/timelock), emergency response protocol.

### Fixed
- `workflow:plan` was silently omitting `@ux-ui` from SMALL and MEDIUM sequences despite `config.md` and all agent documentation specifying it as a required step. Fixed in `src/commands/workflow-plan.js` and updated `tests/workflow-plan.test.js`.

## [0.1.11] - 2026-03-02
### Added
- Agent prompt enrichment across all 8 agents:
  - `@analyst`: 6 concrete Phase 1 discovery questions, entity deep-dive example (scheduling system), field-level table format for Phase 3, `Visual references` and `Risks identified` output sections, responsibility boundary note.
  - `@architect`: concrete folder/module structure trees for MICRO/SMALL/MEDIUM across Laravel (TALL), Node/Express, Next.js (App Router), and dApp (Hardhat/Foundry/Anchor) stacks.
  - `@pm`: explicit 2-page golden rule with cut-ruthlessly instruction, when-to-use guidance (SMALL/MEDIUM only, skip MICRO), exact `prd.md` section template.
  - `@dev`: Laravel ALWAYS/NEVER convention list (Form Requests, Actions, Policies, Events+Listeners, Jobs, Resources, N+1 prevention), UI/UX conventions, Web3 guards for dApp projects, semantic commit format with examples, responsibility boundary note.
  - `@orchestrator`: MEDIUM-only activation condition with early exit, 4-step orchestration process, dependency graph example, parallel vs sequential classification rules, `agent-N.status.md` and `shared-decisions.md` status file protocol.
  - `@setup`: explicit `framework_installed` contract semantics (true/false downstream behavior), monorepo detection guidance for mixed Web3 + backend repos.
  - `@ux-ui` and `@qa`: no structural changes (already complete).
- All 8 locale packs (`en`, `pt-BR`, `es`, `fr`) synchronized with enriched agent content.
- `isMonorepoDetection()` in `src/detector.js`: returns `true` when a Web3 framework and a backend or frontend framework coexist in the same directory.
- Monorepo detection note propagated to `setup:context` output (localized via `note_monorepo` key in all 4 i18n message files).
- `note_monorepo` i18n key added to `en`, `pt-BR`, `es`, and `fr` message dictionaries.
- 4 new tests for `isMonorepoDetection` in `tests/detector.test.js`.

### Changed
- `setup:context` now prepends a localized monorepo warning note when Web3 and application framework signals coexist in the project directory.
- `template/.aios-lite/config.md` context contract updated with explicit `framework_installed` semantics.
- `aios_lite_version` example in `@setup` output template corrected from `0.1.8` to `0.1.10`.
- `tests/agent-contracts.test.js` updated to reflect new `@dev` section names (`Laravel conventions`, `Responsibility boundary`).

### Added
- Full `pt-BR` CLI dictionary at `src/i18n/messages/pt-BR.js`.
- Localized agent prompt packs for:
  - `es` at `template/.aios-lite/locales/es/agents/*.md`
  - `fr` at `template/.aios-lite/locales/fr/agents/*.md`
- New `@ux-ui` agent contract and template set:
  - `.aios-lite/agents/ux-ui.md`
  - `.aios-lite/locales/{en,pt-BR,es,fr}/agents/ux-ui.md`
  - `.gemini/commands/aios-ux-ui.toml`
- Legacy framework detection support:
  - `CodeIgniter 3`
  - `CodeIgniter 4`
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
- Version resolution is now centralized via `src/version.js` and shared across `info`, `setup:context`, and installer metadata generation.
- Removed remaining hardcoded `0.1.8` fallback in `setup:context` version assignment.
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
- Standardized localized line formatting for `agents`, `locale:apply`, `workflow:plan`, and `parallel:init` human-readable listings.
- Localized diagnostic line wrappers for `mcp:doctor` and `parallel:doctor` checks/hints, plus `context:validate` issue list rows.
- Localized diagnostic/action wrapper lines in `doctor` command output (checks, hints, fix actions, and detail lines).
- `cli` help and unknown-command wrapper lines are now localized via i18n keys instead of inline formatting.
- `init` and `install` now print explicit multi-IDE onboarding hints (`agents` + `agent:prompt setup`) with optional `--tool=codex|claude|gemini|opencode` guidance.
- Agent flow now supports explicit UI/UX handoff:
  - `@architect` may hand off key screens/component constraints to `@ux-ui`
  - `@dev` now consumes `.aios-lite/context/ui-spec.md` when present
  - `SMALL`/`MEDIUM` default sequence includes `@ux-ui`
- `doctor` now enforces multi-IDE gateway contracts (Claude/Codex/Gemini/OpenCode) and validates required Gemini/OpenCode files.
- `doctor` now also validates each Gemini command file (`.gemini/commands/aios-*.toml`) maps to the expected shared agent instruction file.
- `doctor --fix` now restores broken gateway contract files (Claude/Codex/Gemini/OpenCode + Gemini command mappings) from template in safe mode.
- `update` now supports `--lang=en|pt-BR|es|fr` (and `--language`) to force localized agent-pack sync during update, including dry-run planning.
- `--json` output mode now supports `init`, `install`, and `update` with clean machine-readable payloads (no mixed human logs).
- `--json` output mode now also supports `agents`, `agent:prompt`, `locale:apply`, `setup:context`, and `i18n:add`.
- JSON payloads for `init/install/update/agents/agent:prompt/locale:apply/setup:context/i18n:add` now include stable `ok` and command context fields.
- JSON schema catalog expanded with formal contracts for:
  - `init`
  - `install`
  - `update`
  - `agents`
  - `agent:prompt`
  - `locale:apply`
  - `setup:context`
  - `i18n:add`
- `init` and `install` now support `--lang=en|pt-BR|es|fr` to auto-apply localized agent packs during bootstrap.
- Setup templates now default `aios_lite_version` to `0.1.8`.
- `ui-ux-modern` static skill was expanded to a production-ready checklist with token, state, accessibility, responsive, and handoff guidance.
- Developer onboarding now handles `Other` backend/frontend choices as true free-text custom values (legacy/custom stacks).
- Expanded automated coverage:
  - `tests/i18n-cli.test.js`
  - `tests/init-install-guidance.test.js`
  - `tests/prompt-tool.test.js`
  - `tests/init-install-guidance.test.js` now validates locale pack auto-apply on `init/install --lang`
  - `tests/version.test.js`
  - `tests/update.test.js` now covers `--lang` override and dry-run locale sync planning
  - `tests/json-output.test.js` now covers `init/install/update --json`
  - `tests/json-output.test.js` now covers `agents/agent:prompt/locale:apply/setup:context/i18n:add --json`
  - `tests/json-schema-files.test.js` now validates expanded schema catalog
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
