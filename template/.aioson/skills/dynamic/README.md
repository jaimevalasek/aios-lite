# Dynamic Skills

Files in this folder are **live-reference stubs** — they tell the agent where and how to fetch current documentation rather than embedding static (potentially stale) content.

## Pattern

When an agent reads a file here, it receives:
1. What this skill covers
2. Which MCP tool or URL to fetch from
3. What to look for (focus area)

The agent then fetches the current docs at runtime, preventing outdated patterns in generated code.

## When to use these vs static skills

| Situation | Use |
|---|---|
| Framework conventions, project structure, best practices | `skills/static/` |
| Current API signatures, latest package versions, changelog entries | `skills/dynamic/` (this folder) |

## Available dynamic skills

| File | Covers | Source |
|---|---|---|
| `laravel-docs.md` | Current Laravel syntax, helpers, Eloquent methods | laravel.com/docs |
| `ethereum-docs.md` | EVM tooling, Solidity compiler notes, library changes | docs.soliditylang.org |
| `solana-docs.md` | Anchor account model, SDK changes | docs.solana.com |
| `cardano-docs.md` | UTXO/validator patterns, off-chain SDK | docs.cardano.org |
| `flux-ui-docs.md` | Flux UI component APIs | fluxui.dev/docs |
| `npm-packages.md` | Package compatibility, version stability | npmjs.com |
