# Dynamic Skill: Laravel Docs

Use MCP documentation tools or fetch directly from the official docs to get current Laravel references before suggesting syntax or patterns.

---

## Installation paths

Before scaffolding a Laravel project, confirm which installation path was used — each ships different defaults:

| Path | URL | What it includes |
|---|---|---|
| **Standard (Herd / Installer)** | https://laravel.com/docs/12.x/installation | Bare Laravel, no auth scaffolding. Add Breeze/Jetstream manually. |
| **Sail (Docker)** | https://laravel.com/docs/10.x/installation#choosing-your-sail-services | Chooses services (MySQL, Redis, Meilisearch…) at creation. Works on all versions. |
| **Jetstream + Livewire** | https://jetstream.laravel.com/installation.html | Full auth (login, register, 2FA, teams, API tokens) + Livewire already installed. ⚠️ Must be chosen at project creation — late install is risky. |

**Jetstream detection signals:** presence of `laravel/jetstream` in `composer.json`, `app/Livewire/` folder, `resources/views/livewire/` folder, `JetstreamServiceProvider`.

**Sail detection signals:** `docker-compose.yml` in project root, `vendor/laravel/sail` in composer.

---

## Fetch targets

**Fetch from:** https://laravel.com/docs (latest version)

**Focus areas:**
- Eloquent method signatures (especially new helpers added per version)
- Artisan command options
- Service container bindings
- Vite asset bundling changes
- Breaking changes in the current major version
- Livewire v3 component lifecycle (if Jetstream detected)

**MCP tool examples:**
```
mcp_fetch url="https://laravel.com/docs/eloquent" topic="relationships"
mcp_fetch url="https://laravel.com/docs/12.x/installation" topic="herd quick start"
mcp_fetch url="https://jetstream.laravel.com/installation.html" topic="livewire stack"
mcp_fetch url="https://livewire.laravel.com/docs/components" topic="lifecycle hooks"
```
