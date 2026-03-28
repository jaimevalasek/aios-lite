# Components — Bold Editorial UI

All reusable component specifications. Uses tokens from `design-tokens.md`. Every component must respect the Bold Editorial visual language: minimal radius, cinematic shadows, mono captions, display font for impact numbers.

---

## Typography Components

### Display Heading
```css
.display-heading {
  font-family: var(--font-display);
  font-weight: var(--weight-bold);
  letter-spacing: var(--tracking-tighter);
  line-height: var(--leading-none);
  color: var(--text-heading);
}

/* Size variants */
.display-heading--xl { font-size: var(--text-6xl); }  /* manifesto */
.display-heading--lg { font-size: var(--text-5xl); }  /* hero */
.display-heading--md { font-size: var(--text-4xl); }  /* section hero */
.display-heading--sm { font-size: var(--text-3xl); }  /* card title */
```

### Section Heading
```css
.section-heading {
  font-family: var(--font-display);
  font-size: var(--text-2xl);
  font-weight: var(--weight-bold);
  letter-spacing: var(--tracking-tight);
  line-height: var(--leading-snug);
  color: var(--text-heading);
}
```

### Subheading
```css
.subheading {
  font-family: var(--font-body);
  font-size: var(--text-lg);
  font-weight: var(--weight-medium);
  letter-spacing: var(--tracking-wide);
  color: var(--text-primary);
}
```

### Mono Caption
The connective tissue of this system. Used for ALL metadata, overlines, categories, dates, version tags.
```css
.mono-caption {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: var(--weight-medium);
  letter-spacing: var(--tracking-widest);
  text-transform: uppercase;
  color: var(--text-secondary);
}

/* With accent */
.mono-caption--accent {
  color: var(--accent);
}
```

### Body Text
```css
.body-text {
  font-family: var(--font-body);
  font-size: var(--text-base);
  font-weight: var(--weight-regular);
  line-height: var(--leading-relaxed);
  color: var(--text-primary);
}

.body-text--lead {
  font-size: var(--text-lg);
  line-height: var(--leading-normal);
  color: var(--text-primary);
}
```

### Quote Block
```css
.quote-block {
  font-family: var(--font-display);
  font-size: var(--text-2xl);
  font-style: italic;
  font-weight: var(--weight-medium);
  line-height: var(--leading-snug);
  color: var(--text-heading);
  border-left: 4px solid var(--accent);
  padding-left: var(--space-6);
  margin: var(--space-8) 0;
}
```

### Counter / Stat Number
```css
.stat-number {
  font-family: var(--font-display);
  font-weight: var(--weight-bold);
  letter-spacing: var(--tracking-tighter);
  line-height: var(--leading-none);
  color: var(--text-heading);
}

.stat-number--xl  { font-size: var(--text-5xl); }
.stat-number--lg  { font-size: var(--text-4xl); }
.stat-number--md  { font-size: var(--text-3xl); }
```

---

## Navigation

### Top Bar
```css
.topbar {
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--space-8);
  position: sticky;
  top: 0;
  z-index: var(--z-sticky);
  background: rgba(10, 10, 10, 0.85);    /* --bg-base with opacity */
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border-subtle);
  transition: var(--transition-theme);
}

/* Logo */
.topbar__logo {
  font-family: var(--font-display);
  font-size: var(--text-lg);
  font-weight: var(--weight-bold);
  color: var(--text-heading);
  text-decoration: none;
}

/* Nav links */
.topbar__nav {
  display: flex;
  gap: var(--space-8);
  list-style: none;
}

.topbar__link {
  font-family: var(--font-body);
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  color: var(--text-secondary);
  text-decoration: none;
  transition: color var(--transition-fast);
}

.topbar__link:hover {
  color: var(--text-heading);
}

/* Light variant */
[data-theme="light"] .topbar {
  background: rgba(250, 250, 247, 0.90);
}
```

### Sidebar (app shell)
```css
.sidebar {
  width: 200px;
  flex-shrink: 0;
  background: var(--bg-base);
  border-right: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  padding: var(--space-6) var(--space-3);
  gap: var(--space-1);
  overflow-y: auto;
}

.sidebar__item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: var(--weight-medium);
  letter-spacing: var(--tracking-wider);
  text-transform: uppercase;
  color: var(--text-secondary);
  cursor: pointer;
  transition: background var(--transition-fast), color var(--transition-fast);
}

.sidebar__item:hover {
  background: var(--bg-surface);
  color: var(--text-primary);
}

.sidebar__item--active {
  background: var(--bg-surface);
  color: var(--text-heading);
  border-left: 2px solid var(--accent);
  padding-left: calc(var(--space-3) - 2px);
}

.sidebar__section-label {
  font-family: var(--font-mono);
  font-size: 0.65rem;
  font-weight: var(--weight-medium);
  letter-spacing: var(--tracking-widest);
  text-transform: uppercase;
  color: var(--text-muted);
  padding: var(--space-4) var(--space-3) var(--space-2);
}
```

---

## Buttons

### Primary Button
```css
.btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  height: 44px;
  padding: 0 var(--space-6);
  background: var(--accent);
  color: var(--accent-contrast);
  border: none;
  border-radius: var(--radius-md);
  font-family: var(--font-body);
  font-size: var(--text-sm);
  font-weight: var(--weight-semibold);
  letter-spacing: var(--tracking-wide);
  cursor: pointer;
  transition: background var(--transition-fast), box-shadow var(--transition-fast), transform var(--transition-fast);
}

.btn-primary:hover {
  background: var(--accent-hover);
  box-shadow: var(--shadow-sm);
}

.btn-primary:active {
  transform: scale(0.98);
}

.btn-primary:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.btn-primary:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
```

### Hero CTA Button (large variant)
```css
.btn-hero {
  height: 56px;
  padding: 0 var(--space-10);
  font-size: var(--text-base);
  font-weight: var(--weight-bold);
  letter-spacing: var(--tracking-wide);
  text-transform: uppercase;
  border-radius: var(--radius-md);
  background: var(--accent);
  color: var(--accent-contrast);
  box-shadow: var(--shadow-glow);
  transition: background var(--transition-fast), box-shadow var(--transition-base), transform var(--transition-fast);
}

.btn-hero:hover {
  background: var(--accent-hover);
  box-shadow: var(--shadow-glow), var(--shadow-md);
  transform: translateY(-1px);
}
```

### Secondary Button
```css
.btn-secondary {
  height: 44px;
  padding: 0 var(--space-6);
  background: transparent;
  color: var(--text-primary);
  border: 1px solid var(--border-medium);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  cursor: pointer;
  transition: background var(--transition-fast), border-color var(--transition-fast), color var(--transition-fast);
}

.btn-secondary:hover {
  background: var(--bg-elevated);
  border-color: var(--border-strong);
  color: var(--text-heading);
}
```

### Ghost Button
```css
.btn-ghost {
  height: 44px;
  padding: 0 var(--space-6);
  background: transparent;
  color: var(--text-secondary);
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  cursor: pointer;
  transition: background var(--transition-fast), color var(--transition-fast);
}

.btn-ghost:hover {
  background: var(--bg-surface);
  color: var(--text-heading);
}
```

### Icon Button
```css
.btn-icon {
  width: 40px;
  height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  cursor: pointer;
  transition: background var(--transition-fast), color var(--transition-fast), border-color var(--transition-fast);
}

.btn-icon:hover {
  background: var(--bg-surface);
  border-color: var(--border-medium);
  color: var(--text-heading);
}
```

---

## Cards

### Base Card
```css
.card {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  box-shadow: var(--shadow-sm);
  transition: box-shadow var(--transition-base), border-color var(--transition-base);
}

.card:hover {
  box-shadow: var(--shadow-md);
  border-color: var(--border-medium);
}
```

### Stat Card
```css
.card-stat {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: var(--space-6) var(--space-8);
  box-shadow: var(--shadow-sm);
}

.card-stat__label {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: var(--weight-medium);
  letter-spacing: var(--tracking-widest);
  text-transform: uppercase;
  color: var(--text-secondary);
  margin-bottom: var(--space-2);
}

.card-stat__value {
  font-family: var(--font-display);
  font-size: var(--text-4xl);
  font-weight: var(--weight-bold);
  letter-spacing: var(--tracking-tighter);
  line-height: var(--leading-none);
  color: var(--text-heading);
  margin-bottom: var(--space-2);
}

.card-stat__trend {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: var(--weight-medium);
  letter-spacing: var(--tracking-wide);
}

.card-stat__trend--up   { color: var(--semantic-green); }
.card-stat__trend--down { color: var(--semantic-red); }
```

### Feature Card
```css
.card-feature {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: var(--space-10);
  box-shadow: var(--shadow-sm);
  transition: box-shadow var(--transition-base), transform var(--transition-base);
}

.card-feature:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.card-feature__icon-area {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--accent-dim);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-6);
  color: var(--accent);
}

.card-feature__title {
  font-family: var(--font-display);
  font-size: var(--text-xl);
  font-weight: var(--weight-bold);
  letter-spacing: var(--tracking-tight);
  color: var(--text-heading);
  margin-bottom: var(--space-3);
}

.card-feature__description {
  font-family: var(--font-body);
  font-size: var(--text-sm);
  line-height: var(--leading-relaxed);
  color: var(--text-secondary);
}
```

### Media Card
```css
.card-media {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
  transition: box-shadow var(--transition-base), transform var(--transition-base);
}

.card-media:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.card-media__image {
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  display: block;
  transition: transform var(--transition-slow);
}

.card-media:hover .card-media__image {
  transform: scale(1.03);
}

.card-media__body {
  padding: var(--space-5);
}

.card-media__overline {
  /* uses .mono-caption */
  margin-bottom: var(--space-2);
}

.card-media__title {
  font-family: var(--font-display);
  font-size: var(--text-lg);
  font-weight: var(--weight-bold);
  letter-spacing: var(--tracking-tight);
  color: var(--text-heading);
}
```

---

## Forms

### Input
```css
.input {
  height: 44px;
  width: 100%;
  padding: 0 var(--space-4);
  background: transparent;
  border: 1px solid var(--border-medium);
  border-radius: var(--radius-md);
  font-family: var(--font-body);
  font-size: var(--text-sm);
  color: var(--text-heading);
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
  outline: none;
}

.input::placeholder {
  color: var(--text-muted);
}

.input:hover {
  border-color: var(--border-strong);
}

.input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-dim);
}

.input--error {
  border-color: var(--semantic-red);
}

.input--error:focus {
  box-shadow: 0 0 0 3px var(--semantic-red-dim);
}
```

### Minimal Input (editorial style — border-bottom only)
```css
.input-minimal {
  width: 100%;
  height: 48px;
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--border-medium);
  border-radius: 0;
  padding: var(--space-2) 0;
  font-family: var(--font-body);
  font-size: var(--text-base);
  color: var(--text-heading);
  transition: border-color var(--transition-fast);
  outline: none;
}

.input-minimal:focus {
  border-bottom-color: var(--accent);
}
```

### Label
```css
.label {
  display: block;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: var(--weight-medium);
  letter-spacing: var(--tracking-widest);
  text-transform: uppercase;
  color: var(--text-secondary);
  margin-bottom: var(--space-2);
}
```

### Helper / Error Text
```css
.helper-text {
  font-family: var(--font-body);
  font-size: var(--text-xs);
  color: var(--text-muted);
  margin-top: var(--space-1);
}

.error-text {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  letter-spacing: var(--tracking-wide);
  color: var(--semantic-red);
  margin-top: var(--space-1);
}
```

### Textarea
```css
.textarea {
  width: 100%;
  min-height: 120px;
  padding: var(--space-3) var(--space-4);
  background: transparent;
  border: 1px solid var(--border-medium);
  border-radius: var(--radius-md);
  font-family: var(--font-body);
  font-size: var(--text-sm);
  line-height: var(--leading-relaxed);
  color: var(--text-heading);
  resize: vertical;
  outline: none;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}

.textarea:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-dim);
}
```

### Checkbox
```css
.checkbox-wrapper {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  cursor: pointer;
}

.checkbox {
  width: 18px;
  height: 18px;
  min-width: 18px;
  background: transparent;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background var(--transition-fast), border-color var(--transition-fast);
}

.checkbox--checked {
  background: var(--accent);
  border-color: var(--accent);
}

/* SVG checkmark animates in via stroke-dashoffset */
```

### Toggle Switch
```css
.toggle {
  width: 44px;
  height: 24px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-medium);
  border-radius: var(--radius-full);
  position: relative;
  cursor: pointer;
  transition: background var(--transition-base), border-color var(--transition-base);
}

.toggle--checked {
  background: var(--accent);
  border-color: var(--accent);
}

.toggle__thumb {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 16px;
  height: 16px;
  background: var(--text-heading);
  border-radius: var(--radius-full);
  box-shadow: var(--shadow-xs);
  transition: transform 200ms cubic-bezier(0.16, 1, 0.3, 1);
}

.toggle--checked .toggle__thumb {
  transform: translateX(20px);
}
```

---

## Data Display

### Table
```css
.table-container {
  overflow-x: auto;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-subtle);
}

.table {
  width: 100%;
  border-collapse: collapse;
  font-family: var(--font-body);
  font-size: var(--text-sm);
}

.table th {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: var(--weight-medium);
  letter-spacing: var(--tracking-widest);
  text-transform: uppercase;
  color: var(--text-secondary);
  padding: var(--space-4) var(--space-5);
  text-align: left;
  border-bottom: 1px solid var(--border-medium);
  background: var(--bg-elevated);
}

.table td {
  padding: var(--space-4) var(--space-5);
  color: var(--text-primary);
  border-bottom: 1px solid var(--border-subtle);
}

.table tr:last-child td {
  border-bottom: none;
}

.table tr:hover td {
  background: var(--bg-elevated);
}
```

### Badge
```css
.badge {
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 var(--space-2);
  border-radius: var(--radius-sm);
  font-family: var(--font-mono);
  font-size: 0.65rem;
  font-weight: var(--weight-medium);
  letter-spacing: var(--tracking-wider);
  text-transform: uppercase;
}

.badge--default  { background: var(--bg-elevated); color: var(--text-secondary); }
.badge--accent   { background: var(--accent-dim); color: var(--accent); }
.badge--green    { background: var(--semantic-green-dim); color: var(--semantic-green); }
.badge--amber    { background: var(--semantic-amber-dim); color: var(--semantic-amber); }
.badge--red      { background: var(--semantic-red-dim); color: var(--semantic-red); }
.badge--blue     { background: var(--semantic-blue-dim); color: var(--semantic-blue); }
```

### Avatar
```css
.avatar {
  border-radius: var(--radius-md);   /* editorial: square-ish, not circular */
  object-fit: cover;
  background: var(--bg-elevated);
  flex-shrink: 0;
}

.avatar--xs { width: 24px; height: 24px; }
.avatar--sm { width: 32px; height: 32px; }
.avatar--md { width: 40px; height: 40px; }
.avatar--lg { width: 56px; height: 56px; }
.avatar--xl { width: 80px; height: 80px; }
.avatar--circle { border-radius: var(--radius-full); }
```

### Code Block
```css
.code-block {
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.code-block__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3) var(--space-5);
  border-bottom: 1px solid var(--border-subtle);
  background: var(--bg-overlay);
}

.code-block__filename {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--text-secondary);
  letter-spacing: var(--tracking-wide);
}

.code-block__body {
  padding: var(--space-5);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  line-height: var(--leading-loose);
  color: var(--text-primary);
  overflow-x: auto;
}
```

### Divider
```css
.divider {
  height: 1px;
  background: var(--border-subtle);
  border: none;
}

.divider--accent {
  height: 2px;
  background: var(--accent);
  border: none;
}
```

---

## Feedback

### Toast
```css
.toast {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-5);
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-left: 4px solid var(--accent);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  max-width: 400px;
}

.toast--success { border-left-color: var(--semantic-green); }
.toast--warning { border-left-color: var(--semantic-amber); }
.toast--error   { border-left-color: var(--semantic-red); }

.toast__title {
  font-family: var(--font-body);
  font-size: var(--text-sm);
  font-weight: var(--weight-semibold);
  color: var(--text-heading);
}

.toast__message {
  font-family: var(--font-body);
  font-size: var(--text-sm);
  color: var(--text-secondary);
  margin-top: var(--space-1);
}
```

### Modal
```css
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.70);
  backdrop-filter: blur(4px);
  z-index: var(--z-modal);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-6);
}

.modal {
  background: var(--bg-surface);
  border: 1px solid var(--border-medium);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-xl);
  width: 100%;
  max-width: 560px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-6) var(--space-8);
  border-bottom: 1px solid var(--border-subtle);
}

.modal__title {
  font-family: var(--font-display);
  font-size: var(--text-xl);
  font-weight: var(--weight-bold);
  letter-spacing: var(--tracking-tight);
  color: var(--text-heading);
}

.modal__body {
  padding: var(--space-8);
}

.modal__footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
  padding: var(--space-5) var(--space-8);
  border-top: 1px solid var(--border-subtle);
}
```

### Tooltip
```css
.tooltip {
  position: absolute;
  background: var(--bg-overlay);
  border: 1px solid var(--border-medium);
  border-radius: var(--radius-md);
  padding: var(--space-2) var(--space-3);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: var(--weight-medium);
  letter-spacing: var(--tracking-wide);
  color: var(--text-primary);
  box-shadow: var(--shadow-md);
  pointer-events: none;
  white-space: nowrap;
  z-index: var(--z-tooltip);
}
```

### Progress Bar
```css
.progress-track {
  width: 100%;
  height: 4px;
  background: var(--bg-elevated);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--accent);
  border-radius: var(--radius-full);
  transition: width 600ms cubic-bezier(0.16, 1, 0.3, 1);
}
```

### Skeleton Loader
```css
@keyframes editorial-pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.4; }
}

.skeleton {
  background: var(--bg-elevated);
  border-radius: var(--radius-md);
  animation: editorial-pulse 2s ease-in-out infinite;
}
```
