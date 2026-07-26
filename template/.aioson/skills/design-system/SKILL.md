---
name: design
description: Cognitive Core Design System — a modular visual identity system for building dark/light themed dashboards, frontpages, admin panels, institutional sites, landing pages, and any web interface. Use this skill whenever asked to build, style, or design ANY web UI — dashboards, SaaS panels, landing pages, institutional websites, portfolio pages, command centers, admin tools, or frontpages. Triggers on phrases like "use the design skill", "cognitive core style", "apply the design system", "dark dashboard", "build a landing page", "create a frontpage", "mentes sinteticas layout", "build an admin panel", "create a website with our visual identity", or any request for a styled web interface. This skill routes to sub-modules — always read this file first, then load only the modules you need.
---

# Cognitive Core Design System

A modular visual identity system. Agents read THIS file first, then load only the sub-modules needed for the task.

## How Agents Use This System

### Step 1: Read this file (you're doing it)

### Step 2: Classify the task

Determine what type of UI is being built:

| Task Type | Load These Modules |
|---|---|
| **Dashboard / Admin panel** | foundations → components → patterns → dashboards |
| **Landing page / Frontpage** | foundations → components → patterns → motion |
| **Institutional / Corporate site** | foundations → components → patterns → motion |
| **Settings / Config page** | foundations → components → patterns |
| **Auth page (login/register)** | foundations → components → patterns |
| **Single component** | foundations → components |
| **Quick styling fix** | foundations |
| **Animation work** | foundations → motion |

### Step 3: Read the required modules IN ORDER

Always start with `foundations/SKILL.md` — it has the CSS variables everything else depends on. Then read the others as needed.

### Step 4: Build

Compose the interface using tokens from foundations, building blocks from components, layouts from patterns, and animations from motion. For dashboards, the dashboards module has ready-to-use presets.

## Visual Identity Summary

The Cognitive Core aesthetic has three pillars:

1. **Command Center Authority** — Dense data, monospaced labels, large stat readouts, structured grids
2. **Premium Refinement** — Layered surfaces (3+ depth levels), subtle borders, teal/cyan accent as the "pulse"
3. **Structured Hierarchy** — Tabs, sidebars, card grids, section headers with icons, labeled zones

This applies to ALL output types — dashboards get the full treatment, but frontpages and institutional pages use the same typography, color system, and component vocabulary in a more open layout.

## Theme System

Every output supports dark/light toggle via `data-theme` attribute:

```html
<div data-theme="dark"> <!-- or "light" -->
```

Toggle the attribute value to switch themes. The mechanism (state, JS toggle, server-side) depends on your stack.

Default to **dark** for dashboards/admin. Default to **light** for frontpages/institutional. Always include a theme toggle.

## Technology boundary

This skill controls visual identity, not framework, build tooling, or file layout. Treat sub-module examples as design specifications and adapt them to the active stack.

## Required Assets (all technologies)

- **Fonts**: Google Fonts — JetBrains Mono + Inter (import via CSS `@import` or `<link>` tag)
- **Icons**: Any icon library. Emoji placeholders in examples are just for illustration.
