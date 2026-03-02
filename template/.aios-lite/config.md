# AIOS Lite Config

## Principles
- Less is more: complexity must match problem size.
- Single source of truth: rules live in `.aios-lite/agents/`.
- Never assume stack: detect first, then ask.

## Project sizes
- MICRO: `@setup -> @dev` (optional `@ux-ui` for UI-heavy projects)
- SMALL: `@setup -> @analyst -> @architect -> @ux-ui -> @dev -> @qa`
- MEDIUM: `@setup -> @analyst -> @architect -> @ux-ui -> @pm -> @orchestrator -> @dev -> @qa`

## Official classification
Score (0-6):
- User types: 1=0, 2=1, 3+=2
- External integrations: 0=0, 1-2=1, 3+=2
- Non-obvious rules: none=0, some=1, complex=2

Ranges:
- 0-1: MICRO
- 2-3: SMALL
- 4-6: MEDIUM

## Context contract
`project.context.md` must contain YAML frontmatter with:
- `project_name`
- `project_type`
- `profile`
- `framework`
- `framework_installed` (boolean) — `true` means the framework was detected in the workspace; downstream agents skip installation commands. `false` means it was not detected; agents must include installation steps before any implementation.
- `classification`
- `conversation_language` (BCP-47, for example `en`, `pt-BR`)
- `aios_lite_version`

Allowed `project_type` values:
- `web_app`
- `api`
- `site`
- `script`
- `dapp`

Optional Web3 context fields (recommended for `project_type=dapp`):
- `web3_enabled` (boolean)
- `web3_networks` (for example `ethereum`, `solana`, `cardano`, `ethereum,solana`)
- `contract_framework` (for example `Hardhat`, `Foundry`, `Anchor`, `Aiken`)
- `wallet_provider` (for example `wagmi`, `RainbowKit`, `Phantom`, `Lace`)
- `indexer` (for example `The Graph`, `Helius`, `Blockfrost`)
- `rpc_provider` (for example `Alchemy`, `Infura`, `QuickNode`)

## Agent locale packs
- Localized agent prompts are stored in `.aios-lite/locales/<locale>/agents/`.
- Active runtime prompts are in `.aios-lite/agents/`.
- Built-in locale packs: `en`, `pt-BR`, `es`, `fr`.
- Apply locale pack using:
  - `aios-lite locale:apply` (reads `conversation_language` from context)
  - `aios-lite locale:apply --lang=pt-BR` (manual override, also accepts `en`, `es`, `fr`)
