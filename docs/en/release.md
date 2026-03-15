# Release Guide

## CI
- Workflow: `.github/workflows/ci.yml`
- Triggers: push to `main`, pull requests
- Steps: install, lint, test, `npm pack --dry-run`

## npm publish
- Workflow: `.github/workflows/release.yml`
- Triggers: `v*` git tags or manual dispatch
- Required secret: `NPM_TOKEN`

## Name availability snapshot (2026-03-01)
The following names returned `404 Not Found` from npm registry lookup and were therefore available at the time of check:
- `aioson`
- `aioson-cli`
- `create-aioson`
- `@aioson/create`
- `@synkra-ai/aioson`
- `@synkra-ai/create-aioson`

## Recommended release flow
1. Update `CHANGELOG.md`.
2. Bump version in `package.json`.
3. Commit and push to `main`.
4. Create and push a tag like `v0.1.1`.
5. Verify publish logs in GitHub Actions.

## Templates
- Release notes template: `.github/release-notes-template.md`
- Extended release notes guide: `docs/en/release-notes-template.md`
- Tag flow checklist: `docs/en/release-flow.md`
