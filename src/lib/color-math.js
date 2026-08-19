'use strict';

/**
 * color-math — deterministic CSS color parsing and OKLCH conversion.
 *
 * Shared by visual telemetry (palette fingerprinting: which hue family a
 * surface actually ships) and the design seed generator (drawing palettes
 * that are provably harmonious and contrast-safe). Pure arithmetic, no IO,
 * no dependencies — the same numbers on every host and every model.
 *
 * OKLCH is the working space because equal steps are perceptually equal:
 * hue distance and chroma thresholds mean the same thing in a warm palette
 * and a cold one, which is what makes cross-project hue comparison honest.
 */

// ─── sRGB ↔ linear ──────────────────────────────────────────────────────────

function srgbToLinear(c) {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function linearToSrgb(v) {
  const c = v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
  return Math.round(Math.min(1, Math.max(0, c)) * 255);
}

// ─── sRGB ↔ OKLab/OKLCH (Björn Ottosson's published matrices) ───────────────

function rgbToOklch({ r, g, b }) {
  const lr = srgbToLinear(r);
  const lg = srgbToLinear(g);
  const lb = srgbToLinear(b);

  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);

  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;

  const C = Math.sqrt(A * A + B * B);
  let H = (Math.atan2(B, A) * 180) / Math.PI;
  if (H < 0) H += 360;
  return { l: L, c: C, h: C < 1e-6 ? 0 : H };
}

/** OKLCH → sRGB without gamut checking — components may fall outside 0..255. */
function oklchToRgbUnclamped({ l, c, h }) {
  const rad = (h * Math.PI) / 180;
  const A = c * Math.cos(rad);
  const B = c * Math.sin(rad);

  const l_ = l + 0.3963377774 * A + 0.2158037573 * B;
  const m_ = l - 0.1055613458 * A - 0.0638541728 * B;
  const s_ = l - 0.0894841775 * A - 1.291485548 * B;

  const l3 = l_ * l_ * l_;
  const m3 = m_ * m_ * m_;
  const s3 = s_ * s_ * s_;

  return {
    r: 4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3,
    g: -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3,
    b: -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3
  };
}

function inSrgbGamut({ l, c, h }) {
  const { r, g, b } = oklchToRgbUnclamped({ l, c, h });
  const eps = 1e-4;
  return r >= -eps && r <= 1 + eps && g >= -eps && g <= 1 + eps && b >= -eps && b <= 1 + eps;
}

/** OKLCH → {r,g,b} 0..255, chroma-reduced into gamut if needed. */
function oklchToRgb(color) {
  const fitted = inSrgbGamut(color) ? color : { ...color, c: clampChroma(color.l, color.c, color.h) };
  const lin = oklchToRgbUnclamped(fitted);
  return { r: linearToSrgb(lin.r), g: linearToSrgb(lin.g), b: linearToSrgb(lin.b) };
}

/** Largest chroma ≤ c that stays inside sRGB at this lightness/hue. */
function clampChroma(l, c, h) {
  if (inSrgbGamut({ l, c, h })) return c;
  let lo = 0;
  let hi = c;
  for (let i = 0; i < 16; i += 1) {
    const mid = (lo + hi) / 2;
    if (inSrgbGamut({ l, c: mid, h })) lo = mid;
    else hi = mid;
  }
  return lo;
}

// ─── hex helpers ────────────────────────────────────────────────────────────

function rgbToHex({ r, g, b }) {
  const part = (n) => Math.min(255, Math.max(0, Math.round(n))).toString(16).padStart(2, '0');
  return `#${part(r)}${part(g)}${part(b)}`;
}

function oklchToHex(color) {
  return rgbToHex(oklchToRgb(color));
}

function oklchCss({ l, c, h }) {
  return `oklch(${(l * 100).toFixed(1)}% ${c.toFixed(3)} ${Math.round(h)})`;
}

// ─── CSS color parsing ──────────────────────────────────────────────────────

function hslToRgb(h, s, l) {
  const hue = ((h % 360) + 360) % 360;
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const x = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = l - chroma / 2;
  let rgb;
  if (hue < 60) rgb = [chroma, x, 0];
  else if (hue < 120) rgb = [x, chroma, 0];
  else if (hue < 180) rgb = [0, chroma, x];
  else if (hue < 240) rgb = [0, x, chroma];
  else if (hue < 300) rgb = [x, 0, chroma];
  else rgb = [chroma, 0, x];
  return { r: Math.round((rgb[0] + m) * 255), g: Math.round((rgb[1] + m) * 255), b: Math.round((rgb[2] + m) * 255) };
}

const NAMED = { white: '#ffffff', black: '#000000' };

/**
 * Parse one CSS color literal → { r, g, b, alpha, oklch } or null.
 * Covers the literal forms real prototypes ship: hex 3/4/6/8, rgb()/rgba(),
 * hsl()/hsla(), oklch(). Keywords beyond white/black, and dynamic forms
 * (color-mix, var chains), stay out — callers resolve var() first and
 * fingerprinting tolerates skipped tokens.
 */
function parseCssColor(input) {
  const raw = String(input || '').trim().toLowerCase();
  if (!raw) return null;
  const text = NAMED[raw] || raw;

  let m;
  if ((m = text.match(/^#([0-9a-f]{3,8})$/))) {
    const hex = m[1];
    if (hex.length === 3 || hex.length === 4) {
      const r = parseInt(hex[0] + hex[0], 16);
      const g = parseInt(hex[1] + hex[1], 16);
      const b = parseInt(hex[2] + hex[2], 16);
      const alpha = hex.length === 4 ? parseInt(hex[3] + hex[3], 16) / 255 : 1;
      return withOklch({ r, g, b, alpha });
    }
    if (hex.length === 6 || hex.length === 8) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      const alpha = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
      return withOklch({ r, g, b, alpha });
    }
    return null;
  }

  if ((m = text.match(/^rgba?\(\s*([\d.]+)\s*[, ]\s*([\d.]+)\s*[, ]\s*([\d.]+)\s*(?:[,/]\s*([\d.]+%?)\s*)?\)$/))) {
    const alpha = parseAlpha(m[4]);
    return withOklch({ r: Number(m[1]), g: Number(m[2]), b: Number(m[3]), alpha });
  }

  if ((m = text.match(/^hsla?\(\s*([\d.-]+)(?:deg)?\s*[, ]\s*([\d.]+)%\s*[, ]\s*([\d.]+)%\s*(?:[,/]\s*([\d.]+%?)\s*)?\)$/))) {
    const { r, g, b } = hslToRgb(Number(m[1]), Number(m[2]) / 100, Number(m[3]) / 100);
    return withOklch({ r, g, b, alpha: parseAlpha(m[4]) });
  }

  if ((m = text.match(/^oklch\(\s*([\d.]+%?)\s+([\d.]+%?)\s+([\d.-]+)(?:deg)?\s*(?:\/\s*([\d.]+%?)\s*)?\)$/))) {
    const l = m[1].endsWith('%') ? Number(m[1].slice(0, -1)) / 100 : Number(m[1]);
    const c = m[2].endsWith('%') ? Number(m[2].slice(0, -1)) * 0.004 : Number(m[2]);
    const h = ((Number(m[3]) % 360) + 360) % 360;
    const rgb = oklchToRgb({ l, c, h });
    return { ...rgb, alpha: parseAlpha(m[4]), oklch: { l, c, h } };
  }

  return null;
}

function parseAlpha(token) {
  if (token == null || token === '') return 1;
  const t = String(token);
  const n = t.endsWith('%') ? Number(t.slice(0, -1)) / 100 : Number(t);
  return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 1;
}

function withOklch(color) {
  return { ...color, oklch: rgbToOklch(color) };
}

// ─── contrast (WCAG 2.x) ────────────────────────────────────────────────────

function relativeLuminance({ r, g, b }) {
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

function contrastRatio(a, b) {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** Circular hue distance in degrees, always 0..180. */
function hueDeltaDeg(a, b) {
  const d = Math.abs(((a - b) % 360 + 360) % 360);
  return d > 180 ? 360 - d : d;
}

module.exports = {
  srgbToLinear,
  linearToSrgb,
  rgbToOklch,
  oklchToRgb,
  oklchToRgbUnclamped,
  inSrgbGamut,
  clampChroma,
  rgbToHex,
  oklchToHex,
  oklchCss,
  hslToRgb,
  parseCssColor,
  relativeLuminance,
  contrastRatio,
  hueDeltaDeg
};
