# Engineering Notes

Date: 2026-03-01

## What was added in this iteration
- Web3 framework detection was added:
  - Ethereum: `Hardhat`, `Foundry`, `Truffle`
  - Solana: `Anchor`, `Solana Web3`
  - Cardano: `Cardano` (Aiken/Cardano SDK signals)
- Context contract extended:
  - `project_type` now supports `dapp`
  - `project.context.md` now includes Web3 frontmatter/body fields (`web3_enabled`, `web3_networks`, `contract_framework`, `wallet_provider`, `indexer`, `rpc_provider`)
- `setup:context` now infers `dapp` defaults from Web3 framework detection.
- New Web3 skills shipped in template:
  - static: chain patterns + security checklist + Node/TypeScript patterns
  - dynamic: Ethereum/Solana/Cardano docs references
- New guide: `docs/en/web3.md`.
- `test:smoke` now supports chain-specific Web3 profiles:
  - `--web3=ethereum`
  - `--web3=solana`
  - `--web3=cardano`
- Web3 smoke now verifies framework detection and `project.context.md` dApp fields per network profile.
- New `--json` mode for automation in:
  - `info`
  - `doctor`
  - `context:validate`
  - `test:smoke`
- CLI now emits structured JSON errors for unknown commands and runtime failures in `--json` mode.
- Development baseline bumped to `0.1.7`.

## Why this matters
- Makes AIOS Lite viable for the growing JS/TS Web3 developer segment.
- Reduces setup ambiguity by encoding chain/framework decisions into structured context.
- Keeps lightweight scope: guidance and detection first, no risky auto-deployment behavior.
- Prevents silent regressions in Web3 onboarding across supported chains.
- Enables robust CI integration without brittle text parsing.

## Known limitations
- Agent execution is still manual from the AI CLI perspective; this package does not spawn external AI sessions.
- Locale pack coverage is currently limited to `en` and `pt-BR`.
- Web3 detection is heuristic-based and may require manual override in monorepos.
- JSON schema is implicit in tests/docs and not yet versioned as a formal spec file.

## Next implementation targets
1. Expand locale packs beyond `en` and `pt-BR` (for example `es`, `fr`) with contribution workflow.
2. Add profile-specific smoke scenarios for mixed Web2 + Web3 monorepos.
3. Publish formal JSON schema docs per command (with backward compatibility policy).
