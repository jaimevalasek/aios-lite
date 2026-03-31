# CSS Tokens & Design Systems

> Load when setting up the visual CSS system for a landing page.
> Contains complete token blocks, component styles, and mandatory "wow" techniques
> for both **Bold & Cinematic** and **Clean & Luminous** directions.

---

## 2. CSS Design Systems

### 2a. Bold & Cinematic (Dark, AI/Tech, Gradient-rich)

```css
/* === TOKENS === */
:root {
  /* Background scale */
  --bg-base:     hsl(240, 15%, 6%);    /* deepest: page bg */
  --bg-surface:  hsl(240, 12%, 10%);   /* cards, panels */
  --bg-elevated: hsl(240, 10%, 14%);   /* modals, popovers */
  --bg-glass:    hsla(240, 20%, 100%, 0.06); /* glassmorphism */

  /* Text scale */
  --text-primary:   hsl(220, 30%, 96%);
  --text-secondary: hsl(220, 15%, 70%);
  --text-muted:     hsl(220, 10%, 50%);

  /* Brand & accent */
  --accent-primary: hsl(265, 80%, 65%);  /* purple */
  --accent-glow:    hsla(265, 80%, 65%, 0.35);
  --accent-alt:     hsl(190, 80%, 55%);  /* cyan complement */
  --gradient-brand: linear-gradient(135deg, hsl(265, 80%, 65%), hsl(310, 75%, 60%));
  --gradient-hero:  linear-gradient(135deg,
    hsla(240, 50%, 8%, 0.95) 0%,
    hsla(265, 60%, 20%, 0.75) 50%,
    hsla(310, 40%, 12%, 0.5) 100%);

  /* Borders */
  --border-faint:  hsla(220, 100%, 90%, 0.07);
  --border-subtle: hsla(220, 100%, 90%, 0.12);
  --border-glow:   hsla(265, 80%, 65%, 0.3);

  /* Spacing */
  --space-xs: 4px; --space-sm: 8px; --space-md: 16px;
  --space-lg: 24px; --space-xl: 40px; --space-2xl: 64px;
  --space-3xl: 96px; --space-4xl: 160px;

  /* Typography */
  --font-display: 'Space Grotesk', 'Syne', sans-serif;
  --font-body:    'Inter', system-ui, sans-serif;
  --font-mono:    'JetBrains Mono', monospace;

  /* Type scale */
  --text-sm:   0.875rem;  /* 14px */
  --text-base: 1rem;      /* 16px */
  --text-lg:   1.125rem;  /* 18px */
  --text-xl:   1.25rem;   /* 20px */
  --text-2xl:  1.5rem;    /* 24px */
  --text-3xl:  1.875rem;  /* 30px */
  --text-4xl:  2.25rem;   /* 36px */
  --text-5xl:  3rem;      /* 48px */
  --text-6xl:  3.75rem;   /* 60px */
  --text-7xl:  4.5rem;    /* 72px */

  /* Radius */
  --radius-sm: 6px; --radius-md: 12px; --radius-lg: 20px; --radius-pill: 9999px;

  /* Motion */
  --ease-out:    cubic-bezier(0.16, 1, 0.3, 1);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
  --duration-fast: 150ms; --duration-base: 250ms; --duration-slow: 400ms;
}

/* === LAYOUT === */
.container {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 var(--space-xl);
}
@media (max-width: 768px) { .container { padding: 0 var(--space-lg); } }

/* === HEADER: glassmorphism, sticky === */
.header {
  position: sticky; top: 0; left: 0; right: 0; z-index: 100;
  height: 72px;
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  background: hsla(240, 15%, 6%, 0.75);
  border-bottom: 1px solid var(--border-faint);
  transition: background var(--duration-base) ease;
}
.header.scrolled { background: hsla(240, 15%, 6%, 0.95); }
.header__inner {
  height: 100%;
  display: flex; align-items: center; gap: var(--space-xl);
}
.header__logo {
  display: flex; align-items: center; gap: var(--space-sm);
  font-family: var(--font-display); font-weight: 700; font-size: var(--text-lg);
  color: var(--text-primary);
}
.logo-mark { color: var(--accent-primary); }
.header__nav {
  display: flex; gap: var(--space-xl);
  margin-left: auto; /* push right */
}
.header__nav a {
  font-size: var(--text-sm); font-weight: 500;
  color: var(--text-secondary);
  transition: color var(--duration-fast) ease;
}
.header__nav a:hover { color: var(--text-primary); }

/* === HERO === */
.hero {
  position: relative;
  min-height: 100dvh;
  display: flex; align-items: center; justify-content: center;
  overflow: hidden;
}
.hero__bg {
  position: absolute; inset: 0; z-index: 0;
}
.hero__bg img {
  width: 100%; height: 100%;
  object-fit: cover; object-position: center;
}
.hero__overlay {
  position: absolute; inset: 0;
  background: var(--gradient-hero);
}
.hero__content {
  position: relative; z-index: 1;
  text-align: center;
  padding: var(--space-4xl) 0;
}
.hero__label {
  display: inline-block;
  padding: 6px 16px;
  border-radius: var(--radius-pill);
  border: 1px solid var(--border-glow);
  background: hsla(265, 80%, 65%, 0.1);
  font-size: var(--text-sm); font-weight: 500; letter-spacing: 0.05em; text-transform: uppercase;
  color: var(--accent-primary);
  margin-bottom: var(--space-xl);
}
.hero__title {
  font-family: var(--font-display);
  font-size: clamp(var(--text-4xl), 7vw, var(--text-7xl));
  font-weight: 800; line-height: 1.05; letter-spacing: -0.03em;
  color: var(--text-primary);
  margin-bottom: var(--space-lg);
}
.hero__subtitle {
  font-size: clamp(var(--text-lg), 2.5vw, var(--text-xl));
  color: var(--text-secondary); line-height: 1.6; max-width: 600px; margin: 0 auto var(--space-xl);
}
.hero__actions { display: flex; gap: var(--space-md); justify-content: center; flex-wrap: wrap; }

/* Decorative glowing orbs */
.hero__decor { position: absolute; inset: 0; z-index: 0; pointer-events: none; }
.orb {
  position: absolute; border-radius: 50%;
  filter: blur(80px); opacity: 0.35;
}
.orb--1 {
  width: 600px; height: 600px;
  background: radial-gradient(circle, hsl(265, 80%, 65%), transparent 70%);
  top: -200px; left: -100px;
}
.orb--2 {
  width: 400px; height: 400px;
  background: radial-gradient(circle, hsl(190, 80%, 55%), transparent 70%);
  bottom: -100px; right: -50px;
}
.orb--3 {
  width: 300px; height: 300px;
  background: radial-gradient(circle, hsl(310, 75%, 60%), transparent 70%);
  top: 50%; left: 50%; transform: translate(-50%, -50%);
}

/* === GRADIENT TEXT === */
.gradient-text {
  background: var(--gradient-brand);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  background-clip: text; display: inline;
}

/* === BUTTONS === */
.btn {
  display: inline-flex; align-items: center; gap: var(--space-sm);
  font-weight: 600; border-radius: var(--radius-md);
  transition: all var(--duration-base) var(--ease-out);
  white-space: nowrap;
}
.btn--sm  { padding: 8px 16px;  font-size: var(--text-sm); }
.btn--md  { padding: 12px 24px; font-size: var(--text-base); }
.btn--lg  { padding: 14px 32px; font-size: var(--text-lg); }
.btn--xl  { padding: 18px 48px; font-size: var(--text-xl); }
.btn--primary {
  background: var(--gradient-brand);
  color: white;
  box-shadow: 0 0 32px var(--accent-glow), 0 4px 16px rgba(0,0,0,0.3);
}
.btn--primary:hover {
  box-shadow: 0 0 48px hsla(265, 80%, 65%, 0.55), 0 8px 24px rgba(0,0,0,0.4);
  transform: translateY(-2px) scale(1.02);
}
.btn--primary:active { transform: translateY(0) scale(0.99); }
.btn--ghost {
  background: var(--bg-glass);
  color: var(--text-primary);
  border: 1px solid var(--border-subtle);
  backdrop-filter: blur(8px);
}
.btn--ghost:hover {
  background: hsla(240, 20%, 100%, 0.1);
  border-color: var(--border-glow);
}

/* === GLASSMORPHISM CARDS === */
.feature-card {
  background: var(--bg-glass);
  border: 1px solid var(--border-faint);
  border-radius: var(--radius-lg);
  padding: var(--space-xl);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  transition: all var(--duration-base) var(--ease-out);
  position: relative; overflow: hidden;
}
.feature-card::before {
  /* Shimmer top border */
  content: '';
  position: absolute; top: 0; left: 0; right: 0; height: 1px;
  background: linear-gradient(90deg, transparent, var(--accent-primary), transparent);
  opacity: 0;
  transition: opacity var(--duration-base) ease;
}
.feature-card:hover {
  border-color: var(--border-glow);
  transform: translateY(-4px);
  box-shadow: 0 20px 60px rgba(0,0,0,0.3), 0 0 40px var(--accent-glow);
}
.feature-card:hover::before { opacity: 1; }
.feature-card__icon {
  font-size: var(--text-3xl); margin-bottom: var(--space-md);
}
.feature-card__title {
  font-family: var(--font-display); font-size: var(--text-xl); font-weight: 700;
  color: var(--text-primary); margin-bottom: var(--space-sm);
}
.feature-card__desc { font-size: var(--text-base); color: var(--text-secondary); line-height: 1.6; }

/* Grid: 3 cols → 2 → 1 */
.features__grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-lg);
  margin-top: var(--space-3xl);
}
@media (max-width: 900px) { .features__grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 600px) { .features__grid { grid-template-columns: 1fr; } }

/* === ANIMATED GRADIENT BORDER === */
.card--glow-border {
  position: relative;
  background: var(--bg-surface);
  border-radius: var(--radius-lg);
}
.card--glow-border::before {
  content: '';
  position: absolute; inset: -1px;
  border-radius: inherit;
  background: linear-gradient(135deg, hsl(265,80%,65%), hsl(190,80%,55%), hsl(310,75%,60%));
  z-index: -1;
  opacity: 0;
  transition: opacity var(--duration-base) ease;
}
.card--glow-border:hover::before { opacity: 1; }

/* === SECTION HEADERS === */
.section-header { text-align: center; max-width: 700px; margin: 0 auto var(--space-3xl); }
.section-label {
  display: inline-block;
  font-size: var(--text-sm); font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase;
  color: var(--accent-primary); margin-bottom: var(--space-md);
}
.section-title {
  font-family: var(--font-display);
  font-size: clamp(var(--text-3xl), 4vw, var(--text-5xl));
  font-weight: 800; line-height: 1.1; letter-spacing: -0.02em;
  color: var(--text-primary); margin-bottom: var(--space-md);
}
.section-subtitle { font-size: var(--text-lg); color: var(--text-secondary); line-height: 1.6; }

/* Sections padding */
.features, .how-it-works, .testimonials { padding: var(--space-4xl) 0; }

/* Alternating section background */
.how-it-works {
  background: linear-gradient(180deg, var(--bg-base) 0%, var(--bg-surface) 50%, var(--bg-base) 100%);
}

/* === ANGULAR CLIP-PATH DIVIDER === */
.section--angled {
  clip-path: polygon(0 4%, 100% 0%, 100% 96%, 0 100%);
  margin: -40px 0;
  padding: calc(var(--space-4xl) + 40px) 0;
}

/* === TESTIMONIAL CARDS === */
.testimonials__grid {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-lg);
}
.testimonial-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-faint);
  border-radius: var(--radius-lg);
  padding: var(--space-xl);
  transition: border-color var(--duration-base) ease;
}
.testimonial-card:hover { border-color: var(--border-glow); }
.testimonial-card__quote {
  font-size: var(--text-base); line-height: 1.7; color: var(--text-secondary);
  font-style: italic; margin-bottom: var(--space-lg);
}
.testimonial-card__quote::before { content: '"'; font-size: var(--text-3xl); color: var(--accent-primary); line-height: 0; vertical-align: -0.4em; margin-right: 4px; }
.testimonial-card__author { display: flex; align-items: center; gap: var(--space-md); }
.testimonial-card__author img { border-radius: 50%; border: 2px solid var(--border-subtle); }
.testimonial-card__name { display: block; font-weight: 600; color: var(--text-primary); }
.testimonial-card__role { font-size: var(--text-sm); color: var(--text-muted); }
@media (max-width: 900px) { .testimonials__grid { grid-template-columns: 1fr; } }

/* === FINAL CTA === */
.cta-final {
  text-align: center; padding: var(--space-4xl) 0;
  background: radial-gradient(ellipse 80% 60% at 50% 50%, hsla(265,60%,30%,0.3), transparent);
  border-top: 1px solid var(--border-faint);
}
.cta-final__title {
  font-family: var(--font-display);
  font-size: clamp(var(--text-4xl), 5vw, var(--text-6xl));
  font-weight: 800; line-height: 1.1; letter-spacing: -0.02em;
  color: var(--text-primary); margin-bottom: var(--space-md);
}
.cta-final__subtitle { font-size: var(--text-xl); color: var(--text-secondary); margin-bottom: var(--space-xl); }
.cta-final__note { font-size: var(--text-sm); color: var(--text-muted); margin-top: var(--space-md); }

/* === FOOTER === */
.footer {
  background: var(--bg-surface); border-top: 1px solid var(--border-faint);
  padding: var(--space-xl) 0;
}
.footer__inner {
  display: flex; align-items: center; gap: var(--space-xl);
  flex-wrap: wrap;
}
.footer__logo { font-family: var(--font-display); font-weight: 700; color: var(--text-primary); }
.footer__nav { display: flex; gap: var(--space-lg); margin-left: auto; }
.footer__nav a { font-size: var(--text-sm); color: var(--text-muted); transition: color var(--duration-fast) ease; }
.footer__nav a:hover { color: var(--text-primary); }
.footer__copy { font-size: var(--text-sm); color: var(--text-muted); }

/* === SCROLL REVEAL ANIMATIONS === */
.reveal {
  animation: fadeUp 0.7s var(--ease-out) both;
}
.reveal-delay-1 { animation-delay: 0.1s; }
.reveal-delay-2 { animation-delay: 0.2s; }
.reveal-delay-3 { animation-delay: 0.3s; }
.reveal-delay-4 { animation-delay: 0.4s; }
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(28px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* === COUNTER ANIMATION (hero stats) === */
.stat-number {
  font-family: var(--font-display); font-size: var(--text-5xl); font-weight: 800;
  background: var(--gradient-brand);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
}

/* === AVATAR GROUP === */
.avatar-group { display: flex; }
.avatar-group img {
  width: 32px; height: 32px; border-radius: 50%;
  border: 2px solid var(--bg-base);
  margin-left: -8px;
}
.avatar-group img:first-child { margin-left: 0; }

/* === STAR RATING === */
.star-rating { color: hsl(45, 100%, 60%); font-size: var(--text-sm); font-weight: 600; }
.star-rating span { color: var(--text-secondary); margin-left: 4px; }

/* === ACCESSIBILITY === */
:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 3px;
  border-radius: var(--radius-sm);
}
.sr-only {
  position: absolute; width: 1px; height: 1px;
  padding: 0; margin: -1px; overflow: hidden;
  clip: rect(0,0,0,0); white-space: nowrap; border: 0;
}

/* === REDUCED MOTION === */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
```

### 2a-extra. Mandatory "Wow" Techniques for Bold & Cinematic

These three techniques are **required** — not optional. They separate a premium landing page from a generic dark dashboard.

#### Animated mesh background (background breathes)

```css
/* Replace the static mesh with an animated one */
.hero__bg--mesh {
  position: absolute; inset: 0; z-index: 0;
  background:
    radial-gradient(ellipse 120% 80% at -15% -10%, hsla(265,70%,55%,0.28), transparent 55%),
    radial-gradient(ellipse 100% 70% at 115%  15%, hsla(190,70%,50%,0.25), transparent 50%),
    radial-gradient(ellipse 120% 80% at  50% 110%, hsla(310,65%,55%,0.2),  transparent 52%),
    linear-gradient(160deg, hsl(240,18%,6%) 0%, hsl(240,15%,10%) 100%);
  background-size: 200% 200%;
  animation: meshDrift 20s ease infinite alternate;
}
@keyframes meshDrift {
  0%   { background-position: 0%   0%; }
  33%  { background-position: 60%  40%; }
  66%  { background-position: 40%  80%; }
  100% { background-position: 100% 100%; }
}

@media (prefers-reduced-motion: reduce) {
  .hero__bg--mesh { animation: none; }
}
```

**HTML usage:**
```html
<section class="hero">
  <div class="hero__bg--mesh" aria-hidden="true"></div>
  <!-- orbs still work on top of this -->
  <div class="hero__decor" aria-hidden="true">
    <div class="orb orb--1"></div>
    <div class="orb orb--2"></div>
  </div>
  <div class="container hero__content"> ... </div>
</section>
```

---

#### Animated gradient text (headline that breathes color)

The headline `<em>` or key phrase has a gradient that slowly shifts — subtle but unmistakably premium.

```css
.gradient-text--animated {
  background: linear-gradient(
    135deg,
    var(--accent-primary),
    hsl(190, 80%, 55%),
    hsl(310, 75%, 65%),
    var(--accent-primary)
  );
  background-size: 300% 300%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  display: inline;
  animation: textGradient 8s ease infinite;
}
@keyframes textGradient {
  0%, 100% { background-position: 0%   50%; }
  50%       { background-position: 100% 50%; }
}

@media (prefers-reduced-motion: reduce) {
  .gradient-text--animated { animation: none; }
}
```

**HTML usage:**
```html
<h1 class="hero__title">
  The fastest way to <em class="gradient-text--animated">ship AI products</em>
</h1>
```

---

#### 3D Card Tilt on hover (cards feel physical)

Cards that tilt toward the cursor. One of the strongest single micro-interactions.

```css
/* CSS: enable GPU compositing and smooth reset */
.feature-card {
  transform-style: preserve-3d;
  transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1),
              box-shadow 0.3s ease;
  will-change: transform;
}
```

```js
// JS: 3D tilt on mousemove, smooth reset on mouseleave
function initCardTilt(selector = '.feature-card') {
  document.querySelectorAll(selector).forEach(card => {
    card.addEventListener('mousemove', e => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width  - 0.5; // -0.5 → +0.5
      const y = (e.clientY - r.top)  / r.height - 0.5;
      card.style.transition = 'none';
      card.style.transform =
        `perspective(700px) rotateY(${x * 14}deg) rotateX(${-y * 14}deg) translateZ(10px)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transition = 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)';
      card.style.transform = '';
    });
  });
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    initCardTilt('.feature-card');
    initCardTilt('.tool-card');
  }
});
```

**Important:** do NOT apply tilt on touch devices:
```js
if (window.matchMedia('(hover: none)').matches) return; // skip on touch
```

---

### 2b. Clean & Luminous (Light, Apple-like)

```css
:root {
  --bg-base:    hsl(0, 0%, 100%);
  --bg-surface: hsl(220, 20%, 97%);
  --bg-sunken:  hsl(220, 15%, 94%);

  --text-primary:   hsl(220, 30%, 10%);
  --text-secondary: hsl(220, 15%, 40%);
  --text-muted:     hsl(220, 10%, 65%);

  --accent-primary: hsl(250, 90%, 58%);
  --accent-light:   hsla(250, 90%, 58%, 0.1);
  --gradient-brand: linear-gradient(135deg, hsl(250,90%,58%), hsl(280,80%,65%));

  --border-faint:  hsl(220, 20%, 92%);
  --border-subtle: hsl(220, 15%, 86%);
  --shadow-sm: 0 1px 3px hsla(220,30%,10%,0.06), 0 4px 16px hsla(220,30%,10%,0.04);
  --shadow-md: 0 4px 12px hsla(220,30%,10%,0.08), 0 16px 40px hsla(220,30%,10%,0.06);
  --shadow-lg: 0 8px 24px hsla(220,30%,10%,0.1),  0 32px 64px hsla(220,30%,10%,0.08);

  /* Same spacing/radius/motion tokens as Bold & Cinematic */
  --font-display: 'Plus Jakarta Sans', sans-serif;
  --font-body:    'Plus Jakarta Sans', sans-serif;
}

/* Header: white with subtle border */
.header {
  background: hsla(0, 0%, 100%, 0.85);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--border-faint);
}

/* Cards with elegant hover */
.feature-card {
  background: var(--bg-base);
  border: 1px solid var(--border-faint);
  border-radius: var(--radius-lg);
  padding: var(--space-xl);
  box-shadow: var(--shadow-sm);
  transition: box-shadow var(--duration-base) ease, transform var(--duration-base) var(--ease-out);
}
.feature-card:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-4px);
}

/* Accent rule under section titles */
.section-title::after {
  content: '';
  display: block;
  width: 48px; height: 3px;
  border-radius: 2px;
  background: var(--gradient-brand);
  margin-top: 12px;
}

/* Soft section background alternation */
.how-it-works { background: var(--bg-surface); }
```
