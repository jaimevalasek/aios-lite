---
slug: system-publish-build-source-leak
status: done
owner: dev
created_at: 2026-08-28
updated_at: 2026-08-28
classification: MICRO
risk: medium
source: direct-user-request
---

# Simple Plan - `system:publish --build` shipped readable runtime source

## Scope
Audit of `aioson system:publish . --build` end to end (CLI → `aioson-com` store API → Play install/update) before publishing an app to the Play store, with the owner's requirement "no source must travel". The measured package of a split-stack app (backend run by `tsx server/server.ts`) carried 61 readable `.ts` files, QA reports and AI-assistant config. Fix the framework so the build lane keeps its promise and is auditable before upload.

## Selected context / rules
- `context:guard` selected `.aioson/rules/source-code-language-convention.md` (English identifiers — followed: `protectRuntimeTypeScript`, `rawSourceError`, `DEV_ONLY_DIRS`).
- Existing pattern followed: the Terser boundary already used for compiled `.js` (`obfuscateJs`), the `BOOLEAN_FLAGS` contract in `src/parser.js`, `system.*` i18n keys in the four locales.
- Framework leverage before custom code: Node's own `module.stripTypeScriptTypes` (>= 22.13) instead of a new dependency; no obfuscator package added.
- Structure/data boundary: everything stays in `src/commands/store-system.js` (collector + publish) — no new module, no server change required for the fix.

## Options considered
- **include now**: type-strip + mangle `server/**/*.ts` under the same path; fail the publish on unprotectable runtime source (`--allow-raw-source` escape hatch); `.d.ts` never ships; `--dry-run` lists the package; dev-only dirs/files excluded; `--build` boolean in the parser; quarantine notice.
- **defer**: `include`/`exclude` lists in `.aioson/build-options.json` (already has `include`); `.mts/.cts` under `server/`; excluding `.aioson/squads/**/docs` from packages.
- **escalate (aioson-com, separate repo)**: `packageHash` is sha256 of an empty map in ZIP mode (`lib/store.ts:895`); CLI publish flips `isCurrent` on catalog-managed (PRO/BUSINESS) releases (`lib/store.ts:960`); retention leaves catalog artifact files on disk.

## Expected files
- `src/commands/store-system.js` — behavior
- `src/parser.js` — behavior
- `tests/store-system.test.js` — support
- `src/i18n/messages/{en,pt-BR,es,fr}.js` — support
- `docs/pt/3-receitas/publicar-no-aioson-com.md`, `docs/integrations/apps-publish-marketplace.md`, `docs/pt/5-referencia/comandos-cli.md`, `.aioson/docs/integrations/aioson-app-developer-guide.md` — support
- `CHANGELOG.md`, `.aioson/learnings/gotchas/publish-build-shipped-runtime-typescript.md`, `.aioson/learnings/INDEX.md` — support

## Done criteria
- A `--build` package of a tsx-run app contains no `server/**/*.ts` with type annotations or comments, no `.d.ts`, no `reports/`, `.opencode/`, `.qwen/`, `.agents/`, `aios-qa*`, `tests/`.
- The protected package boots through the app's real `start` (`tsx server/server.ts`).
- A runtime `.ts` file that cannot be protected aborts the publish before any upload; `--allow-raw-source` lets it through.
- `system:publish --dry-run` prints the full file list.
- `system:publish --build ./dir` publishes `./dir`, not the CWD.
- Suite: zero new failures.

## Verification evidence (2026-08-28)
- `node --test tests/store-system.test.js tests/parser-core.test.js tests/new-code-coverage-gaps.test.js` → 31/31.
- Full suite in four foreground quarters → 981 + 1147 + 1075 (1 pre-existing skip) + 1267 pass, 0 fail.
- Read-only collector over three real apps: split-stack app 104 → 90 files, `protectedTs: 60`, `rawSource: []`, 0 of 60 server files still carrying types/comments; QA reports and AI-assistant config gone from all three.
- Production-path smoke: protected package extracted to a temp dir + `node_modules` junction, `tsx server/server.ts` → `listening`, `GET /api/health` 200, `GET /api/workspaces` 401 (auth middleware executing).
- In-process live-fire with `fetch` stubbed: dry-run lists 5 files and never calls fetch; JSX under `server/` aborts with `system.error_raw_source` and 0 fetch calls; `--allow-raw-source` reaches the upload step; no `ExperimentalWarning` in the log.
