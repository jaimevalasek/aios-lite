---
name: design-patterns
description: Cognitive Core page-level patterns for dashboards, settings, authentication, list/detail, command centers, landing pages, and institutional pages. Load foundations and components first. Use when composing complete screens or page shells.
---

# Page Patterns

Load `../foundations/SKILL.md` and `../components/SKILL.md` first. Choose the smallest pattern matching the product task; do not merge every pattern into one screen.

## Pattern selection

- **Dashboard shell:** top bar + sidebar + main content. Start with page title/actions, then primary metrics, then data/charts. Collapse navigation to an accessible drawer at narrow widths.
- **Settings:** local settings navigation + one bounded form section at a time. Keep save/reset actions stable and show dirty/saved/error state.
- **Authentication:** focused single-column form with product identity, clear recovery path, validation, and optional contextual panel only when it adds trust.
- **List/detail:** filter/search/action rail, scan-friendly list or table, and detail region. Use route-based detail on mobile instead of forcing a cramped split pane.
- **Command center:** compact operational shell, health/status summary, prioritized alerts, live activity, and high-confidence actions. Never make all panels equally urgent.
- **Landing page:** navigation, one clear promise, proof, capability narrative, workflow/demo, objections, and final CTA. Use real product evidence; avoid invented metrics.
- **Institutional/content:** strong title and metadata, readable measure, stable local navigation, related content, and restrained calls to action.

## Shared composition contract

1. Establish the page's primary user outcome and one dominant action.
2. Select a pattern and write its information order before styling.
3. Build from foundation tokens and component contracts.
4. Add loading, empty, error, permission, and success states where the data flow requires them.
5. Define desktop, tablet, and mobile behavior by priority—not by uniform shrinking.
6. Verify keyboard order, focus visibility, heading hierarchy, and route/history behavior.

## Layout rules

- Use a bounded content width unless the task needs edge-to-edge operational data.
- Keep page titles/actions outside nested cards.
- Group related controls close to the data they affect.
- Keep sticky headers/rails from covering focused content.
- Let tables scroll or disclose columns intentionally; never squeeze unreadable values.
- Preserve one strong focal zone per viewport and subordinate secondary panels.
- Avoid card-in-card shells, repeated generic stat tiles, and empty decorative sidebars.

## Pattern-specific done gates

- Dashboard: metrics have units/context; charts have labels and non-chart summaries.
- Settings: unsaved changes are visible; destructive actions are separated.
- Auth: errors are recoverable; password/session actions are clear.
- List/detail: filters are reversible and represented in URL/state when appropriate.
- Command center: alert priority and freshness are explicit.
- Landing: CTA, proof, and content hierarchy survive without animation.
- Institutional: long-form measure and heading navigation remain readable.

## Final gate

Reject the page if the chosen pattern does not match the user journey, mobile only stacks everything without prioritization, state handling is absent, navigation becomes inaccessible, or visual grouping contradicts task order.
