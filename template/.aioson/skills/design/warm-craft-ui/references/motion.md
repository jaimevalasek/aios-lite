# Motion — Warm Craft UI

Animation and transition specifications. Motion in Warm Craft is **gentle and purposeful** — every animation should feel like a natural, unhurried movement. Nothing aggressive, nothing flashy.

---

## Motion Principles

1. **Gentle over dramatic.** Animations should feel like a slow exhale, not a punch. Ease-out curves, moderate durations, subtle distances.
2. **Purposeful only.** Every animation must communicate something: entrance, state change, feedback, hierarchy. Decorative motion is noise.
3. **Consistent timing.** Use the token-based durations. Never arbitrary millisecond values.
4. **Respect user preference.** Always implement `prefers-reduced-motion` — reduce all animations to near-instant.

---

## Timing Tokens

```css
--transition-fast:  120ms ease;       /* micro-interactions: hover, focus, toggle */
--transition-base:  200ms ease;       /* state changes: active, expand, collapse */
--transition-slow:  320ms ease;       /* page transitions, large reveals, modals */
--transition-theme: background 200ms ease, color 200ms ease, border-color 200ms ease, box-shadow 200ms ease;
```

---

## Easing Curves

```css
/* Standard — most interactions */
--ease-default:  cubic-bezier(0.25, 0.1, 0.25, 1.0);    /* ease */

/* Entrance — elements appearing */
--ease-enter:    cubic-bezier(0.0, 0.0, 0.2, 1.0);      /* ease-out — decelerates in */

/* Exit — elements leaving */
--ease-exit:     cubic-bezier(0.4, 0.0, 1.0, 1.0);      /* ease-in — accelerates out */

/* Gentle spring — for playful moments (onboarding, celebrations) */
--ease-spring:   cubic-bezier(0.34, 1.56, 0.64, 1.0);   /* slight overshoot */
```

---

## Entrance Animations

### Fade In (default entrance)
```css
@keyframes warm-fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}

.fade-in {
  animation: warm-fade-in 300ms var(--ease-enter) both;
}
```

### Fade Up (cards, sections)
```css
@keyframes warm-fade-up {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.fade-up {
  animation: warm-fade-up 400ms var(--ease-enter) both;
}
```

### Scale In (modals, popovers)
```css
@keyframes warm-scale-in {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.scale-in {
  animation: warm-scale-in 250ms var(--ease-enter) both;
}
```

### Slide In (drawers, side panels)
```css
@keyframes warm-slide-in-right {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.slide-in-right {
  animation: warm-slide-in-right 300ms var(--ease-enter) both;
}
```

---

## Stagger Sequences

For lists, grids, and card groups appearing together:

```css
.stagger-group > * {
  animation: warm-fade-up 400ms var(--ease-enter) both;
}

.stagger-group > *:nth-child(1) { animation-delay: 0ms; }
.stagger-group > *:nth-child(2) { animation-delay: 60ms; }
.stagger-group > *:nth-child(3) { animation-delay: 120ms; }
.stagger-group > *:nth-child(4) { animation-delay: 180ms; }
.stagger-group > *:nth-child(5) { animation-delay: 240ms; }
.stagger-group > *:nth-child(6) { animation-delay: 300ms; }
```

Rules:
- Stagger delay: 60ms per item (warm, unhurried).
- Max 6 items staggered. After 6, start the rest together.
- Only stagger on first load or page transition. Never on scroll.

---

## Micro-Interactions

### Button Press
```css
button:active {
  transform: scale(0.98);
  transition: transform 80ms ease;
}
```

### Card Hover Lift
```css
.card-interactive {
  transition: transform var(--transition-base), box-shadow var(--transition-base);
}

.card-interactive:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}
```

### Toggle Switch
```css
.toggle-thumb {
  transition: transform 200ms var(--ease-spring);
}

.toggle-checked .toggle-thumb {
  transform: translateX(20px);
}
```

### Checkbox Check
```css
@keyframes warm-check {
  0%   { stroke-dashoffset: 20; }
  100% { stroke-dashoffset: 0; }
}

.checkbox-checked svg path {
  animation: warm-check 200ms var(--ease-enter) both;
}
```

### Input Focus Ring
```css
input {
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}

input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-dim);
}
```

---

## Page Transitions

### Content Area Change (tab switch, route change)
```css
.page-content-enter {
  animation: warm-fade-up 300ms var(--ease-enter) both;
}

.page-content-exit {
  animation: warm-fade-in 150ms var(--ease-exit) reverse both;
}
```

Rule: exit is faster than enter (150ms vs 300ms). Content should leave quickly and arrive gently.

### Modal Enter/Exit
```css
/* Backdrop */
.modal-backdrop-enter {
  animation: warm-fade-in 200ms ease both;
}

/* Modal */
.modal-enter {
  animation: warm-scale-in 280ms var(--ease-enter) both;
  animation-delay: 60ms; /* slight delay after backdrop */
}

.modal-exit {
  animation: warm-scale-in 180ms var(--ease-exit) reverse both;
}
```

### Drawer Enter/Exit
```css
.drawer-enter {
  animation: warm-slide-in-right 300ms var(--ease-enter) both;
}

.drawer-exit {
  animation: warm-slide-in-right 200ms var(--ease-exit) reverse both;
}
```

---

## Scroll Reveal (websites only)

Use for landing pages and marketing sections. Never for app pages.

```css
.scroll-reveal {
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 500ms var(--ease-enter), transform 500ms var(--ease-enter);
}

.scroll-reveal.visible {
  opacity: 1;
  transform: translateY(0);
}
```

Implementation:
```javascript
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target); // trigger once
    }
  });
}, { threshold: 0.15 });

document.querySelectorAll('.scroll-reveal').forEach(el => observer.observe(el));
```

Rules:
- Threshold: 0.15 (trigger when 15% visible — feels natural).
- Trigger once, never re-animate on scroll back.
- Translate distance: 20px max. More feels dramatic, less feels invisible.
- Duration: 500ms. Scroll reveals are slower than UI transitions — they are narrative.

---

## Loading States

### Skeleton Pulse
```css
@keyframes warm-pulse {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.5; }
}

.skeleton {
  background: var(--bg-elevated);
  border-radius: var(--radius-md);
  animation: warm-pulse 1.8s ease-in-out infinite;
}
```

### Spinner (for buttons, small areas)
```css
@keyframes warm-spin {
  to { transform: rotate(360deg); }
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid var(--border-medium);
  border-top-color: var(--accent);
  border-radius: var(--radius-full);
  animation: warm-spin 800ms linear infinite;
}
```

### Progress Bar Fill
```css
.progress-fill {
  transition: width 600ms var(--ease-enter);
}
```

---

## Celebration Moments

For onboarding completion, achievement unlocked, milestone reached.

```css
@keyframes warm-celebrate {
  0%   { transform: scale(0.8); opacity: 0; }
  50%  { transform: scale(1.05); }
  100% { transform: scale(1); opacity: 1; }
}

.celebration {
  animation: warm-celebrate 500ms var(--ease-spring) both;
}
```

Use sparingly. One celebration per flow, not per step.

---

## Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

Non-negotiable. Always include this in the global stylesheet.
