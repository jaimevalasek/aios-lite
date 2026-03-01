# Risk Register

## R001 - User expects automatic visual agent picker
- Severity: High
- Probability: High
- Mitigation: expose `agents` and `agent:prompt` commands; improve docs.

## R002 - Invalid project context breaks downstream agents
- Severity: High
- Probability: Medium
- Mitigation: strict validation in `doctor` and `context:validate` command.

## R003 - Partial i18n expectation mismatch (CLI vs agent conversation)
- Severity: Medium
- Probability: Medium
- Mitigation: localized agent packs are active for `en` and `pt-BR` via `locale:apply` and `setup:context`; keep adding locale coverage and smoke tests for language flows.

## R004 - Release process inconsistency across local and CI
- Severity: Medium
- Probability: Medium
- Mitigation: keep release templates/checklists up to date and require CI green before publish.

## R005 - Unsafe auto-fixes could overwrite user intent
- Severity: High
- Probability: Low
- Mitigation: keep `doctor --fix` restricted to safe template restoration (no overwrite) and locale sync only; provide `--dry-run` preview.

## R006 - Web3 framework mis-detection in mixed repos
- Severity: Medium
- Probability: Medium
- Mitigation: keep explicit `--framework` and `--project-type` overrides in `setup:context`; document manual override flow in `docs/en/web3.md`.

## R007 - Web3 smoke profile drift from real-world stacks
- Severity: Medium
- Probability: Medium
- Mitigation: maintain per-chain smoke seeds and update profile fixtures when major tooling conventions change.

## R008 - JSON contract breaking downstream automation
- Severity: Medium
- Probability: Medium
- Mitigation: lock JSON payload fields with automated tests and document schema evolution before changes.
