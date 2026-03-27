# Motion — Cognitive Core UI

Read after `design-tokens.md`. Add to context only when motion materially improves the result.

Motion is **purposeful and restrained**. Dashboards use minimal motion. Landing pages use more dramatic entrances and scroll effects.

---

## Principles

1. **Functional first** — every animation communicates state change or hierarchy
2. **Fast transitions** — UI state: 140ms. Theme: 240ms. Entrances: 400–600ms
3. **Ease curves** — default `ease`. Entrances: `cubic-bezier(0.16, 1, 0.3, 1)` (smooth decelerate)
4. **No bounce, no elastic** — this is a command center, not a toy
5. **Always include** `@media (prefers-reduced-motion: reduce)` fallback

---

## CSS Keyframes

```css
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes fadeInDown {
  from { opacity: 0; transform: translateY(-12px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes slideInLeft {
  from { opacity: 0; transform: translateX(-20px); }
  to   { opacity: 1; transform: translateX(0); }
}
@keyframes slideInRight {
  from { opacity: 0; transform: translateX(20px); }
  to   { opacity: 1; transform: translateX(0); }
}
@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.95); }
  to   { opacity: 1; transform: scale(1); }
}
@keyframes pulseGlow {
  0%, 100% { box-shadow: 0 0 20px var(--accent-glow); }
  50%       { box-shadow: var(--shadow-glow-strong); }
}
@keyframes shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
@keyframes progressFill {
  from { width: 0%; }
}
@keyframes countUp {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* Reduced motion fallback */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Entrance Patterns

### Dashboard Page Load (staggered)

```
Top bar:    fadeInDown   0ms    300ms
Stats row:  fadeInUp   100ms   400ms  (each card +80ms delay)
Tab bar:    fadeIn     250ms   300ms
Sidebar:    slideInLeft 200ms  400ms
Content:    fadeInUp   350ms   500ms  (each card in grid +60ms stagger)
```

**React helper:**
```jsx
const stagger = (index, base = 0, step = 60) => ({
  animation: `fadeInUp 500ms cubic-bezier(0.16, 1, 0.3, 1) ${base + index * step}ms both`,
});
// Usage on each card: style={{ ...stagger(cardIndex, 350) }}
```

### Landing Page Hero

```
Mono label:  fadeInUp    0ms   500ms
Heading:     fadeInUp  150ms   600ms
Subtitle:    fadeInUp  300ms   500ms
CTA buttons: fadeInUp  450ms   500ms
```

### Modal

```css
.modal-backdrop { animation: fadeIn 200ms ease both; }
.modal-content  { animation: scaleIn 300ms cubic-bezier(0.16, 1, 0.3, 1) both; }
```

---

## Expression-Aware Motion

Match motion to the expression mode chosen in `references/art-direction.md`.

### Tactical Monolith
- Keep motion short, directional, and low drama
- Prefer panel reveals, status updates, and quiet count-up behavior
- Avoid floaty motion, oversized parallax, or decorative loops

### Quiet Graphite
- Use soft fades, small elevation shifts, and measured reveal delays
- Let motion reinforce polish, not spectacle

### Signal Editorial
- Use more narrative sequencing: headings, side notes, proof blocks, and media can enter in layered stages
- Favor stagger and reveal rhythm over obvious bounce or glow pulses

### Luminous Light
- Keep motion crisp and clean
- Favor focus, control feedback, and gentle surface lifts over cinematic effects

### Industrial Flow
- Motion should feel functional and linear
- Sliding panels, queue shifts, progress fills, and status transitions work better than float or blur-heavy effects

### Gallery Intelligence
- Let media frames, profile blocks, and showcase surfaces reveal with slightly richer sequencing
- Keep metadata motion subtle so the content remains primary

---

## Hover Effects

### Card Hover

```jsx
onMouseEnter={e => {
  e.currentTarget.style.borderColor = 'var(--border-medium)';
  e.currentTarget.style.boxShadow = 'var(--shadow-glow)';
  e.currentTarget.style.transform = 'translateY(-2px)';
}}
onMouseLeave={e => {
  e.currentTarget.style.borderColor = '';
  e.currentTarget.style.boxShadow = 'none';
  e.currentTarget.style.transform = '';
}}
```

Card must have: `transition: border-color 150ms ease, box-shadow 150ms ease, transform 150ms ease`

### Button Hover
```
Primary: background → var(--accent-hover)
Secondary: borderColor → var(--border-accent), color → var(--text-accent)
transition: 150ms ease
```

### Tab Hover (non-active)
`background: var(--bg-elevated)`, `border-radius: var(--radius-md) var(--radius-md) 0 0`

### Sidebar Item Hover
`background: var(--bg-elevated)`, `color: var(--text-primary)`

---

## Loading States

### Skeleton Shimmer

```jsx
const skeletonStyle = {
  background: `linear-gradient(90deg,
    var(--bg-elevated) 25%,
    var(--bg-overlay) 50%,
    var(--bg-elevated) 75%)`,
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.5s ease-in-out infinite',
  borderRadius: 'var(--radius-md)',
};
// Usage: <div style={{ ...skeletonStyle, height: 20, width: '60%', marginBottom: 8 }} />
```

### Pulse Glow (Mode Panel when active)
```css
animation: pulseGlow 3s ease-in-out infinite;
```

### Progress Bar Fill (on mount)
```css
animation: progressFill 800ms cubic-bezier(0.16, 1, 0.3, 1) both;
```

### Stat Number Count-up
```css
animation: countUp 600ms cubic-bezier(0.16, 1, 0.3, 1) both;
```

---

## Scroll-Triggered Animations (Landing Pages)

```jsx
function useScrollReveal(ref, delay = 0) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.15 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return {
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : 'translateY(24px)',
    transition: `opacity 600ms cubic-bezier(0.16,1,0.3,1) ${delay}ms,
                 transform 600ms cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
  };
}

// Usage:
const ref = useRef(null);
const reveal = useScrollReveal(ref, 100);
<div ref={ref} style={reveal}>...</div>
```

**CSS-only alternative (no JS):**
```css
.reveal {
  opacity: 0; transform: translateY(24px);
  transition: opacity 600ms cubic-bezier(0.16,1,0.3,1), transform 600ms cubic-bezier(0.16,1,0.3,1);
}
.reveal.visible { opacity: 1; transform: translateY(0); }
```

---

## Theme Transition

Apply to ALL themed containers so dark/light switch feels smooth:

```jsx
const TT = { transition: 'background 240ms ease, color 240ms ease, border-color 240ms ease, box-shadow 240ms ease' };
// Or in CSS: transition: var(--transition-theme);
```

---

## When to Use What

| Context | Level | Techniques |
|---|---|---|
| Dashboard | Minimal | Card hover, tab switch, theme transition, progress fill |
| Landing page | Moderate | Staggered entrances, scroll reveals, hero sequence, card hovers |
| Frontpage | Moderate | Hero entrance, scroll reveals, CTA glow pulse |
| Modal/Detail | Light | scaleIn entrance, fadeIn backdrop |
| Loading state | Ambient | Skeleton shimmer, pulse glow |
| Admin CRUD | None/minimal | Only theme transition + hover states |

---

## Anti-Generic Motion Rules

- Do not use the same stagger recipe on every page type.
- Do not animate everything just because motion is available.
- One memorable sequence beats constant moving surfaces.
- If motion draws more attention than hierarchy or content, reduce it.
