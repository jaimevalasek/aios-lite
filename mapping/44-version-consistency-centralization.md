# 44 - Version Consistency Centralization

Date: 2026-03-01

## Scope
Remove version drift risk by centralizing CLI package version lookup and eliminating old hardcoded fallback values.

## Changes
- Added `src/version.js`:
  - `getCliVersion()`
  - `getCliVersionSync()`
  - `parseVersionFromPackageJson()`
- Integrated shared version resolution into:
  - `src/commands/info.js`
  - `src/commands/setup-context.js`
  - `src/installer.js` (install metadata generation)
- Removed remaining hardcoded `0.1.8` fallback in setup context creation.
- Updated changelog top section to `## [Unreleased]` for forward development tracking.

## Validation
- Added `tests/version.test.js`.
- `npm run ci` passed.
