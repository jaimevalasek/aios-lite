# Patterns — Neo-Brutalist UI

Page-level compositions and app shell. All layouts use thick borders as structural dividers — no subtle separators.

---

## App Shell

```
┌──────────────────────────────────────────────────────────────┐
│  SIDEBAR (240px)         │  TOP BAR (56px)                   │
│  border-right: 3px solid │  border-bottom: 3px solid         │
│  bg-surface              │  bg-surface                       │
│                          ├───────────────────────────────────┤
│  Logo (top, bold/mono)   │  CONTENT AREA                     │
│                          │  bg-base (cream off-white)        │
│  NAV ITEMS               │  padding: 24px                    │
│  font-mono, text-sm      │                                   │
│  Active: bg-accent       │                                   │
│          color: black    │                                   │
│          font-bold       │                                   │
│                          │                                   │
│  (no left-border active  │                                   │
│   — full bg fill instead)│                                   │
│                          │                                   │
│  FOOTER: user profile    │                                   │
│  border-top: 2px solid   │                                   │
└──────────────────────────┴───────────────────────────────────┘
```

### Sidebar spec

```css
.sidebar {
  width: 240px;
  background: var(--bg-surface);
  border-right: var(--border-thicker);
  height: 100vh;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.sidebar__logo {
  padding: var(--space-5) var(--space-6);
  border-bottom: var(--border-thick);
  font-family: var(--font-display);
  font-weight: var(--weight-extrabold);
  font-size: var(--text-lg);
}

.sidebar__nav {
  flex: 1;
  padding: var(--space-4) var(--space-3);
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  overflow-y: auto;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-3);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--text-secondary);
  text-decoration: none;
  border-radius: var(--radius-none);
  border: var(--border-subtle);
  border-color: transparent;
  transition: background var(--transition-fast), color var(--transition-fast);
}

.nav-item:hover {
  background: var(--bg-elevated);
  color: var(--text-heading);
  border-color: var(--border-color);
}

/* Active: full accent fill — not a left border indicator */
.nav-item--active {
  background: var(--accent);
  color: var(--accent-contrast);
  font-weight: var(--weight-bold);
  border-color: var(--border-color);
}

.sidebar__section-label {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: var(--tracking-wider);
  color: var(--text-muted);
  padding: var(--space-4) var(--space-3) var(--space-2);
}

.sidebar__footer {
  border-top: var(--border-thick);
  padding: var(--space-4) var(--space-6);
}
```

### Top bar spec

```css
.topbar {
  height: 56px;
  background: var(--bg-surface);
  border-bottom: var(--border-thicker);
  display: flex;
  align-items: center;
  padding: 0 var(--space-6);
  gap: var(--space-4);
  justify-content: space-between;
}

.topbar__breadcrumb {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

.topbar__actions {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}
```

### Content area

```css
.content-area {
  flex: 1;
  background: var(--bg-base);
  padding: var(--space-6);
  overflow-y: auto;
  min-height: 0;
}

.page-header {
  margin-bottom: var(--space-6);
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
}

.page-title {
  font-family: var(--font-display);
  font-size: var(--text-2xl);
  font-weight: var(--weight-extrabold);
  color: var(--text-heading);
  letter-spacing: var(--tracking-tight);
}
```

---

## Page Patterns

### 1. Dashboard Page

```
[STICKER BADGE: Overview]
[Page title] + [Date range selector]

┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│ STAT   │ │ STAT   │ │ STAT   │ │ STAT   │
│ CARD   │ │ CARD   │ │ CARD   │ │ CARD   │
└────────┘ └────────┘ └────────┘ └────────┘

┌──────────────────────────────────────────┐
│ CHART CARD (full width, brutalist card)  │
│ border-thicker, shadow-md                │
└──────────────────────────────────────────┘

┌────────────────────────┐ ┌──────────────┐
│ TABLE (full grid)      │ │ ACTIVITY LOG │
│ border on every cell   │ │ mono, times  │
└────────────────────────┘ └──────────────┘
```

Composition rules:
- Stat cards: 3–4 column grid, each with hard shadow, border-thicker
- Charts: always in a brutalist card, never floating
- Tables: full-grid border (every cell), not minimal
- Activity log: mono font, timestamps left-aligned, severity badges

---

### 2. List Page

```
[Page title bold]  [+ NEW sticker button: right]

[FILTER BAR: brutalist inputs inline, border-thick, shadow-sm]

┌────────────────────────────────────────────────┐
│ TABLE                                          │
│ header: mono uppercase, bg-elevated            │
│ all cells: border-subtle                       │
│ hover row: bg-elevated                         │
│ action column: inline icons on hover           │
└────────────────────────────────────────────────┘

[PAGINATION: brutalist buttons, arrow + page numbers]
```

The "+ NEW" button in the page header should use `btn-primary` or a `.sticker` style button to maintain the brutalist feel.

---

### 3. Detail Page

```
┌──────────────────────────────────────────────┐
│ HEADER CARD                                  │
│ title text-2xl bold + badges row             │
│ metadata row: mono text (id, date, author)   │
│ action buttons: right-aligned                │
│ border-thicker, shadow-md                    │
└──────────────────────────────────────────────┘

[TAB BAR: border-bottom thick, active tab bg-accent]

┌──────────────────┐ ┌────────────────────────┐
│ CONTENT SECTION  │ │ SIDE PANEL             │
│ brutalist cards  │ │ brutalist cards        │
│ padding space-6  │ │ metadata, links, etc.  │
└──────────────────┘ └────────────────────────┘
```

Tab bar:
```css
.tab-bar {
  display: flex;
  border-bottom: var(--border-thicker);
  gap: 0;
}

.tab {
  padding: var(--space-3) var(--space-5);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  color: var(--text-secondary);
  border: var(--border-thick);
  border-bottom: none;
  border-right: none;
  cursor: pointer;
  background: var(--bg-surface);
}

.tab:first-child { border-left: var(--border-thick); }
.tab:hover { background: var(--bg-elevated); color: var(--text-heading); }

.tab--active {
  background: var(--accent);
  color: var(--accent-contrast);
  font-weight: var(--weight-bold);
}
```

---

### 4. Settings Page

```
┌──────────────────┬─────────────────────────────┐
│ SETTINGS NAV     │ SETTINGS FORM               │
│ (left, vertical) │                             │
│ 200px            │ [Section Title — mono caps] │
│ border-right:    │ ┌───────────────────────┐   │
│  3px solid       │ │ SETTINGS CARD         │   │
│                  │ │ form fields inside    │   │
│ nav items:       │ │ border-thicker        │   │
│ .nav-item style  │ └───────────────────────┘   │
│                  │                             │
│                  │ [Section Title]             │
│                  │ ┌───────────────────────┐   │
│                  │ │ SETTINGS CARD         │   │
│                  │ └───────────────────────┘   │
└──────────────────┴─────────────────────────────┘
```

Section title style:
```css
.settings-section-title {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: var(--weight-bold);
  text-transform: uppercase;
  letter-spacing: var(--tracking-wider);
  color: var(--text-secondary);
  margin-bottom: var(--space-4);
  padding-bottom: var(--space-2);
  border-bottom: var(--border-thick);
}
```

---

### 5. Auth Page

```
bg-void (or pattern-dots)

         ┌──────────────────────────┐
         │ AUTH CARD                │
         │ border-thicker           │
         │ shadow-xl                │
         │ max-width: 400px         │
         │                          │
         │ [Logo or product name]   │
         │ [Heading text-xl bold]   │
         │                          │
         │ [Input: email]           │
         │ [Input: password]        │
         │                          │
         │ [CTA Button full width]  │
         │                          │
         │ [Secondary link — mono]  │
         └──────────────────────────┘
```

```css
.auth-page {
  min-height: 100vh;
  background: var(--bg-void);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-6);
}

.auth-card {
  background: var(--bg-surface);
  border: var(--border-thicker);
  box-shadow: var(--shadow-xl);
  padding: var(--space-10);
  width: 100%;
  max-width: 400px;
}

.auth-card__heading {
  font-family: var(--font-display);
  font-size: var(--text-xl);
  font-weight: var(--weight-extrabold);
  margin-bottom: var(--space-8);
}
```

---

### 6. Onboarding

```
bg-base

         [Step counter badge: "[1/4]" — mono, bordered]

         ┌──────────────────────────────────────┐
         │ STEP CARD                            │
         │ border-thicker, shadow-xl            │
         │ max-width: 540px                     │
         │                                      │
         │ Step heading + description           │
         │                                      │
         │ [Progress bar — thick, 12px]         │
         │                                      │
         │ Step content (input/choice/action)   │
         │                                      │
         │ [BACK btn secondary]  [NEXT btn CTA] │
         └──────────────────────────────────────┘
```

Step counter badge:
```css
.step-counter {
  display: inline-block;
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  font-weight: var(--weight-bold);
  background: var(--bg-surface);
  border: var(--border-thick);
  box-shadow: var(--shadow-sm);
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-none);
  margin-bottom: var(--space-6);
}
```

---

## Responsive Behavior

### Breakpoints
- `< 1024px`: sidebar collapses to hamburger menu
- `< 768px`: single column stack for all card grids
- `< 640px`: full-width content, padding reduces to `space-4`

### Sidebar collapse
```css
@media (max-width: 1023px) {
  .sidebar {
    position: fixed;
    left: -240px;
    top: 0;
    z-index: var(--z-modal);
    transition: left var(--transition-base);
  }

  .sidebar--open {
    left: 0;
  }

  /* Hamburger trigger */
  .hamburger {
    display: flex;
    flex-direction: column;
    gap: 5px;
    width: 36px;
    height: 36px;
    border: var(--border-thick);
    background: none;
    padding: var(--space-2);
    cursor: pointer;
    justify-content: center;
  }

  .hamburger__line {
    height: 2px;
    background: var(--text-heading);
    width: 100%;
  }
}
```

### Tables on mobile
Tables always scroll horizontally — never stack to card layout:
```css
.table-container {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}
```

### Shadows on mobile
Hard shadows reduce to `--shadow-sm` (2px offset) on touch targets to avoid layout overflow:
```css
@media (max-width: 639px) {
  .card { box-shadow: var(--shadow-sm); }
  .btn-primary { box-shadow: var(--shadow-sm); }
}
```
