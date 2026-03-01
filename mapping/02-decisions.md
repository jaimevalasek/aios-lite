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
