---
name: design-components
description: Reusable Cognitive Core UI components for cards, metrics, navigation, tables, forms, dialogs, badges, progress, and feedback. Load `foundations/SKILL.md` first. Use when building structured product-interface elements.
---

# Components

Load `../foundations/SKILL.md` first. Adapt these contracts to the active stack; examples are not a technology mandate.

## Component contracts

- **Stat card:** mono label, tabular primary number, explicit unit/trend, optional semantic status. Do not use color alone for direction.
- **Base/info card:** one surface level, clear title/body/actions, optional icon or quote. Avoid nested card shells.
- **Profile header:** avatar/entity mark, name, role, stable ID, statuses, then metrics. Reflow vertically on narrow screens.
- **Badge/chip:** accent, outline, or semantic variant with readable label; status variants include icon/text.
- **Tabs:** actual buttons or links with selected state, keyboard navigation, scroll-safe overflow, and a visible active indicator.
- **Sidebar/tree:** labeled groups, current-page semantics, collapsible mobile alternative, and no icon-only ambiguity.
- **Progress:** labeled value and maximum; expose progress semantics and an indeterminate state where required.
- **Table:** real headers, alignment by data type, sort state, selection, empty/loading/error states, overflow or responsive priority.
- **Form:** persistent labels, help/error association, required/disabled/read-only states, validation near the field, and a stable submit area.
- **Dialog/drawer:** focus trap, Escape/close behavior, restored focus, title/description association, and destructive-action confirmation.
- **Button:** primary, secondary, ghost, and destructive variants; default, hover, focus, active, disabled, and loading states.
- **Toast/alert:** semantic icon/title/message, appropriate live-region behavior, dismiss control when persistent, and no critical information only in a toast.

## Composition rules

- Use foundation tokens exclusively.
- Preserve one obvious primary action per region.
- Keep icon source and sizing consistent; do not use emoji as interface icons.
- Use compact density for repeated operations and comfortable density for onboarding/content.
- Keep hit targets at least 44×44 CSS pixels where touch is expected.
- Add tooltips only for genuinely ambiguous compact controls, never as a substitute for labels.
- Keep skeletons structurally similar to the content they replace.
- Prefer inline errors for recoverable form failures and page alerts for cross-form/system failures.

## Accessibility and responsive gate

- Every interactive element is reachable and operable by keyboard.
- Focus is never hidden behind sticky regions.
- Selected, expanded, pressed, invalid, and busy states are exposed semantically.
- Tables/forms remain usable at 320px; choose scroll, stacking, or priority disclosure intentionally.
- Motion honors `prefers-reduced-motion`.
- Both themes preserve contrast and state differentiation.

## Done gate

Reject components with hardcoded visual values outside the foundation layer, missing interaction states, unlabeled icons, inaccessible dialogs, fake tables built only from generic divs, nested-card clutter, destructive actions without confirmation, or responsive behavior that simply clips content.
