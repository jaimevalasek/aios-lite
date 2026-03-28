# Components — Neo-Brutalist UI

All components follow three universal rules:
1. **Border on everything**: every interactive or container element has a visible border. No borderless components.
2. **Hard shadow direction**: all shadows go bottom-right (positive x, positive y). Consistent across all components.
3. **Push mechanic**: every clickable element with a hard shadow implements the push on `:active` (shadow disappears + `translate` equal to shadow offset).

---

## 1. Brutalist Card

The foundational container. Everything derives from this.

```css
.card {
  background: var(--bg-surface);
  border: var(--border-thicker);
  box-shadow: var(--shadow-md);
  border-radius: var(--radius-none);
  padding: var(--space-6);
}

.card:hover {
  box-shadow: var(--shadow-lg);
  transition: box-shadow 80ms ease;
}

/* Interactive card variant */
.card--interactive:active {
  box-shadow: none;
  transform: translate(4px, 4px);
  transition: box-shadow 60ms linear, transform 60ms linear;
}
```

---

## 2. Stat Card

Brutalist Card + big mono number.

```css
.stat-card {
  /* extends .card */
  padding: var(--space-5) var(--space-6);
}

.stat-card__number {
  font-family: var(--font-mono);
  font-size: var(--text-3xl);
  font-weight: var(--weight-bold);
  color: var(--text-heading);
  letter-spacing: var(--tracking-tight);
}

.stat-card__label {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: var(--weight-medium);
  text-transform: uppercase;
  letter-spacing: var(--tracking-wider);
  color: var(--text-secondary);
}

/* Trend badge: green bg for positive, red for negative */
.stat-card__trend {
  display: inline-block;
  background: var(--semantic-green-dim);
  color: var(--semantic-green);
  border: var(--border-subtle);
  border-radius: var(--radius-none);
  padding: 2px var(--space-2);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
}
```

---

## 3. Feature Card

Brutalist Card with icon area.

```css
.feature-card__icon-area {
  width: 48px;
  height: 48px;
  background: var(--accent);
  border: var(--border-thick);
  border-radius: var(--radius-none);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: var(--space-4);
}

.feature-card__title {
  font-family: var(--font-display);
  font-size: var(--text-lg);
  font-weight: var(--weight-bold);
  color: var(--text-heading);
  margin-bottom: var(--space-2);
}

.feature-card__description {
  font-family: var(--font-body);
  font-size: var(--text-sm);
  color: var(--text-secondary);
  line-height: 1.6;
}
```

---

## 4. Button — Primary

The most important component. Must feel physical.

```css
.btn-primary {
  background: var(--accent);
  color: var(--accent-contrast);
  border: var(--border-thicker);
  box-shadow: var(--shadow-md);
  border-radius: var(--radius-none);
  height: var(--control-md);
  padding: 0 var(--space-6);
  font-family: var(--font-display);
  font-size: var(--text-sm);
  font-weight: var(--weight-bold);
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
  cursor: pointer;
  transition: box-shadow var(--transition-fast);
}

.btn-primary:hover {
  box-shadow: var(--shadow-lg);
}

.btn-primary:active {
  box-shadow: none;
  transform: translate(4px, 4px);
  transition: box-shadow var(--transition-push), transform var(--transition-push);
}

.btn-primary:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

/* Large CTA variant */
.btn-primary--lg {
  height: var(--control-lg);
  padding: 0 var(--space-8);
  font-size: var(--text-base);
  box-shadow: var(--shadow-lg);
}

.btn-primary--lg:hover { box-shadow: var(--shadow-xl); }
.btn-primary--lg:active { transform: translate(6px, 6px); }
```

---

## 5. Button — Secondary

```css
.btn-secondary {
  background: transparent;
  color: var(--text-heading);
  border: var(--border-thicker);
  box-shadow: var(--shadow-sm);
  border-radius: var(--radius-none);
  height: var(--control-md);
  padding: 0 var(--space-6);
  font-family: var(--font-display);
  font-size: var(--text-sm);
  font-weight: var(--weight-bold);
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
  cursor: pointer;
  transition: box-shadow var(--transition-fast), background var(--transition-fast);
}

.btn-secondary:hover {
  background: var(--bg-elevated);
  box-shadow: var(--shadow-md);
}

.btn-secondary:active {
  box-shadow: none;
  transform: translate(2px, 2px);
  transition: box-shadow var(--transition-push), transform var(--transition-push);
}
```

---

## 6. Button — Pill

Playful contrast to the square default.

```css
.btn-pill {
  background: var(--accent);
  color: var(--accent-contrast);
  border: var(--border-thick);
  box-shadow: var(--shadow-sm);
  border-radius: var(--radius-full);
  height: var(--control-sm);
  padding: 0 var(--space-5);
  font-family: var(--font-display);
  font-size: var(--text-sm);
  font-weight: var(--weight-bold);
  cursor: pointer;
}

.btn-pill:hover { box-shadow: var(--shadow-md); }
.btn-pill:active { box-shadow: none; transform: translate(2px, 2px); }
```

---

## 7. Input

```css
.input {
  background: var(--bg-surface);
  color: var(--text-primary);
  border: var(--border-thick);
  border-radius: var(--radius-none);
  height: var(--control-md);
  padding: 0 var(--space-4);
  font-family: var(--font-body);
  font-size: var(--text-sm);
  width: 100%;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}

.input::placeholder {
  font-family: var(--font-mono);
  color: var(--text-muted);
}

.input:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: var(--shadow-accent);
}

.input:disabled {
  background: var(--bg-elevated);
  color: var(--text-disabled);
  cursor: not-allowed;
}
```

---

## 8. Textarea

```css
.textarea {
  /* extends .input */
  height: auto;
  min-height: 120px;
  padding: var(--space-3) var(--space-4);
  resize: vertical;
  line-height: 1.6;
}
```

---

## 9. Select

```css
.select {
  /* extends .input */
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L6 7L11 1' stroke='%231A1A1A' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right var(--space-4) center;
  padding-right: var(--space-10);
  cursor: pointer;
}

/* Dropdown */
.select-dropdown {
  background: var(--bg-surface);
  border: var(--border-thicker);
  box-shadow: var(--shadow-lg);
  border-radius: var(--radius-none);
  padding: var(--space-2) 0;
}

.select-option {
  padding: var(--space-2) var(--space-4);
  font-family: var(--font-body);
  font-size: var(--text-sm);
  cursor: pointer;
}

.select-option:hover {
  background: var(--bg-elevated);
}

.select-option--active {
  background: var(--accent);
  color: var(--accent-contrast);
  font-weight: var(--weight-bold);
}
```

---

## 10. Checkbox

```css
.checkbox {
  width: 20px;
  height: 20px;
  border: var(--border-thick);
  border-radius: var(--radius-none);
  background: var(--bg-surface);
  appearance: none;
  cursor: pointer;
  position: relative;
  flex-shrink: 0;
}

.checkbox:checked {
  background: var(--accent);
}

/* Bold checkmark — 2px stroke minimum */
.checkbox:checked::after {
  content: '';
  position: absolute;
  left: 4px;
  top: 1px;
  width: 8px;
  height: 12px;
  border-right: 2.5px solid var(--accent-contrast);
  border-bottom: 2.5px solid var(--accent-contrast);
  transform: rotate(45deg);
}

.checkbox:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
```

---

## 11. Toggle

Brutalist variant: square, not round.

```css
.toggle {
  width: 48px;
  height: 24px;
  border: var(--border-thick);
  border-radius: var(--radius-none);   /* SQUARE — brutalist signature */
  background: var(--bg-elevated);
  cursor: pointer;
  position: relative;
  transition: background var(--transition-base);
}

.toggle:checked {
  background: var(--accent);
}

.toggle-thumb {
  width: 16px;
  height: 16px;
  background: var(--bg-surface);
  border: var(--border-thick);
  border-radius: var(--radius-none);   /* SQUARE thumb */
  position: absolute;
  top: 2px;
  left: 2px;
  transition: transform var(--transition-base);
}

.toggle:checked .toggle-thumb {
  transform: translateX(24px);
}
```

---

## 12. Badge

```css
.badge {
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 var(--space-3);
  border: var(--border-thick);
  border-radius: var(--radius-full);   /* PILL — contrast with card radius 0 */
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: var(--weight-medium);
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
  white-space: nowrap;
}

.badge--accent  { background: var(--accent); color: var(--accent-contrast); }
.badge--green   { background: var(--semantic-green-dim); color: var(--semantic-green); }
.badge--amber   { background: var(--semantic-amber-dim); color: var(--semantic-amber); }
.badge--red     { background: var(--semantic-red-dim); color: var(--semantic-red); }
.badge--blue    { background: var(--semantic-blue-dim); color: var(--semantic-blue); }
.badge--neutral { background: var(--bg-elevated); color: var(--text-secondary); }
```

---

## 13. Tag / Chip (dismissible)

```css
.tag {
  /* extends .badge */
  border-radius: var(--radius-full);
  gap: var(--space-2);
}

.tag__close {
  width: 16px;
  height: 16px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 12px;
  font-weight: var(--weight-bold);
  color: currentColor;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}
```

---

## 14. Table

Full-grid borders — the brutalist data table signature.

```css
.table {
  width: 100%;
  border-collapse: collapse;
  border: var(--border-thick);
  font-size: var(--text-sm);
}

.table th,
.table td {
  border: var(--border-subtle);   /* ALL cells bordered */
  padding: var(--space-3) var(--space-4);
  text-align: left;
}

.table thead {
  background: var(--bg-elevated);
}

.table th {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: var(--weight-medium);
  text-transform: uppercase;
  letter-spacing: var(--tracking-wider);
  color: var(--text-secondary);
}

/* Data cells: mono for numbers, dates, IDs */
.table td[data-type="number"],
.table td[data-type="date"],
.table td[data-type="id"],
.table td[data-type="status"] {
  font-family: var(--font-mono);
}

.table tbody tr:hover {
  background: var(--bg-elevated);
  transition: background 60ms ease;
}

/* Sort arrow */
.table th[aria-sort] {
  cursor: pointer;
}

.table th[aria-sort]::after {
  content: ' ↕';
  font-size: 10px;
  color: var(--text-muted);
}

.table th[aria-sort="ascending"]::after  { content: ' ↑'; color: var(--text-heading); }
.table th[aria-sort="descending"]::after { content: ' ↓'; color: var(--text-heading); }
```

Tables never stack into card lists on mobile — they scroll horizontally:
```css
.table-container {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}
```

---

## 15. Modal

```css
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: color-mix(in srgb, var(--bg-void) 70%, transparent);
  /* NO backdrop-filter blur — brutalist has zero blur */
  z-index: var(--z-overlay);
}

.modal {
  background: var(--bg-surface);
  border: var(--border-thicker);
  box-shadow: var(--shadow-xl);
  border-radius: var(--radius-none);
  padding: var(--space-8);
  max-width: 540px;
  width: 90%;
  position: relative;
  z-index: var(--z-modal);
}

.modal__header {
  border-bottom: var(--border-thick);
  padding-bottom: var(--space-4);
  margin-bottom: var(--space-6);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal__title {
  font-family: var(--font-display);
  font-size: var(--text-lg);
  font-weight: var(--weight-bold);
  color: var(--text-heading);
}

.modal__close {
  width: 32px;
  height: 32px;
  border: var(--border-thick);
  background: none;
  cursor: pointer;
  font-size: 18px;
  font-weight: var(--weight-bold);
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal__close:hover { background: var(--bg-elevated); }
.modal__close:active { transform: translate(2px, 2px); box-shadow: none; }
```

---

## 16. Toast

```css
.toast {
  background: var(--bg-surface);
  border: var(--border-thicker);
  box-shadow: var(--shadow-md);
  border-radius: var(--radius-none);
  padding: var(--space-4) var(--space-5);
  padding-left: calc(var(--space-5) + 4px);  /* room for accent bar */
  min-width: 280px;
  max-width: 420px;
  position: relative;
  overflow: hidden;
}

/* Left accent bar — 4px color indicator */
.toast::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
}

.toast--success::before { background: var(--semantic-green); }
.toast--error::before   { background: var(--semantic-red); }
.toast--warning::before { background: var(--semantic-amber); }
.toast--info::before    { background: var(--semantic-blue); }

.toast__message {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--text-primary);
}

/* Position: top-right so shadow is visible */
.toast-container {
  position: fixed;
  top: var(--space-6);
  right: var(--space-6);
  z-index: var(--z-toast);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
```

---

## 17. Tooltip

```css
.tooltip {
  background: var(--text-heading);   /* near-black in light, near-white in dark */
  color: var(--bg-base);
  border: var(--border-thick);
  border-color: var(--text-heading);
  border-radius: var(--radius-none);
  padding: var(--space-1) var(--space-3);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  white-space: nowrap;
  pointer-events: none;
}
```

---

## 18. Progress Bar

Thick — more substantial than other skills.

```css
.progress {
  height: 12px;   /* thicker than standard */
  border: var(--border-thick);
  border-radius: var(--radius-none);
  background: var(--bg-elevated);
  overflow: hidden;
}

.progress__fill {
  height: 100%;
  background: var(--accent);
  border-radius: var(--radius-none);
  transition: width var(--transition-slow);
}

.progress--success .progress__fill { background: var(--semantic-green); }
.progress--danger  .progress__fill { background: var(--semantic-red); }
```

---

## 19. Avatar

```css
.avatar {
  border: var(--border-thicker);
  border-radius: var(--radius-none);   /* SQUARE — brutalist default */
  overflow: hidden;
  flex-shrink: 0;
  background: var(--bg-elevated);
}

.avatar--circle { border-radius: var(--radius-full); }  /* Round variant */

.avatar--sm { width: 32px; height: 32px; }
.avatar--md { width: 40px; height: 40px; }
.avatar--lg { width: 56px; height: 56px; }
```

---

## 20. Divider

```css
.divider {
  border: none;
  border-top: var(--border-thick);
  width: 100%;
  margin: var(--space-4) 0;
}

.divider--dashed {
  border-top-style: dashed;
}

.divider--double {
  border-top: var(--border-subtle);
  box-shadow: 0 3px 0 var(--border-color);  /* visual double — border + shadow line */
}
```

---

## 21. Marquee

For announcement bars and promotional strips.

```css
.marquee {
  height: 40px;
  background: var(--accent);
  border-top: var(--border-thick);
  border-bottom: var(--border-thick);
  overflow: hidden;
  display: flex;
  align-items: center;
}

.marquee__track {
  display: flex;
  gap: var(--space-16);
  animation: marquee 20s linear infinite;
  white-space: nowrap;
}

.marquee__text {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  font-weight: var(--weight-bold);
  color: var(--accent-contrast);
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
}

@keyframes marquee {
  from { transform: translateX(0); }
  to   { transform: translateX(-50%); }
}

@media (prefers-reduced-motion: reduce) {
  .marquee__track { animation: none; }
}
```

---

## 22. Code Block

```css
.code-block {
  background: var(--bg-elevated);
  border: var(--border-thicker);
  border-radius: var(--radius-none);
  overflow: hidden;
}

/* Colored tab header with filename */
.code-block__header {
  background: var(--accent);
  color: var(--accent-contrast);
  border-bottom: var(--border-thick);
  padding: var(--space-2) var(--space-4);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: var(--weight-bold);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.code-block__copy {
  background: none;
  border: var(--border-thick);
  color: var(--accent-contrast);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  padding: 2px var(--space-2);
  cursor: pointer;
  border-radius: var(--radius-none);
}

.code-block__body {
  padding: var(--space-5);
  overflow-x: auto;
}

.code-block pre, .code-block code {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--text-primary);
  line-height: 1.7;
}
```

---

## 23. Sticker Badge

The signature decorative element of this skill.

```css
.sticker {
  display: inline-block;
  background: var(--accent);
  color: var(--accent-contrast);
  border: var(--border-thick);
  box-shadow: var(--shadow-sm);
  border-radius: var(--radius-none);
  padding: var(--space-1) var(--space-3);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: var(--weight-bold);
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
  transform: rotate(-2deg);  /* subtle tilt — sticker energy */
  transform-origin: center;
}

/* Variants */
.sticker--new    { background: var(--accent-green); transform: rotate(-1deg); }
.sticker--hot    { background: var(--accent-red); color: white; transform: rotate(2deg); }
.sticker--beta   { background: var(--accent-blue); color: white; transform: rotate(-2deg); }
.sticker--accent { background: var(--accent); transform: rotate(1.5deg); }

/* No animation — stickers are static by default */
```

---

## Component Rules Summary

| Rule | Detail |
|------|--------|
| Border on everything | Every interactive or container element must have a visible border. Min 2px solid. |
| Shadow direction | All hard shadows point bottom-right. Never top-left, never scattered. |
| Push mechanic | Every element with `box-shadow` implements shadow-remove + translate on `:active`. |
| Mono for data | Numbers, dates, IDs, status text, labels, metadata → `font-family: var(--font-mono)`. |
| Square toggle | Toggle uses `border-radius: 0`. This is the brutalist signature, not a mistake. |
| Max 2 accents per page | Indie/devtool/zine modes: max 2 accent colors. Creative Playground: up to 4. |
| No blur anywhere | No `box-shadow` with blur-radius > 0. No `backdrop-filter: blur()`. Zero blur everywhere. |
| No radius in between | Components are `--radius-none` (0) or `--radius-full` (pills). Never 4–16px unless explicitly specified in a token. |
