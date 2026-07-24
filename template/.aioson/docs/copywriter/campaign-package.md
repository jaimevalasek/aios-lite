---
description: Sequential Mode 6 campaign package with cross-channel limits and one coherent voice
agents: [copywriter]
task_types: [campaign-copy, multi-channel-copy]
triggers: [mode 6, campaign package, multi-platform ads]
---

# Copywriter Campaign Package

Run only after audience, PMS, central belief, structure, and voice are resolved.

## Inputs

Infer goal and channel mix from context. Ask only if either changes the deliverable materially. If no mix is stated, use landing page, Facebook/Instagram, Google Search, and email.

Run sequentially:

1. Load `headline-matrix.md`; produce eight variations across at least five types and select one primary by awareness, structure, and voice.
2. Produce long body in `copy-{slug}.md`, plus ~100-word short and ~25-word micro versions.
3. Load `platform-constraints.md`; create only requested channel formats within hard limits.
4. Load `cta-matrix.md`; produce five variations across at least four commitment levels and select the primary by funnel goal.
5. Produce ten mobile-conscious email subjects with extending, non-repeating preheaders: curiosity, benefit, question, real urgency when available, personalization, and voice-specific variants.
6. Assemble `.aioson/context/campaign-{slug}.md`; optionally emit JSON when explicitly requested.

No absent `ads-cpgc.md` or `content-multiplier.md` dependency exists. For Facebook/Instagram, generate several hooks, concise body, and CTA options directly from the primary belief and platform limits.

## Coherence gate

- One central belief and voice across all formats
- Primary headline/CTA work together
- Platform adaptation changes length/shape, not brand identity
- No unsupported urgency, merge-tag error, placeholder, or limit violation
- Landing body remains the single source at `copy-{slug}.md`

JSON, when requested, includes project/goal/channels, central belief, primary headline/CTA, headline variants, body references/variants, per-channel copy, CTA variants, and subject/preheader pairs.
