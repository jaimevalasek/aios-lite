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

const { parseCssColor, rgbToHex } = require('./color-math');

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

// ── interaction contracts (forms, confirmation, drag-and-drop, widgets) ──────
// Lexical mirrors of the .aioson/rules/ interaction contracts. Same trade as
// everything else in this file: the one near-zero-FP defect (a native browser
// dialog, contractually banned in prototypes) is an issue; the rest are
// presence/absence measurements a reviewer judges in context.

// Bare or window-qualified native dialog call. `(?<![\w$./])` rejects method
// calls on other objects (`modal.confirm(`), identifiers that merely end in
// the name (`showConfirm(`), and URL paths (`example.com/confirm(guide)`);
// Portuguese verbs (`confirmar(`) fail the `\s*\(`.
const NATIVE_DIALOG = /(?<![\w$./])(?:window\s*\.\s*)?(alert|confirm|prompt)\s*\(/g;

// Field-identity words that imply a structured format. Deliberately excludes
// bare `date`/`data` (the fix is type="date", and pt-BR "data" is too common).
const STRUCTURED_FIELD = /cpf|cnpj|\bcep\b|postal|zipcode|zip.?code|phone|telefone|celular|whatsapp|cart[aã]o|card.?number|nascimento|moeda|currency|pre[cç]o|price|valor/i;

// Input types that already carry semantics; a structured field using one of
// these is not a bare text input.
const SEMANTIC_INPUT_TYPES = new Set(['tel', 'email', 'number', 'date', 'time', 'datetime-local', 'month', 'week', 'url']);

const DESTRUCTIVE_CONTROL = /excluir|deletar|apagar|\bdelete\b|\bremove\b|remover|destroy|desativar|deactivate|arquivar|\barchive\b/i;
const DIALOG_MARKERS = /<dialog\b|role\s*=\s*["']dialog["']|aria-modal|\bmodal\b|\bconfirm(?:ation)?-dialog\b/i;

const KANBAN_MARKERS = /\bkanban\b|\bpipeline\b[\s\S]{0,600}\bstage\b|\bboard\b[\s\S]{0,600}\b(column|lane|coluna)\b/i;
const DND_MARKERS = /\bdraggable\s*=|dragstart|dragover|dragend|ondrop\b|\bsortable\b|\bdnd\b|pointerdown/i;

const MANAGEMENT_MARKERS = /\b(dashboard|cockpit|crm|erp|back.?office|painel|admin)\b/i;
const WIDGET_MARKERS = /\b(widget|kpi|chart|metric|m[eé]trica|indicador|sparkline|graph|gr[aá]fico)\b|<canvas\b/i;

/** Text of every `<script>` block plus inline `on*=` handler values. */
function extractScriptText(html) {
  const markup = String(html || '');
  const out = [];
  const scriptRe = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = scriptRe.exec(markup))) out.push(m[1]);
  const handlerRe = /\bon\w+\s*=\s*("[^"]*"|'[^']*')/gi;
  while ((m = handlerRe.exec(markup))) out.push(m[1].slice(1, -1));
  return out.join('\n');
}

/** `<input …>` tags whose identity implies a structured format but whose attributes carry no input semantics. */
function bareStructuredInputs(html) {
  const out = [];
  const re = /<input\b([^>]*)>/gi;
  let m;
  while ((m = re.exec(String(html || '')))) {
    const attrs = m[1] || '';
    const attr = (name) => {
      const found = attrs.match(new RegExp(`\\b${name}\\s*=\\s*("[^"]*"|'[^']*')`, 'i'));
      return found ? found[1].slice(1, -1) : null;
    };
    const identity = [attr('name'), attr('id'), attr('placeholder'), attr('aria-label')].filter(Boolean).join(' ');
    if (!identity || !STRUCTURED_FIELD.test(identity)) continue;
    const type = (attr('type') || 'text').toLowerCase();
    const hasSemantics =
      SEMANTIC_INPUT_TYPES.has(type) ||
      /\binputmode\s*=|\bpattern\s*=|\bmaxlength\s*=|\bautocomplete\s*=/i.test(attrs) ||
      /mask/i.test(`${attr('class') || ''} ${attrs.match(/\bdata-[\w-]*mask[\w-]*/i) || ''}`);
    if (!hasSemantics) out.push(identity.trim().slice(0, 60));
  }
  return out;
}

const CARD_TAG = /^(div|section|article|li|aside)$/i;
const CARD_CLASS = /\b(card|panel|tile|widget)\b/i;

// Emoji standing in for icons. The range covers pictographs, symbols and
// dingbats; the allowlist removes the handful of dingbats UI text uses
// deliberately (checkmarks, crosses, stars), because those are typography,
// not icon-faking. Warning tier: emoji inside seeded mock CONTENT (a chat
// message, a reaction) is legitimate and only a reviewer can tell.
const EMOJI_GLYPH = /[\u{1F1E6}-\u{1F1FF}\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu;
const EMOJI_ALLOWED = new Set(['✓', '✔', '✕', '✖', '✗', '✘', '★', '☆']);

// Spaced em dashes in prose position — the most recognizable model-writing
// cadence. Scattered microcopy (toasts, placeholders, tour steps, seeded mock
// data) hides it from sentence-level review: each instance reads as one
// deliberate em dash while the corpus saturates, so the check counts the whole
// surface. Code punctuation never spaces an em dash, which keeps the lexical
// count near-zero false positive. Warning tier with a threshold: a couple of
// deliberate interruptions are legitimate typography.
const EM_DASH_PROSE = /\s—\s/g;
const EM_DASH_PROSE_THRESHOLD = 4;

// Prototype affordance markers. `data-aioson-id` is the build contract's anchor
// attribute, so its presence identifies an AIOSON prototype; only then are the
// tour and primary-feature markers expected.
const PROTOTYPE_ANCHOR = /data-aioson-id\s*=/i;
const PRIMARY_MARKER = /data-aioson-primary\b/i;
const TOUR_MARKER = /data-aioson-tour\b/i;

// ── craft floor (the measured half of "premium") ─────────────────────────────
// Hygiene metrics prove discipline; none of them can see ambition. A surface
// with perfect tokens, perfect rhythm and OS-default typography reads as a
// default document — the measured shape of "cheap". The craft axis counts the
// levers that separate a designed surface from a hygienic one: a delivered
// typeface, display-scale type, material depth, motion choreography, and
// evidence imagery. Each lever is a fact provable from the text; only the
// aggregate is judgment, and it stays a warning.
//
// Small corpora (component demos, unit fixtures, fragments) are not surfaces —
// the craft axis only measures documents with a real amount of authored CSS.
const CRAFT_MIN_DECLARATIONS = 150;
const CRAFT_LEVER_FLOOR = 2; // warn at <= 2 of 5 active
const DISPLAY_TYPE_FLOOR_PX = 56; // 3.5rem — where display typography starts

// Families every OS ships (or ships a metric twin of): naming one of these
// first is delivery-free by definition. Naming anything else WITHOUT an
// @font-face or webfont link means most machines silently render the fallback.
const OS_DEFAULT_FONT_STACKS = new Set([
  'system-ui', '-apple-system', 'blinkmacsystemfont', 'ui-serif', 'ui-sans-serif',
  'ui-monospace', 'ui-rounded', 'segoe ui', 'segoe ui variable', 'roboto', 'arial',
  'helvetica', 'helvetica neue', 'georgia', 'times', 'times new roman', 'garamond',
  'palatino', 'palatino linotype', 'book antiqua', 'iowan old style', 'charter',
  'cambria', 'calibri', 'candara', 'constantia', 'corbel', 'optima', 'avenir',
  'avenir next', 'seravek', 'verdana', 'tahoma', 'trebuchet ms', 'gill sans',
  'courier', 'courier new', 'consolas', 'monaco', 'menlo', 'sfmono-regular',
  'sf mono', 'sf pro', 'sf pro text', 'sf pro display', 'lucida grande',
  'lucida sans', 'noto sans', 'noto serif', 'droid sans', 'cantarell', 'ubuntu',
  'liberation sans', 'liberation serif', 'dejavu sans', 'dejavu serif',
  'apple color emoji', 'segoe ui emoji', 'segoe ui symbol', 'noto color emoji',
  'serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'math', 'emoji'
]);
const CSS_WIDE_KEYWORDS = new Set(['inherit', 'initial', 'unset', 'revert', 'revert-layer']);

// The build contract's one sanctioned external resource: font delivery hosts.
const WEBFONT_HOST = /fonts\.googleapis\.com|fonts\.gstatic\.com|fonts\.bunny\.net|api\.fontshare\.com|cdn\.fontshare\.com|use\.typekit\.net|fonts\.cdnfonts\.com/i;

// Scroll-driven reveal machinery — CSS-native or the vanilla JS idiom.
const SCROLL_REVEAL = /IntersectionObserver|view-timeline|scroll-timeline|animation-timeline|@starting-style/i;

// Modern CSS vocabulary probes. Each is a native, build-free feature of the
// current platform; a full surface using NONE of them was authored in the
// pre-2020 dialect — the measured shape of "looks dated" even when every
// hygiene metric passes. Probes are (name, regex-over-css) pairs; scroll-driven
// machinery is probed over the whole markup because the vanilla JS idiom counts.
const MODERN_CSS_PROBES = [
  { feature: 'container queries', re: /@container\b|container-type\s*:/i },
  { feature: ':has()', re: /:has\(/i },
  { feature: 'fluid clamp() type', re: /clamp\(/i },
  { feature: 'oklch/color-mix', re: /oklch\(|oklab\(|color-mix\(/i },
  { feature: 'subgrid', re: /\bsubgrid\b/i },
  { feature: 'text-wrap balance', re: /text-wrap\s*:\s*(balance|pretty)/i },
  { feature: 'aspect-ratio', re: /aspect-ratio\s*:/i }
];

/** Strip CSS comments so commented-out code never counts as a measurement. */
function stripComments(css) {
  return String(css || '').replace(/\/\*[\s\S]*?\*\//g, '');
}

/**
 * Strip HTML comments so commented-out markup never counts as a measurement.
 * A design-rationale header saying "not admin density" must not read as a
 * management surface, and a commented-out `<input name="cpf">` is not a bare
 * structured field.
 */
function stripHtmlComments(html) {
  return String(html || '').replace(/<!--[\s\S]*?-->/g, '');
}

/**
 * Strip JS comments before the native-dialog scan — a commented-out
 * `// confirm('...')` must never fire the blocking tier. Lexical like
 * everything here: `//` preceded by `:` survives so string URLs are safe;
 * a `//` inside another string may over-strip its line, which trades a rare
 * false negative for the tier's near-zero-false-positive promise.
 */
function stripJsComments(js) {
  return String(js || '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:\\])\/\/[^\n]*/gm, '$1');
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

/** Split a CSS value on top-level commas — commas inside function calls stay put. */
function topLevelSplit(value) {
  const out = [];
  let depth = 0;
  let current = '';
  for (const ch of String(value || '')) {
    if (ch === '(') depth += 1;
    else if (ch === ')') depth -= 1;
    if (ch === ',' && depth === 0) {
      out.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  if (current.trim()) out.push(current);
  return out;
}

/** Map of `--custom-property` → raw value across the corpus. Last write wins. */
function customProperties(css) {
  const out = {};
  const re = /(--[\w-]+)\s*:\s*([^;{}]+)/g;
  let m;
  while ((m = re.exec(String(css || '')))) out[m[1]] = m[2].trim();
  return out;
}

/**
 * Resolve `var(--x, fallback)` chains against the corpus's own custom
 * properties, depth-limited. This is what lets typography metrics see through
 * a token system — `font-family: var(--font-display)` was invisible to the
 * measurement before, which is how a surface reported "fonts 0" while
 * rendering Georgia.
 */
function resolveCustomProps(value, props, depth = 0) {
  if (depth > 4 || !/var\(/.test(String(value || ''))) return String(value || '');
  const re = /var\(\s*(--[\w-]+)\s*(?:,\s*([^()]*(?:\([^()]*\)[^()]*)*))?\)/g;
  const replaced = String(value).replace(re, (all, name, fallback) => {
    if (props[name] != null) return resolveCustomProps(props[name], props, depth + 1);
    if (fallback != null) return resolveCustomProps(fallback, props, depth + 1);
    return all;
  });
  return replaced;
}

/**
 * A font-size value in px, or null. rem/em resolve against 16; `clamp()` reads
 * its maximum arm — fluid type is judged by where it is allowed to grow.
 */
function fontSizePx(value) {
  let v = String(value || '').trim();
  const clamp = v.match(/clamp\(([\s\S]*)\)/i);
  if (clamp) {
    const arms = topLevelSplit(clamp[1]);
    v = (arms[arms.length - 1] || v).trim();
  }
  let m;
  if ((m = v.match(/(-?\d*\.?\d+)px\b/))) return Math.abs(Number(m[1]));
  if ((m = v.match(/(-?\d*\.?\d+)rem\b/))) return Math.abs(Number(m[1])) * 16;
  if ((m = v.match(/(-?\d*\.?\d+)em\b/))) return Math.abs(Number(m[1])) * 16;
  return null;
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
 * Longest run of consecutive sibling card-like elements sharing one class
 * attribute — the "uniform card wall" every generative default converges on.
 * Same lexical tag walker as `maxCardNesting`; a run is broken by any sibling
 * tag with a different (or no) card class. Restricted to card classes on
 * purpose: twenty `.row` siblings are a list, eight identical `.card` siblings
 * are the replaceability test failing in markup.
 *
 * @returns {{run: number, className: string|null}}
 */
function maxCardSiblingRun(html) {
  const re = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)\b([^>]*)>/g;
  const rootFrame = { tag: null, lastKey: null, run: 0 };
  const stack = [rootFrame];
  let best = { run: 0, className: null };
  let m;
  while ((m = re.exec(String(html || '')))) {
    const closing = m[1] === '/';
    const tag = m[2].toLowerCase();
    const attrs = m[3] || '';
    if (VOID_OR_OPAQUE.has(tag)) {
      // A void sibling (hr, img) still separates two cards visually.
      stack[stack.length - 1].lastKey = null;
      stack[stack.length - 1].run = 0;
      continue;
    }
    if (closing) {
      const idx = stack.map((frame) => frame.tag).lastIndexOf(tag);
      if (idx > 0) stack.length = idx; // unwind to (and drop) the matching frame
      continue;
    }
    const parent = stack[stack.length - 1];
    const classAttr = attrs.match(/\bclass\s*=\s*["']([^"']*)["']/i);
    const classValue = classAttr ? classAttr[1].trim().replace(/\s+/g, ' ') : '';
    const key = CARD_TAG.test(tag) && CARD_CLASS.test(classValue) ? `${tag}.${classValue}` : null;
    if (key && key === parent.lastKey) {
      parent.run += 1;
    } else {
      parent.lastKey = key;
      parent.run = key ? 1 : 0;
    }
    if (parent.run > best.run) best = { run: parent.run, className: classValue };
    if (!/\/\s*$/.test(attrs)) stack.push({ tag, lastKey: null, run: 0 });
  }
  return best;
}

/** Unique emoji glyphs in the corpus, minus the deliberate-typography allowlist. */
function emojiGlyphs(text) {
  const out = new Set();
  for (const hit of String(text || '').matchAll(EMOJI_GLYPH)) {
    if (!EMOJI_ALLOWED.has(hit[0])) out.add(hit[0]);
  }
  return [...out];
}

/**
 * Spaced em dashes across the visible corpus, with short context samples.
 * Styles are removed first (CSS is never user-visible prose) and HTML/JS
 * comments are stripped (commented-out text is not on the surface); script
 * string/template content stays in — that is where SPA copy and seed data live.
 */
function emDashProse(html) {
  const noComments = stripHtmlComments(html);
  const noStyles = noComments.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '\n');
  const corpus = noStyles.replace(
    /(<script\b[^>]*>)([\s\S]*?)(<\/script>)/gi,
    (all, open, body, close) => `${open}${stripJsComments(body)}${close}`
  );
  const count = (corpus.match(EM_DASH_PROSE) || []).length;
  const samples = [];
  const sampleRe = /([^\s—][^\n—]{0,21})?\s—\s(?:([^\n—]{0,21}[^\s—]))?/g;
  let m;
  while (samples.length < 3 && (m = sampleRe.exec(corpus))) {
    samples.push(`${m[1] || ''} — ${m[2] || ''}`.replace(/\s+/g, ' ').trim());
  }
  return { count, samples };
}

/**
 * Measure one HTML+CSS corpus.
 *
 * @param {{html?: string, css?: string}} sources
 * @returns {{applicable: boolean, metrics: object, issues: string[], warnings: string[]}}
 */
function analyzeVisualSources({ html = '', css = '' } = {}) {
  const markup = stripHtmlComments(html);
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
  // var()-resolved: `font-family: var(--font-display)` is a token, not an
  // invisible font. The first family of each stack is what actually renders.
  const props = customProperties(styleText);
  const families = new Set();
  for (const { prop, value } of decls) {
    if (prop !== 'font-family') continue;
    const resolved = resolveCustomProps(value, props);
    const first = topLevelSplit(resolved)[0];
    const name = first ? first.trim().replace(/^["']|["']$/g, '').toLowerCase() : '';
    if (name && !name.startsWith('var(') && !CSS_WIDE_KEYWORDS.has(name)) families.add(name);
  }

  // Font delivery: does anything make a non-OS family actually render?
  const fontFaceBlocks = (styleText.match(/@font-face\b/g) || []).length;
  const webfontLinked =
    WEBFONT_HOST.test(markup.match(/<link\b[^>]*>/gi)?.join('\n') || '') ||
    WEBFONT_HOST.test(styleText.match(/@import\b[^;]+/gi)?.join('\n') || '');
  const fontDelivered = fontFaceBlocks > 0 || webfontLinked;
  const undeliveredFamilies = fontDelivered
    ? []
    : [...families].filter((f) => !OS_DEFAULT_FONT_STACKS.has(f));

  // Type scale: the largest resolved font-size is where display typography
  // lives (or does not). clamp() counts at its max arm.
  let maxFontPx = 0;
  const fontSizes = new Set();
  for (const { prop, value } of decls) {
    if (prop !== 'font-size') continue;
    const px = fontSizePx(resolveCustomProps(value, props));
    if (px === null) continue;
    fontSizes.add(px);
    if (px > maxFontPx) maxFontPx = px;
  }
  const fluidType = /font-size\s*:\s*[^;{}]*clamp\(/i.test(styleText) ||
    [...Object.values(props)].some((v) => /clamp\(/.test(v) && /rem|px/.test(v));

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
  const cardWall = maxCardSiblingRun(markup);
  const emoji = emojiGlyphs(markup);
  const emDash = emDashProse(markup);

  // ── prototype affordances ────────────────────────────────────────────────
  const isPrototype = PROTOTYPE_ANCHOR.test(markup);
  const hasPrimaryMarker = PRIMARY_MARKER.test(markup);
  const hasTourMarker = TOUR_MARKER.test(markup);

  // ── interaction contracts ────────────────────────────────────────────────
  const scriptText = stripJsComments(extractScriptText(markup));
  const nativeDialogs = [...new Set([...scriptText.matchAll(NATIVE_DIALOG)].map((hit) => hit[1]))];
  const unmaskedInputs = bareStructuredInputs(markup);
  const destructiveControls = (markup.match(/<button\b[^>]*>[^<]*<\/button>|<button\b[^>]*>/gi) || [])
    .filter((tag) => DESTRUCTIVE_CONTROL.test(tag)).length;
  const hasDialogMachinery = DIALOG_MARKERS.test(corpus);
  const kanbanSurface = KANBAN_MARKERS.test(markup);
  const hasDndMarkers = DND_MARKERS.test(corpus);
  const managementSurface = MANAGEMENT_MARKERS.test(markup);
  const hasWidgetMarkers = WIDGET_MARKERS.test(corpus);

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

  // ── craft levers (measured ambition) ─────────────────────────────────────
  const gradientCount = (styleText.match(/(?:linear|radial|conic)-gradient\(/gi) || []).length;
  let layeredShadows = 0;
  for (const { prop, value } of decls) {
    if (prop !== 'box-shadow' && prop !== 'text-shadow') continue;
    const resolved = resolveCustomProps(value, props);
    if (/^\s*none\b/i.test(resolved)) continue;
    if (topLevelSplit(resolved).length >= 2) layeredShadows += 1;
  }
  const grainNoise = /feTurbulence/i.test(markup);
  const blendModes = decls.filter((d) => d.prop === 'mix-blend-mode' || d.prop === 'background-blend-mode').length;
  const maskLayers = decls.filter((d) => d.prop === 'mask-image' || d.prop === '-webkit-mask-image').length;
  const modernColor = (styleText.match(/color-mix\(|oklch\(|oklab\(/gi) || []).length;
  const backgroundImages = decls.filter((d) => (d.prop === 'background' || d.prop === 'background-image') && /url\(/i.test(d.value)).length;
  const transitionCount = decls.filter((d) => d.prop === 'transition' || d.prop === 'transition-property').length;
  const scrollReveal = SCROLL_REVEAL.test(markup);

  const materialTechniques = [
    gradientCount >= 2 && 'gradients',
    layeredShadows >= 2 && 'layered shadows',
    depth.blur >= 1 && 'blur',
    grainNoise && 'grain',
    blendModes >= 1 && 'blend modes',
    maskLayers >= 1 && 'masks',
    modernColor >= 3 && 'modern color'
  ].filter(Boolean);

  const modernCss = MODERN_CSS_PROBES.filter((probe) => probe.re.test(styleText)).map((probe) => probe.feature);
  if (scrollReveal) modernCss.push('scroll-driven reveals');

  // ── palette fingerprint ──────────────────────────────────────────────────
  // Which hue family this surface actually ships, as arithmetic: every color
  // literal (var()-resolved) converted to OKLCH and weighted by use. The
  // fingerprint is what makes cross-PROJECT sameness machine-visible — each
  // surface can pass every gate alone while the operator's projects all land
  // on the model's favorite palette; comparing fingerprints is how that stops
  // being a feeling and starts being a measured delta.
  const COLOR_TOKEN = /#[0-9a-fA-F]{3,8}\b|(?:rgba?|hsla?|oklch)\([^()]*\)/g;
  const colorCounts = new Map(); // canonical hex → { count, oklch }
  const groundCounts = new Map(); // background-prop colors only
  for (const { prop, value } of decls) {
    const resolved = resolveCustomProps(value, props);
    let match;
    COLOR_TOKEN.lastIndex = 0;
    let first = true;
    while ((match = COLOR_TOKEN.exec(resolved))) {
      const parsed = parseCssColor(match[0]);
      if (!parsed || parsed.alpha < 0.5) { first = false; continue; }
      const key = rgbToHex(parsed);
      const record = colorCounts.get(key) || { count: 0, oklch: parsed.oklch };
      record.count += 1;
      colorCounts.set(key, record);
      if (first && parsed.alpha >= 0.9 && (prop === 'background' || prop === 'background-color')) {
        groundCounts.set(key, (groundCounts.get(key) || 0) + 1);
      }
      first = false;
    }
  }
  const CHROMATIC_FLOOR = 0.07; // OKLCH chroma below this reads as a tinted neutral
  let colorLiteralCount = 0;
  let chromaticCount = 0;
  const clusters = []; // { sin, cos, weight, maxChroma } — greedy ±20° hue clustering
  const sorted = [...colorCounts.values()].sort((a, b) => b.count - a.count);
  for (const { count, oklch } of sorted) {
    colorLiteralCount += count;
    if (oklch.c < CHROMATIC_FLOOR) continue;
    chromaticCount += count;
    const rad = (oklch.h * Math.PI) / 180;
    const home = clusters.find((cl) => {
      const rep = ((Math.atan2(cl.sin, cl.cos) * 180) / Math.PI + 360) % 360;
      const d = Math.abs(((oklch.h - rep) % 360 + 360) % 360);
      return Math.min(d, 360 - d) <= 20;
    });
    if (home) {
      home.sin += Math.sin(rad) * count;
      home.cos += Math.cos(rad) * count;
      home.weight += count;
      home.maxChroma = Math.max(home.maxChroma, oklch.c);
    } else {
      clusters.push({ sin: Math.sin(rad) * count, cos: Math.cos(rad) * count, weight: count, maxChroma: oklch.c });
    }
  }
  clusters.sort((a, b) => b.weight - a.weight);
  const accentCluster = clusters[0] || null;
  const accentHue = accentCluster
    ? Math.round(((Math.atan2(accentCluster.sin, accentCluster.cos) * 180) / Math.PI + 360) % 360)
    : null;
  let ground = null;
  if (groundCounts.size > 0) {
    const [groundHex] = [...groundCounts.entries()].sort((a, b) => b[1] - a[1])[0];
    const g = colorCounts.get(groundHex).oklch;
    const pole = g.c >= 0.12 ? 'chromatic' : g.l >= 0.75 ? 'light' : g.l <= 0.45 ? 'dark' : 'mid';
    ground = { hex: groundHex, l: Math.round(g.l * 100) / 100, c: Math.round(g.c * 1000) / 1000, h: Math.round(g.h), pole };
  }
  const palette = {
    color_literals: colorLiteralCount,
    chromatic_share_pct: colorLiteralCount ? Math.round((chromaticCount / colorLiteralCount) * 100) : null,
    hue_clusters: clusters.length,
    accent_hue: accentHue,
    accent_chroma: accentCluster ? Math.round(accentCluster.maxChroma * 1000) / 1000 : null,
    ground
  };

  const craftMeasured = decls.length >= CRAFT_MIN_DECLARATIONS;
  const levers = {
    typeface: fontDelivered,
    display_scale: maxFontPx >= DISPLAY_TYPE_FLOOR_PX,
    material: materialTechniques.length >= 2,
    motion: (keyframes >= 3 && hasReducedMotion) || scrollReveal || transitionCount >= 12,
    evidence: mediaElements >= 1 || backgroundImages >= 1
  };
  const activeLevers = Object.values(levers).filter(Boolean).length;

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
    font_delivery: {
      font_face_blocks: fontFaceBlocks,
      webfont_linked: webfontLinked,
      delivered: fontDelivered,
      undelivered_families: undeliveredFamilies
    },
    max_font_size_px: maxFontPx || null,
    font_size_count: fontSizes.size,
    fluid_type: fluidType,
    keyframes,
    animated_declarations: animated,
    reduced_motion_handled: hasReducedMotion,
    states_present: statesPresent,
    states_missing: statesMissing,
    interactive_surface: interactive,
    max_card_nesting: cardNesting,
    max_card_sibling_run: cardWall.run,
    card_sibling_class: cardWall.className,
    emoji_glyphs: emoji,
    em_dash_prose: emDash.count,
    prototype_anchors: isPrototype,
    primary_marker: hasPrimaryMarker,
    tour_marker: hasTourMarker,
    media_elements: mediaElements,
    native_dialog_calls: nativeDialogs,
    structured_inputs_without_semantics: unmaskedInputs,
    destructive_controls: destructiveControls,
    dialog_machinery: hasDialogMachinery,
    kanban_surface: kanbanSurface,
    dnd_markers: hasDndMarkers,
    management_surface: managementSurface,
    widget_markers: hasWidgetMarkers,
    palette,
    craft: {
      measured: craftMeasured,
      active_levers: activeLevers,
      levers,
      material_techniques: materialTechniques,
      gradient_count: gradientCount,
      layered_shadow_declarations: layeredShadows,
      grain_noise: grainNoise,
      blend_modes: blendModes,
      mask_layers: maskLayers,
      modern_color_functions: modernColor,
      background_images: backgroundImages,
      transition_declarations: transitionCount,
      scroll_reveal: scrollReveal,
      modern_css: modernCss
    }
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
  if (nativeDialogs.length > 0) {
    issues.push(`native browser dialog call(s): ${nativeDialogs.map((name) => `${name}()`).join(', ')} — use the design system's modal/toast; native dialogs are contractually banned`);
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
  if (unmaskedInputs.length > 0) {
    const sample = unmaskedInputs.slice(0, 3).join('; ');
    warnings.push(`${unmaskedInputs.length} structured field(s) with no input semantics (${sample}${unmaskedInputs.length > 3 ? ', …' : ''}) — a CPF/phone/currency field needs a mask, inputmode, pattern, maxlength or autocomplete (form-fields-masks-and-validation rule)`);
  }
  if (destructiveControls > 0 && !hasDialogMachinery) {
    warnings.push(`${destructiveControls} destructive control(s) with no dialog machinery in the corpus — status changes and deletions confirm through a design-system modal (status-change-confirmation rule)`);
  }
  if (kanbanSurface && !hasDndMarkers) {
    warnings.push('kanban/pipeline surface with no drag-and-drop markers — recurrent status flows move by drag-and-drop with an accessible fallback (status-flow-drag-and-drop rule)');
  }
  if (managementSurface && !hasWidgetMarkers) {
    warnings.push('management surface with no widget/KPI/chart markers — a management home opens with decision-driving widgets (management-home-widgets rule)');
  }
  if (emoji.length > 0) {
    const sample = emoji.slice(0, 6).join(' ');
    warnings.push(`${emoji.length} emoji glyph(s) in the UI corpus (${sample}${emoji.length > 6 ? ' …' : ''}) — emoji standing in for icons is a slop marker; use the icon set. Emoji inside seeded mock content is fine — judge in context`);
  }
  if (emDash.count >= EM_DASH_PROSE_THRESHOLD) {
    const sample = emDash.samples.map((s) => `"${s}"`).join(', ');
    warnings.push(`${emDash.count} spaced em dash(es) across UI copy and mock content (${sample}${emDash.count > emDash.samples.length ? ', …' : ''}) — repeated em-dash cadence is a model-writing tell; keep a deliberate few and rewrite the rest with periods, colons, or shorter sentences. Quotations stay verbatim — judge in context`);
  }
  if (cardWall.run >= 8) {
    warnings.push(`${cardWall.run} consecutive sibling cards share class "${cardWall.className}" — a uniform card wall is the replaceability test failing in markup; vary the composition or collapse to rows`);
  }
  if (isPrototype && !hasPrimaryMarker) {
    warnings.push('prototype has `data-aioson-id` anchors but no `data-aioson-primary` marker — mark the one region rendering the briefing\'s #1 differentiator so the runtime fold check can prove it is visible without scrolling');
  }
  if (isPrototype && !hasTourMarker) {
    warnings.push('prototype has no first-open explainer (`data-aioson-tour`) — a briefing prototype must explain itself to the owner: 3–5 lay steps from the briefing promises, reopenable via a persistent `?` control');
  }

  // ── craft warnings (full surfaces only) ──────────────────────────────────
  // Typography first: it is the single most visible "cheap default" tell, and
  // both failure shapes are provable from the text. A family named without any
  // delivery mechanism silently renders the OS fallback on most machines — the
  // chosen face never reaches the user.
  if (craftMeasured && !fontDelivered) {
    if (undeliveredFamilies.length > 0) {
      const sample = undeliveredFamilies.slice(0, 4).join(', ');
      warnings.push(`font families named but never delivered (${sample}) — no @font-face and no webfont link in the corpus, so most machines silently render the OS fallback instead of the chosen face; link the typeface (the build contract's font exception) or embed a WOFF2 @font-face, and keep a deliberate fallback stack`);
    } else if (families.size > 0) {
      const sample = [...families].slice(0, 4).join(', ');
      warnings.push(`typography never leaves the OS default stacks (${sample}) — the most visible "cheap default" tell there is; a premium surface delivers one real typeface (webfont link or embedded @font-face) with a credible fallback that preserves hierarchy`);
    }
  }
  if (craftMeasured && activeLevers <= CRAFT_LEVER_FLOOR) {
    const missing = [];
    if (!levers.typeface) missing.push(`a delivered typeface (${fontFaceBlocks} @font-face, webfont link ${webfontLinked ? 'present' : 'absent'})`);
    if (!levers.display_scale) missing.push(`display-scale type (largest font-size ${maxFontPx || 0}px, floor ${DISPLAY_TYPE_FLOOR_PX}px)`);
    if (!levers.material) missing.push(`material depth (${gradientCount} gradients, ${layeredShadows} layered shadows, ${depth.blur} blur, grain ${grainNoise ? 'yes' : 'no'})`);
    if (!levers.motion) missing.push(`motion choreography (${keyframes} keyframes, ${transitionCount} transitions, no scroll reveal)`);
    if (!levers.evidence) missing.push(`evidence imagery (${mediaElements} media elements, ${backgroundImages} CSS image layers)`);
    warnings.push(`craft floor: ${activeLevers}/5 premium levers active — missing: ${missing.join('; ')}. Hygiene alone reads as a default document, not a designed product; each lever is optional, the floor is not (visual-effects.md owns the vocabulary, the register's premium bar owns the shape)`);
  }
  if (craftMeasured && modernCss.length === 0) {
    warnings.push('authored in pre-2020 CSS only — none of: container queries, :has(), fluid clamp() type, oklch/color-mix, subgrid, text-wrap balance, aspect-ratio, scroll-driven reveals. The current platform repertoire is absent, which is the measured shape of "looks dated"; adopt the features the surface earns (visual-effects.md, Modern baseline)');
  }

  return { applicable: true, metrics, issues, warnings };
}

module.exports = {
  analyzeVisualSources,
  // exported for reuse / tests
  topLevelSplit,
  customProperties,
  resolveCustomProps,
  fontSizePx,
  extractStyleBlocks,
  extractScriptText,
  bareStructuredInputs,
  declarations,
  ruleBlocks,
  maxCardNesting,
  maxCardSiblingRun,
  emojiGlyphs,
  emDashProse,
  stripComments,
  stripHtmlComments,
  stripJsComments,
  SPACING_GRID
};
