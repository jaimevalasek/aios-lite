# Structure — HTML Production Shell

> Load when building any landing page. Contains the Hero Law and the complete semantic HTML skeleton.

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
