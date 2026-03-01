# Development Mapping — AIOS Lite

This folder stores the technical memory for the project to prevent context loss during development.

## Files
- `01-gap-analysis.md`: identified planning gaps.
- `02-decisions.md`: technical decisions and rationale.
- `03-compatibility-matrix.md`: compatibility rules for Claude Code, Codex CLI, Gemini CLI, and OpenCode.
- `04-implementation-backlog.md`: executable MVP backlog.
- `05-test-plan.md`: automated and manual testing strategy.
- `06-release-checklist.md`: npm + GitHub release checklist.
- `07-engineering-notes.md`: implementation notes and next technical targets.
- `08-risk-register.md`: active risks, impact, and mitigations.

## Usage rules
1. Every significant change should create or update a record in `02-decisions.md`.
2. Any cross-IDE behavior mismatch must be logged in `03-compatibility-matrix.md`.
3. Before release, every item in `06-release-checklist.md` must be completed.
