# Motion — pt.squarespace.com

## Motion Philosophy

CSS-first, no third-party animation libraries. All animations implemented via `@keyframes` + class toggling + `IntersectionObserver`. Fast micro-interactions (300–500ms), slow scroll reveals (800–1200ms). Easing is smooth deceleration (`cubic-bezier(0.23, 1, 0.32, 1)`) for reveals and power (`cubic-bezier(0.645, 0.045, 0.355, 1)`) for CTA interactions.

**No GSAP. No Framer Motion. No AOS. No Lottie.** Pure CSS + vanilla JS.

---

## Timing Functions

| Token | Value | Usage |
|-------|-------|-------|
| `--ease-default` | `cubic-bezier(0.455, 0.03, 0.515, 0.955)` | General transitions |
| `--ease-sqsp-reveal` | `cubic-bezier(0.23, 1, 0.32, 1)` | Scroll reveals, stats (the Squarespace signature ease) |
| `--ease-sqsp-cta` | `cubic-bezier(0.645, 0.045, 0.355, 1)` | CTA hover, mobile menu, dropdowns |
| `--ease-sqsp-menu` | `cubic-bezier(0.165, 0.84, 0.44, 1)` | Mobile menu swipe, accordion |
| `--ease-out` | `ease-out` | Exit animations |

## Durations

| Token | Value | Usage |
|-------|-------|-------|
| `--transition-fast` | `100ms` | Micro color changes |
| `--transition-base` | `200ms` | Standard hover |
| `--transition-medium` | `300ms` | Nav dropdowns, CTA hover overlay |
| `--transition-slow` | `400ms` | Layout transitions |
| `--transition-reveal` | `800ms` | Scroll-triggered section reveals |
| `--transition-reveal-slow` | `1200ms` | Stats card reveal |

---

## Extracted @keyframes (verbatim from pt.squarespace.com/css/index.css)

### fadeIn
```css
@keyframes fadeIn {
  0% { opacity: 0; }
  to { opacity: 1; }
}
```
**Used on:** `.stats__card` — `1.2s cubic-bezier(0.23, 1, 0.32, 1) forwards`

---

### ctaUnderlineSlideIn / ctaUnderlineSlideOut
```css
@keyframes ctaUnderlineSlideIn {
  0% { background-position: -200% 100%, -100% 100%; }
  to { background-position: 0 100%, 100% 100%; }
}
@keyframes ctaUnderlineSlideOut {
  0% { background-position: 0 100%, 100% 100%; }
  to { background-position: 210% 100%, 300% 100%; }
}
```
**Used on:** `.cta--tertiary` (text links with sliding underline)
- Rest state: `0.5s cubic-bezier(0.645, 0.045, 0.355, 1) forwards ctaUnderlineSlideOut`
- Hover state: `0.5s cubic-bezier(0.645, 0.045, 0.355, 1) forwards ctaUnderlineSlideIn`
- Requires `background-image: linear-gradient(currentColor, currentColor), linear-gradient(currentColor, currentColor)`

---

### swipeIn / swipeOut
```css
@keyframes swipeIn {
  0% { clip-path: polygon(101% 0%, 100% 0%, 101% 100%, 116% 100%); }
  to { clip-path: polygon(0% 0%, 101% 0%, 101% 101%, 0% 101%); }
}
@keyframes swipeOut {
  0% { clip-path: polygon(0% 0%, 101% 0%, 101% 101%, 0% 101%); }
  to { clip-path: polygon(105% 0%, 100% 0%, 101% 100%, 100% 100%); }
}
```
**Used on:** `.global-navigation__mobile-menu`
- Open: `0.6s cubic-bezier(0.165, 0.84, 0.44, 1) forwards swipeIn`
- Close: `0.6s cubic-bezier(0.165, 0.84, 0.44, 1) forwards swipeOut`
- **Signature effect:** The mobile drawer "wipes" in from the right using a clip-path polygon animation — not a `translateX` slide.

---

### rotateAnimation
```css
@keyframes rotateAnimation {
  0%   { transform: rotate(0); }
  22%  { transform: rotate(240deg); }
  44%  { transform: rotate(480deg); }
  66%  { transform: rotate(720deg); }
  to   { transform: rotate(720deg); }
}
```
**Used on:** `.ai-dots` — `14s cubic-bezier(0.645, 0.045, 0.355, 1) infinite`
- Non-linear rotation: accelerates in bursts, pauses at multiples of 240°.

---

### scaleAnimationLarge / Medium / Small (AI dots morphing)
```css
@keyframes scaleAnimationLarge {
  0%  { transform: var(--defaultTransform); }
  11% { transform: scale(0.403) translate(-20%, -30%); }
  22% { transform: scale(0.403) translate(-20%, -30%); }
  33% { transform: scale(0.64) translate(40%, -45%); }
  44% { transform: scale(0.64) translate(40%, -45%); }
  55% { transform: var(--defaultTransform); }
  to  { transform: var(--defaultTransform); }
}
@keyframes scaleAnimationMedium {
  0%  { transform: var(--defaultTransform); }
  11% { transform: scale(1.56) translate(-10%, -33%); }
  22% { transform: scale(1.56) translate(-10%, -33%); }
  33% { transform: scale(0.63) translate(10%, -85%); }
  44% { transform: scale(0.63) translate(10%, -85%); }
  55% { transform: var(--defaultTransform); }
  to  { transform: var(--defaultTransform); }
}
@keyframes scaleAnimationSmall {
  0%  { transform: var(--defaultTransform); }
  11% { transform: scale(1.59) translate(-45%, -30%); }
  22% { transform: scale(1.59) translate(-45%, -30%); }
  33% { transform: scale(2.48) translate(5%, -15%); }
  44% { transform: scale(2.48) translate(5%, -15%); }
  55% { transform: var(--defaultTransform); }
  to  { transform: var(--defaultTransform); }
}
```
**Used on:** `.ai-dots__dot--large/medium/small` — `var(--defaultTiming) linear infinite`
- Three dots orbit and morph around each other using coordinated scale+translate.
- `--defaultTransform` is the rest position (typically `scale(1) translate(0, 0)`).

---

### flip
```css
@keyframes flip {
  0%    { transform: rotateY(0); }
  12.5% { transform: rotateY(0); }
  50%   { transform: rotateY(180deg); }
  62.5% { transform: rotateY(180deg); }
  to    { transform: rotate(180deg); }
}
```
**Used on:** `.loader__square` — `1.6s cubic-bezier(0.66, 0, 0.34, 1) infinite`
- Loading state animation.

---

### supportHoverArrow
```css
@keyframes supportHoverArrow {
  0%       { transform: translate(0); }
  20%, 30% { transform: translate(2px); }
  70%, 80% { transform: translate(-2px); }
  to       { transform: translate(0); }
}
```
**Used on:** `.support__links-cta-arrow--hovered` — `1.1s linear infinite`
- Subtle shimmy/vibration on the support section arrow when hovered.

---

## CTA Hover Overlay Effect (not @keyframes — pure CSS)

The primary and secondary CTA buttons use a `mix-blend-mode: difference` overlay that scales in on hover:

```css
.cta--primary::after,
.cta--secondary::after {
  content: '';
  mix-blend-mode: difference;
  background-color: white;
  transform-origin: 0;
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0; left: 0;
  transform: scaleX(0);
  transition: transform 0.3s cubic-bezier(0.645, 0.045, 0.355, 1);
}
.cta--primary:hover::after,
.cta--secondary:hover::after {
  transform: scaleX(1);
}
```
**Effect:** The `mix-blend-mode: difference` + white fill creates an inversion effect rather than a simple color change — the button appears to "flip" colors on hover.

---

## Scroll Reveal Pattern

No third-party library. IntersectionObserver adds `.in-view` class:

```typescript
const observer = new IntersectionObserver(
  entries => entries.forEach(e => {
    if (e.isIntersecting) e.target.classList.add('in-view');
  }),
  { threshold: 0.15 }
);
document.querySelectorAll('.reveal, .reveal-stagger').forEach(el => observer.observe(el));
```

CSS handles the animation:
```css
.reveal {
  opacity: 0;
  transform: translateY(16px);
  transition: opacity 0.8s cubic-bezier(0.23, 1, 0.32, 1),
              transform 0.8s cubic-bezier(0.23, 1, 0.32, 1);
}
.reveal.in-view { opacity: 1; transform: translateY(0); }
```

Stats cards use staggered delays (0.1s increments per child).

---

## Video Background Pattern

Hero section uses `<video autoplay muted loop playsInline preload="auto">` with responsive sources:

```html
<video autoplay muted loop playsinline preload="auto">
  <source src="video-desktop.webm" type="video/webm">
  <source src="video-desktop.mp4" type="video/mp4">
</video>
```

- Mobile: swap to `video-mobile.webm/mp4` (lighter, portrait-optimized)
- Overlay: `rgba(0, 0, 0, 0.52)` dark layer over video
- Card carousel videos: `preload="none"` (only hero is eager-loaded)

---

## Navigation Accordion (mobile)

Mobile nav accordion uses CSS grid transition for smooth open/close:

```css
.global-navigation__accordion-content {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.7s cubic-bezier(0.165, 0.84, 0.44, 1),
              padding 0.7s cubic-bezier(0.165, 0.84, 0.44, 1);
}
.global-navigation__accordion-content--open {
  grid-template-rows: 1fr;
}
```

`grid-template-rows: 0fr → 1fr` is the modern CSS accordion technique (no JS height calculation needed).

---

## Reduced Motion

All animations respect `prefers-reduced-motion`:
```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```
Mobile menu `.animation: none` override also applied explicitly.
