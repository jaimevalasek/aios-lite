# Components — Glassmorphism UI

All components use glass tokens. The Glass Card is the fundamental building block — everything else extends or contains it.

---

## Glass Rules (read first)

Before building any component:

1. **Minimum 2 layers**: never place a glass card directly over white or solid black. Always over a gradient or another glass layer.
2. **Text over glass**: guarantee WCAG AA contrast. If blur is insufficient, increase `glass-bg` opacity toward `glass-bg-active`.
3. **Fallback without blur**: if `backdrop-filter` is unsupported, use `glass-fallback-bg` at 0.95 opacity (see `design-tokens.md`).
4. **Performance**: limit glass nesting to 3 levels max. Each `backdrop-filter` is a composite layer.
5. **Top reflection**: every glass card has `::before` with `glass-highlight` for the top edge reflection. This is what makes glass feel real.

---

## 1. Glass Card (fundamental component)

Every other container-type component inherits from this.

```
Structure:
  position: relative
  overflow: hidden
  background: var(--glass-bg)
  backdrop-filter: var(--glass-blur-md)
  border: 1px solid var(--glass-border)
  border-radius: var(--radius-xl)
  box-shadow: var(--shadow-sm), var(--shadow-inner)
  padding: var(--space-6)

Pseudo-element ::before (top reflection):
  content: ''
  position: absolute
  top: 0; left: 0; right: 0
  height: 50%
  background: var(--glass-highlight)
  pointer-events: none
  border-radius: inherit

Hover:
  background: var(--glass-bg-hover)
  box-shadow: var(--shadow-md), var(--shadow-inner)
  transition: var(--transition-glass)
```

Variants:
- `glass-card--sm`: `border-radius: var(--radius-lg)`, `padding: var(--space-4)`
- `glass-card--lg`: `border-radius: var(--radius-2xl)`, `padding: var(--space-8)`
- `glass-card--hero`: `border-radius: var(--radius-3xl)`, `padding: var(--space-10)`, `backdrop-filter: var(--glass-blur-lg)`
- `glass-card--elevated`: `background: var(--glass-bg-elevated)` (more opaque, for nested)
- `glass-card--featured`: adds `box-shadow: var(--shadow-glow)` + `border: 1px solid rgba(124,58,237,0.30)`

---

## 2. Stat Card

Glass Card + stat display. Used in dashboards and analytics.

```
Structure: Glass Card (radius-xl, padding-6)
  └─ Label: text-sm, text-secondary, weight-500, mb-2
  └─ Value: text-3xl or text-4xl, weight-bold, text-heading
       Optional: gradient text (var(--accent-gradient), -webkit-background-clip: text)
  └─ Trend badge: below value, inline-flex
       ↑ green / ↓ red + percentage text-sm
  └─ Optional: sparkline (40px height) at bottom

Hover: glass card hover + inner glow (shadow-glow at 50% opacity)
```

---

## 3. Feature Card

Glass Card for marketing and feature lists.

```
Structure: Glass Card (radius-2xl, padding-8)
  └─ Icon area: 48x48px, background: var(--accent-dim), border-radius: var(--radius-lg)
       icon: 24px, accent color
  └─ Title: text-lg, weight-semibold, text-heading, mt-4
  └─ Description: text-sm, text-secondary, mt-2, line-height 1.6
  └─ Optional: link/CTA at bottom (text-sm, accent color, arrow icon)
```

---

## 4. Navigation Bar (app)

Glass top bar, sticky, inside the content area (not full-width over sidebar).

```
Structure:
  position: sticky
  top: 0
  height: var(--nav-height)   /* 64px */
  background: var(--glass-bg)
  backdrop-filter: var(--glass-blur-lg)
  border-bottom: 1px solid var(--glass-border)
  z-index: 10

  Layout: flex, align-center, px-6, gap-4
    Left: page title (text-lg, weight-semibold)
    Right: actions (search icon, notifications, avatar)

On scroll: background → var(--glass-bg-hover) via transition-glass
```

---

## 5. Sidebar

Glass sidebar, fixed or sticky, 256px wide.

```
Structure:
  width: var(--sidebar-width)   /* 256px */
  height: 100vh
  position: fixed
  top: 0; left: 0
  background: var(--glass-bg)
  backdrop-filter: var(--glass-blur-lg)
  border-right: 1px solid var(--glass-border)
  padding: var(--space-6) 0
  overflow-y: auto

  Sections:
    Logo area: px-6, mb-8, height 40px
    Nav groups: label text-xs uppercase tracking-wider text-muted px-6 mb-2
    Nav items: px-4, py-2.5, radius-lg, gap-3, icon + label

  Nav item states:
    Default: text-secondary, icon text-muted
    Hover: background var(--glass-bg-hover)
    Active: background var(--accent-dim), border-left 2px solid var(--accent), text-heading, icon accent
```

---

## 6. Bottom Sheet (mobile)

Glass overlay sheet sliding up from bottom. iOS-style.

```
Structure:
  position: fixed
  bottom: 0; left: 0; right: 0
  background: var(--glass-bg-active)   /* more opaque */
  backdrop-filter: var(--glass-blur-xl)
  border-radius: var(--radius-3xl) var(--radius-3xl) 0 0
  border-top: 1px solid var(--glass-border)
  padding: var(--space-3) var(--space-6) var(--space-8)

  Drag handle:
    width: 40px; height: 4px
    background: var(--text-muted)
    border-radius: var(--radius-full)
    margin: 0 auto var(--space-6)

Content behind: background becomes blur (achieved by the backdrop-filter revealing gradient below)
```

---

## 7. Button — Primary

Accent gradient, solid feel within glass environment.

```
height: var(--control-lg)   /* 44px */
padding: 0 var(--space-5)
background: var(--accent-gradient)
color: var(--accent-contrast)
border: none
border-radius: var(--radius-md)
box-shadow: var(--shadow-sm)
font-weight: 500
font-size: var(--text-sm)

Hover: box-shadow var(--shadow-md) + filter brightness(1.05), 120ms
Active: filter brightness(0.95)
Disabled: opacity 0.4
```

---

## 8. Button — Glass

Secondary action button. Looks like a glass surface with text.

```
height: var(--control-lg)
padding: 0 var(--space-5)
background: var(--glass-bg)
backdrop-filter: var(--glass-blur-sm)
border: 1px solid var(--glass-border)
border-radius: var(--radius-md)
color: var(--text-primary)
font-weight: 500

Hover: background var(--glass-bg-hover), 120ms
Active: background var(--glass-bg-active)
```

---

## 9. Button — Ghost

Minimal button, transparent, glass hover.

```
height: var(--control-md)
padding: 0 var(--space-4)
background: transparent
border: none
border-radius: var(--radius-md)
color: var(--text-primary)

Hover: background var(--glass-bg)
```

---

## 10. Input

Text input with glass surface and luminous focus ring.

```
height: var(--control-md)
padding: 0 var(--space-3)
background: var(--glass-bg)
backdrop-filter: var(--glass-blur-sm)
border: 1px solid var(--glass-border)
border-radius: var(--radius-md)
color: var(--text-primary)
font-size: var(--text-sm)

Placeholder: color var(--text-muted)
Focus: border-color var(--glass-border-focus) + box-shadow 0 0 0 3px var(--accent-dim)
Transition: var(--transition-glass)

Icon left/right: 16px, text-muted, position absolute with padding offset
```

---

## 11. Select / Dropdown

Trigger uses Input style. Menu is a glass card.

```
Trigger: Input appearance + chevron-down icon right
Menu:
  Glass Card (radius-lg, padding-2, shadow-lg, blur-lg)
  position: absolute, top: calc(100% + 4px), min-width: 100%
  max-height: 240px, overflow-y: auto

  Item: px-3, py-2, radius-md, text-sm text-primary
  Item hover: background var(--glass-bg-hover)
  Item selected: background var(--accent-dim), text-accent, font-weight 500
```

---

## 12. Toggle Switch

```
width: 44px; height: 24px
background: var(--glass-border)   /* off state */
border-radius: var(--radius-full)
position: relative
transition: background var(--transition-base)

Thumb:
  width: 18px; height: 18px
  background: white
  border-radius: var(--radius-full)
  box-shadow: var(--shadow-sm)
  position: absolute, top: 3px, left: 3px
  transition: transform var(--transition-base)

Checked:
  background: var(--accent-gradient)
  thumb: transform translateX(20px)
```

---

## 13. Badge

```
height: 22px
padding: 0 var(--space-2.5)   /* 10px */
border-radius: var(--radius-full)
background: var(--glass-bg)
border: 1px solid var(--glass-border)
font-size: var(--text-xs)
font-weight: 500

Semantic variants (add tint to glass-bg):
  success: background rgba(16, 185, 129, 0.12), color var(--semantic-green)
  warning: background rgba(245, 158, 11, 0.12), color var(--semantic-amber)
  error:   background rgba(239, 68, 68, 0.12), color var(--semantic-red)
  info:    background rgba(59, 130, 246, 0.12), color var(--semantic-blue)
  accent:  background var(--accent-dim), color var(--accent)
```

---

## 14. Modal

Glass card with blurred backdrop.

```
Backdrop:
  position: fixed, inset: 0
  background: rgba(var(--bg-void-rgb), 0.50)
  backdrop-filter: var(--glass-blur-sm)
  z-index: 50

Modal container:
  Glass Card (radius-2xl, shadow-lg, blur-lg)
  max-width: 520px; width: calc(100% - 32px)
  position: fixed, top: 50%, left: 50%
  transform: translate(-50%, -50%)
  padding: var(--space-8)
  z-index: 51

  Header: title text-lg weight-semibold + close button (ghost, icon-only)
  Body: mt-4, text-sm text-secondary
  Footer: mt-6, flex gap-3 justify-end
```

---

## 15. Toast

Auto-dismissing glass notification.

```
Glass Card (radius-xl, shadow-md)
padding: var(--space-4) var(--space-5)
display: flex, align-center, gap-3
border-left: 3px solid semantic-color
min-width: 280px; max-width: 400px
position: fixed, bottom: var(--space-6), right: var(--space-6)
z-index: 60
animation: float-up 350ms ease-out + auto-dismiss 5s
```

---

## 16. Tooltip

Small glass bubble on hover.

```
Glass Card (radius-md, blur-sm)
background: var(--glass-bg-active)   /* more opaque for readability */
padding: var(--space-2) var(--space-3)
font-size: var(--text-xs)
box-shadow: var(--shadow-sm)
pointer-events: none
z-index: 70
animation: scale-materialize 150ms
```

---

## 17. Tab Bar

Horizontal navigation tabs.

```
Container:
  display: flex
  background: var(--glass-bg)
  backdrop-filter: var(--glass-blur-md)
  border-bottom: 1px solid var(--glass-border)
  padding: 0 var(--space-6)

Tab item:
  padding: var(--space-3) var(--space-4)
  font-size: var(--text-sm)
  font-weight: 500
  color: var(--text-secondary)
  border-bottom: 2px solid transparent
  position: relative

Active tab:
  color: var(--text-heading)
  border-bottom: 2px solid var(--accent)

Hover: color var(--text-primary), transition var(--transition-fast)
```

---

## 18. Progress Bar

```
Container:
  height: 6px
  background: var(--glass-border)
  border-radius: var(--radius-full)
  overflow: hidden

Fill:
  height: 100%
  background: var(--accent-gradient)
  border-radius: var(--radius-full)
  transition: width var(--transition-slow)
```

---

## 19. Avatar

```
Sizes: 24px / 32px / 40px / 56px
border-radius: var(--radius-full)
border: 2px solid var(--glass-border)
box-shadow: var(--shadow-sm)
overflow: hidden

Fallback (no image): background var(--accent-dim), initials text-sm weight-600 accent color
Avatar group: overlapping avatars with margin-left -8px, each with border 2px white/glass
```

---

## 20. Empty State

```
Container: centered, py-16, flex-col align-center gap-4

Illustration: abstract gradient shape (not line art)
  80px x 80px, background var(--accent-gradient) with opacity 0.2
  border-radius var(--radius-3xl)
  + icon on top (24px, accent)

Title: text-base weight-semibold text-heading
Description: text-sm text-secondary, max-width 280px text-center
CTA: Glass Button or Primary Button
```

---

## 21. Skeleton Loader

Glass surface with shimmer animation.

```
Shape: matches the component it replaces (text lines, card, avatar)
background: var(--glass-bg)
border-radius: matches component radius
overflow: hidden
position: relative

Shimmer (::after):
  content: ''
  position: absolute, inset: 0
  background: linear-gradient(90deg,
    transparent 0%,
    rgba(255,255,255,0.10) 50%,
    transparent 100%)
  animation: shimmer 1.5s infinite
  transform: translateX(-100%)

@keyframes shimmer {
  to { transform: translateX(100%); }
}

Reduced motion: no shimmer animation — use static glass-bg only
```

---

## 22. Chip / Tag

```
height: var(--control-xs)   /* 28px */
padding: 0 var(--space-3)
background: var(--glass-bg)
backdrop-filter: var(--glass-blur-sm)
border: 1px solid var(--glass-border)
border-radius: var(--radius-full)
font-size: var(--text-sm)
color: var(--text-primary)
display: inline-flex, align-center, gap-2

Close icon: 14px, text-muted, hover text-primary, cursor pointer
Hover: background var(--glass-bg-hover)
Selected: background var(--accent-dim), border-color rgba(accent 0.30), color var(--accent)
```
