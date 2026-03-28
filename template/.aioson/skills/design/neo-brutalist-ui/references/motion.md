# Motion — Neo-Brutalist UI

Neo-brutalist motion is mechanical, not fluid. Like physical switches and buttons, not flowing water.

---

## Principles

1. **Mechanical**: movements are mechanical, not organic. Things snap into place, not glide.
2. **Instant feedback**: transitions are short and direct. User clicks → thing happens. No delay, no anticipation.
3. **Push mechanic**: the fundamental interaction — shadow disappears + translate equal to shadow offset. This is physical and satisfying.
4. **No spring curves**: easing is minimal. `linear` or basic `ease`. No bouncy `cubic-bezier`. That's glassmorphism/editorial territory.
5. **Zero blur motion**: no blur-in, no blur-out, no lens-style motion blur. Consistency with the no-blur principle.

---

## Timings

The fastest timings of all design skills. Brutalist doesn't waste time on animation.

```css
--transition-push:  60ms linear;    /* push mechanic — must feel instant */
--transition-fast:  80ms ease;      /* hover, focus state changes */
--transition-base:  120ms ease;     /* standard state changes (toggle, checkbox) */
--transition-slow:  200ms ease;     /* content changes, entrances */
```

---

## Core Mechanic — Push

The single most important interaction in this skill. Apply to every element that has a hard shadow.

```css
/* The brutalist push — applied to buttons, interactive cards, any element with box-shadow */

.brutalist-pushable {
  border: var(--border-thicker);
  box-shadow: var(--shadow-md);     /* 4px 4px 0 — the resting state */
  transition:
    box-shadow var(--transition-fast),
    transform var(--transition-fast);
}

.brutalist-pushable:hover {
  box-shadow: var(--shadow-lg);     /* 6px 6px 0 — grows on hover */
}

.brutalist-pushable:active {
  box-shadow: none;                 /* shadow completely gone */
  transform: translate(4px, 4px);  /* translate exactly equal to shadow-md offset */
  transition:
    box-shadow var(--transition-push),
    transform var(--transition-push);
}
```

Offset table — translate must match the resting shadow:

| Resting shadow | Active translate |
|---|---|
| `--shadow-sm` (2px 2px) | `translate(2px, 2px)` |
| `--shadow-md` (4px 4px) | `translate(4px, 4px)` |
| `--shadow-lg` (6px 6px) | `translate(6px, 6px)` |
| `--shadow-xl` (8px 8px) | `translate(8px, 8px)` |

Elements that get the push mechanic: all buttons, interactive cards, card-links, any element with `box-shadow`.

---

## Entrance Animations

### Snap In (default)
No movement — just appear. This is brutalist: things exist, they don't float in.

```css
@keyframes snap-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}

.enter-snap {
  animation: snap-in 150ms linear forwards;
}
```

### Slide Down
For dropdowns and menus — minimal vertical movement.

```css
@keyframes slide-down {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.enter-slide-down {
  animation: slide-down 200ms ease forwards;
}
```

### Pop
For modals and tooltips — scale from slightly smaller.

```css
@keyframes pop {
  from {
    opacity: 0;
    transform: scale(0.92);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.enter-pop {
  animation: pop 150ms ease forwards;
}
```

### Typewriter (decorative, use sparingly)
For code blocks and terminal-feel elements only.

```css
/* Implementation via JavaScript character-by-character reveal */
/* CSS: set initial text to empty, add characters via JS at 30ms intervals */
/* Only for hero code blocks or onboarding terminal demos — never for body text */
```

---

## Stagger

Very fast — barely perceptible. The entrance is about structure, not spectacle.

```css
/* 30ms per item — faster than all other skills */
.stagger-1 { animation-delay: 0ms; }
.stagger-2 { animation-delay: 30ms; }
.stagger-3 { animation-delay: 60ms; }
.stagger-4 { animation-delay: 90ms; }
```

Rules:
- Maximum 4 items in a stagger sequence
- Use `snap-in` as the animation (opacity only — no translate)
- Do not stagger on content inside tables
- Stagger on: card grids, feature lists, stat cards on initial page load

---

## Hover States

```css
/* Cards */
.card:hover {
  box-shadow: var(--shadow-lg);    /* shadow grows: 4px → 6px */
  transition: box-shadow 80ms ease;
}

/* Buttons: same shadow growth */
.btn-primary:hover {
  box-shadow: var(--shadow-lg);
}

/* Table rows */
.table tbody tr:hover {
  background: var(--bg-elevated);
  transition: background 60ms ease;
}

/* Nav links: underline reveal */
.nav-link:hover {
  text-decoration: underline;
  text-decoration-thickness: 2px;
  text-underline-offset: 4px;
  /* Instant — no animation needed */
}

/* Images: NO hover transition */
/* Brutalist images don't do smooth zoom or overlay on hover */
```

---

## Scroll Animations

Minimal. Apps: none by default. Websites: opacity only on viewport entry.

### For websites (IntersectionObserver)

```js
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target); // only once
      }
    });
  },
  { threshold: 0.15 }
);

document.querySelectorAll('[data-animate]').forEach(el => observer.observe(el));
```

```css
[data-animate] {
  opacity: 0;
  transition: opacity 200ms ease;
}

[data-animate].visible {
  opacity: 1;
}
```

No `translateY`, no scale — **opacity only**. Brutalist content doesn't slide in.

### Marquee (continuous)

Only the `.marquee` component. CSS animation, never applied to anything else.

```css
@keyframes marquee {
  from { transform: translateX(0); }
  to   { transform: translateX(-50%); }
}
```

---

## Page Transitions

```css
/* App content area: near-instant */
.content-area--transitioning {
  animation: snap-in 100ms linear;
}

/* Modal: pop entrance */
.modal { animation: pop 150ms ease; }

/* Backdrop: instant */
.modal-backdrop { animation: snap-in 80ms linear; }

/* Tabs: instant — no fade, just swap */
.tab-content[hidden] { display: none; }  /* direct hide — no transition */
```

---

## Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  /* Remove all animations */
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }

  /* EXCEPTION: Push mechanic is maintained */
  /* It's nearly instant at 60ms, and is tactile feedback — not decoration */
  .brutalist-pushable:active {
    transition-duration: 60ms !important;
  }

  /* Marquee: stop */
  .marquee__track {
    animation: none !important;
  }
}
```

The push mechanic (`60ms linear`) is preserved under reduced motion because it's functionally equivalent to instant feedback — it confirms the press, not decorates it.
