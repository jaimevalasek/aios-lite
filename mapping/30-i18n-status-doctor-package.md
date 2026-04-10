# Mapping 30 - i18n hardening for status/doctor/package

Date: 2026-03-01

## Scope
- Localize remaining human-readable output and fallback error details in:
  - `parallel:status`
  - `mcp:doctor`
  - `test:package`

## Changes
- `parallel-status`
  - Replaced hardcoded human lines with i18n keys.
  - Added localized status labels for pending/in_progress/completed/blocked/other.
  - Added localized lane summary line.
- `mcp-doctor`
  - Replaced hardcoded `OK/WARN/FAIL` prefixes with i18n keys per locale.
- `package-e2e`
  - Replaced hardcoded fallback `unknown error` with localized key.
  - Exported `commandFailureDetail` for focused unit coverage.

## i18n keys added
- `package_test.error_unknown_detail`
- `parallel_status.status_line`
- `parallel_status.status_pending`
- `parallel_status.status_in_progress`
- `parallel_status.status_completed`
- `parallel_status.status_blocked`
- `parallel_status.status_other`
- `parallel_status.lane_line`
- `mcp_doctor.prefix_ok`
- `mcp_doctor.prefix_warn`
- `mcp_doctor.prefix_fail`

## Tests added
- `tests/parallel-status.test.js`
  - PT-BR localization checks for status line and lane line.
- `tests/mcp-doctor.test.js`
  - PT-BR localization checks for check prefixes (`[AVISO]`, `[FALHA]`).
- `tests/package-test.test.js`
  - Localized fallback for `commandFailureDetail` when stderr/stdout are empty.

## Risk notes
- JSON outputs remain unchanged; only human-readable logs were localized.
- Status JSON payload still uses canonical machine values (`pending`, `in_progress`, etc.).
