# Static HTML Patterns — Landing Page Production Guide

> Read this skill when building any landing page (project_type=site).
> This covers structure, modern CSS techniques, performance, and the "wow factor" that makes users stop scrolling.

---

## 0. THE HERO LAW (read this first, it overrides everything)

> **The hero section is NEVER a grid of cards.**
> The hero is: full viewport height — background (animated mesh OR full-bleed photograph) — ONE large headline — ONE or TWO supporting lines — TWO buttons — optional social proof strip below. That is it.
>
> Card grids belong in the Features or Tools section. A hero with cards looks like a dashboard, not a landing page.
>
> For Bold & Cinematic: the hero background must be ALIVE (animated mesh gradient or parallax image).
> For Clean & Luminous: the hero background must have generous whitespace and a large, confident headline.

---

## 1. HTML Structure — The Production Shell

Every landing page follows this semantic skeleton:

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="[real product description]">
  <title>[Product Name] — [Value Proposition]</title>

  <!-- Preload critical fonts (eliminate layout shift) -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=[ChosenFont]:wght@400;500;600;700;800&display=swap" rel="stylesheet">

  <!-- Inline critical CSS (above-the-fold only: reset, header, hero) -->
  <style>
    /* === CRITICAL CSS — inline here, rest in external file === */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html { font-size: 16px; scroll-behavior: smooth; }
    body { font-family: var(--font-body); background: var(--color-bg); color: var(--color-text); -webkit-font-smoothing: antialiased; }
    img { max-width: 100%; display: block; object-fit: cover; }
    a { text-decoration: none; color: inherit; }
    button { cursor: pointer; border: none; font: inherit; }
    /* rest of CSS below */
  </style>
</head>
<body>

  <!-- HEADER: sticky, transparent → solid on scroll -->
  <header class="header" id="header">
    <div class="container header__inner">
      <a href="/" class="header__logo" aria-label="Home">
        <span class="logo-mark">●</span>
        <span class="logo-text">ProductName</span>
      </a>
      <nav class="header__nav" aria-label="Main navigation">
        <a href="#features">Features</a>
        <a href="#how-it-works">How it works</a>
        <a href="#pricing">Pricing</a>
      </nav>
      <a href="#cta" class="btn btn--primary btn--sm">Get started</a>
      <button class="header__burger" aria-label="Open menu" aria-expanded="false">
        <span></span><span></span><span></span>
      </button>
    </div>
  </header>

  <main>
    <!-- HERO: full viewport, image/gradient + content -->
    <section class="hero" aria-labelledby="hero-title">
      <div class="hero__bg">
        <img src="https://images.unsplash.com/photo-[id]?w=1920&q=80&fit=crop"
             alt="" role="presentation" loading="eager" fetchpriority="high">
        <div class="hero__overlay" aria-hidden="true"></div>
      </div>
      <div class="container hero__content">
        <span class="hero__label reveal">Category / Tagline</span>
        <h1 class="hero__title reveal reveal-delay-1" id="hero-title">
          Bold Headline That <em class="gradient-text">Changes Everything</em>
        </h1>
        <p class="hero__subtitle reveal reveal-delay-2">
          Supporting text that adds real context — who benefits, how fast, what outcome.
        </p>
        <div class="hero__actions reveal reveal-delay-3">
          <a href="#signup" class="btn btn--primary btn--lg">Primary CTA</a>
          <a href="#demo" class="btn btn--ghost btn--lg">
            <span class="btn__icon" aria-hidden="true">▶</span>
            Watch demo
          </a>
        </div>
        <div class="hero__social-proof reveal reveal-delay-4">
          <span>Trusted by 2,000+ teams</span>
          <div class="avatar-group" aria-label="User avatars">
            <img src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=40&h=40&fit=crop&crop=face" alt="User" width="40" height="40">
            <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=40&h=40&fit=crop&crop=face" alt="User" width="40" height="40">
            <img src="https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=40&h=40&fit=crop&crop=face" alt="User" width="40" height="40">
          </div>
          <div class="star-rating" aria-label="5 out of 5 stars">★★★★★ <span>4.9</span></div>
        </div>
      </div>
      <!-- Decorative floating elements (aria-hidden) -->
      <div class="hero__decor" aria-hidden="true">
        <div class="orb orb--1"></div>
        <div class="orb orb--2"></div>
        <div class="orb orb--3"></div>
      </div>
    </section>

    <!-- LOGOS: social proof bar -->
    <section class="logos-bar" aria-label="Trusted by">
      <div class="container">
        <p class="logos-bar__label">Trusted by teams at</p>
        <div class="logos-bar__track">
          <!-- Logo images or text placeholders -->
        </div>
      </div>
    </section>

    <!-- FEATURES: 3 or 6 cards in grid -->
    <section class="features" id="features" aria-labelledby="features-title">
      <div class="container">
        <div class="section-header">
          <span class="section-label">Features</span>
          <h2 class="section-title" id="features-title">Everything you need</h2>
          <p class="section-subtitle">One sentence expanding on the value.</p>
        </div>
        <div class="features__grid">
          <article class="feature-card reveal">
            <div class="feature-card__icon" aria-hidden="true">⚡</div>
            <h3 class="feature-card__title">Feature Name</h3>
            <p class="feature-card__desc">What it does and why it matters to the user.</p>
          </article>
          <!-- repeat 5 more -->
        </div>
      </div>
    </section>

    <!-- HOW IT WORKS: numbered steps, alternating layout -->
    <section class="how-it-works" id="how-it-works" aria-labelledby="hiw-title">
      <div class="container">
        <div class="section-header">
          <span class="section-label">Process</span>
          <h2 class="section-title" id="hiw-title">How it works</h2>
        </div>
        <ol class="steps" role="list">
          <li class="step reveal">
            <span class="step__number" aria-hidden="true">01</span>
            <div class="step__content">
              <h3>Step title</h3>
              <p>Explanation focused on what the user does and gets.</p>
            </div>
            <div class="step__visual">
              <img src="https://images.unsplash.com/photo-[id]?w=600&q=80" alt="[descriptive alt]" loading="lazy">
            </div>
          </li>
        </ol>
      </div>
    </section>

    <!-- TESTIMONIALS -->
    <section class="testimonials" aria-labelledby="testimonials-title">
      <div class="container">
        <h2 class="section-title" id="testimonials-title">What teams say</h2>
        <div class="testimonials__grid">
          <blockquote class="testimonial-card reveal">
            <p class="testimonial-card__quote">"Specific outcome they achieved using the product."</p>
            <footer class="testimonial-card__author">
              <img src="https://images.unsplash.com/photo-[id]?w=48&h=48&fit=crop&crop=face"
                   alt="[Name]" width="48" height="48" loading="lazy">
              <div>
                <cite class="testimonial-card__name">Full Name</cite>
                <span class="testimonial-card__role">Role, Company</span>
              </div>
            </footer>
          </blockquote>
        </div>
      </div>
    </section>

    <!-- FINAL CTA -->
    <section class="cta-final" id="cta" aria-labelledby="cta-title">
      <div class="container">
        <h2 class="cta-final__title reveal" id="cta-title">Ready to get started?</h2>
        <p class="cta-final__subtitle reveal reveal-delay-1">Join thousands of teams already using [Product].</p>
        <a href="#signup" class="btn btn--primary btn--xl reveal reveal-delay-2">Start for free</a>
        <p class="cta-final__note">No credit card required · Cancel anytime</p>
      </div>
    </section>
  </main>

  <footer class="footer" role="contentinfo">
    <div class="container footer__inner">
      <a href="/" class="footer__logo" aria-label="Home">ProductName</a>
      <nav class="footer__nav" aria-label="Footer navigation">
        <a href="/privacy">Privacy</a>
        <a href="/terms">Terms</a>
        <a href="/contact">Contact</a>
      </nav>
      <p class="footer__copy">© 2026 ProductName. All rights reserved.</p>
    </div>
  </footer>

  <!-- Scripts: async, non-blocking -->
  <script async src="main.js"></script>
</body>
</html>
```

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

## 9. GSAP Animations — Production Patterns (AI Agency / SaaS style)

Source: Aigocy / GSAP ScrollTrigger — gsap.com/docs/v3/Plugins/ScrollTrigger

### Setup

```html
<script src="https://cdn.jsdelivr.net/npm/gsap@3/dist/gsap.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3/dist/ScrollTrigger.min.js" defer></script>
```

```js
// Register plugin once
gsap.registerPlugin(ScrollTrigger);
```

### Reusable animation helpers (add to main.js)

```js
// 1. Reveal elements on scroll (fade + translateY)
function revealOnScroll(selector, options = {}) {
  const els = document.querySelectorAll(selector);
  if (!els.length) return;
  gsap.fromTo(els,
    { opacity: 0, y: options.y ?? 40 },
    {
      opacity: 1, y: 0,
      duration: options.duration ?? 0.7,
      ease: 'power3.out',
      stagger: options.stagger ?? 0.1,
      scrollTrigger: {
        trigger: els[0].closest('section') ?? els[0],
        start: 'top 80%',
        once: true,
      }
    }
  );
}

// 2. Hero intro sequence (run on load, not scroll)
function heroIntroTimeline() {
  return gsap.timeline({ delay: 0.2 })
    .from('.hero__label',    { opacity: 0, y: 20, duration: 0.5, ease: 'power2.out' })
    .from('.hero__title',    { opacity: 0, y: 30, duration: 0.7, ease: 'power3.out' }, '-=0.2')
    .from('.hero__subtitle', { opacity: 0, y: 20, duration: 0.6, ease: 'power2.out' }, '-=0.4')
    .from('.hero__actions',  { opacity: 0, y: 20, duration: 0.5, ease: 'power2.out' }, '-=0.3')
    .from('.hero__social-proof', { opacity: 0, duration: 0.4 }, '-=0.2');
}

// 3. Card grid stagger (features, services, team)
function cardsStaggerIn(sectionSelector) {
  const section = document.querySelector(sectionSelector);
  if (!section) return;
  gsap.fromTo(section.querySelectorAll('.card, .feature-card, .service-card'),
    { opacity: 0, y: 50, scale: 0.97 },
    {
      opacity: 1, y: 0, scale: 1,
      duration: 0.6, ease: 'power3.out', stagger: 0.1,
      scrollTrigger: { trigger: section, start: 'top 75%', once: true }
    }
  );
}

// 4. Light parallax on hero background
function parallaxLight(selector) {
  gsap.to(selector, {
    yPercent: 30,
    ease: 'none',
    scrollTrigger: { trigger: selector, start: 'top top', end: 'bottom top', scrub: true }
  });
}

// 5. Counter animation (stats section)
function animateCounters() {
  document.querySelectorAll('[data-counter]').forEach(el => {
    const target = +el.dataset.counter;
    ScrollTrigger.create({
      trigger: el, start: 'top 85%', once: true,
      onEnter: () => {
        gsap.fromTo(el,
          { textContent: 0 },
          {
            textContent: target, duration: 1.5, ease: 'power2.out',
            snap: { textContent: 1 },
            onUpdate() { el.textContent = Math.round(+el.textContent).toLocaleString(); }
          }
        );
      }
    });
  });
}

// 6. Animated gradient border on hover (section highlight)
function initGlowCards() {
  document.querySelectorAll('.card--glow-border').forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width  * 100).toFixed(1);
      const y = ((e.clientY - rect.top)  / rect.height * 100).toFixed(1);
      card.style.setProperty('--mouse-x', `${x}%`);
      card.style.setProperty('--mouse-y', `${y}%`);
    });
  });
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  heroIntroTimeline();
  revealOnScroll('.section-header', { y: 30 });
  revealOnScroll('.step', { stagger: 0.15 });
  revealOnScroll('.testimonial-card', { stagger: 0.1 });
  revealOnScroll('.cta-final__title', { y: 20 });
  cardsStaggerIn('.features');
  cardsStaggerIn('.services');
  parallaxLight('.hero__bg img');
  animateCounters();
  initGlowCards();
});
```

### Anti-patterns to avoid
- Do NOT put all scroll animations in one giant master timeline
- Do NOT animate `width`, `height`, or `padding` — only `transform` and `opacity`
- Do NOT run heavy GSAP work in `scroll` event — always use ScrollTrigger
- Always `once: true` for entrance animations (don't re-trigger on scroll up)
- Disable GSAP on `prefers-reduced-motion`:

```js
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  gsap.globalTimeline.timeScale(0); // or skip init entirely
}
```

---

## 10. Swiper Sliders — Production Patterns

Source: swiperjs.com/swiper-api

### CDN

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css">
<script src="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js" defer></script>
```

### HTML Structure

```html
<div class="swiper testimonials-swiper" data-swiper-options='{"slidesPerView":1,"spaceBetween":24}'>
  <div class="swiper-wrapper">
    <div class="swiper-slide"><!-- content --></div>
    <div class="swiper-slide"><!-- content --></div>
  </div>
  <div class="swiper-pagination" aria-hidden="true"></div>
  <button class="swiper-button-prev" aria-label="Previous slide"></button>
  <button class="swiper-button-next" aria-label="Next slide"></button>
</div>
```

### Universal Init (handles multiple sliders via data-attribute)

```js
document.querySelectorAll('.swiper').forEach(el => {
  const options = el.dataset.swiperOptions ? JSON.parse(el.dataset.swiperOptions) : {};
  new Swiper(el, {
    loop: true,
    navigation: { nextEl: el.querySelector('.swiper-button-next'), prevEl: el.querySelector('.swiper-button-prev') },
    pagination: { el: el.querySelector('.swiper-pagination'), clickable: true },
    a11y: { prevSlideMessage: 'Previous slide', nextSlideMessage: 'Next slide' },
    breakpoints: {
      768:  { slidesPerView: 2, spaceBetween: 24 },
      1024: { slidesPerView: 3, spaceBetween: 32 },
    },
    ...options, // data-attribute options override defaults
  });
});
```

### CSS: fix slider CLS (layout shift)

```css
.swiper { overflow: hidden; }
.swiper-wrapper { display: flex; align-items: stretch; }
.swiper-slide { height: auto; } /* equal height cards */
```

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

---

## 12. Full Section Checklist (AI / SaaS Landing Page)

For complete AI agency or SaaS landing pages, include these sections in order:

| # | Section | Purpose |
|---|---|---|
| 1 | Header (sticky) | Logo + nav + CTA button |
| 2 | Hero | Headline + sub + 2 CTAs + social proof |
| 3 | Logos bar | "Trusted by" brand names |
| 4 | Features grid | 3–6 cards with icon + title + description |
| 5 | How it works | 3 numbered steps with image alternation |
| 6 | Services | Cards with deeper service descriptions |
| 7 | Stats / Numbers | Animated counters (clients, projects, uptime) |
| 8 | Case studies | Portfolio cards with hover image reveal |
| 9 | Testimonials | Swiper slider with quotes + avatars |
| 10 | Pricing | 3-tier cards with "Most popular" badge |
| 11 | FAQ | Accordion with open/close animation |
| 12 | Final CTA | Single button, urgency, no distractions |
| 13 | Footer | Dense: links + social + newsletter + copyright |

**For MICRO landing pages (single page, simple product):** sections 1, 2, 4, 9, 12, 13.

---

## 13. Pre-delivery Checklist

- [ ] Mobile menu opens/closes, body scroll locked when open
- [ ] Sliders have correct breakpoints and accessible buttons
- [ ] GSAP scroll animations work on mobile (use `start: 'top 85%'` for shorter viewports)
- [ ] Hero image loads eagerly with `fetchpriority="high"`, all others `loading="lazy"`
- [ ] No layout shift (CLS): img/video elements have explicit width+height
- [ ] `prefers-reduced-motion: reduce` disables all animations
- [ ] All interactive elements reachable by keyboard
- [ ] Color contrast ≥ 4.5:1 checked
- [ ] `<title>` and `<meta description>` are real content (not placeholders)
- [ ] Open Graph meta tags present (`og:title`, `og:description`, `og:image`)
- [ ] No placeholder text remains anywhere in the HTML

---

## 14. Premium Template Patterns (Aigocy-style)

Real patterns extracted from a production AI agency template (ThemeForest #61450410).
Use these to elevate landing pages from "nice" to "award-worthy".

---

### 14a. effectFade Animations (signature 3D entrance)

Two animation modes used by the Aigocy template — add these classes to any element
and trigger via GSAP ScrollTrigger or IntersectionObserver.

**HTML markup:**
```html
<!-- Simple fade up — most common -->
<h2 class="effectFade fadeUp" data-delay="0">Headline</h2>
<p class="effectFade fadeUp" data-delay="0.15">Supporting text</p>

<!-- 3D perspective rotate — signature "cinematic" entrance -->
<div class="effectFade fadeRotateX" data-delay="0.1">Card content</div>
```

**CSS:**
```css
/* Base state (invisible, ready to animate in) */
.effectFade { opacity: 0; }
.effectFade.fadeUp { transform: translateY(50px); }
.effectFade.fadeRotateX {
  transform: perspective(800px) rotateX(25deg) translateY(40px);
  transform-origin: 50% 0%;
}

/* Animated state (JS adds .animated class) */
.effectFade.animated {
  opacity: 1;
  transform: none;
  transition: opacity 0.7s ease, transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
}
```

**JS (GSAP + data-delay stagger):**
```js
// Use data-delay for precise per-element stagger control
gsap.utils.toArray('.effectFade').forEach(el => {
  const delay = parseFloat(el.dataset.delay ?? '0');
  gsap.fromTo(el,
    { opacity: 0, y: el.classList.contains('fadeUp') ? 50 : 0,
      rotateX: el.classList.contains('fadeRotateX') ? 25 : 0,
      transformPerspective: 800, transformOrigin: '50% 0%' },
    {
      opacity: 1, y: 0, rotateX: 0,
      duration: 0.8, delay, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 85%', once: true }
    }
  );
});
```

---

### 14b. Infinite Logo Marquee (CSS only, no library)

Infinitely scrolling partner/client logo bar. Works with just CSS — no JS needed.
Duplicating the list items (`data-clone` attribute in Aigocy) prevents gaps.

**HTML:**
```html
<section class="logos-marquee" aria-label="Trusted by">
  <div class="marquee-track">
    <!-- Original items -->
    <ul class="marquee-list" aria-hidden="false">
      <li><img src="logo-1.svg" alt="Company A" height="32"></li>
      <li><img src="logo-2.svg" alt="Company B" height="32"></li>
      <li><img src="logo-3.svg" alt="Company C" height="32"></li>
      <li><img src="logo-4.svg" alt="Company D" height="32"></li>
      <li><img src="logo-5.svg" alt="Company E" height="32"></li>
    </ul>
    <!-- Cloned items for seamless loop (aria-hidden) -->
    <ul class="marquee-list" aria-hidden="true">
      <!-- same items, duplicated -->
    </ul>
  </div>
</section>
```

**CSS:**
```css
.logos-marquee { overflow: hidden; padding: var(--space-xl) 0; }

.marquee-track {
  display: flex;
  width: max-content;
  animation: infiniteSlide 24s linear infinite;
}

.marquee-list {
  display: flex; align-items: center; gap: 64px;
  list-style: none; padding: 0 32px;
}

.marquee-list img {
  height: 32px; width: auto;
  filter: grayscale(1) opacity(0.5);
  transition: filter 0.3s ease;
}
.marquee-list img:hover {
  filter: grayscale(0) opacity(1);
}

@keyframes infiniteSlide {
  from { transform: translateX(0); }
  to   { transform: translateX(-50%); } /* -50% because track = 2× list width */
}

/* Pause on hover for accessibility */
.logos-marquee:hover .marquee-track { animation-play-state: paused; }

@media (prefers-reduced-motion: reduce) {
  .marquee-track { animation: none; }
}
```

**JS (optional: auto-clone):**
```js
// Auto-clone the list so you only maintain one set of logos in HTML
document.querySelectorAll('.marquee-track').forEach(track => {
  const list = track.querySelector('.marquee-list');
  const clone = list.cloneNode(true);
  clone.setAttribute('aria-hidden', 'true');
  track.appendChild(clone);
});
```

---

### 14c. SVG Animated Paths (hub-and-spoke diagram)

Dots traveling along SVG paths connecting a center image to surrounding icons.
Pure SMIL animation — no JS or GSAP needed. Great for "how it works" or "integrations" sections.

**HTML:**
```html
<div class="tools-hub" aria-hidden="true">
  <!-- Center image -->
  <div class="hub-center">
    <img src="product-logo.svg" alt="">
  </div>

  <!-- Surrounding tool icons (positioned absolutely) -->
  <div class="tool-item tool-item--1"><img src="icon-1.svg" alt=""></div>
  <div class="tool-item tool-item--2"><img src="icon-2.svg" alt=""></div>
  <div class="tool-item tool-item--3"><img src="icon-3.svg" alt=""></div>

  <!-- SVG paths with animated dots -->
  <svg class="hub-svg" viewBox="0 0 600 600" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Path from center to tool-1 -->
    <path id="path-1" d="M300 300 C 240 240, 160 200, 100 160" stroke="hsla(265,80%,65%,0.3)" stroke-width="1" fill="none"/>
    <circle r="4" fill="hsl(265,80%,65%)">
      <animateMotion dur="3s" repeatCount="indefinite" begin="0s">
        <mpath href="#path-1"/>
      </animateMotion>
    </circle>

    <!-- Path from center to tool-2 -->
    <path id="path-2" d="M300 300 C 360 240, 440 200, 500 160" stroke="hsla(265,80%,65%,0.3)" stroke-width="1" fill="none"/>
    <circle r="4" fill="hsl(310,75%,60%)">
      <animateMotion dur="4s" repeatCount="indefinite" begin="1s">
        <mpath href="#path-2"/>
      </animateMotion>
    </circle>
  </svg>
</div>
```

**CSS:**
```css
.tools-hub {
  position: relative; width: 600px; height: 600px;
  margin: 0 auto;
}
.hub-center {
  position: absolute; top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  width: 120px; height: 120px;
  border-radius: 50%;
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  display: flex; align-items: center; justify-content: center;
}
.tool-item {
  position: absolute;
  width: 64px; height: 64px;
  border-radius: var(--radius-md);
  background: var(--bg-elevated);
  border: 1px solid var(--border-faint);
  display: flex; align-items: center; justify-content: center;
}
/* Position items around the hub */
.tool-item--1 { top: 8%;  left: 8%; }
.tool-item--2 { top: 8%;  right: 8%; }
.tool-item--3 { bottom: 8%; left: 50%; transform: translateX(-50%); }

.hub-svg {
  position: absolute; inset: 0;
  width: 100%; height: 100%;
  pointer-events: none;
}

@media (max-width: 768px) { .tools-hub { display: none; } /* hide on mobile */ }
```

---

### 14d. Scroll-to-top with Circular Progress

A back-to-top button that shows reading progress as a circular arc.
Uses a CSS custom property `--progress-angle` updated by JS.

**HTML:**
```html
<button class="scroll-top" id="goTop" aria-label="Back to top" title="Back to top">
  <svg class="scroll-top__ring" viewBox="0 0 48 48" aria-hidden="true">
    <circle class="scroll-top__track" cx="24" cy="24" r="20" fill="none" stroke-width="2"/>
    <circle class="scroll-top__progress" cx="24" cy="24" r="20" fill="none" stroke-width="2"
            style="stroke-dasharray: 125.66; stroke-dashoffset: var(--dash-offset, 125.66)"/>
  </svg>
  <span class="scroll-top__icon" aria-hidden="true">↑</span>
</button>
```

**CSS:**
```css
.scroll-top {
  position: fixed; bottom: 32px; right: 32px; z-index: 50;
  width: 48px; height: 48px;
  border-radius: 50%;
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  display: flex; align-items: center; justify-content: center;
  opacity: 0; pointer-events: none;
  transition: opacity 0.3s ease, transform 0.2s ease;
}
.scroll-top.visible { opacity: 1; pointer-events: auto; }
.scroll-top:hover { transform: translateY(-2px); }

.scroll-top__ring {
  position: absolute; inset: 0;
  transform: rotate(-90deg); /* start progress from top */
}
.scroll-top__track { stroke: var(--border-faint); }
.scroll-top__progress {
  stroke: var(--accent-primary);
  transition: stroke-dashoffset 0.1s linear;
}
.scroll-top__icon {
  font-size: 18px; font-weight: 700;
  color: var(--text-primary); line-height: 1;
}
```

**JS:**
```js
const goTop = document.getElementById('goTop');
const progressCircle = goTop?.querySelector('.scroll-top__progress');
const circumference = 125.66; // 2π × r (r=20)

window.addEventListener('scroll', () => {
  const scrolled = window.scrollY;
  const total = document.body.scrollHeight - window.innerHeight;
  const progress = scrolled / total;
  const offset = circumference * (1 - progress);

  goTop?.classList.toggle('visible', scrolled > 300);
  progressCircle?.style.setProperty('--dash-offset', offset);
}, { passive: true });

goTop?.addEventListener('click', () =>
  window.scrollTo({ top: 0, behavior: 'smooth' })
);
```

---

### 14e. Split Swiper (synchronized text + image sliders)

Two separate Swiper instances that scroll together — one shows testimonial text,
the other shows the matching portrait. Classic premium agency pattern.

**HTML:**
```html
<section class="split-testimonials">
  <div class="container split-testimonials__grid">
    <!-- Left: text slides -->
    <div class="swiper testimonials-text-swiper">
      <div class="swiper-wrapper">
        <div class="swiper-slide">
          <blockquote class="split-quote">
            <p>"This is the most impactful tool we've adopted this year. Our team velocity doubled."</p>
            <footer>
              <cite class="split-quote__name">Maria Silva</cite>
              <span class="split-quote__role">CTO, Acme Corp</span>
            </footer>
          </blockquote>
        </div>
        <!-- more slides -->
      </div>
      <div class="split-testimonials__controls">
        <button class="swiper-button-prev" aria-label="Previous testimonial"></button>
        <div class="swiper-pagination"></div>
        <button class="swiper-button-next" aria-label="Next testimonial"></button>
      </div>
    </div>

    <!-- Right: image slides (synchronized) -->
    <div class="swiper testimonials-image-swiper">
      <div class="swiper-wrapper">
        <div class="swiper-slide">
          <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=480&h=560&fit=crop&crop=face"
               alt="Maria Silva" loading="lazy">
        </div>
        <!-- more slides -->
      </div>
    </div>
  </div>
</section>
```

**CSS:**
```css
.split-testimonials__grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3xl);
  align-items: center;
}
.split-quote p {
  font-size: var(--text-xl); line-height: 1.7;
  color: var(--text-secondary); font-style: italic;
  margin-bottom: var(--space-xl);
}
.split-quote::before { content: '"'; font-size: 80px; color: var(--accent-primary); line-height: 0.6; display: block; }
.split-quote__name { display: block; font-weight: 700; color: var(--text-primary); }
.split-quote__role { font-size: var(--text-sm); color: var(--text-muted); }

.testimonials-image-swiper img {
  border-radius: var(--radius-lg); width: 100%; height: 480px; object-fit: cover;
}

.split-testimonials__controls {
  display: flex; align-items: center; gap: var(--space-md); margin-top: var(--space-xl);
}

@media (max-width: 768px) {
  .split-testimonials__grid { grid-template-columns: 1fr; }
  .testimonials-image-swiper { display: none; }
}
```

**JS:**
```js
const textSwiper = new Swiper('.testimonials-text-swiper', {
  loop: true,
  navigation: {
    nextEl: '.testimonials-text-swiper .swiper-button-next',
    prevEl: '.testimonials-text-swiper .swiper-button-prev',
  },
  pagination: { el: '.testimonials-text-swiper .swiper-pagination', clickable: true },
});

const imageSwiper = new Swiper('.testimonials-image-swiper', {
  loop: true,
  allowTouchMove: false,  // image slider is controlled only by text slider
  effect: 'fade', fadeEffect: { crossFade: true },
});

// Synchronize: text controls image
textSwiper.on('slideChange', () => {
  imageSwiper.slideTo(textSwiper.realIndex);
});
```

---

### 14f. Swiper with Progress Bar Navigation

Instead of dots, show a thin animated progress bar for long testimonial or case study sliders.

**HTML:**
```html
<div class="swiper portfolio-swiper">
  <div class="swiper-wrapper">
    <!-- slides -->
  </div>
  <div class="swiper-progress-bar" aria-hidden="true">
    <div class="swiper-progress-fill"></div>
  </div>
  <div class="swiper-nav">
    <button class="swiper-button-prev" aria-label="Previous"></button>
    <button class="swiper-button-next" aria-label="Next"></button>
  </div>
</div>
```

**CSS:**
```css
.swiper-progress-bar {
  width: 100%; height: 2px;
  background: var(--border-faint); border-radius: 2px;
  margin-top: var(--space-lg); overflow: hidden;
}
.swiper-progress-fill {
  height: 100%; background: var(--accent-primary);
  border-radius: 2px;
  transition: width 0.3s ease;
}
```

**JS:**
```js
const slider = new Swiper('.portfolio-swiper', {
  loop: false,
  navigation: {
    nextEl: '.portfolio-swiper .swiper-button-next',
    prevEl: '.portfolio-swiper .swiper-button-prev',
  },
  on: {
    init(swiper) { updateProgress(swiper); },
    slideChange(swiper) { updateProgress(swiper); },
  },
});

function updateProgress(swiper) {
  const fill = document.querySelector('.swiper-progress-fill');
  if (!fill) return;
  const pct = ((swiper.activeIndex + 1) / swiper.slides.length) * 100;
  fill.style.width = pct + '%';
}
```

---

### 14g. box-white / box-black Section Alternation

Aigocy alternates full-width section containers between dark (`box-black`) and light (`box-white`)
with decorative gradient glow images for depth. This creates the "cinematic layer cake" effect.

**HTML:**
```html
<div class="box-black">
  <img class="light-top" src="light-bg-top.png" alt="" aria-hidden="true">
  <section class="features"> ... </section>
  <img class="light-bot" src="light-bg-bot.png" alt="" aria-hidden="true">
</div>

<div class="box-white">
  <section class="how-it-works"> ... </section>
</div>
```

**CSS (generate glow with CSS instead of images):**
```css
.box-black {
  background: var(--bg-base);
  position: relative; overflow: hidden;
}
.box-white {
  background: var(--bg-surface);
  position: relative; overflow: hidden;
}

/* Decorative ambient glow (replaces light-top/light-bot PNG images) */
.box-black::before {
  content: '';
  position: absolute; top: -200px; left: 50%;
  transform: translateX(-50%);
  width: 800px; height: 400px;
  background: radial-gradient(ellipse at center,
    hsla(265,60%,40%,0.15) 0%,
    transparent 70%
  );
  pointer-events: none; z-index: 0;
}
.box-black::after {
  content: '';
  position: absolute; bottom: -200px; left: 50%;
  transform: translateX(-50%);
  width: 800px; height: 400px;
  background: radial-gradient(ellipse at center,
    hsla(265,60%,40%,0.1) 0%,
    transparent 70%
  );
  pointer-events: none; z-index: 0;
}

/* Ensure section content is above glow */
.box-black > section, .box-white > section { position: relative; z-index: 1; }
```

---

### 14h. Accordion FAQ (Bootstrap collapse pattern)

Clean accordion FAQ that works without JS library if you use the native `<details>` element,
or with Bootstrap's collapse for richer animations.

**HTML (native, no-library version):**
```html
<section class="faq" id="faq" aria-labelledby="faq-title">
  <div class="container">
    <div class="section-header">
      <span class="section-label">FAQ</span>
      <h2 class="section-title" id="faq-title">Common questions</h2>
    </div>
    <div class="faq__list">
      <details class="faq__item">
        <summary class="faq__question">
          How long does setup take?
          <span class="faq__icon" aria-hidden="true">+</span>
        </summary>
        <div class="faq__answer">
          <p>Setup takes under 5 minutes. Connect your account, configure your first workflow, and you're live.</p>
        </div>
      </details>
      <!-- repeat -->
    </div>
  </div>
</section>
```

**CSS:**
```css
.faq__list { max-width: 800px; margin: 0 auto; }

.faq__item {
  border-bottom: 1px solid var(--border-faint);
  padding: var(--space-lg) 0;
}
.faq__item:first-child { border-top: 1px solid var(--border-faint); }

.faq__question {
  display: flex; justify-content: space-between; align-items: center;
  font-size: var(--text-lg); font-weight: 600;
  color: var(--text-primary); cursor: pointer;
  list-style: none; /* hide default marker */
}
.faq__question::-webkit-details-marker { display: none; }

.faq__icon {
  font-size: var(--text-xl); font-weight: 300;
  color: var(--accent-primary);
  transition: transform var(--duration-base) var(--ease-out);
  flex-shrink: 0; margin-left: var(--space-lg);
}
details[open] .faq__icon { transform: rotate(45deg); }

.faq__answer {
  padding-top: var(--space-md);
}
.faq__answer p {
  font-size: var(--text-base); color: var(--text-secondary); line-height: 1.7;
}
```

---

### 14i. Footer with Watermark Background Logo

Premium footer pattern: brand name as a large faded watermark behind footer content,
with dense 3-column layout (links / copyright / social).

**HTML:**
```html
<footer class="footer" role="contentinfo">
  <div class="footer__watermark" aria-hidden="true">ProductName</div>
  <div class="container footer__body">
    <div class="footer__col footer__col--links">
      <strong>Product</strong>
      <a href="#">Features</a>
      <a href="#">Pricing</a>
      <a href="#">Docs</a>
    </div>
    <div class="footer__col footer__col--center">
      <a href="/" class="footer__logo" aria-label="Home">
        <img src="logo.svg" alt="ProductName" height="32">
      </a>
      <p class="footer__copy">© 2026 ProductName, Inc. All rights reserved.</p>
    </div>
    <div class="footer__col footer__col--social">
      <strong>Follow us</strong>
      <div class="footer__social">
        <a href="#" aria-label="Twitter" class="social-link">
          <svg width="20" height="20" aria-hidden="true"><!-- twitter icon --></svg>
          Twitter
        </a>
        <a href="#" aria-label="LinkedIn" class="social-link">
          <svg width="20" height="20" aria-hidden="true"><!-- linkedin icon --></svg>
          LinkedIn
        </a>
      </div>
    </div>
  </div>
</footer>
```

**CSS:**
```css
.footer {
  position: relative; overflow: hidden;
  background: var(--bg-surface);
  border-top: 1px solid var(--border-faint);
  padding: var(--space-3xl) 0 var(--space-xl);
}

/* Faded watermark behind content */
.footer__watermark {
  position: absolute; bottom: -20px; left: 50%;
  transform: translateX(-50%);
  font-family: var(--font-display); font-size: clamp(80px, 15vw, 160px);
  font-weight: 900; line-height: 1;
  color: var(--text-primary); opacity: 0.04;
  white-space: nowrap; pointer-events: none; user-select: none;
}

.footer__body {
  display: grid; grid-template-columns: 1fr auto 1fr;
  gap: var(--space-xl); align-items: start;
  position: relative; z-index: 1;
}
.footer__col { display: flex; flex-direction: column; gap: var(--space-sm); }
.footer__col--center { text-align: center; align-items: center; }
.footer__col--social { align-items: flex-end; }

.footer__col strong {
  font-size: var(--text-sm); font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.08em; color: var(--text-primary); margin-bottom: var(--space-xs);
}
.footer__col a {
  font-size: var(--text-sm); color: var(--text-muted);
  transition: color var(--duration-fast) ease;
}
.footer__col a:hover { color: var(--text-primary); }

.social-link {
  display: flex; align-items: center; gap: var(--space-sm);
}

.footer__copy {
  font-size: var(--text-sm); color: var(--text-muted); margin-top: var(--space-md);
}

@media (max-width: 768px) {
  .footer__body { grid-template-columns: 1fr; text-align: center; }
  .footer__col--social { align-items: center; }
  .footer__watermark { display: none; }
}
```

---

### 14j. Canvas Cursor Trail (optional, cinematic touch)

A subtle canvas trail that follows the cursor — drawn as fading dots.
Only activate for Bold & Cinematic direction, and skip on touch devices.

```js
// Add <canvas id="cursorTrail" style="position:fixed;inset:0;pointer-events:none;z-index:9999"></canvas>
// to <body> to use this.

(function initCursorTrail() {
  if (window.matchMedia('(hover: none)').matches) return; // skip on touch
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const canvas = document.getElementById('cursorTrail');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  });

  const dots = [];
  const MAX_DOTS = 20;
  const COLOR = 'hsla(265, 80%, 65%,';

  window.addEventListener('mousemove', (e) => {
    dots.push({ x: e.clientX, y: e.clientY, alpha: 1 });
    if (dots.length > MAX_DOTS) dots.shift();
  }, { passive: true });

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    dots.forEach((dot, i) => {
      const size = (i / dots.length) * 8 + 2;
      dot.alpha = (i / dots.length) * 0.6;
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, size, 0, Math.PI * 2);
      ctx.fillStyle = `${COLOR}${dot.alpha})`;
      ctx.fill();
    });
    requestAnimationFrame(draw);
  }
  draw();
})();
```
