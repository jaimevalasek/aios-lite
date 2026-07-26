---
name: design-dashboards
description: Cognitive Core presets for premium control centers, admin analytics, ops cockpits, and CRM layouts. Load foundations, components, and patterns first. Use for dashboards, admin panels, monitoring tools, or other data-heavy operational interfaces.
---

# Dashboard Presets

Load `../foundations/SKILL.md`, `../components/SKILL.md`, and `../patterns/SKILL.md` first. Select one primary preset, then adapt it to actual data and user decisions.

## Premium control center

Use for orchestration, security, AI operations, and command surfaces.

- Shell: top bar + compact sidebar + full-width main region.
- First row: 3–5 high-value metrics with units, trend, and freshness.
- Main focal region: system topology, active pipeline, or prioritized work.
- Secondary region: health, recent activity, and bounded alerts.
- Keep mono rails, dense labels, and restrained accent. Make urgency semantic.

## Admin analytics

Use for product, growth, finance, or business reporting.

- Start with timeframe/filter context and report actions.
- Summary row followed by one primary chart, comparison breakdown, then detailed table.
- Preserve exact values outside charts and label all axes/units.
- Represent loading, empty, partial-data, and export states.
- Keep density moderate and optimize for comparison rather than spectacle.

## Ops cockpit

Use for live services, queues, incidents, deployments, or logistics.

- Lead with overall state, freshness, incidents, and operator actions.
- Use compact status lanes, service/queue table, event stream, and alert detail.
- Make acknowledgment, retry, rollback, or escalation consequences explicit.
- Separate active incidents from historical noise.
- Use timestamps, owner, severity, and source on every alert.

## CRM/contact manager

Use for accounts, leads, opportunities, pipelines, and relationship workflows.

- List/table with search, filters, saved views, sorting, pagination, and bulk actions.
- Detail route or split view with identity, activity, related records, next action, and ownership.
- Pipeline views expose stage rules and preserve an accessible list alternative.
- Never hide validation, permissions, duplicate detection, archive, or restore behavior.

## Adaptation rules

1. Name the primary user decision and choose the closest preset.
2. Remove irrelevant regions before adding new ones.
3. Map real data fields, states, permissions, and actions to components.
4. Establish responsive priority: primary state/actions first, details later.
5. Add keyboard navigation, focus handling, and non-color status cues.
6. Validate with representative long labels, empty data, errors, and high volume.

Mix at most one bounded region from another preset. Preserve a single hierarchy and do not create a “mega-dashboard”.

## Done gate

Reject the dashboard if every panel has equal weight, metrics lack units/context, charts lack textual values, tables are unusable on mobile, alert freshness/ownership is missing, actions have no feedback, filters are not reversible, or the composition is a generic grid unrelated to the operator's decisions.
