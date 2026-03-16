
# Motion — Animation System

Read after `references/foundations.md`.

Motion in Cognitive Core is **purposeful and restrained**. Dashboards use minimal motion (fast transitions, no flashy animations). Landing pages and frontpages use more dramatic entrances and scroll effects.

## Principles

1. **Functional first** — Every animation communicates state change or hierarchy
2. **Fast transitions** — UI state changes: 150ms. Theme changes: 250ms. Entrances: 400-600ms.
3. **Ease curves** — Default: `ease`. Entrances: `cubic-bezier(0.16, 1, 0.3, 1)` (smooth decelerate)
4. **No bounce, no elastic** — This is a command center, not a toy

## CSS Keyframes

Include these in your `<style>` block:

```css
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes fadeInDown {
  from { opacity: 0; transform: translateY(-12px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes slideInLeft {
  from { opacity: 0; transform: translateX(-20px); }
  to { opacity: 1; transform: translateX(0); }
}
@keyframes slideInRight {
  from { opacity: 0; transform: translateX(20px); }
  to { opacity: 1; transform: translateX(0); }
}
@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}
@keyframes pulseGlow {
  0%, 100% { box-shadow: 0 0 20px var(--accent-glow); }
  50% { box-shadow: var(--shadow-glow-strong); }
}
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
@keyframes progressFill {
  from { width: 0%; }
}
@keyframes countUp {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
```

## Entrance Patterns

### Page Load Sequence (staggered)

Apply to dashboard elements in this order, using `animation-delay`:

```
Top bar:      fadeInDown    0ms     300ms duration
Stats row:    fadeInUp      100ms   400ms duration (each card +80ms delay)
Tab bar:      fadeIn        250ms   300ms
Sidebar:      slideInLeft   200ms   400ms
Content:      fadeInUp      350ms   500ms (each card in grid +60ms stagger)
```

**React implementation:**
```jsx
const stagger = (index, base = 0, step = 60) => ({
  animation: `fadeInUp 500ms cubic-bezier(0.16, 1, 0.3, 1) ${base + index * step}ms both`,
});
// Usage: style={{ ...stagger(cardIndex, 350) }}
```

### Landing Page Hero Entrance

```
Mono label:    fadeInUp    0ms      500ms
Heading:       fadeInUp    150ms    600ms
Subtitle:      fadeInUp    300ms    500ms
CTA buttons:   fadeInUp    450ms    500ms
```

### Modal Entrance

```css
.modal-backdrop { animation: fadeIn 200ms ease both; }
.modal-content { animation: scaleIn 300ms cubic-bezier(0.16, 1, 0.3, 1) both; }
```

## Hover Effects

### Card Hover (default for all cards)
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
Primary: darken background. Secondary: accent border + accent text.
```
transition: background 150ms ease, color 150ms ease, border-color 150ms ease;
```

### Link Hover
```
color: var(--text-accent) → var(--accent-hover)
transition: color 150ms ease
```

### Tab Hover
Non-active tab: `background: var(--bg-elevated)`, `border-radius: var(--radius-md) var(--radius-md) 0 0`

### Sidebar Item Hover
`background: var(--bg-elevated)`, `color: var(--text-primary)`

## Loading States

### Skeleton Loading (shimmer)
```jsx
const skeletonStyle = {
  background: `linear-gradient(90deg, var(--bg-elevated) 25%, var(--bg-overlay) 50%, var(--bg-elevated) 75%)`,
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.5s ease-in-out infinite',
  borderRadius: 'var(--radius-md)',
};
// Usage: <div style={{ ...skeletonStyle, height: 20, width: '60%', marginBottom: 8 }} />
```

### Pulse Glow (for Mode Panel when "active")
```css
animation: pulseGlow 3s ease-in-out infinite;
```

### Progress Bar Animation
When progress bars first appear:
```css
animation: progressFill 800ms cubic-bezier(0.16, 1, 0.3, 1) both;
```

### Stat Number Count-up
```css
animation: countUp 600ms cubic-bezier(0.16, 1, 0.3, 1) both;
```

## Theme Transition

When toggling dark/light:
```css
transition: var(--transition-theme);
/* = background 250ms ease, color 250ms ease, border-color 250ms ease, box-shadow 250ms ease */
```

Apply to ALL themed containers. In React with inline styles:
```jsx
const TT = { transition: 'background 250ms ease, color 250ms ease, border-color 250ms ease, box-shadow 250ms ease' };
```

## Scroll-Triggered Animations (Landing Pages)

Use IntersectionObserver to trigger entrance animations on scroll:

```jsx
function useScrollReveal(ref, delay = 0) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVisible(true); obs.disconnect(); }
    }, { threshold: 0.15 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return {
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : 'translateY(24px)',
    transition: `opacity 600ms cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 600ms cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
  };
}
```

Usage:
```jsx
const ref = useRef(null);
const reveal = useScrollReveal(ref, 100);
<div ref={ref} style={reveal}>...</div>
```

## When to Use What

| Context | Motion Level | Techniques |
|---|---|---|
| Dashboard | Minimal | Card hover, tab switch, theme transition, progress bar fill |
| Landing page | Moderate | Staggered entrances, scroll reveals, hero sequence, card hovers |
| Frontpage | Moderate | Hero entrance, scroll reveals, CTA glow pulse |
| Modal/Detail | Light | scaleIn entrance, fadeIn backdrop |
| Loading state | Ambient | Skeleton shimmer, pulse glow |
