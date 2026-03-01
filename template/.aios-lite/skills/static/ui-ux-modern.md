# Modern UI/UX Guidelines

## Goal
Ship interfaces that feel intentional, modern, and production-ready without over-designing beyond project scope.

## Core-Lite balance
- Follow AIOS Core quality discipline (explicit decisions, consistency, UX clarity).
- Keep AIOS Lite delivery lean (small scope, direct implementation guidance, low artifact overhead).

## Core principles
- Clarity before decoration: users should immediately understand the primary action.
- One visual direction per product area: typography, color, and component density must be consistent.
- Reuse before reinventing: prioritize existing stack UI libraries and primitives.
- Accessibility is default, not optional.

## Layout and hierarchy
- Define a spacing scale (for example 4/8/12/16/24/32) and keep it consistent.
- Keep a clear reading order:
  1. Page intent
  2. Primary action
  3. Supporting data
- Prefer shallow nesting in cards and panels to reduce cognitive load.

## Typography and color
- Use a predictable type scale with clear role mapping:
  - page title
  - section title
  - body
  - helper/meta text
- Keep contrast high for critical text and controls.
- Use semantic color roles (primary/success/warning/danger/info) instead of arbitrary one-off colors.

## Component quality checklist
For every major component, define:
- default state
- hover/focus/active/disabled states
- loading skeleton/spinner behavior
- empty state
- error state with recovery action
- success confirmation when relevant

## Forms and validation
- Put labels outside placeholders (placeholders are hints, not labels).
- Validate as early as possible without being noisy.
- Show inline field errors and one global summary for multi-field failures.
- Disable destructive actions while submitting and show progress feedback.

## Responsive behavior
- Design mobile-first, then scale up.
- Ensure key actions are reachable with one hand on mobile.
- Avoid dense tables on small screens; use stacked cards or summary rows.

## Accessibility baseline
- Semantic HTML and proper landmarks.
- Full keyboard navigation and visible focus states.
- Click/tap targets large enough for touch.
- Meaning not conveyed by color alone.

## Motion and feedback
- Use motion to clarify transitions, not as decoration.
- Keep transitions short and consistent.
- Avoid blocking animations for critical workflows.

## Stack-specific guidance
- Laravel + TALL: prefer Livewire + Alpine patterns and existing Blade components.
- Filament admin: prefer Resources and built-in actions before custom UI.
- Flux UI: use Flux primitives first and keep custom wrappers minimal.
- Next.js/React: keep component boundaries clean and avoid unnecessary client state.

## Handoff quality
When passing to implementation:
- provide component mapping to real library components
- include state matrix (loading/empty/error/success/permission)
- include responsive and accessibility notes
- keep the spec concise enough for direct coding
