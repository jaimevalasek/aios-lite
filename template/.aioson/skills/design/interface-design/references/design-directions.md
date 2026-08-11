# Design Directions — Interface Design

Choose ONE direction. Never mix. Mixing produces visual noise.
The chosen direction defines spacing, typography, border strategy, depth, and motion posture — before components are built.

The token specs below are starting math, not a signature. In origination mode pair the direction with one register from `aesthetic-registers.md`; the register decides the typographic posture and texture, and the families named here are examples of a class, not defaults to accept unexamined. A face chosen because it was printed in this file is the same regression to the average the register exists to prevent.

---

## Precision & Density

*For: dashboards, admin panels, developer tools, power-user interfaces.*

```
Foundation : Cool slate (borders-only depth)
Spacing    : 4px base — scale: 4, 8, 12, 16, 24, 32
Colors     : foreground=slate-900, secondary=slate-600, muted=slate-400,
             faint=slate-200, border=rgba(0,0,0,0.08), accent=blue-600
Radius     : 4px / 6px / 8px  (sharp, technical)
Typography : system-ui, 11–18px, weights 400/500/600
             monospace: SF Mono, Consolas (for data/code)
Components :
  Button   → 32px height, 8px/12px padding, 4px radius, 13px 500-weight
  Card     → 0.5px faint border, 12px padding, 6px radius, NO shadows
  Table    → 8px/12px cell padding, tabular-nums, 13px font, 1px bottom border
Rationale  : borders-only maximizes density; compact sizing serves power users;
             system fonts feel native and load instantly.
```

---

## Warmth & Approachability

*For: consumer apps, collaborative tools, onboarding flows, customer-facing products.*

```
Foundation : Warm stone (subtle shadows)
Spacing    : 4px base — scale: 8, 12, 16, 24, 32, 48 (generous)
Colors     : foreground=stone-900, secondary=stone-600, accent=orange-500,
             surface=white on stone-50
Radius     : 8px / 12px / 16px  (rounded, friendly)
Typography : Inter, 13–24px, weights 400/500/600
Components :
  Button   → 40px height, 12px/20px padding, 8px radius
  Card     → 20px padding, 12px radius, white on stone-50
  Input    → 44px height, 12px/16px padding, 1.5px faint border
Rationale  : subtle shadows add approachable depth; generous spacing enables
             focused tasks; warm tones feel human and inviting.
```

---

## Sophistication & Trust

*For: fintech, enterprise SaaS, operational products where clarity and trust matter more than novelty.*

```
Foundation : Cool mineral (restrained layers)
Spacing    : 4px base — scale: 4, 8, 12, 16, 24, 32
Colors     : foreground=slate-950, secondary=slate-700, muted=slate-500,
             surface=white, border=rgba(15,23,42,0.10), accent=blue-700
Radius     : 8px / 10px / 12px  (firm, not playful)
Typography : IBM Plex Sans or Public Sans, 12–20px, weights 400/500/600
Components :
  Button   → 38px height, 12px/18px padding, 10px radius
  Card     → 16px padding, 10px radius, subtle border, rare soft shadow
  Table    → 10px/14px cell padding, tabular-nums, quiet row dividers
Rationale  : trust comes from control, not decoration; a restrained palette and
             firm typography make the product feel expensive and dependable.
```

---

## Premium Dark Platform

*For: premium dashboards, media/catalog products, command surfaces, high-density apps with persistent navigation.*

```
Foundation : Graphite layers (borders-first)
Spacing    : 4px base — scale: 4, 8, 12, 16, 24, 32
Colors     : base=#0b1015, surface=#10161d, elevated=#151c24,
             foreground=#f3f7fb, secondary=#b7c2cf, muted=#7f8b99,
             border=rgba(255,255,255,0.08), accent=desaturated blue
Radius     : 12px / 14px / 16px  (premium, controlled)
Typography : Manrope, Geist, or IBM Plex Sans, 12–22px, weights 400/500/600
Components :
  Button   → 40px height, 12px/18px padding, 12px radius
  Card     → layered surfaces, 16px padding, 14px radius, no heavy glow
  Sidebar  → quiet active state, compact icon rhythm, clean section grouping
Rationale  : premium dark works when contrast is controlled, surfaces are few,
             and borders quietly separate the system without turning neon.
```

---

## Immersive Media

*For: cinema, streaming, games, entertainment, launch pages built around footage or artwork — pairs naturally with the Cinematic register.*

```
Foundation : Near-black stage (light-based depth — scrims, not borders)
Spacing    : 8px base — scene rhythm: 8, 16, 24, 40, 64, 96
Colors     : base=#05070a, foreground=#f5f7fa, secondary=rgba(245,247,250,.72),
             scrim=linear-gradient(transparent → rgba(5,7,10,.92)),
             accent sampled from the artwork, one only
Radius     : 0 for frames, 8px/16px for controls (frames sharp, controls soft)
Typography : display face at true display sizes (48–120px, tight leading) over media;
             UI 13–16px, quiet, out of the frame
Components :
  Hero     → full-viewport media, legibility scrim, one action, one meta row
  Rail     → edge-to-edge horizontal scroll with snap and a visible overflow cue
  Overlay  → controls fade on idle, return on pointer/focus, always keyboard-reachable
Rationale  : the media carries the design; UI recedes and light replaces borders.
             Scrims keep type legible without boxing the image.
```

---

## Conversion Landing

*For: landing pages, product launches, campaign pages — any surface whose job is one decision.*

```
Foundation : product-evidence-first; any register sits on top
Spacing    : section rhythm 96/128px desktop, 48/64px mobile; 8px base inside components
Colors     : quiet ground, ONE conversion accent reserved for the primary CTA —
             the accent appears on nothing that is not the action
Radius     : consistent with the paired register
Typography : the promise at display size (clamp 36–72px), proof at body size,
             headline line length under ~14 words
Components :
  Hero     → promise + real product evidence + primary CTA inside the first viewport
  Proof    → logos, numbers, testimonials with sources — never invented metrics
  Sections → narrative order: promise → proof → capability → objection → CTA
  CTA      → repeated at decision points with the same words and accent, nothing competing
Rationale  : a landing converts through evidence and one unmistakable action, not
             decoration; every section either advances the argument or leaves.
```

---

## Other directions (adapt token specs above)

- **Data & Analysis** — cool blue, high-density tables, monospace for numbers, minimal chrome
- **Editorial** — strong typographic hierarchy, generous white space, restrained color
- **Minimal & Calm** — near-monochrome, whitespace as design element, hairline borders only
- **Boldness & Clarity** — stronger accent, harder contrast, one dominant focal move
- **Utility & Function** — minimal decoration, maximum legibility, near-invisible chrome
