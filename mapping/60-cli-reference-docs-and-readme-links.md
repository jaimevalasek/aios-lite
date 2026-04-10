# Iteration 60 — CLI reference docs and README links

## Date
2026-03-04

## Commit
b2072ef — docs(cli-reference): add full CLI reference and link README

---

## What was requested
The README listed ~20 commands but most had no documentation. User asked for:
1. Categorized docs with examples for all commands
2. Clickable links in the README pointing to each command's doc

---

## Diagnosis — coverage before this iteration

| Command | Had doc? |
|---------|---------|
| `mcp:init`, `mcp:doctor` | ✓ docs/en/mcp.md |
| `parallel:init/assign/status/doctor` | ✓ docs/en/parallel.md |
| `i18n:add`, `locale:apply` | ✓ docs/en/i18n.md |
| Web3 `setup:context` flags | ✓ docs/en/web3.md |
| `--json` output | ✓ docs/en/json-schemas.md |
| `init`, `install`, `update` | ✗ |
| `info` | ✗ |
| `doctor` | ✗ |
| `setup:context` | ✗ |
| `context:validate` | ✗ |
| `agents`, `agent:prompt` | ✗ |
| `workflow:plan` | ✗ |
| `test:smoke`, `test:package` | ✗ |

---

## Files created

### `docs/en/cli-reference.md` (new)
Full reference for all 12 previously undocumented commands. Each entry has:
- Description and use case
- All flags with explanations
- Code examples
- Output format (text and `--json` where applicable)

Commands covered: `init`, `install`, `update`, `info`, `doctor`, `setup:context` (all flags + Web3 flags + brownfield example), `context:validate`, `agents`, `agent:prompt`, `workflow:plan`, `test:smoke`, `test:package`.

---

## Files modified

### `README.md`
- **Commands section**: split into 6 categories (Setup/install, Agents, Locale, Parallel, MCP, Testing). Every command is now a markdown link `[`aios-lite cmd`](docs/en/...#anchor)`.
- **Agent usage helper**: restructured from a single `bash` code block (no links possible inside code blocks) into categorized lists with clickable links per command.
- **JSON output for CI**: added link to `docs/en/json-schemas.md`.
- **Web3 section**: added link to `docs/en/web3.md`.
- **Docs section**: converted from plain-text paths to proper markdown links, split into CLI reference / feature guides / release (internal) / Portuguese guides.

### `src/commands/workflow-plan.js`
Inconsistency found: `workflow:plan` CLI command still had the old sequences (without `@product`), while `config.md` had already been updated in iteration 59. Fixed:
- SMALL: `['setup', 'product', 'analyst', 'architect', 'dev', 'qa']`
- MEDIUM: `['setup', 'product', 'analyst', 'architect', 'ux-ui', 'pm', 'orchestrator', 'dev', 'qa']`
- MICRO: unchanged (`['setup', 'dev']`) but gains a `note_product_optional` note.

### `src/i18n/messages/en.js` / `pt-BR.js` / `es.js` / `fr.js`
Added `note_product_optional` key to `workflow_plan` section in all 4 locale files:
- en: "@product is optional for MICRO — skip it and go straight to @dev if the idea is already clear."
- pt-BR, es, fr: translated equivalents.

### `tests/workflow-plan.test.js`
Updated `deepEqual` assertions for SMALL and MEDIUM sequences to match the new sequences including `@product`.

---

## Key design note — README links strategy
Links inside ````bash` code blocks are not rendered as clickable by GitHub. The "Agent usage helper" was a single code block; restructuring it into categorized markdown lists was necessary to make links work.

GitHub anchor format for headings with colons: `setup:context` → `#setupcontext` (colon stripped, rest lowercased).

---

## Test result
178/178 pass.
