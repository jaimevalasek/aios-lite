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
- Probability: High
- Mitigation: enforce `conversation_language` contract and implement localized agent packs in next cycle.

## R004 - Release process inconsistency across local and CI
- Severity: Medium
- Probability: Medium
- Mitigation: keep release templates/checklists up to date and require CI green before publish.
