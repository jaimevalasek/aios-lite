---
description: Setup technology orientation, framework caveats, Web3 fields, and visual-system selection
agents: [setup]
task_types: [stack-selection, design-selection, project-setup]
triggers: [choose framework, choose authentication, choose design skill, configure dapp]
paths: [.aioson/skills/design/, .aioson/context/identity.md]
---

# Setup Stack and Design Reference

Load only when the user needs to choose a technology, a framework-specific option changes setup safety, or a `site`/`web_app` needs its visual-system decision.

## Backend and runtime

- **Laravel / PHP:** batteries-included MVC, Eloquent, Artisan, broad ecosystem.
- **Rails / Ruby:** convention-heavy rapid development and strong defaults.
- **Django / Python:** built-in ORM/admin and batteries-included web development.
- **Next.js / TypeScript:** React with server rendering, static generation, and server routes.
- **FastAPI / Python:** async API framework with generated OpenAPI documentation.
- **Node.js with Express/Fastify:** minimal JavaScript/TypeScript API foundation.
- **Other:** preserve the user's described stack as-is; no forced preset.

When current information may have changed or the user needs exact versions, browse official primary documentation rather than relying on this orientation summary.

## Authentication

For Laravel:

- Breeze: basic login, registration, and password reset;
- Jetstream with Livewire: teams, 2FA, and API tokens;
- Filament Shield: roles/permissions for a Filament administration surface;
- Sanctum, Passport, OAuth, or custom JWT: explicit API/custom flows;
- none: when authentication is outside the confirmed scope.

Jetstream is safest at project creation. If an existing project requests a late Jetstream install, surface three choices: continue without it, recreate with Jetstream, or accept manual-install conflict risk. Do not install it during setup.

## UI orientation

- Tailwind CSS: utility-first styling across frameworks;
- Tailwind plus shadcn/ui: React component foundation;
- Tailwind plus shadcn-vue: Vue/Nuxt equivalent;
- Livewire: Laravel server-driven reactive UI;
- Bootstrap: conventional component-based CSS;
- Nuxt UI: Nuxt/Vue component library;
- none/custom: project-owned styling.

For Rails, resolve relevant `rails new` flags only when creating a project. For Next.js, resolve TypeScript, linting, and router options only when material. For Laravel, record the intended major version when known.

## Visual-system decision

The default recommendation is not a fixed aesthetic preset. Offer:

1. `interface-design` as the craft engine plus the user's reference images captured into `identity.md`;
2. one explicitly chosen installed design preset;
3. `design_skill: ""` with a visible pending visual decision.

Inspect available folder names under `.aioson/skills/design/`, but load only the chosen skill. Never infer selection from installation.

Use this compact decision language:

> I recommend `interface-design` driven by your reference images so the result is project-specific. You can instead select one installed preset, or leave the visual system pending for Product/UX.

When the first option is selected, follow `.aioson/docs/reference-identity.md`; do not fabricate a reference identity without images.

## Web3 orientation

When `project_type=dapp`, require explicit values for:

- `web3_enabled`;
- networks;
- contract framework;
- wallet provider;
- indexer;
- RPC provider.

Detect Hardhat, Foundry, Truffle, Anchor, Solana Web3, and Cardano signals. If Web3 and a backend/frontend framework coexist, treat the repository as a possible monorepo, confirm its primary framework, and document the structure.

## Decision rule

Explain only the tradeoff that changes the user's decision. Do not dump this entire reference into the conversation, add unsolicited alternatives, or turn setup into architecture design.
