# 53 - Legacy and Custom Stack Support

Date: 2026-03-02

## Scope
Improve AIOS Lite usability for existing legacy repositories and stacks outside preset menus.

## Implemented
- Detector support for legacy PHP frameworks:
  - `CodeIgniter 3` via `system/core/CodeIgniter.php` or `application/config/config.php`
  - `CodeIgniter 4` via `spark`, `app/Config/App.php`, or `composer.json:codeigniter4/framework`
- Developer onboarding now handles true custom values when selecting `Other`:
  - backend free text
  - frontend free text
- `setup:context` help text updated (all built-in locales) to expose custom stack flags:
  - `--framework`
  - `--backend`
  - `--frontend`
  - `--database`
  - `--auth`
  - `--uiux`
- README now includes explicit legacy usage example with CodeIgniter 3.

## Validation
- Added tests for:
  - detector (`CodeIgniter 3/4`)
  - onboarding custom `Other` handling
  - `setup:context --defaults` with custom legacy stack
- `npm run ci` passed after changes.
