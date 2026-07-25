# Release Guide

## CI
- Workflow: `.github/workflows/ci.yml`
- Triggers: push to `main`, pull requests
- Steps: install, lint, test, and `npm run verify:release:quick`

## Release validation
- Workflow: `.github/workflows/release.yml`
- Triggers: `v*` git tags or manual dispatch
- Behavior: runs the complete release-readiness gate; it does not publish.

Publishing remains a separate, explicitly authorized
`npm publish --access public` operation after the tagged workflow is green.

## npm package name
The published package name is `@jaimevalasek/aioson`.

The unscoped name `aioson` was rejected by npm because it is considered too similar to an existing package, so releases should use the scoped package.

## Recommended release flow
1. Update `CHANGELOG.md`.
2. Bump version in `package.json`.
3. Run `npm run verify:release`.
4. Commit and push to `main`.
5. Create and push a tag like `v0.1.1`.
6. Verify the validation workflow, explicitly authorize publication, then
   verify the local npm publish output.

The full gate is implemented by
`scripts/testing/release-readiness.js`. It combines Git/package boundaries,
production dependency audit, tarball closure, the full CI suite, operational
smoke checks, and an isolated install exercise. The tag and release-label
workflows both call this same script so local and hosted release behavior cannot
drift.

## Templates
- Release notes template: `.github/release-notes-template.md`
- Extended release notes guide: `docs/en/release-notes-template.md`
- Tag flow checklist: `docs/en/release-flow.md`
