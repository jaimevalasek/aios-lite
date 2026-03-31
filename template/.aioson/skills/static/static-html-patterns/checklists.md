# Checklists — Section Map & Pre-delivery

> Load when planning which sections to include or doing final QA before delivery.

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
