# Release Checklist

## Code
- [x] `npm test` is green.
- [x] `npm run lint` is green.
- [x] CLI commands pass smoke tests.

## Documentation
- [x] README with quick start.
- [x] Initial CHANGELOG.
- [x] CONTRIBUTING and CODE_OF_CONDUCT.

## Publishing
- [x] npm name availability checked (`aios-lite` and fallbacks verified as available on 2026-03-01).
- [x] `bin` executable has shebang.
- [x] `files` in package.json include templates and docs.
- [x] Release tag created in git repository (`v0.1.0`, `v0.1.1`, `v0.1.2`, `v0.1.3`, `v0.1.4`, `v0.1.5`, `v0.1.6`).
- [x] Release notes templates prepared (`.github/release-notes-template.md`, `docs/en/release-notes-template.md`).
- [x] GitHub Actions CI and release workflows are configured.
