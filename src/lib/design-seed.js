'use strict';

/**
 * design-seed — deterministic palette, pairing, and composition draws for
 * cold-start origination, diversified against the operator's recent projects.
 *
 * The problem it solves is measured, not hypothetical: left to its prior, a
 * generative model lands unrelated projects on the same favorite palette and
 * the same hero shapes. Quality gates cannot see that — each surface passes
 * alone. This module gives the engine an entropy source it must build FROM:
 *
 *   - a seeded PRNG (project slug → hash) draws hue, pole, scheme, pairing,
 *     and composition posture — same project, same draw; different project,
 *     different draw;
 *   - palette construction is contrast-solved in OKLCH, so every candidate is
 *     validated raw material, never a random pretty accident;
 *   - an operator-level fingerprint registry (written by verify:artifact from
 *     MEASURED surfaces) lets the draw steer away from hue families the
 *     operator's recent projects already shipped.
 *
 * The model keeps the judgment half: it picks ONE candidate and refines it.
 * The draw only decides where in the space the work starts — which is exactly
 * the decision the prior was silently making the same way every time.
 */

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const {
  clampChroma,
  oklchToRgb,
  oklchToHex,
  oklchCss,
  contrastRatio,
  hueDeltaDeg
} = require('./color-math');

// ─── deterministic randomness ───────────────────────────────────────────────

function fnv1a(text) {
  let hash = 0x811c9dc5;
  for (const ch of String(text)) {
    hash ^= ch.codePointAt(0);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickWeighted(rng, pairs) {
  const total = pairs.reduce((sum, [, w]) => sum + w, 0);
  let roll = rng() * total;
  for (const [value, weight] of pairs) {
    roll -= weight;
    if (roll <= 0) return value;
  }
  return pairs[pairs.length - 1][0];
}

function pickFrom(rng, list) {
  return list[Math.floor(rng() * list.length) % list.length];
}

function between(rng, lo, hi) {
  return lo + rng() * (hi - lo);
}

// ─── banks ──────────────────────────────────────────────────────────────────
// Curated raw material, not a decision surface: the seed draws FROM these, the
// engine composes WITH the draw. Every family is deliverable from its host
// (Google Fonts / Fontshare) per the build contract's typeface exception.
//
// The bank deliberately avoids the training-saturated faces the telemetry
// flags (SATURATED_DISPLAY_FACES in visual-telemetry.js): a face every model
// reaches for by reflex reads as a default even when a fair draw picked it,
// so a dice that can roll the monoculture defeats its own purpose. A test
// keeps the two lists disjoint.

const REGISTERS = ['technical', 'quiet', 'editorial', 'material', 'constructed', 'cinematic'];

const TYPEFACE_BANK = [
  { display: 'Young Serif', ui: 'Figtree', host: 'google', registers: ['editorial', 'material'], vibe: 'warm chunky oldstyle' },
  { display: 'Gambetta', ui: 'Switzer', host: 'fontshare', registers: ['editorial', 'quiet'], vibe: 'calligraphic contemporary serif' },
  { display: 'Petrona', ui: 'Archivo', host: 'google', registers: ['editorial'], vibe: 'upright latin serif with bite' },
  { display: 'Italiana', ui: 'Karla', host: 'google', registers: ['quiet', 'editorial'], vibe: 'hairline display roman' },
  { display: 'Abril Fatface', ui: 'Mulish', host: 'google', registers: ['material', 'editorial'], vibe: 'poster didone' },
  { display: 'Gloock', ui: 'Hanken Grotesk', host: 'google', registers: ['editorial', 'cinematic'], vibe: 'heavy didone display' },
  { display: 'Bodoni Moda', ui: 'Public Sans', host: 'google', registers: ['editorial'], vibe: 'true italian didone' },
  { display: 'Spectral', ui: 'Work Sans', host: 'google', registers: ['quiet', 'editorial'], vibe: 'cool text serif' },
  { display: 'Marcellus', ui: 'Mulish', host: 'google', registers: ['quiet', 'cinematic'], vibe: 'inscriptional capitals' },
  { display: 'Schibsted Grotesk', ui: 'Archivo', host: 'google', registers: ['technical', 'constructed'], vibe: 'newsroom grotesque' },
  { display: 'Sora', ui: 'Hanken Grotesk', host: 'google', registers: ['technical'], vibe: 'geometric future sans' },
  { display: 'Unbounded', ui: 'Manrope', host: 'google', registers: ['constructed', 'cinematic'], vibe: 'expanded display sans' },
  { display: 'Panchang', ui: 'General Sans', host: 'fontshare', registers: ['constructed'], vibe: 'squared wide display' },
  { display: 'Anton', ui: 'Archivo', host: 'google', registers: ['constructed'], vibe: 'compressed poster sans' },
  { display: 'Bricolage Grotesque', ui: 'Public Sans', host: 'google', registers: ['constructed', 'editorial'], vibe: 'characterful grotesque' },
  { display: 'Familjen Grotesk', ui: 'Karla', host: 'google', registers: ['quiet', 'technical'], vibe: 'warm grotesque' },
  { display: 'Fragment Mono', ui: 'Archivo', host: 'google', registers: ['technical'], vibe: 'monospace display' },
  { display: 'Clash Display', ui: 'Satoshi', host: 'fontshare', registers: ['constructed', 'cinematic'], vibe: 'angular display grotesque' },
  { display: 'Cabinet Grotesk', ui: 'General Sans', host: 'fontshare', registers: ['editorial', 'constructed'], vibe: 'retro grotesque' },
  { display: 'Zodiak', ui: 'Switzer', host: 'fontshare', registers: ['editorial', 'material'], vibe: 'fat-face serif' },
  { display: 'Sentient', ui: 'General Sans', host: 'fontshare', registers: ['quiet', 'editorial'], vibe: 'gentle transitional serif' },
  { display: 'Boska', ui: 'Switzer', host: 'fontshare', registers: ['cinematic', 'editorial'], vibe: 'sharp fashion serif' },
  { display: 'Erode', ui: 'Satoshi', host: 'fontshare', registers: ['editorial', 'quiet'], vibe: 'ink-trap text serif' }
];

const COMPOSITION_BANK = [
  { hero: 'split-editorial', note: 'text column against a full-bleed media column, baselines locked across the seam', registers: ['editorial', 'quiet', 'material'] },
  { hero: 'type-as-image', note: 'display type IS the hero — the wordmark or promise set at 96px+, media behind or absent', registers: ['editorial', 'constructed', 'cinematic'] },
  { hero: 'full-bleed-stage', note: 'media or product fills the viewport under a legibility scrim, one action, UI out of the frame', registers: ['cinematic', 'material'] },
  { hero: 'offset-grid', note: 'asymmetric 12-col grid with one element overlapping the seam and one bleeding off-canvas', registers: ['editorial', 'constructed'] },
  { hero: 'centered-object', note: 'one subject floating at full presence in a generous field, soft grounded shadow, nothing competing', registers: ['quiet', 'material', 'technical'] },
  { hero: 'stacked-manifesto', note: 'oversized stacked display lines with one word swapped for media or color, marquee optional', registers: ['constructed', 'editorial'] },
  { hero: 'framed-plate', note: 'media in a drawn frame with hairline rules and small caps captions — a plate, not a card', registers: ['editorial', 'quiet'] },
  { hero: 'collage-layers', note: 'overlapping color panels and cutout media at slight rotations — composed chaos with a strict palette', registers: ['constructed', 'material'] },
  { hero: 'horizontal-rail', note: 'edge-to-edge horizontal scroll rail with snap and a visible overflow cue as the first move', registers: ['cinematic', 'constructed'] },
  { hero: 'diagonal-axis', note: 'content set on one tilted axis or clipped section seams — the angle is the signature, used once', registers: ['constructed', 'cinematic'] }
];

// Names echo the visual-effects.md vocabulary — the doc owns the execution.
const MATERIALS = ['radial wash', 'grain and noise', 'dither and halftone', 'conic ring', 'glass', 'ambient drift'];

const RHYTHMS = ['96/128px desktop, 48/64px mobile', '112/160px desktop, 56/72px mobile', '80/120px desktop, 48/64px mobile'];

const SCHEMES = ['mono', 'analogous', 'complementary', 'split-complementary', 'triadic', 'duo-accent', 'color-block'];

// Pole = where the ground sits. 'chromatic' is a saturated color field —
// the register shapes how far each posture reaches for it.
const POLE_WEIGHTS = {
  technical: [['light', 0.45], ['dark', 0.45], ['chromatic', 0.1]],
  quiet: [['light', 0.6], ['dark', 0.3], ['chromatic', 0.1]],
  editorial: [['light', 0.55], ['dark', 0.3], ['chromatic', 0.15]],
  material: [['light', 0.4], ['dark', 0.4], ['chromatic', 0.2]],
  constructed: [['light', 0.3], ['dark', 0.3], ['chromatic', 0.4]],
  cinematic: [['dark', 0.7], ['light', 0.15], ['chromatic', 0.15]],
  default: [['light', 0.4], ['dark', 0.35], ['chromatic', 0.25]]
};

const SCHEME_WEIGHTS = {
  technical: [['mono', 0.35], ['duo-accent', 0.25], ['analogous', 0.2], ['complementary', 0.2]],
  quiet: [['mono', 0.45], ['analogous', 0.35], ['complementary', 0.2]],
  editorial: [['mono', 0.3], ['complementary', 0.25], ['analogous', 0.25], ['split-complementary', 0.2]],
  material: [['analogous', 0.35], ['complementary', 0.3], ['mono', 0.2], ['duo-accent', 0.15]],
  constructed: [['color-block', 0.3], ['triadic', 0.25], ['complementary', 0.25], ['duo-accent', 0.2]],
  cinematic: [['mono', 0.35], ['duo-accent', 0.3], ['complementary', 0.2], ['analogous', 0.15]],
  default: [['mono', 0.2], ['analogous', 0.2], ['complementary', 0.2], ['split-complementary', 0.1], ['triadic', 0.1], ['duo-accent', 0.1], ['color-block', 0.1]]
};

// ─── palette construction (contrast-solved) ─────────────────────────────────

const INK_BODY_TARGET = 7; // aim AAA body copy
const INK_FLOOR = 4.5; // never ship below AA
const MUTED_TARGET = 4.5;
const ACCENT_TARGET = 3; // large text / UI components

function role(l, c, h) {
  const fitted = { l, c: clampChroma(l, c, h), h };
  return { ...fitted, hex: oklchToHex(fitted), css: oklchCss(fitted) };
}

/**
 * Scan lightness from `from` toward `to` until the color reaches `target`
 * contrast against `againstRgb`; returns the best found (last scanned) when
 * the target is unreachable at this chroma/hue.
 */
function fitLightness({ c, h }, againstRgb, target, from, to) {
  const step = from <= to ? 0.01 : -0.01;
  let best = null;
  for (let l = from; step > 0 ? l <= to : l >= to; l += step) {
    const candidate = { l: Math.round(l * 1000) / 1000, c: clampChroma(l, c, h), h };
    const ratio = contrastRatio(oklchToRgb(candidate), againstRgb);
    if (!best || ratio > best.ratio) best = { color: candidate, ratio };
    if (ratio >= target) return { color: candidate, ratio };
  }
  return best;
}

/** Chromatic grounds sit where the hue is naturally comfortable in sRGB. */
function chromaticGroundLightness(rng, hue) {
  if (hue >= 60 && hue < 165) return between(rng, 0.78, 0.88); // yellows/greens carry high L
  if (hue >= 165 && hue < 225) return between(rng, 0.62, 0.75); // cyans/teals
  if (hue >= 225 && hue < 330) return between(rng, 0.42, 0.54); // blues/violets stay deep
  return between(rng, 0.55, 0.66); // reds/oranges
}

function accentHueFor(scheme, baseHue, rng) {
  switch (scheme) {
    case 'mono': return (baseHue + between(rng, -8, 8) + 360) % 360;
    case 'analogous': return (baseHue + (rng() < 0.5 ? 1 : -1) * between(rng, 26, 42) + 360) % 360;
    case 'complementary': return (baseHue + 180 + between(rng, -12, 12)) % 360;
    case 'split-complementary': return (baseHue + (rng() < 0.5 ? 150 : 210) + between(rng, -8, 8)) % 360;
    case 'triadic': return (baseHue + (rng() < 0.5 ? 120 : 240) + between(rng, -8, 8)) % 360;
    case 'duo-accent': return (baseHue + between(rng, 150, 210)) % 360;
    case 'color-block': return baseHue;
    default: return baseHue;
  }
}

function buildPalette(rng, { baseHue, pole, scheme }) {
  // ground — a tinted field, never flat gray; chromatic pole is a color field.
  let ground;
  if (pole === 'light') ground = role(between(rng, 0.955, 0.985), between(rng, 0.008, 0.03), baseHue);
  else if (pole === 'dark') ground = role(between(rng, 0.15, 0.24), between(rng, 0.01, 0.04), baseHue);
  else ground = role(chromaticGroundLightness(rng, baseHue), between(rng, 0.14, 0.2), baseHue);
  const groundRgb = oklchToRgb(ground);

  // ink — same family, lightness solved for AAA-leaning body contrast.
  const inkChroma = between(rng, 0.015, 0.04);
  const darkInk = contrastRatio({ r: 0, g: 0, b: 0 }, groundRgb) >= contrastRatio({ r: 255, g: 255, b: 255 }, groundRgb);
  let inkFit = darkInk
    ? fitLightness({ c: inkChroma, h: baseHue }, groundRgb, INK_BODY_TARGET, 0.32, 0.08)
    : fitLightness({ c: inkChroma, h: baseHue }, groundRgb, INK_BODY_TARGET, 0.82, 0.99);
  if (inkFit.ratio < INK_FLOOR) {
    // saturated field fighting the ink: drop the tint and take the extreme.
    inkFit = darkInk
      ? fitLightness({ c: 0.01, h: baseHue }, groundRgb, INK_FLOOR, 0.2, 0.03)
      : fitLightness({ c: 0.01, h: baseHue }, groundRgb, INK_FLOOR, 0.9, 1);
  }
  const ink = role(inkFit.color.l, inkFit.color.c, baseHue);

  // muted — secondary text, still readable.
  const mutedFit = darkInk
    ? fitLightness({ c: inkChroma, h: baseHue }, groundRgb, MUTED_TARGET, 0.52, 0.2)
    : fitLightness({ c: inkChroma, h: baseHue }, groundRgb, MUTED_TARGET, 0.62, 0.92);
  const muted = role(mutedFit.color.l, mutedFit.color.c, baseHue);

  // surface — one quiet layer above the ground.
  const surfaceL = pole === 'light' ? ground.l - 0.025 : pole === 'dark' ? ground.l + 0.035 : ground.l + (darkInk ? 0.05 : -0.05);
  const surface = role(surfaceL, ground.c, baseHue);

  // accent — the one color with a job, solved for UI contrast on the ground.
  const accentHue = accentHueFor(scheme, baseHue, rng);
  const accentChroma = between(rng, 0.16, 0.24);
  const accentFit = pole === 'dark'
    ? fitLightness({ c: accentChroma, h: accentHue }, groundRgb, ACCENT_TARGET, between(rng, 0.68, 0.78), 0.9)
    : pole === 'light'
      ? fitLightness({ c: accentChroma, h: accentHue }, groundRgb, ACCENT_TARGET, between(rng, 0.52, 0.62), 0.3)
      : fitLightness({ c: accentChroma, h: accentHue }, groundRgb, ACCENT_TARGET, darkInk ? 0.4 : 0.78, darkInk ? 0.2 : 0.92);
  const accent = role(accentFit.color.l, accentFit.color.c, accentHue);
  const accentRgb = oklchToRgb(accent);

  const accentInkWhite = contrastRatio({ r: 255, g: 255, b: 255 }, accentRgb) >= contrastRatio({ r: 0, g: 0, b: 0 }, accentRgb);
  const accentInkFit = accentInkWhite
    ? fitLightness({ c: 0.02, h: accentHue }, accentRgb, INK_FLOOR, 0.96, 1)
    : fitLightness({ c: 0.03, h: accentHue }, accentRgb, INK_FLOOR, 0.22, 0.05);
  const accentInk = role(accentInkFit.color.l, accentInkFit.color.c, accentHue);

  // wash — a tinted section variant of the ground at the accent hue.
  const wash = role(
    pole === 'light' ? ground.l - 0.02 : pole === 'dark' ? ground.l + 0.05 : ground.l,
    Math.min(0.055, between(rng, 0.03, 0.055)),
    accentHue
  );

  const roles = { ground, surface, ink, muted, accent, accent_ink: accentInk, wash };

  if (scheme === 'duo-accent') {
    const hue2 = (accentHue + between(rng, 150, 210)) % 360;
    const fit2 = pole === 'dark'
      ? fitLightness({ c: accentChroma, h: hue2 }, groundRgb, ACCENT_TARGET, 0.74, 0.9)
      : fitLightness({ c: accentChroma, h: hue2 }, groundRgb, ACCENT_TARGET, 0.56, 0.3);
    roles.accent_2 = role(fit2.color.l, fit2.color.c, hue2);
  }

  let blocks;
  if (scheme === 'color-block') {
    blocks = [0, between(rng, 110, 130), between(rng, 230, 250)].map((offset) => {
      const hue = (baseHue + offset) % 360;
      const l = chromaticGroundLightness(rng, hue);
      const block = role(l, between(rng, 0.15, 0.2), hue);
      const blockRgb = oklchToRgb(block);
      const whiteInk = contrastRatio({ r: 255, g: 255, b: 255 }, blockRgb) >= contrastRatio({ r: 0, g: 0, b: 0 }, blockRgb);
      return { ...block, ink: whiteInk ? '#ffffff' : '#101010' };
    });
  }

  return {
    roles,
    blocks,
    contrast: {
      ink_on_ground: round2(contrastRatio(oklchToRgb(ink), groundRgb)),
      muted_on_ground: round2(contrastRatio(oklchToRgb(muted), groundRgb)),
      accent_on_ground: round2(contrastRatio(accentRgb, groundRgb)),
      accent_ink_on_accent: round2(contrastRatio(oklchToRgb(accentInk), accentRgb))
    }
  };
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

// ─── candidate generation ───────────────────────────────────────────────────

const GOLDEN_ANGLE = 137.508;
const REPETITION_DELTA_DEG = 24;
const REPETITION_TIGHT_DELTA_DEG = 18;

/**
 * Two fingerprints read as "the same project again" when the accent hue
 * family repeats on the same ground pole — or repeats tightly regardless of
 * pole: espresso-ground-rust-accent and cream-ground-rust-accent are the same
 * wardrobe with the polarity flipped, and the eye reads them as one brand.
 */
function fingerprintMatchReason(delta, samePole) {
  if (samePole && delta <= REPETITION_DELTA_DEG) return 'same hue family on the same ground pole';
  if (delta <= REPETITION_TIGHT_DELTA_DEG) return 'same accent family with the ground polarity flipped';
  return null;
}

/**
 * Deterministic candidates for one project. `avoid` carries fingerprints of
 * OTHER recent projects ({ accent_hue, ground_pole }): a draw landing in an
 * already-shipped hue family on the same pole rotates away by the golden
 * angle — diversity by construction, not by luck.
 */
function generateSeedCandidates({ slug, register = null, count = 3, seed = 0, avoid = [] } = {}) {
  const normalizedRegister = register && REGISTERS.includes(String(register).toLowerCase())
    ? String(register).toLowerCase()
    : null;
  const basis = `${String(slug || 'project')}|${normalizedRegister || ''}|${Number(seed) || 0}`;
  const hash = fnv1a(basis);
  const rng = mulberry32(hash);

  const baseHue0 = rng() * 360;
  const candidates = [];
  const takenHues = [];
  const usedDisplays = new Set();
  const usedHeroes = new Set();

  for (let i = 0; i < Math.max(1, Math.min(6, count)); i += 1) {
    const candidateRegister = normalizedRegister || pickFrom(rng, REGISTERS);
    const pole = pickWeighted(rng, POLE_WEIGHTS[candidateRegister] || POLE_WEIGHTS.default);
    const scheme = pickWeighted(rng, SCHEME_WEIGHTS[candidateRegister] || SCHEME_WEIGHTS.default);

    let hue = (baseHue0 + i * GOLDEN_ANGLE) % 360;
    for (let attempt = 0; attempt < 12 && takenHues.some((t) => hueDeltaDeg(hue, t) < 28); attempt += 1) {
      hue = (hue + GOLDEN_ANGLE) % 360;
    }

    // The avoidance check reads the BUILT accent, not the base hue — a
    // complementary scheme rotates the accent 180° away from the base, and the
    // accent is the hue the fingerprint registry records and the eye compares.
    const avoided = (h) => avoid.some((f) =>
      f && Number.isFinite(f.accent_hue) && Boolean(fingerprintMatchReason(hueDeltaDeg(h, f.accent_hue), f.ground_pole === pole)));
    let palette = buildPalette(rng, { baseHue: hue, pole, scheme });
    for (let attempt = 0; attempt < 12 && avoided(palette.roles.accent.h); attempt += 1) {
      hue = (hue + GOLDEN_ANGLE) % 360;
      palette = buildPalette(rng, { baseHue: hue, pole, scheme });
    }
    takenHues.push(hue);

    // Candidates are alternatives — same pairing or hero twice in one draw
    // wastes a slot, so re-pick a few times before accepting a repeat.
    const pairingPool = TYPEFACE_BANK.filter((p) => p.registers.includes(candidateRegister));
    let pairing = pickFrom(rng, pairingPool.length ? pairingPool : TYPEFACE_BANK);
    for (let attempt = 0; attempt < 6 && usedDisplays.has(pairing.display); attempt += 1) {
      pairing = pickFrom(rng, pairingPool.length ? pairingPool : TYPEFACE_BANK);
    }
    usedDisplays.add(pairing.display);

    const compositionPool = COMPOSITION_BANK.filter((c) => c.registers.includes(candidateRegister));
    let composition = pickFrom(rng, compositionPool.length ? compositionPool : COMPOSITION_BANK);
    for (let attempt = 0; attempt < 6 && usedHeroes.has(composition.hero); attempt += 1) {
      composition = pickFrom(rng, compositionPool.length ? compositionPool : COMPOSITION_BANK);
    }
    usedHeroes.add(composition.hero);

    candidates.push({
      label: `${scheme}-${Math.round(hue)}`,
      register: candidateRegister,
      pole,
      scheme,
      base_hue: Math.round(hue),
      accent_hue: Math.round(palette.roles.accent.h),
      roles: Object.fromEntries(Object.entries(palette.roles).map(([name, value]) => [name, { hex: value.hex, oklch: value.css }])),
      ...(palette.blocks ? { blocks: palette.blocks.map((b) => ({ hex: b.hex, oklch: b.css, ink: b.ink })) } : {}),
      contrast: palette.contrast,
      pairing: { display: pairing.display, ui: pairing.ui, host: pairing.host, vibe: pairing.vibe },
      composition: {
        hero: composition.hero,
        note: composition.note,
        rhythm: pickFrom(rng, RHYTHMS),
        material: pickFrom(rng, MATERIALS),
        finishing: FINISHING_FLOOR[pole]
      }
    });
  }

  return { basis, hash, register: normalizedRegister, candidates };
}

// The drawn material is the SIGNATURE, never the whole system. Every candidate
// ships with the finish floor its palette must wear — tokened so every route
// inherits it — because a legitimate draw applied without finishing is exactly
// how a premium palette ships looking like generic output.
const FINISHING_FLOOR = {
  light: 'token a paper shadow vocabulary (soft layered shadows + inset highlight) on floating surfaces and a tinted soft wash per accent role for chips/fills — the drawn material sits on top of this floor, it never replaces it',
  dark: 'token surface elevation the eye can read (steps or an inverted light plate for the stat moment), a layered shadow vocabulary and tinted washes per accent role — the drawn material sits on top of this floor, it never replaces it',
  chromatic: 'token an ink-anchored shadow vocabulary tuned on the colored field plus tinted washes per accent role — the drawn material sits on top of this floor, it never replaces it'
};

// ─── operator fingerprint registry ──────────────────────────────────────────
// Written by verify:artifact from MEASURED surfaces (ground truth, auto-fires
// through the existing gate chain); read here to steer new draws away. Local
// to the operator's machine, best-effort, never blocking.

const REGISTRY_VERSION = 1;
const REGISTRY_CAP = 24;

function registryPath() {
  return process.env.AIOSON_DESIGN_REGISTRY
    || path.join(os.homedir(), '.aioson', 'design-fingerprints.json');
}

function readRegistry() {
  try {
    const parsed = JSON.parse(fs.readFileSync(registryPath(), 'utf8'));
    if (parsed && Array.isArray(parsed.entries)) return { version: parsed.version || REGISTRY_VERSION, entries: parsed.entries };
  } catch { /* absent or unreadable — empty registry */ }
  return { version: REGISTRY_VERSION, entries: [] };
}

function recordFingerprint(entry) {
  if (!entry || !entry.project || !Number.isFinite(entry.accent_hue)) return false;
  try {
    const registry = readRegistry();
    const key = (e) => `${e.project}::${e.slug || ''}`;
    const entries = registry.entries.filter((e) => key(e) !== key(entry));
    entries.unshift({ ...entry, at: new Date().toISOString() });
    const file = registryPath();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, `${JSON.stringify({ version: REGISTRY_VERSION, entries: entries.slice(0, REGISTRY_CAP) }, null, 2)}\n`);
    return true;
  } catch {
    return false;
  }
}

/**
 * The closest recent fingerprint from a DIFFERENT project sharing this
 * surface's hue family and ground pole — the measured shape of "the second
 * project came out looking like the first".
 */
function findRepetition(current, entries) {
  if (!current || !Number.isFinite(current.accent_hue)) return null;
  let hit = null;
  for (const entry of entries || []) {
    if (!entry || entry.project === current.project || !Number.isFinite(entry.accent_hue)) continue;
    const delta = hueDeltaDeg(entry.accent_hue, current.accent_hue);
    const reason = fingerprintMatchReason(delta, entry.ground_pole === current.ground_pole);
    if (!reason) continue;
    if (!hit || delta < hit.delta) {
      hit = {
        entry,
        delta: Math.round(delta),
        reason,
        same_face: Boolean(current.display_face && entry.display_face && current.display_face === entry.display_face)
      };
    }
  }
  return hit;
}

module.exports = {
  generateSeedCandidates,
  buildPalette,
  registryPath,
  readRegistry,
  recordFingerprint,
  findRepetition,
  fingerprintMatchReason,
  fnv1a,
  mulberry32,
  REGISTERS,
  SCHEMES,
  TYPEFACE_BANK,
  COMPOSITION_BANK,
  MATERIALS,
  REPETITION_DELTA_DEG
};
