# Domain: Cinematic Web

> Category: deliverable (software/mixed squads)
> Version: 1.0.0
> Updated: 2026-08-12

Squads that build cinematic websites: scroll-driven narrative pages where art
direction, motion, and typography carry the story. This is a deliverable
domain — the squad ships sites, not content into a folder.

## Domain signature

What separates a cinematic site from a template landing page:

- **Narrative structure** — the page is scenes, not sections: each viewport
  states one idea and hands off to the next; scroll is the timeline.
- **Art direction over decoration** — one committed visual concept (palette,
  grain, light, texture) applied everywhere; not an effects collection.
- **Motion as causality** — animation explains entrance, hierarchy, and
  transition; it is choreographed to scroll/interaction, never ambient noise.
- **Typography at display scale** — type is a primary visual actor with a real
  scale contrast between display and reading sizes.
- **Atmosphere with performance** — heavy media is earned: lazy, sized,
  compressed; LCP and scroll smoothness are part of the aesthetic.

## Executor implications

The roster this domain actually demands (adapt, don't copy):

- an **art-direction owner** (concept, tokens, references — the taste authority)
- a **motion/interaction builder** (scroll choreography, transitions, states)
- a **narrative copy owner** (scene-level story, not filler headlines)
- an independent **quality reviewer** (replaceability test, performance budget)

## Quality bar

- Passes the replaceability test: swap the client's name and the page must stop
  making sense — composition and content are domain-specific.
- Reduced-motion behavior is designed, not an afterthought.
- Responsive means recomposed scenes, not shrunk desktop.
- Performance floor: mobile LCP under 2.5s despite rich media.

## Anti-patterns

- Template shell with a hero, three cards, and a CTA — the card-wall failure.
- Neon-gradient "premium" slop with no committed art concept.
- Motion without narrative: parallax everywhere, meaning nowhere.
- A wide page of dead controls instead of one finished vertical.

## Pilot flagship

One complete cinematic landing for a representative (fictional) client: hero
scene, two narrative scenes, and a close, with real scroll choreography,
reduced-motion fallback, and responsive recomposition. Entrypoint:
`output/{slug}/pilot/index.html`. Depth of finish beats page count.

## Reuse before inventing

Design skills under `.aioson/skills/design/` (e.g. `bold-editorial-ui`,
`aurora-command-ui`) and `landing-page-forge` provide direction systems and
production stacks; the squad parameterizes them, it does not fork them.
