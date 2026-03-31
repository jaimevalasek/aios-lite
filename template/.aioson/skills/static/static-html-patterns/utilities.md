# Utilities — Performance, JS, BEM, Responsive, A11y, Images, SCSS

> Load when you need: performance rules, minimal JS patterns, naming conventions,
> responsive strategy, accessibility checklist, Unsplash image IDs, or SCSS architecture.
> These sections are short — all included in one file for convenience.

---

## 3. Performance Patterns (always apply)

```html
<!-- Critical: preconnect fonts before CSS -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>

<!-- Hero image: eager + fetchpriority for LCP -->
<img src="hero.jpg" loading="eager" fetchpriority="high" alt="">

<!-- Below-fold images: lazy -->
<img src="feature.jpg" loading="lazy" alt="[descriptive]">

<!-- Non-critical CSS: preload then apply -->
<link rel="preload" href="styles.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
<noscript><link rel="stylesheet" href="styles.css"></noscript>

<!-- Scripts: always async or defer -->
<script async src="analytics.js"></script>
<script defer src="interactions.js"></script>
```

**Critical CSS inline rule:** Only header + hero CSS in `<style>` tag. Everything else in external file.

---

## 4. Minimal JavaScript (interactions only)

```js
// Header: add .scrolled class after scroll
window.addEventListener('scroll', () => {
  document.getElementById('header')
    .classList.toggle('scrolled', window.scrollY > 40);
}, { passive: true });

// Mobile menu toggle
document.querySelector('.header__burger')?.addEventListener('click', function() {
  const expanded = this.getAttribute('aria-expanded') === 'true';
  this.setAttribute('aria-expanded', String(!expanded));
  document.querySelector('.header__nav').classList.toggle('open', !expanded);
});

// Scroll reveal with IntersectionObserver
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('revealed');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });
document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

// Counter animation (for stats section)
function animateCounter(el) {
  const target = +el.dataset.target;
  const duration = 1500;
  const start = performance.now();
  requestAnimationFrame(function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    el.textContent = Math.round(eased * target).toLocaleString();
    if (progress < 1) requestAnimationFrame(tick);
  });
}
```

---

## 5. CSS Naming Convention (BEM-lite)

```
component           → .hero, .feature-card, .testimonial-card
component__element  → .hero__title, .feature-card__icon
component--modifier → .btn--primary, .btn--lg, .card--glow-border
```

Rules:
- Class names are lowercase, hyphenated
- No deep nesting in CSS (max 2 levels: `.hero .hero__content`)
- No `id` for styling — only for anchor links and `aria-labelledby`
- Utility classes for single-purpose overrides: `.sr-only`, `.reveal`, `.gradient-text`

---

## 6. Responsive Strategy

**Do NOT just reflow columns on mobile. Also:**
- Hide secondary navigation links → show only logo + CTA + burger
- Reduce heading sizes with `clamp()` instead of media queries for font-size
- Stack `.hero__actions` buttons vertically below 480px
- Remove decorative orbs/blobs on mobile (performance + layout stability)
- Simplify card grids: 3 → 2 → 1 columns
- Show testimonials as carousel or stacked, not 3-column grid

```css
/* Prefer clamp() for fluid typography over breakpoint-heavy font-size */
.hero__title { font-size: clamp(2rem, 6vw, 4.5rem); }
.section-title { font-size: clamp(1.875rem, 4vw, 3rem); }

/* Hide decorative elements on mobile */
@media (max-width: 768px) {
  .hero__decor { display: none; }
  .header__nav { display: none; }
  .header__nav.open { display: flex; flex-direction: column; }
  .hero__actions { flex-direction: column; align-items: center; }
}
```

---

## 7. Accessibility Checklist (non-negotiable)

- [ ] All `<img>` have `alt` — decorative images use `alt=""` + `role="presentation"`
- [ ] All interactive elements reachable by `Tab` and operable by `Enter`/`Space`
- [ ] `:focus-visible` styles visible and clear (2px outline, offset, accent color)
- [ ] All `<button>` have `type="button"` or `type="submit"`
- [ ] Icon-only buttons have `aria-label`
- [ ] Sections have `aria-labelledby` pointing to their heading `id`
- [ ] Color contrast ≥ 4.5:1 for body text, ≥ 3:1 for large text and UI controls
- [ ] `prefers-reduced-motion: reduce` disables all animations
- [ ] Mobile menu uses `aria-expanded` toggling
- [ ] Footer `<nav>` has `aria-label="Footer navigation"` distinct from header nav

---

## 8. Curated Unsplash Images by Domain

Format: `https://images.unsplash.com/photo-{ID}?w=1920&q=80&fit=crop`

| Domain | Hero | Feature/Section |
|---|---|---|
| Tech/AI/SaaS | `1518770660439-4636190af475` | `1551288049-bebda4e38f71` |
| Business/Corp | `1497366216548-37526070297c` | `1522071820081-009f0129c71c` |
| Creative/Agency | `1558618666-fcd25c85cd64` | `1504607798333-52a30db54a5d` |
| Wellness/Health | `1506905925346-21bda4d32df4` | `1571019613454-1cb2f99b2d8b` |
| Food/Restaurant | `1414235077428-338989a2e8c0` | `1555939594-58d7cb561ad1` |
| Architecture | `1486325212027-8081e485255e` | `1460317442991-0ec209397118` |
| Nature/Travel | `1441974231531-c6227db76b6e` | `1506197603052-3cc9c3a201bd` |
| People/Teams | `1522202176988-66273c2fd55f` | `1582213782179-e0d53f98f2ca` |
| Avatars (face) | `1535713875002-d1d0cf377fde` | `1494790108377-be9c29b29330` |

Face crops (for testimonials): append `&w=48&h=48&fit=crop&crop=face`

---

## 11. SCSS Architecture (for larger projects)

```
assets/scss/
  base/
    _reset.scss        ← minimal reset + box-model
    _typography.scss   ← font imports, type scale, body
    _helpers.scss      ← .sr-only, .reveal, .gradient-text, .container
  tokens/
    _colors.scss       ← CSS custom properties :root block
    _spacing.scss      ← --space-* tokens
    _typography.scss   ← --font-*, --text-* tokens
    _motion.scss       ← --ease-*, --duration-* tokens
  layout/
    _header.scss
    _footer.scss
    _grid.scss
  components/
    _buttons.scss
    _cards.scss
    _forms.scss
    _modal.scss
    _accordion.scss
    _slider.scss
  sections/
    _hero.scss
    _features.scss
    _how-it-works.scss
    _testimonials.scss
    _pricing.scss
    _faq.scss
    _cta-final.scss
  main.scss            ← @forward all partials in order
```

**Compile:** `sass assets/scss/main.scss assets/css/main.min.css --style=compressed --watch`
