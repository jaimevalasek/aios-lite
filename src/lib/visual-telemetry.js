'use strict';

/**
 * Static visual telemetry — build-free, browser-free measurement of a produced
 * interface.
 *
 * Every other anti-slop surface in AIOSON is prose an agent may or may not
 * honor. This one is arithmetic: it reads the HTML/CSS text that was actually
 * written and reports numbers (token adherence, spacing rhythm, depth
 * strategies, motion coverage, state coverage) plus a small set of
 * high-confidence structural defects.
 *
 * Deliberately lexical, not a parser: pure RegExp over the source text, so it
 * costs milliseconds, needs no toolchain, and behaves identically on any host
 * or model. The trade is precision — every finding here is chosen because it
 * survives that trade with a near-zero false-positive rate. Heuristics that
 * would need a DOM, a rendered layout, or taste (hero evidence, card walls,
 * "is this generic") are deliberately NOT findings: they stay metrics, or they
 * stay with the reviewing agent. A gate that cries wolf gets ignored.
 *
 * Scope: self-contained prototypes and CSS-authored front-ends. A utility-class
 * codebase (Tailwind and friends) expresses tokens in markup, so the adherence
 * and rhythm metrics do not describe it — `analyzeVisualSources` reports
 * `applicable: false` rather than inventing a verdict.
 */

// Properties whose value should come from a design token, not a literal.
const TOKENIZABLE = new Set([
  'color', 'background', 'background-color', 'border-color', 'fill', 'stroke',
  'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'gap', 'row-gap', 'column-gap', 'border-radius', 'font-size', 'box-shadow'
]);

// Properties that carry the spacing rhythm. Off-grid values here are the
// single most reliable tell of hand-tuned, systemless spacing.
const SPACING_PROPS = new Set([
  'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'gap', 'row-gap', 'column-gap'
]);

const SPACING_GRID = 4;

const LITERAL_VALUE = /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\s*\(|(?:^|[\s(,:])-?\d*\.?\d+(?:px|rem|em)\b/;

// Elements that never open a container frame: void elements, plus the two that
// carry non-markup payloads.
const VOID_OR_OPAQUE = new Set([
  'script', 'style', 'br', 'img', 'input', 'hr', 'meta', 'link', 'source', 'track', 'area', 'col', 'embed', 'wbr'
]);

// Presence markers for the states a finished surface is expected to render.
// A missing marker is a warning, never a blocking finding, so these are matched
// in the project's authoring languages: markup written in pt-BR would otherwise
// report a state as absent purely because it was not named in English.
const STATE_MARKERS = [
  { state: 'loading', re: /\bis-loading\b|\bloading\b|\bskeleton\b|\bspinner\b|aria-busy|\bcarregando\b|\bcarregamento\b/i },
  { state: 'empty', re: /\bempty-state\b|\bis-empty\b|\bempty\b|\bno-results\b|\bnenhum\b|\bvazio\b|\bsem-resultados\b/i },
  { state: 'error', re: /\bis-error\b|\bhas-error\b|\berror-state\b|\berror\b|\berro\b|aria-invalid|\bfalha\b/i },
  { state: 'disabled', re: /:disabled\b|\bdisabled\b|aria-disabled|\bdesabilitado\b|\bdesativado\b/i },
  { state: 'focus', re: /:focus\b|:focus-visible\b|\bfocus-ring\b|\bfoco\b/i }
];

const INTERACTIVE = /<button|<input|<select|<textarea|<form|addEventListener|onclick=/i;

const CARD_TAG = /^(div|section|article|li|aside)$/i;
const CARD_CLASS = /\b(card|panel|tile|widget)\b/i;

/** Strip CSS comments so commented-out code never counts as a measurement. */
function stripComments(css) {
  return String(css || '').replace(/\/\*[\s\S]*?\*\//g, '');
}

/** Collect the text of every `<style>` block in an HTML document. */
function extractStyleBlocks(html) {
  const out = [];
  const re = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
  let m;
  while ((m = re.exec(String(html || '')))) out.push(m[1]);
  return out.join('\n');
}

/** Flat (property, value) pairs from CSS text. At-rule preludes are skipped. */
function declarations(css) {
  const out = [];
  const re = /([-a-zA-Z]+)\s*:\s*([^;{}]+)/g;
  let m;
  while ((m = re.exec(css))) {
    out.push({ prop: m[1].toLowerCase(), value: m[2].trim() });
  }
  return out;
}

/** Flat rule blocks — `selector { body }`. Nested at-rules yield their inner blocks. */
function ruleBlocks(css) {
  const out = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(css))) {
    out.push({ selector: m[1].trim(), body: m[2] });
  }
  return out;
}

/** px values in a declaration value, as absolute numbers. */
function pxValues(value) {
  const out = [];
  const re = /(-?\d*\.?\d+)px\b/g;
  let m;
  while ((m = re.exec(value))) out.push(Math.abs(Number(m[1])));
  return out;
}

/**
 * Deepest simultaneous nesting of card-like containers.
 *
 * A tiny tag walker rather than a DOM: keep a stack of open frames and count how
 * many ancestors are card-like. Void and self-closing tags never open a frame.
 */
function maxCardNesting(html) {
  const re = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)\b([^>]*)>/g;
  const stack = [];
  let depth = 0;
  let max = 0;
  let m;
  while ((m = re.exec(String(html || '')))) {
    const closing = m[1] === '/';
    const tag = m[2].toLowerCase();
    const attrs = m[3] || '';
    if (VOID_OR_OPAQUE.has(tag)) continue;
    if (closing) {
      // Unwind to the matching open frame. Markup that never closes a wrapper
      // must not leave a card counted open forever.
      const idx = stack.map((frame) => frame.tag).lastIndexOf(tag);
      if (idx === -1) continue;
      while (stack.length > idx) {
        const frame = stack.pop();
        if (frame.isCard) depth -= 1;
      }
      continue;
    }
    if (/\/\s*$/.test(attrs)) continue;
    const classAttr = attrs.match(/\bclass\s*=\s*["']([^"']*)["']/i);
    const isCard = Boolean(CARD_TAG.test(tag) && classAttr && CARD_CLASS.test(classAttr[1]));
    if (isCard) {
      depth += 1;
      if (depth > max) max = depth;
    }
    stack.push({ tag, isCard });
  }
  return max;
}

/**
 * Measure one HTML+CSS corpus.
 *
 * @param {{html?: string, css?: string}} sources
 * @returns {{applicable: boolean, metrics: object, issues: string[], warnings: string[]}}
 */
function analyzeVisualSources({ html = '', css = '' } = {}) {
  const markup = String(html || '');
  const styleText = stripComments(`${extractStyleBlocks(markup)}\n${String(css || '')}`);
  const decls = declarations(styleText);

  if (decls.length < 10) {
    return {
      applicable: false,
      reason: 'not enough authored CSS to measure (fewer than 10 declarations) — utility-class markup and framework-generated styles are out of scope for static telemetry',
      metrics: { declarations: decls.length },
      issues: [],
      warnings: []
    };
  }

  // ── token adherence ──────────────────────────────────────────────────────
  let tokenized = 0;
  let literal = 0;
  for (const { prop, value } of decls) {
    if (!TOKENIZABLE.has(prop)) continue;
    if (value.includes('var(--')) tokenized += 1;
    else if (LITERAL_VALUE.test(value)) literal += 1;
  }
  const tokenTotal = tokenized + literal;
  const adherence = tokenTotal === 0 ? null : Math.round((tokenized / tokenTotal) * 100);

  // ── spacing rhythm ───────────────────────────────────────────────────────
  let onGrid = 0;
  const offGrid = [];
  for (const { prop, value } of decls) {
    if (!SPACING_PROPS.has(prop)) continue;
    for (const px of pxValues(value)) {
      if (px === 0) continue;
      if (px % SPACING_GRID === 0) onGrid += 1;
      else offGrid.push(`${prop}: ${px}px`);
    }
  }

  // ── depth strategies ─────────────────────────────────────────────────────
  const depth = { borders: 0, shadows: 0, blur: 0 };
  for (const { prop, value } of decls) {
    if (/^border(-(top|right|bottom|left))?$|^border-(width|style)$/.test(prop) && !/^\s*(none|0)\b/.test(value)) depth.borders += 1;
    if (prop === 'box-shadow' && !/^\s*none\b/.test(value)) depth.shadows += 1;
    if (prop === 'backdrop-filter' || (prop === 'filter' && /blur\s*\(/.test(value))) depth.blur += 1;
  }
  const DEPTH_FLOOR = 3;
  const activeDepth = Object.entries(depth).filter(([, n]) => n >= DEPTH_FLOOR).map(([k]) => k);

  // ── typography ───────────────────────────────────────────────────────────
  const families = new Set();
  for (const { prop, value } of decls) {
    if (prop !== 'font-family') continue;
    const first = value.split(',')[0].trim().replace(/^["']|["']$/g, '').toLowerCase();
    if (first && !first.startsWith('var(')) families.add(first);
  }

  // ── motion ───────────────────────────────────────────────────────────────
  const keyframes = (styleText.match(/@keyframes\b/g) || []).length;
  const animated = decls.filter((d) => d.prop === 'animation' || d.prop === 'animation-name').length;
  const hasReducedMotion = /prefers-reduced-motion/.test(styleText);

  // ── states ───────────────────────────────────────────────────────────────
  const corpus = `${markup}\n${styleText}`;
  const statesPresent = STATE_MARKERS.filter((s) => s.re.test(corpus)).map((s) => s.state);
  const statesMissing = STATE_MARKERS.filter((s) => !s.re.test(corpus)).map((s) => s.state);
  const interactive = INTERACTIVE.test(markup);

  // ── structure ────────────────────────────────────────────────────────────
  const cardNesting = maxCardNesting(markup);
  const mediaElements = (markup.match(/<(img|video|canvas|picture)\b/gi) || []).length;

  // Decorative blob: absolutely positioned, fully rounded, blurred. Three
  // co-occurring properties in one rule — a shape that exists to decorate and
  // nothing else. Any two of them alone is ordinary UI.
  //
  // "Fully rounded" means a circle/ellipse (50%) or the pill idiom (999px and
  // up). A modest radius does not qualify: an absolutely positioned, blurred
  // panel with `border-radius: 9px` is a soft glow behind a card, not a blob,
  // and this is the blocking tier — it has to stay near-zero false positive.
  const FULLY_ROUNDED = /border-radius\s*:\s*(?:50%|\d{3,}px|9{3,})/i;
  const blobs = ruleBlocks(styleText).filter((block) => {
    const body = block.body;
    return /position\s*:\s*(absolute|fixed)/i.test(body)
      && FULLY_ROUNDED.test(body)
      && /filter\s*:\s*[^;]*blur\s*\(/i.test(body);
  }).map((block) => block.selector);

  const metrics = {
    declarations: decls.length,
    token_adherence_pct: adherence,
    tokenized_values: tokenized,
    literal_values: literal,
    spacing_on_grid: onGrid,
    spacing_off_grid: offGrid.length,
    depth_strategies: activeDepth,
    depth_counts: depth,
    font_families: [...families],
    keyframes,
    animated_declarations: animated,
    reduced_motion_handled: hasReducedMotion,
    states_present: statesPresent,
    states_missing: statesMissing,
    interactive_surface: interactive,
    max_card_nesting: cardNesting,
    media_elements: mediaElements
  };

  // ── findings ─────────────────────────────────────────────────────────────
  // issues   = unambiguous defects, provable from the text alone
  // warnings = threshold measurements a reviewer should judge in context
  const issues = [];
  const warnings = [];

  for (const selector of blobs.slice(0, 5)) {
    issues.push(`decorative blob: \`${selector}\` is absolutely positioned, fully rounded and blurred — decoration standing in for product evidence`);
  }
  if ((keyframes > 0 || animated > 0) && !hasReducedMotion) {
    issues.push(`${keyframes} keyframe animation(s) and ${animated} animated declaration(s) with no \`prefers-reduced-motion\` block`);
  }
  if (cardNesting >= 3) {
    issues.push(`card containers nested ${cardNesting} deep — use rows, dividers, inset sections or a dialog instead of another card`);
  }

  if (adherence !== null && tokenTotal >= 10 && adherence < 60) {
    warnings.push(`token adherence ${adherence}% (${tokenized} tokenized vs ${literal} literal values) — hardcoded colors and sizes are how a design system drifts`);
  }
  if (offGrid.length >= 5) {
    const sample = [...new Set(offGrid)].slice(0, 4).join(', ');
    warnings.push(`${offGrid.length} spacing values off the ${SPACING_GRID}px grid (${sample}${offGrid.length > 4 ? ', …' : ''}) — systemless rhythm is the most visible amateur tell`);
  }
  if (activeDepth.length >= 3) {
    warnings.push(`${activeDepth.length} depth strategies in play (${activeDepth.join(' + ')}) — pick one and let the others stay exceptions`);
  }
  if (families.size > 3) {
    warnings.push(`${families.size} distinct font families (${[...families].slice(0, 4).join(', ')}) — a coherent system rarely needs more than two`);
  }
  if (interactive && statesMissing.length > 0) {
    warnings.push(`interactive surface with no marker for: ${statesMissing.join(', ')} — visual polish cannot hide an unfinished workflow`);
  }

  return { applicable: true, metrics, issues, warnings };
}

module.exports = {
  analyzeVisualSources,
  // exported for reuse / tests
  extractStyleBlocks,
  declarations,
  ruleBlocks,
  maxCardNesting,
  stripComments,
  SPACING_GRID
};
