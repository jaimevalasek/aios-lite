---
name: multi-platform-pattern
description: How to create squads that produce content for multiple platforms simultaneously
version: 1.0.0
---

# Multi-Platform Pattern

A multi-platform squad produces content adapted for 2+ platforms from a single
creative brief. The key challenge is platform-specific adaptation without
losing message coherence.

## When to use

- Content squads targeting Instagram + YouTube + TikTok (or any combination)
- Marketing squads with omnichannel campaigns
- Brand squads maintaining consistent voice across platforms

## Structure

### Option A: Single creator + platform adapters

```
core-creator → platform-adapter-instagram
             → platform-adapter-youtube
             → platform-adapter-tiktok
```

Best when: one strong creative vision needs platform-specific formatting.

### Option B: Platform specialists

```
briefer → instagram-specialist
        → youtube-specialist
        → tiktok-specialist
        → brand-reviewer (cross-platform consistency check)
```

Best when: each platform requires deeply different approaches.

### Option C: Hybrid (recommended for most cases)

```
strategist → core-creator → platform-specialists (parallel)
                           → cross-platform-reviewer
```

## Executor recommendations

| Role | Type | Model tier | Purpose |
|---|---|---|---|
| strategist | agent | powerful | Defines the creative brief and core message |
| core-creator | agent | powerful | Creates the primary content piece |
| platform-adapter | agent | balanced | Adapts content per platform specs |
| brand-reviewer | agent | balanced | Ensures cross-platform consistency |
| format-checker | worker | none | Validates platform constraints (char limits, dimensions) |

## Format loading

Load format templates from `formats/` only for platforms the squad targets:

```
formats/instagram-feed.md    → Instagram squads
formats/youtube-long.md      → YouTube squads
formats/tiktok.md            → TikTok squads
formats/linkedin-post.md     → LinkedIn squads
formats/twitter-thread.md    → Twitter/X squads
```

## Workflow template

```json
{
  "slug": "multi-platform-content",
  "phases": [
    { "id": "brief", "executor": "strategist" },
    { "id": "core-draft", "executor": "core-creator" },
    { "id": "adapt", "executors": ["ig-adapter", "yt-adapter", "tt-adapter"], "parallel": true },
    { "id": "review", "executor": "brand-reviewer", "review": { "criteria": ["brand-consistency", "platform-fit"] } },
    { "id": "validate", "executor": "format-checker" }
  ]
}
```

## Anti-patterns

- **Copy-paste across platforms:** Each platform has unique audience behavior. Adaptation is mandatory.
- **Ignoring platform constraints:** Character limits, video durations, image ratios differ per platform.
- **One-size-fits-all CTA:** "Subscribe" on YouTube, "Follow" on Instagram, "Connect" on LinkedIn.
- **Missing cross-platform review:** Without consistency checks, brand voice fragments.

## Content blueprint suggestion

```json
{
  "slug": "multi-platform-package",
  "contentType": "multi-platform",
  "layoutType": "tabs",
  "sections": [
    { "key": "brief", "label": "Creative Brief" },
    { "key": "core-content", "label": "Core Content" },
    { "key": "instagram", "label": "Instagram Version" },
    { "key": "youtube", "label": "YouTube Version" },
    { "key": "tiktok", "label": "TikTok Version" }
  ]
}
```
