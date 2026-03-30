# Components — Aurora Command UI

Read after `design-tokens.md`. All components use CSS variables and adapt to dark/light themes automatically. Every container-type component is a glass surface.

Code examples use JSX inline style notation as **design specifications** — read property-value pairs as spec, then adapt syntax to the active stack (HTML, Vue, Blade, etc.). The shorthand `TG` means `{ transition: 'var(--transition-glass)' }`.

---

## Glass Rules (read first)

Before building any component:

1. **Substrate required**: glass only works over the aurora gradient background. Confirm `body` or root container has `background: var(--bg-gradient); background-attachment: fixed` before building.
2. **Top reflection on every glass container**: every glass card must have `::before` with `var(--glass-highlight)`. This is what makes the glass feel real.
3. **Minimum 2 depth layers**: never place a glass card directly adjacent to another glass card of the same opacity without context differentiation.
4. **@supports fallback**: every glass surface must degrade gracefully when `backdrop-filter` is unsupported.
5. **Text contrast over dark glass**: dark glass can make text illegible. Verify WCAG AA — increase `--glass-surface` alpha toward `--glass-elevated` if needed.
6. **Mono rails are section structure** — not component decoration. Use them in section headers, stat labels, and metadata zones only.

---

## 1. Glass Card (fundamental component)

Every container-type component inherits from this. It is the atomic building block of the system.

```
Structure:
  position: relative
  overflow: hidden
  background: var(--glass-surface)
  backdrop-filter: var(--glass-blur-md)
  border: 1px solid var(--glass-border)
  border-radius: var(--radius-xl)
  box-shadow: var(--shadow-md), var(--shadow-inner)
  padding: var(--space-5)

::before (top reflection):
  content: ''
  position: absolute
  top: 0; left: 0; right: 0
  height: 50%
  background: var(--glass-highlight)
  pointer-events: none
  border-radius: inherit

Hover:
  background: var(--glass-elevated)
  box-shadow: var(--shadow-glow), var(--shadow-inner)
  transition: var(--transition-glass)

@supports (backdrop-filter: blur(1px)):
  background: var(--glass-surface)
  backdrop-filter: var(--glass-blur-md)
Fallback (no @supports):
  background: var(--glass-fallback)
```

Variants:
- `glass-card--sm`: `padding: var(--space-4)`, `border-radius: var(--radius-lg)`
- `glass-card--lg`: `padding: var(--space-8)`, `border-radius: var(--radius-2xl)`, `backdrop-filter: var(--glass-blur-lg)`
- `glass-card--hero`: `padding: var(--space-10)`, `border-radius: var(--radius-3xl)`, `backdrop-filter: var(--glass-blur-lg)`
- `glass-card--featured`: adds `box-shadow: var(--shadow-glow-strong)` + `border: 1px solid var(--glass-border-accent)`
- `glass-card--shell`: uses `var(--glass-shell)` + `var(--glass-blur-lg)` — for sidebar and top bar surfaces

---

## 2. Glass Top Navigation Bar

```
┌──────────────────────────────────────────────────────────────┐
│ [Logo] AppName     Link  Link  Link     [Theme ☀] [Avatar]  │
└──────────────────────────────────────────────────────────────┘
```

```css
.top-bar {
  position: sticky;
  top: 0;
  z-index: var(--z-sticky);
  height: var(--nav-height);
  background: var(--glass-shell);
  backdrop-filter: var(--glass-blur-lg);
  border-bottom: 1px solid var(--glass-border);
}
@supports (backdrop-filter: blur(1px)) {
  .top-bar {
    background: var(--glass-shell);
    backdrop-filter: var(--glass-blur-lg);
  }
}
```

- Logo: 32px square, `background: var(--accent-primary-dim)`, `border: 1px solid var(--glass-border-accent)`, `border-radius: var(--radius-md)`, icon in `var(--accent-primary)`
- Brand name: `font-family: var(--font-mono)`, `--weight-bold`, `--text-base`, `--text-heading`, `letter-spacing: var(--tracking-wide)`
- Nav links: `--text-base`, `color: var(--text-secondary)`. Hover: `var(--text-primary)`. Active: `var(--text-accent)`.
- Theme toggle: see Component 16.

---

## 3. Stat Card

Glass card with mono label + large number. The primary KPI component.

```jsx
<div style={{
  background: 'var(--glass-surface)',
  backdropFilter: 'var(--glass-blur-md)',
  border: '1px solid var(--glass-border)',
  borderRadius: 'var(--radius-xl)',
  padding: 'var(--space-4) var(--space-5)',
  boxShadow: 'var(--shadow-md), var(--shadow-inner)',
  minWidth: 140, flex: 1, position: 'relative', overflow: 'hidden',
  ...TG,
}}>
  {/* ::before reflection in CSS */}
  <div style={{
    fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)',
    color: 'var(--text-muted)', letterSpacing: 'var(--tracking-widest)',
    textTransform: 'uppercase', fontWeight: 600, marginBottom: 'var(--space-1)'
  }}>LABEL</div>
  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
    <span style={{
      fontFamily: 'var(--font-display)', fontSize: 'var(--text-4xl)', fontWeight: 700,
      color: 'var(--text-heading)', lineHeight: 1, fontVariantNumeric: 'tabular-nums'
    }}>42</span>
    <span style={{ fontSize: 'var(--text-lg)', color: 'var(--text-muted)' }}>/100</span>
  </div>
  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: 'var(--space-1)' }}>
    subtitle text
  </div>
</div>
```

**Hero variant** (gradient stat number — use only once per viewport):
```css
.stat-number--hero {
  background: var(--accent-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
```

**Semantic variants**: replace number color with `var(--semantic-green)`, `var(--semantic-red)`, or `var(--semantic-amber)`.

---

## 4. Glass Sidebar

```
┌───────────────────┐
│ SECTION LABEL     │ ← mono rail
│ ● Item Active     │ ← glass-elevated + border-left accent
│ ○ Item            │ ← text-secondary
│                   │
│ SECTION LABEL     │
│ ○ Item            │
└───────────────────┘
```

```css
.sidebar {
  width: var(--sidebar-width);   /* 210px */
  height: 100vh;
  position: fixed;
  top: 0; left: 0;
  background: var(--glass-shell);
  backdrop-filter: var(--glass-blur-lg);
  border-right: 1px solid var(--glass-border);
  padding: var(--space-6) 0;
  overflow-y: auto;
}
@supports (backdrop-filter: blur(1px)) {
  .sidebar { background: var(--glass-shell); backdrop-filter: var(--glass-blur-lg); }
}

.sidebar-section-label {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: var(--weight-semibold);
  letter-spacing: var(--tracking-widest);
  text-transform: uppercase;
  color: var(--text-muted);
  padding: var(--space-2) var(--space-4);
  margin-top: var(--space-4);
}

.sidebar-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-md);
  font-size: var(--text-base);
  color: var(--text-secondary);
  cursor: pointer;
  transition: var(--transition-glass);
  margin: 0 var(--space-2);
}
.sidebar-item:hover {
  background: var(--glass-elevated);
  color: var(--text-primary);
}
.sidebar-item.active {
  background: var(--glass-elevated);
  border-left: 3px solid var(--accent-primary);
  color: var(--text-heading);
  padding-left: calc(var(--space-4) - 3px);
}
.sidebar-item.active .sidebar-icon {
  color: var(--accent-primary);
}
```

---

## 5. Section Header (mono rail)

The structural backbone. Every content zone begins with one.

```jsx
<div style={{
  display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
  padding: 'var(--space-6) 0 var(--space-3)',
}}>
  <span style={{ color: 'var(--accent-primary)', fontSize: 'var(--text-lg)' }}>⚡</span>
  <div>
    <div style={{
      fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', fontWeight: 600,
      letterSpacing: 'var(--tracking-widest)', textTransform: 'uppercase',
      color: 'var(--text-muted)',
    }}>SECTION LABEL</div>
    <div style={{
      fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 700,
      color: 'var(--text-heading)', letterSpacing: 'var(--tracking-tight)',
    }}>Section Title</div>
  </div>
</div>
```

Simple variant (mono-only, no title — for dense dashboards):
```jsx
<div style={{
  fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', fontWeight: 600,
  letterSpacing: 'var(--tracking-widest)', textTransform: 'uppercase',
  color: 'var(--text-muted)',
  padding: 'var(--space-4) 0 var(--space-2)',
  display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
}}>
  <span>—</span> SECTION NAME
</div>
```

---

## 6. Tab Navigation

```jsx
<div style={{
  display: 'flex',
  background: 'var(--glass-shell)',
  backdropFilter: 'var(--glass-blur-md)',
  borderBottom: '1px solid var(--glass-border)',
  padding: '0 var(--space-6)',
  overflowX: 'auto',
}}>
  <button style={{
    fontFamily: 'var(--font-body)', fontSize: 'var(--text-base)',
    color: isActive ? 'var(--text-accent)' : 'var(--text-secondary)',
    background: 'none', border: 'none',
    padding: 'var(--space-3) var(--space-4)',
    borderBottom: `3px solid ${isActive ? 'var(--accent-primary)' : 'transparent'}`,
    cursor: 'pointer',
    transition: 'color 150ms ease, border-color 150ms ease',
    display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
  }}>
    <span>icon</span> Label
  </button>
</div>
```

Hover (non-active): `background: var(--glass-elevated)`, `border-radius: var(--radius-md) var(--radius-md) 0 0`.

---

## 7. Badge / Chip

Three variants — mono font, uppercase, `letter-spacing: var(--tracking-wider)`, `font-size: var(--text-xs)`.

**Accent badge** (active, primary, teal):
```jsx
{
  background: 'var(--accent-primary-dim)',
  color: 'var(--accent-primary)',
  border: '1px solid var(--glass-border-accent)',
  fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', fontWeight: 600,
  letterSpacing: 'var(--tracking-wider)', textTransform: 'uppercase',
  padding: '2px 10px', borderRadius: 'var(--radius-sm)',
}
```

**Violet badge** (CTA, highlight, escalation):
```jsx
{
  background: 'var(--accent-violet-dim)',
  color: 'var(--accent-violet)',
  border: '1px solid rgba(124,58,237,0.30)',
  /* same font styles as accent */
}
```

**Glass badge** (neutral tag):
```jsx
{
  background: 'var(--glass-surface)',
  backdropFilter: 'var(--glass-blur-sm)',
  color: 'var(--text-secondary)',
  border: '1px solid var(--glass-border)',
  /* same font styles */
}
```

**Semantic badges** (status):
```
Success:  background var(--semantic-green-dim),  color var(--semantic-green)
Danger:   background var(--semantic-red-dim),    color var(--semantic-red)
Warning:  background var(--semantic-amber-dim),  color var(--semantic-amber)
Info:     background var(--semantic-blue-dim),   color var(--semantic-blue)
```

Status dot: `5px × 5px`, `border-radius: 50%`, `background: currentColor`, `display: inline-block`, `margin-right: 5px`.

---

## 8. Progress Bar

Standard (command fill):
```jsx
<div style={{
  height: 5, background: 'var(--glass-border)',
  borderRadius: 'var(--radius-full)', overflow: 'hidden',
}}>
  <div style={{
    height: '100%', borderRadius: 'var(--radius-full)',
    background: 'var(--accent-primary)', width: `${pct}%`,
    transition: 'width 400ms cubic-bezier(0.16, 1, 0.3, 1)',
  }} />
</div>
```

**Gradient fill** (hero metric bar — use once per panel):
```css
background: var(--accent-gradient);
```

**Semantic fills**: `var(--semantic-green)`, `var(--semantic-red)`, `var(--semantic-amber)`.

---

## 9. Data Table (glass container)

```
┌───────────────────────────────────────────────────┐ ← glass card
│ NAME ▲    CATEGORY   STOCK    STATUS   PRICE     │ ← mono header
├───────────────────────────────────────────────────┤
│ Product   Laptops    23       [●OK]    $12,000   │
│ Product   Phones     5        [●Low]   $8,000    │
└───────────────────────────────────────────────────┘
```

The table lives inside a Glass Card container:

```css
.table-container {
  background: var(--glass-surface);
  backdrop-filter: var(--glass-blur-md);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-xl);
  overflow: hidden;
  position: relative;
}

table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0 2px;
}

thead th {
  padding: 12px 16px;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  letter-spacing: var(--tracking-widest);
  text-transform: uppercase;
  color: var(--text-muted);
  text-align: left;
  font-weight: 600;
  background: var(--glass-shell);
  border-bottom: 1px solid var(--glass-border);
}

tbody td {
  padding: 12px 16px;
  background: transparent;
  border-bottom: 1px solid var(--glass-border);
  color: var(--text-primary);
  font-size: var(--text-base);
  font-variant-numeric: tabular-nums;
  transition: var(--transition-glass);
}

tbody tr:hover td {
  background: var(--glass-elevated);
}
```

Rules: never `border-collapse: collapse` with `tr` backgrounds — use `td` surfaces. Numbers must have `font-variant-numeric: tabular-nums`.

---

## 10. Modal / Detail Overlay

```
┌─────── backdrop (glass-overlay blur, z-modal) ───────┐
│                                                        │
│    ┌─ Glass Card max-w: 640px ───────────────────┐    │
│    │ ::before top reflection                     │    │
│    │  HEADER: mono label + title + close         │    │
│    │  ─────────────────────────                  │    │
│    │  BODY: stat cards, progress, badges, etc.   │    │
│    └─────────────────────────────────────────────┘    │
│                                                        │
└────────────────────────────────────────────────────────┘
```

```css
.modal-backdrop {
  position: fixed; inset: 0;
  background: rgba(4, 6, 9, 0.70);
  backdrop-filter: var(--glass-blur-sm);
  z-index: var(--z-modal);
  display: flex; align-items: center; justify-content: center;
}
.modal-content {
  background: var(--glass-overlay);
  backdrop-filter: var(--glass-blur-lg);
  border: 1px solid var(--glass-border-strong);
  border-radius: var(--radius-2xl);
  box-shadow: var(--shadow-glow);
  max-width: 640px; width: calc(100% - 32px);
  position: relative; overflow: hidden;
  padding: var(--space-8);
  z-index: calc(var(--z-modal) + 1);
}
```

Animation: `scale-materialize` from `motion.md`.

---

## 11. Form Elements

**Input:**
```css
.glass-input {
  height: var(--control-md);
  padding: 0 var(--space-3);
  background: var(--glass-surface);
  backdrop-filter: var(--glass-blur-sm);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-size: var(--text-sm);
  font-family: var(--font-body);
  outline: none;
  transition: var(--transition-glass);
}
.glass-input:focus {
  border-color: var(--glass-border-accent);
  box-shadow: 0 0 0 3px var(--accent-primary-dim);
}
.glass-input::placeholder { color: var(--text-muted); }
```

**Label:** mono rail style (xs, muted, uppercase, tracking-widest). `margin-bottom: var(--space-1)`.

---

## 12. Button — Primary (gradient)

```css
.btn-primary {
  height: var(--control-lg);
  padding: 0 var(--space-6);
  background: var(--accent-gradient);
  color: var(--accent-contrast);
  border: none;
  border-radius: var(--radius-md);
  font-family: var(--font-body);
  font-size: var(--text-sm);
  font-weight: var(--weight-semibold);
  letter-spacing: var(--tracking-wide);
  cursor: pointer;
  box-shadow: var(--shadow-glow);
  transition: var(--transition-base), filter 120ms ease, transform 120ms ease;
}
.btn-primary:hover {
  filter: brightness(1.08);
  box-shadow: var(--shadow-glow-strong);
  transform: translateY(-1px);
}
.btn-primary:active { filter: brightness(0.95); transform: translateY(0); }
.btn-primary:focus-visible {
  outline: var(--focus-ring-width) solid var(--accent-primary);
  outline-offset: var(--focus-ring-offset);
}
```

---

## 13. Button — Glass (secondary)

```css
.btn-glass {
  height: var(--control-lg);
  padding: 0 var(--space-5);
  background: var(--glass-surface);
  backdrop-filter: var(--glass-blur-sm);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-family: var(--font-body);
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  cursor: pointer;
  transition: var(--transition-glass);
}
.btn-glass:hover {
  background: var(--glass-elevated);
  border-color: var(--glass-border-strong);
}
```

---

## 14. Button — Ghost

```css
.btn-ghost {
  height: var(--control-md);
  padding: 0 var(--space-4);
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  font-family: var(--font-body);
  font-size: var(--text-sm);
  cursor: pointer;
  transition: background var(--transition-fast), color var(--transition-fast);
}
.btn-ghost:hover {
  background: var(--glass-surface);
  color: var(--text-primary);
}
```

---

## 15. Toggle Switch

```css
.toggle {
  width: 44px; height: 24px;
  background: var(--glass-border);
  border-radius: var(--radius-full);
  position: relative;
  cursor: pointer;
  transition: background var(--transition-base);
}
.toggle.checked { background: var(--accent-gradient); }
.toggle-thumb {
  width: 18px; height: 18px;
  background: white;
  border-radius: var(--radius-full);
  box-shadow: var(--shadow-sm);
  position: absolute; top: 3px; left: 3px;
  transition: transform var(--transition-base);
}
.toggle.checked .toggle-thumb { transform: translateX(20px); }
```

---

## 16. Theme Toggle

```jsx
<button style={{
  width: 36, height: 36,
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--glass-border)',
  background: 'var(--glass-surface)',
  backdropFilter: 'var(--glass-blur-sm)',
  color: 'var(--text-secondary)',
  cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: '1rem',
  transition: 'var(--transition-glass)',
}}>
  {theme === 'dark' ? '☀' : '☾'}
</button>
```

Hover: `background: var(--glass-elevated)`, `border-color: var(--glass-border-accent)`, `color: var(--accent-primary)`.

---

## 17. Profile Header Card

```
┌───────────────────────────────────────────────────────────┐ ← glass-card--lg
│ ::before reflection                                        │
│ [Avatar 96px]  ENTITY NAME                [Badge][Badge] │
│                Role (italic, accent)                      │
│                ✦ TAGLINE (mono, xs, muted)                │
│                                                           │
│ [StatCard] [StatCard] [StatCard]                         │
└───────────────────────────────────────────────────────────┘
```

- Avatar: `96px`, `border-radius: var(--radius-lg)`, `border: 2px solid var(--glass-border-strong)`
- Name: `--text-3xl`, `--weight-bold`, `--tracking-tight`, gradient text on the name if it is the identity hero
- Role: `color: var(--text-accent)`, `font-style: italic`, `--text-lg`
- Tagline: mono rail style, `--text-xs`, `--text-muted`, uppercase, `--tracking-widest`
- Stats: Stat Card components, `min-width: 130px`

---

## 18. DNA / Trait Panel

The identity card for any entity — labeled progress bars with color semantic fills + tag cluster.

```
┌─────────────────────────────────────────┐ ← glass card
│ ✦ TRAIT ANALYSIS                        │ ← mono section label
│                                          │
│ DIMENSION  ████████████████░░░░  80%   │ ← progress row
│ DIMENSION  ██████████░░░░░░░░░  52%   │
│ DIMENSION  █████████████░░░░░░  68%   │
│                                          │
│ [Badge] [Badge] [Badge] [Badge]         │ ← glass chips
└─────────────────────────────────────────┘
```

Label: `min-width: 90px`, mono rail style. Bar: `flex: 1`, Progress Bar component. Value: mono, `--text-sm`, `--text-secondary`, `min-width: 40px; text-align: right`. Tags: `flex-wrap`, `gap: var(--space-2)`.

---

## 19. Alert / Signal Chip

Operational signals for dashboards. Always inline with status dot.

```css
.alert-chip {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: 4px 10px;
  background: var(--glass-surface);
  backdrop-filter: var(--glass-blur-sm);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-full);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: 600;
  letter-spacing: var(--tracking-wider);
  text-transform: uppercase;
}
/* Critical: border-color var(--semantic-red), color var(--semantic-red) */
/* Warning:  border-color var(--semantic-amber), color var(--semantic-amber) */
/* Active:   border-color var(--glass-border-accent), color var(--accent-primary) */
```

---

## 20. Status Tape

A full-width operational status strip placed above the main dashboard content. Signals at a glance.

```
┌── glass-shell, full width ──────────────────────────────────────┐
│ SYSTEM STATUS: ● OPERATIONAL   │ [●ALERT 3] [●WARN 12] [●OK 47]│
└─────────────────────────────────────────────────────────────────┘
```

```css
.status-tape {
  width: 100%;
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-2) var(--space-6);
  background: var(--glass-shell);
  backdrop-filter: var(--glass-blur-md);
  border-bottom: 1px solid var(--glass-border);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: 600;
  letter-spacing: var(--tracking-wider);
  text-transform: uppercase;
  color: var(--text-muted);
}
.status-tape .divider {
  width: 1px; height: 16px;
  background: var(--glass-border);
}
```

---

## 21. Toast / Notification

Auto-dismissing glass notification at bottom-right.

```css
.toast {
  background: var(--glass-overlay);
  backdrop-filter: var(--glass-blur-lg);
  border: 1px solid var(--glass-border-strong);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-glow);
  padding: var(--space-4) var(--space-5);
  display: flex; align-items: center; gap: var(--space-3);
  border-left: 3px solid; /* color from severity */
  min-width: 280px; max-width: 400px;
  position: fixed;
  bottom: var(--space-6); right: var(--space-6);
  z-index: var(--z-toast);
}
```

---

## 22. Empty State

```css
.empty-state {
  display: flex; flex-direction: column; align-items: center;
  gap: var(--space-4); padding: var(--space-16) var(--space-6);
  text-align: center;
}
.empty-icon-area {
  width: 80px; height: 80px;
  background: var(--glass-surface);
  backdrop-filter: var(--glass-blur-sm);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-2xl);
  display: flex; align-items: center; justify-content: center;
  font-size: 2rem;
  position: relative; overflow: hidden;
}
.empty-title {
  font-size: var(--text-base);
  font-weight: var(--weight-semibold);
  color: var(--text-heading);
}
.empty-description {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  max-width: 280px;
  line-height: var(--leading-relaxed);
}
```

---

## 23. Skeleton Loader

Glass surface with aurora shimmer — matches the dark glass environment.

```css
.skeleton {
  position: relative;
  overflow: hidden;
  background: var(--glass-surface);
  border-radius: var(--radius-md);
}
.skeleton::after {
  content: '';
  position: absolute; inset: 0;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(0, 200, 232, 0.06) 50%,
    transparent 100%
  );
  transform: translateX(-100%);
  animation: aurora-shimmer 1.5s infinite;
}
@keyframes aurora-shimmer {
  to { transform: translateX(100%); }
}
@media (prefers-reduced-motion: reduce) {
  .skeleton::after { animation: none; }
}
```

---

## 24. Tooltip

Small glass bubble on hover.

```css
.tooltip {
  background: var(--glass-overlay);
  backdrop-filter: var(--glass-blur-md);
  border: 1px solid var(--glass-border-strong);
  border-radius: var(--radius-md);
  padding: var(--space-2) var(--space-3);
  font-size: var(--text-xs);
  color: var(--text-primary);
  box-shadow: var(--shadow-md);
  pointer-events: none;
  z-index: var(--z-toast);
  white-space: nowrap;
}
```
