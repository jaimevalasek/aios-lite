---
name: premium-visual-design
description: >-
  Premium Visual Design System v2.1 for the AIOSON Squad Dashboard. Provides dark-first tokens, patterns, and components for agent threads, dependency graphs, review workflows, notifications, and team switching. Use when building or reviewing Squad Dashboard, inter-squad communication, or task/review workflow screens.
---

# Premium Visual Design System v2.1

Design system for AIOSON Squad Dashboard v3 and inter-squad UI. Dark-first, density-optimized, terminal-adjacent aesthetic.

## What's in v2.1

### Additions in v2.1.0
- `tokens/status-extended.md` — blocked/ready/solo/auto/human/review state tokens
- `patterns/agent-message-thread.md` — inter-squad feed with @mentions and reactions
- `patterns/task-dependency-graph.md` — SVG-based DAG with zero external deps
- `patterns/review-workflow-ui.md` — hunk-level code review with approve/reject flow
- `patterns/notification-panel.md` — notification center with filters and grouping
- `components/team-switcher.md` — sidebar squad navigation component
- `components/mention-autocomplete.md` — @agent, @squad, #task autocomplete
- `components/notification-center.md` — bell icon + badge + dropdown panel
- `components/dependency-node.md` — individual DAG node component
- `components/review-action-bar.md` — approve/reject/comment action bar
- `components/agent-badge.md` — auto/human/solo agent type indicator

## Architecture

```
skills/premium-visual-design/
├── SKILL.md                              ← Router (this file)
├── tokens/
│   └── status-extended.md               ← State & status color tokens
├── patterns/
│   ├── agent-message-thread.md          ← Inter-squad message feed
│   ├── task-dependency-graph.md         ← DAG visualization
│   ├── review-workflow-ui.md            ← Review + diff + hunks
│   └── notification-panel.md            ← Notification list with filters
└── components/
    ├── agent-badge.md                   ← Agent type badge
    ├── team-switcher.md                 ← Squad sidebar nav
    ├── mention-autocomplete.md          ← @mention dropdown
    ├── notification-center.md           ← Bell + badge + panel
    ├── dependency-node.md               ← DAG node
    └── review-action-bar.md             ← Approve/reject bar
```

## Design Language

**Aesthetic**: Dark terminal-adjacent. Dense but not cluttered. Monospace accents.

**Color foundation** (CSS variables, dark theme):
```css
--bg: #0f1117;           /* deep background */
--bg-card: #1a1d27;      /* card surface */
--bg-hover: #222632;     /* hover/elevated */
--border: #2a2e3a;       /* subtle borders */
--text: #e1e4eb;         /* primary text */
--text-muted: #8b8fa3;   /* secondary text */
--accent: #6c8aff;       /* primary accent (indigo) */
--accent-dim: rgba(108,138,255,0.15);
--success: #4ade80;      /* green */
--warning: #fbbf24;      /* amber */
--danger: #f87171;       /* red */
--cyan: #22d3ee;         /* cyan accent */
--purple: #c084fc;       /* purple accent */
```

## Loading guide for agents

| Task | Load |
|------|------|
| Agent message feed | tokens/status-extended → components/agent-badge → components/mention-autocomplete → patterns/agent-message-thread |
| Task dependencies | tokens/status-extended → components/dependency-node → patterns/task-dependency-graph |
| Code review | tokens/status-extended → components/review-action-bar → patterns/review-workflow-ui |
| Notifications | tokens/status-extended → components/notification-center → patterns/notification-panel |
| Squad nav | tokens/status-extended → components/team-switcher |
| Full dashboard | Load all in order: tokens → components → patterns |
