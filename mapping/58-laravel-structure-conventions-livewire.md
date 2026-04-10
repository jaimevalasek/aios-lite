# Iteration 58 — Laravel structure, naming conventions, Livewire and installation links

## Date
2026-03-03

## Commit
cc7bb65 — feat(laravel): add project structure, naming conventions, Livewire patterns and installation links

## What was requested
- Add Laravel installation links to the docs dynamic skill (Herd, Sail, Jetstream+Livewire)
- Verify if @dev enforces folder separation (controllers, models, views, etc.)
- Verify if singular/plural naming conventions were documented
- Add Livewire patterns (Jetstream stack)

## Diagnosis — what was missing

| File | Gap |
|---|---|
| `skills/dynamic/laravel-docs.md` | No installation links at all |
| `skills/static/laravel-conventions.md` | No project structure tree, no naming table, no Livewire section |
| `@dev` (base + all locales) | Mentioned conventions but no folder layout, no singular/plural rules |

## Changes made

### `template/.aios-lite/skills/dynamic/laravel-docs.md`
Added installation table with three paths:
- Herd/standard: https://laravel.com/docs/12.x/installation
- Sail (Docker): https://laravel.com/docs/10.x/installation#choosing-your-sail-services
- Jetstream + Livewire: https://jetstream.laravel.com/installation.html (full auth, must be at project creation)

Added detection signals for each stack (composer.json keys, folder presence).
Added Livewire v3 MCP fetch example.

### `template/.aios-lite/skills/static/laravel-conventions.md`
Added at the top (before Controllers section):

1. **Project structure tree** — full folder layout including:
   - `app/Actions/`, `app/Http/Controllers/`, `app/Http/Requests/`, `app/Models/`
   - `app/Policies/`, `app/Events/`, `app/Listeners/`, `app/Jobs/`
   - `app/Livewire/` (Jetstream only), `resources/views/<plural>/`
   - `database/`, `routes/`, `tests/`

2. **Naming conventions table** — 13 artefacts:
   - Singular: classes (Model, Controller, Policy, Resource, Form Request, Action, Livewire class)
   - Plural: DB tables, route URIs, view folders
   - Livewire file: kebab-case matching class name

3. **Singular/plural rule of thumb** summary

Added at the bottom (before ALWAYS/NEVER):

4. **Livewire components section** with:
   - `#[Computed]` property pattern
   - `wire:model.live` vs `wire:model.lazy`
   - Component class + blade template example
   - Classic controller variant for non-interactive pages
   - Rule: both patterns coexist — pick one per page

Updated NEVER list:
- Added `#[Computed]` note to "no queries in templates" rule
- Added: never mix Livewire and classic controller on the same route

### `template/.aios-lite/agents/dev.md` + en/pt-BR/es/fr locales (5 files)
Added to the Laravel conventions section:
- Folder layout block (code block with comments)
- Naming singular/plural rules (4 bullet points)
- Extended Never list with `#[Computed]` note and Livewire mixing rule

## Key conventions documented

| Artifact | Convention |
|---|---|
| Model | Singular PascalCase → `User` |
| Table | Plural snake_case → `users` |
| Controller | Singular + Controller → `UserController` |
| Form Request | Action + model → `CreateUserRequest` |
| Action | Verb + noun + Action → `CreateUserAction` |
| View folder | Plural → `resources/views/users/` |
| Route URI | Plural kebab → `/users` |
| Livewire class | PascalCase → `UserList` |
| Livewire file | kebab-case → `user-list.blade.php` |
