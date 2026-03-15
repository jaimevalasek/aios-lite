# Quality Validation Checklist

> Run this before shipping any UI that claims to follow `premium-command-center-ui`.

---

## A. Visual system

- [ ] The page uses a clear premium direction, not a default dark theme.
- [ ] There are no more than 3 major surface levels.
- [ ] Borders are visible and consistent across major panels.
- [ ] Shadows belong to one family only.
- [ ] Semantic colors are limited to clear roles (`accent`, `success`, `warning`, `danger`, `violet`, `neutral`).
- [ ] The background atmosphere is intentional and restrained.

## B. Typography and density

- [ ] Eyebrows, headings, helper text, and monospace metadata follow a consistent hierarchy.
- [ ] Titles use stronger weight and tighter tracking than body copy.
- [ ] Density feels compact and operational, not empty and oversized.
- [ ] Repeated paddings, radii, and gaps follow one compact scale.

## C. Layout and hierarchy

- [ ] The primary operational signal is above infrastructure and secondary metadata.
- [ ] Each page has one obvious focal block.
- [ ] The route composition matches its job (overview, queue, catalog, explorer, registry).
- [ ] Long flat lists were replaced by grouped or segmented structures where appropriate.
- [ ] Important counts or statuses are visible without scrolling deep into the page.

## D. Shell and navigation

- [ ] The shell feels like a product operating surface, not just page chrome.
- [ ] Left navigation exposes real first-class modules only.
- [ ] Top search or command access exists when route count or complexity justifies it.
- [ ] Contextual status/history/metrics are available somewhere persistent when needed.
- [ ] Cards or grouped rows expose direct drill-down actions.

## E. Component quality

- [ ] Major cards have clear default and hover states.
- [ ] Active or selected states are visually distinct.
- [ ] Empty states are intentionally designed, not plain paragraphs.
- [ ] Error and warning surfaces use the semantic tone system.
- [ ] Utility controls (toggle, tabs, segmented filters, search triggers) feel integrated into the shell.

## F. Responsiveness

- [ ] The desktop shell collapses progressively instead of breaking.
- [ ] Split sections stack cleanly below large breakpoints.
- [ ] Action rows and chips wrap safely.
- [ ] No critical context disappears without an alternate access path.
- [ ] Text labels remain legible and do not overflow in common viewport widths.

## G. Accessibility

- [ ] Interactive elements remain keyboard reachable.
- [ ] Focus states are visible.
- [ ] Body text contrast is comfortable for long reading.
- [ ] Meaning is not conveyed by color alone.
- [ ] Modals, overlays, and drawers have obvious close behavior.

## H. Premium feel audit

- [ ] The interface feels faster to use, not only more decorated.
- [ ] The shell, search, context rail, and grouped cards work together as one system.
- [ ] The result does not look like a generic template from a dashboard kit.
- [ ] The visual identity would still be recognizable if labels changed.
- [ ] The user can tell where to act next on every important screen.

---

## Hard fail conditions

If any of these are true, the skill was not applied correctly:

- the page is just a dark background with default cards
- every section has the same weight and the same composition
- runtime-critical areas are buried below paths, config, or explanatory prose
- the UI is still washed out or low-contrast
- the interface feels spacious but not useful
- navigation improved visually but not operationally
