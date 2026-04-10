# 18 - Smoke Mixed Monorepo Profile

Date: 2026-03-01

## Scope completed
- Extended `test:smoke` with profile mode support:
  - `--profile=standard|mixed`
- Added mixed monorepo seeding (`Web2 + Web3`):
  - root workspace package
  - web app package (Next.js)
  - contracts package (Hardhat)
- Added mixed profile verification:
  - ensures inferred `project_type=dapp`
  - ensures `web3_enabled=true`
  - ensures expected framework preference
- Added guardrails:
  - invalid profile rejection
  - conflict rejection for `--profile=mixed` + `--web3`
- Updated i18n messages (`en`, `pt-BR`) and docs.

## Validation
- `npm run ci` passed.
