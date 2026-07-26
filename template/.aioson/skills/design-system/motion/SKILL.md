---
name: design-motion
description: Cognitive Core motion patterns for entrances, hover/focus feedback, loading states, scroll reveals, theme transitions, and micro-interactions. Load foundations first. Use when animation materially improves a landing page, frontpage, dashboard, or product interaction.
---

# Motion System

Load `../foundations/SKILL.md` first. Motion must explain change, preserve continuity, or provide feedback. Dashboards use short functional transitions; marketing surfaces may use more expressive but bounded sequences.

## Timing contract

- Micro feedback: 100–180ms.
- Component state change: 160–240ms.
- Panel/dialog entrance: 200–320ms.
- Page/hero sequence: 300–600ms with small stagger.
- Use ease-out for entrances, ease-in for exits, and ease-in-out for reversible movement.
- Animate opacity and transforms where possible. Avoid layout-thrashing properties.

## Patterns

- **Page entrance:** reveal the focal region, then supporting groups. Cap staggered items; do not animate every row.
- **Hero entrance:** introduce headline, proof, and primary action in reading order. Keep content visible without animation.
- **Dialog/drawer:** pair opacity with small scale/translation; focus moves only after the surface is ready.
- **Hover/focus:** use a slight border, color, shadow, or 1–2px transform. Focus must remain more explicit than hover.
- **Loading:** skeleton for known structure, spinner for bounded action, progress for measurable work, and textual status for long operations.
- **Count/progress:** animate only when the change matters; preserve the final value in accessible text.
- **Theme transition:** transition tokenized color/background/border/shadow properties; disable transitions during initial theme hydration.
- **Scroll reveal:** use one `IntersectionObserver`, reveal once by default, and keep ordering semantic.

## Reduced-motion contract

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    scroll-behavior: auto !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

Do not rely on animation to disclose information. Under reduced motion, render the same final state and preserve all feedback text.

## Implementation rules

- Maintain one owner for each animation; avoid overlapping CSS and JavaScript control.
- Cancel timers/frames/observers on teardown.
- Do not delay primary interaction for entrance sequences.
- Keep transformed elements from creating accidental stacking or clipping bugs.
- Pause continuous animation offscreen and in hidden tabs.
- Use stable dimensions for skeletons/media to prevent layout shift.
- Test rapid repeated input, interrupted transitions, and navigation during animation.

## Done gate

Reject motion that is decorative noise, blocks input, causes layout shift, repeats on every scroll, ignores reduced-motion, hides focus, delays state confirmation, consumes excessive CPU/GPU, or leaves an interrupted component between states.
