# Local NPM Publish Runbook (AIOS Lite)

This file is local-only and intentionally ignored by git.

## Goal
Publish a new `aios-lite` version to npm without auth/token issues.

## Quick release checklist
1. Confirm package version:
   ```bash
   npm pkg get name version
   ```
2. Run quality checks:
   ```bash
   npm run ci
   ```
3. Commit release changes (`package.json`, `package-lock.json`, `CHANGELOG.md`).
4. Create/update git tag (`vX.Y.Z`) after the release commit.
5. Push branch and tag to GitHub.

## npm authentication flow (recommended each publish session)
1. Clean old auth state:
   ```bash
   npm logout
   npm config delete //registry.npmjs.org/:_authToken
   npm config set registry https://registry.npmjs.org/
   ```
2. Login in browser:
   ```bash
   npm login --auth-type=web
   ```
3. Validate auth:
   ```bash
   npm whoami
   ```
4. Validate ownership:
   ```bash
   npm owner ls aios-lite
   ```

## Publish
```bash
npm publish --access public
```

## Verify release
```bash
npm view aios-lite version
```

## Common failures and fixes

### `Access token expired or revoked`
- Cause: stale token in npm config.
- Fix: run the full authentication flow above and login again.

### `404 Not Found - PUT ... aios-lite@X.Y.Z is not in this registry`
- Usually appears when auth is invalid or publish was not authorized.
- Also expected before first successful publish of that exact version.
- Fix: re-authenticate and run `npm whoami` before `npm publish`.

### `403 Two-factor authentication... required`
- Use npm web login + security key/2FA approval.
- If using token-based flow, create a valid granular token with publish permissions and proper 2FA policy.

## Optional secure token flow (if not using web login)
```bash
npm logout
npm config delete //registry.npmjs.org/:_authToken
npm config set //registry.npmjs.org/:_authToken=<TOKEN_SINGLE_LINE>
npm whoami
npm publish --access public
```

Important:
- Never store real tokens in tracked files.
- Revoke leaked/old tokens in npm account settings.
