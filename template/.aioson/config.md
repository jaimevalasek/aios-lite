# AIOSON Config

## Principles
- Less is more: complexity must match problem size.
- Single source of truth: rules live in `.aioson/agents/`.
- Never assume stack: detect first, then ask.
- For `project_type=site` and `project_type=web_app`, visual system choice is explicit workflow data. Record it in `design_skill` or leave it blank on purpose; never auto-pick a design skill silently.

## Project sizes
- MICRO: `@setup -> @product (optional) -> @dev`
- SMALL: `@setup -> @product -> @analyst -> @architect -> @dev -> @qa`
- MEDIUM: `@setup -> @product -> @analyst -> @architect -> @ux-ui -> @pm -> @orchestrator -> @dev -> @qa`

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
- `aioson_version`

Optional UI context fields:
- `design_skill` (for example `cognitive-ui`; keep empty when the visual system is still pending)

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

## Visual system gate
- For `site` and `web_app`, `design_skill` must be chosen explicitly during the workflow or kept explicitly blank.
- `@setup` can register the initial choice.
- `@product` and `@ux-ui` can confirm or update that choice when it is still blank.
- `@dev` must consume the chosen `design_skill`; it must never auto-select one.

## Agent locale packs
- Localized agent prompts are stored in `.aioson/locales/<locale>/agents/`.
- Active runtime prompts are in `.aioson/agents/`.
- Built-in locale packs: `en`, `pt-BR`, `es`, `fr`.
- Apply locale pack using:
  - `aioson locale:apply` (reads `conversation_language` from context)
  - `aioson locale:apply --lang=pt-BR` (manual override, also accepts `en`, `es`, `fr`)
