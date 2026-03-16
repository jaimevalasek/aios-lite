
# Components — UI Building Blocks

Read after `references/foundations.md` so the token set is already in context.

All components use CSS variables and adapt to dark/light theme automatically. Some examples use inline React style objects; treat them as implementation examples and adapt them to the active stack. The shorthand `TT` means `{ transition: 'var(--transition-theme)' }`.

## 1. Stat Card

Large numeric readout with mono label. Used in stat rows at top of pages.

```jsx
<div style={{
  background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--radius-lg)', padding: 'var(--space-4) var(--space-5)',
  minWidth: 140, flex: 1, ...TT,
}}>
  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)',
    letterSpacing: 'var(--tracking-widest)', textTransform: 'uppercase', fontWeight: 600, marginBottom: 'var(--space-1)' }}>
    LABEL
  </div>
  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
    <span style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-4xl)', fontWeight: 700,
      color: 'var(--text-heading)', lineHeight: 1 }}>42</span>
    <span style={{ fontSize: 'var(--text-lg)', color: 'var(--text-muted)' }}>/100</span>
  </div>
  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: 'var(--space-1)' }}>
    subtitle text
  </div>
</div>
```

Accent variant: replace `color: 'var(--text-heading)'` with `color: 'var(--semantic-green)'` (or red/amber).

## 2. Card (base)

The fundamental container. Everything lives in cards.

```jsx
const cardStyle = {
  background: 'var(--bg-surface)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--radius-lg)',
  padding: 'var(--space-5)',
  transition: 'var(--transition-theme), transform 150ms ease',
};
// Hover: borderColor → var(--border-medium), boxShadow → var(--shadow-glow), transform → translateY(-1px)
```

## 3. Info Card (icon + title + description + quote)

Used in grids for features, capabilities, items.

Structure:
```
┌─────────────────────────────────┐
│ 📈  [icon]          Badge text  │ ← header row
│ Card Title                      │ ← accent color
│ Description text here that      │ ← secondary color
│ explains the item.              │
│ ┃ "Optional quote text"         │ ← muted, left border
└─────────────────────────────────┘
```

- Header: flex, space-between. Icon left, badge right (mono, `--text-xs`, muted).
- Title: `--text-lg`, `--weight-semibold`, `color: var(--text-accent)`
- Desc: `--text-base`, `--text-secondary`, `line-height: 1.5`
- Quote: italic, `--text-muted`, `border-left: 2px solid var(--accent-dim)`, `padding-left: var(--space-3)`

## 4. Profile Header

Entity header with avatar, name, role, badges, and stat cards.

Structure:
```
┌──────────────────────────────────────────────────────────┐
│ [Avatar 96px]  BIG NAME          [Badge] [Badge]         │
│ ID: XXX        Role (italic, accent)                     │
│                ✦ TAGLINE (mono, xs, muted)                │
│                                                           │
│ ┌─StatCard─┐  ┌─StatCard─┐  ┌─StatCard─┐               │
└──────────────────────────────────────────────────────────┘
```

- Avatar: `96px`, `border-radius: var(--radius-lg)`, `border: 2px solid var(--border-subtle)`
- ID: mono, `--text-xs`, absolute positioned below avatar
- Name: `--text-3xl`, `--weight-black`, `--tracking-tight`, `--text-heading`
- Role: `color: var(--text-accent)`, `font-style: italic`, `--text-lg`
- Badges: use Badge component (see below)

## 5. Badge / Chip

Three variants:

**Accent badge** (primary, active states):
```jsx
{ background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid var(--border-accent)',
  fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', fontWeight: 600,
  letterSpacing: 'var(--tracking-wider)', textTransform: 'uppercase',
  padding: '2px 10px', borderRadius: 'var(--radius-sm)' }
```

**Outline badge** (neutral tags):
```jsx
{ background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-medium)',
  /* same font styles as accent */ }
```

**Semantic badge** (status — swap vars):
- Success: `background: var(--semantic-green-dim)`, `color: var(--semantic-green)`
- Danger: `var(--semantic-red-dim)`, `var(--semantic-red)`
- Warning: `var(--semantic-amber-dim)`, `var(--semantic-amber)`
- Info: `var(--semantic-blue-dim)`, `var(--semantic-blue)`

All include a status dot: `width: 5px, height: 5px, borderRadius: 50%, background: [color]`

## 6. Tab Navigation

```jsx
<div style={{ display: 'flex', gap: 2, borderBottom: '1px solid var(--border-subtle)', padding: '0 var(--space-6)', overflowX: 'auto' }}>
  <button style={{
    fontFamily: 'var(--font-body)', fontSize: 'var(--text-base)',
    color: isActive ? 'var(--text-accent)' : 'var(--text-secondary)',
    background: 'none', border: 'none', padding: 'var(--space-3) var(--space-4)',
    borderBottom: `2px solid ${isActive ? 'var(--accent)' : 'transparent'}`,
    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
  }}>
    <span style={{ fontSize: 'var(--text-sm)' }}>icon</span> Label
  </button>
</div>
```

## 7. Sidebar Tree

```
┌──────────────────┐
│ SECTION LABEL    │ ← mono, xs, muted, uppercase, tracking-widest
│  ⊞ Item Active   │ ← bg-surface, border-subtle, text-heading
│  📊 Item         │ ← text-secondary, transparent bg
│  💬 Item         │
│                  │
│ SECTION LABEL    │
│  ○ Category      │ ← text-muted or text-accent when active
│  ● Category (on) │
└──────────────────┘
```

Width: `200-220px`. Items: `padding: var(--space-2) var(--space-3)`, `border-radius: var(--radius-md)`.

## 8. Progress Bar

```jsx
<div style={{ height: 5, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
  <div style={{ height: '100%', borderRadius: 'var(--radius-full)', background: color, width: `${pct}%`, transition: 'width 300ms ease' }} />
</div>
```

Colors: `var(--accent)` (default), `var(--semantic-green)`, `var(--semantic-red)`, `var(--semantic-amber)`, `var(--semantic-purple)`.

## 9. Section Header

```jsx
<div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-6) 0 var(--space-4)' }}>
  <span style={{ color: 'var(--accent)', fontSize: 'var(--text-lg)' }}>⚡</span>
  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--text-heading)', margin: 0 }}>Title</h2>
</div>
```

## 10. Mode Panel (accent feature box)

Centered panel with radial glow — used for "operating mode", "status", or a featured CTA.

```
┌─────────── border-accent ──────────┐
│         ◆ BADGE PILL              │
│            [Icon 56px]             │ ← accent border, glow shadow
│          MONO LABEL               │
│        Large Title                │
│       "Subtitle italic"           │
│   radial-gradient glow behind     │
└────────────────────────────────────┘
```

## 11. Top Navigation Bar

```
┌──────────────────────────────────────────────────────┐
│ [Logo] AppName     Link  Link  Link     [☀] [Badge] │
│        SUBTITLE                                       │
└──────────────────────────────────────────────────────┘
```

- Background: `var(--bg-void)`, sticky, `z-index: var(--z-sticky)`
- Logo: `36px`, `background: var(--accent-dim)`, `border: 1px solid var(--accent)`, `border-radius: var(--radius-md)`
- Brand name: mono, `--weight-bold`, `--text-heading`
- Subtitle: mono, `--text-xs`, `--text-muted`, uppercase
- Optional theme toggle: `36px` button, `var(--bg-surface)`, `var(--border-subtle)` when the product actually supports theme switching

## 12. Modal / Detail Overlay

- Backdrop: `rgba(0,0,0,0.6)`, centered flex, `z-index: var(--z-modal)`
- Content: `var(--bg-base)`, `border: 1px solid var(--border-subtle)`, `border-radius: var(--radius-xl)`, `max-width: 700px`
- Header: padding, border-bottom, flex with close button
- Body: reuses stat cards, progress bars, badges, section headers

## 13. Data Table

For list views and tabular data:

```
┌────────────────────────────────────────────────────┐
│ NAME ▲        CATEGORY    STOCK    STATUS    PRICE │ ← mono header, --text-xs, --text-muted
├────────────────────────────────────────────────────┤
│ Product Name  Laptops     23       [●OK]    R$12k │ ← --text-primary, hover row highlight
│ Product Name  Phones      5        [●Crit]  R$8k  │
└────────────────────────────────────────────────────┘
```

- Header row: `background: var(--bg-elevated)`, mono labels
- Body rows: premium tables should prefer row surfaces over collapsed stripes
- Always include sortable headers if data is tabular

### Premium table guardrails

Default recommendation for this visual system:

```css
table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0 10px;
}

thead th {
  padding: 0 16px 10px;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  letter-spacing: var(--tracking-widest);
  text-transform: uppercase;
  color: var(--text-muted);
  text-align: left;
}

tbody td {
  padding: 14px 16px;
  background: var(--bg-surface);
  border-top: 1px solid var(--border-subtle);
  border-bottom: 1px solid var(--border-subtle);
  color: var(--text-primary);
}

tbody td:first-child {
  border-left: 1px solid var(--border-subtle);
  border-top-left-radius: var(--radius-lg);
  border-bottom-left-radius: var(--radius-lg);
}

tbody td:last-child {
  border-right: 1px solid var(--border-subtle);
  border-top-right-radius: var(--radius-lg);
  border-bottom-right-radius: var(--radius-lg);
}

tbody tr:hover td {
  background: var(--bg-elevated);
  border-color: var(--border-medium);
}
```

Rules:
- Do not rely on `border-collapse: collapse` plus background on `tr` when the goal is a premium row surface.
- If the existing stack or component library requires native collapsed tables, style the `td` cells as the surface, not the `tr`.
- In brownfield projects, do not rebuild tables blindly. First check whether the current table should stay a real table or become a list/detail surface instead.

## 14. Form Elements

**Input:**
```jsx
{ background: 'var(--bg-surface)', border: '1px solid var(--border-medium)',
  borderRadius: 'var(--radius-md)', padding: 'var(--space-2) var(--space-3)',
  color: 'var(--text-primary)', fontSize: 'var(--text-base)',
  fontFamily: 'var(--font-body)', outline: 'none' }
// Focus: borderColor → var(--border-accent-strong), boxShadow → 0 0 0 3px var(--accent-glow)
```

**Label:** mono label style (xs, muted, uppercase, tracking-widest). Place above input with `margin-bottom: var(--space-1)`.

**Button primary:**
```jsx
{ background: 'var(--accent)', color: 'var(--text-inverse)', border: 'none',
  borderRadius: 'var(--radius-md)', padding: 'var(--space-2) var(--space-5)',
  fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', fontWeight: 600,
  letterSpacing: 'var(--tracking-wider)', textTransform: 'uppercase', cursor: 'pointer' }
// Hover: background → var(--accent-hover)
```

**Button secondary:**
```jsx
{ background: 'transparent', color: 'var(--text-secondary)',
  border: '1px solid var(--border-medium)', /* rest same as primary */ }
// Hover: borderColor → var(--border-accent), color → var(--text-accent)
```

## 15. DNA Panel (Sliders + Tags)

Combined panel with labeled metrics and tag group. The "personality" card of any entity.

```
┌─────────────────────────────────────────┐
│ ✦ PANEL TITLE                           │
│                                          │
│ LABEL  ███████████████░░░░░  72%        │ ← mono labels, progress bar, value
│ LABEL  █████████░░░░░░░░░░  58%        │
│ LABEL  ████████████░░░░░░░  85%        │
│                                          │
│ [Badge] [Badge] [Badge] [Badge]         │ ← flex wrap, gap var(--space-2)
└─────────────────────────────────────────┘
```

Each row: `display: flex, align-items: center, gap: var(--space-3)`. Label min-width 80px. Progress bar flex:1. Value mono, `--text-sm`.
