'use strict';

/**
 * Runtime visual telemetry — the measurements that only exist once a browser has
 * laid the page out.
 *
 * Static telemetry (`visual-telemetry.js`) reads what was written. This reads
 * what happened: horizontal overflow, clipped text, elements pushed off-screen,
 * undersized tap targets, and real computed contrast. None of that is knowable
 * from source text, and all of it is knowable exactly — no heuristics.
 *
 * Opt-in by construction. Playwright is an optional dependency here exactly as it
 * is for `qa:run`; when it is absent this module reports `available: false` with
 * the install line and no finding at all. A gate that silently degrades into
 * "looks fine" is worse than a gate that says it did not run.
 *
 * The measurement logic is split so it can be proven without a browser:
 *   - `contrastRatio` / `parseColor` / `summarizeRuntime` are pure and unit-tested;
 *   - `collectRuntimeMeasurements` is the thin glue that drives a real page.
 */

const DEFAULT_VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'mobile', width: 360, height: 740 }
];

const MIN_TAP_TARGET = 44;
const CONTRAST_NORMAL = 4.5;
const CONTRAST_LARGE = 3;

/** Parse `rgb()` / `rgba()` / `#rgb` / `#rrggbb` into {r,g,b,a} or null. */
function parseColor(input) {
  const value = String(input || '').trim();
  if (!value) return null;

  const rgb = value.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+%?))?\s*\)$/i);
  if (rgb) {
    let alpha = 1;
    if (rgb[4] !== undefined) {
      alpha = rgb[4].endsWith('%') ? Number(rgb[4].slice(0, -1)) / 100 : Number(rgb[4]);
    }
    return { r: Number(rgb[1]), g: Number(rgb[2]), b: Number(rgb[3]), a: Number.isFinite(alpha) ? alpha : 1 };
  }

  const hex = value.match(/^#([0-9a-f]{3,8})$/i);
  if (hex) {
    let h = hex[1];
    if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join('');
    if (h.length !== 6 && h.length !== 8) return null;
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
      a: h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1
    };
  }
  return null;
}

/** Composite a possibly-translucent foreground over an opaque background. */
function flatten(fg, bg) {
  const a = fg.a === undefined ? 1 : fg.a;
  if (a >= 1) return fg;
  return {
    r: fg.r * a + bg.r * (1 - a),
    g: fg.g * a + bg.g * (1 - a),
    b: fg.b * a + bg.b * (1 - a),
    a: 1
  };
}

function relativeLuminance({ r, g, b }) {
  const channel = (v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/**
 * WCAG 2.x contrast ratio between a foreground and background color.
 * Returns null when either color cannot be parsed — never a fabricated number.
 */
function contrastRatio(foreground, background) {
  const bg = parseColor(background);
  const fgRaw = parseColor(foreground);
  if (!bg || !fgRaw) return null;
  const fg = flatten(fgRaw, bg);
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const [light, dark] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return Math.round(((light + 0.05) / (dark + 0.05)) * 100) / 100;
}

/** WCAG large text: >= 24px, or >= 18.66px when bold. */
function isLargeText(fontSizePx, fontWeight) {
  const size = Number(fontSizePx) || 0;
  const weight = Number(fontWeight) || 400;
  return size >= 24 || (size >= 18.66 && weight >= 700);
}

/**
 * The function serialized into the page. Returns raw measurements only — every
 * verdict is formed outside, in `summarizeRuntime`, where it can be tested.
 *
 * Kept dependency-free and ES5-ish on purpose: it is stringified into a browser
 * context, not bundled.
 */
/* istanbul ignore next — executes inside the page, covered by summarizeRuntime */
function pageProbe() {
  const doc = document;
  const root = doc.documentElement;
  const out = {
    scroll_width: root.scrollWidth,
    viewport_width: window.innerWidth,
    viewport_height: window.innerHeight,
    clipped: [],
    offscreen: [],
    small_targets: [],
    text_samples: [],
    primary: []
  };

  const label = (el) => {
    const id = el.id ? `#${el.id}` : '';
    const cls = typeof el.className === 'string' && el.className ? `.${el.className.trim().split(/\s+/)[0]}` : '';
    return `${el.tagName.toLowerCase()}${id}${cls}`;
  };

  const opaqueBackground = (el) => {
    let node = el;
    while (node && node !== doc) {
      const bg = getComputedStyle(node).backgroundColor;
      if (bg && bg !== 'transparent' && !/rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\s*\)/.test(bg)) return bg;
      node = node.parentElement;
    }
    return 'rgb(255, 255, 255)';
  };

  const all = doc.querySelectorAll('body *');
  for (let i = 0; i < all.length && i < 3000; i++) {
    const el = all[i];
    const style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') continue;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) continue;

    if (el.scrollWidth > el.clientWidth + 1 && /hidden|clip/.test(style.overflowX) && el.textContent.trim()) {
      out.clipped.push(label(el));
    }
    if (rect.right > window.innerWidth + 1 || rect.left < -1) {
      out.offscreen.push(label(el));
    }
    if (/^(a|button|input|select|textarea)$/i.test(el.tagName) && style.pointerEvents !== 'none') {
      if (rect.height > 0 && (rect.height < 44 || rect.width < 44)) {
        out.small_targets.push(`${label(el)} ${Math.round(rect.width)}x${Math.round(rect.height)}`);
      }
    }

    const ownText = [...el.childNodes]
      .filter((n) => n.nodeType === 3 && n.textContent.trim())
      .map((n) => n.textContent.trim())
      .join(' ');
    if (ownText && out.text_samples.length < 400) {
      out.text_samples.push({
        el: label(el),
        color: style.color,
        background: opaqueBackground(el),
        font_size: parseFloat(style.fontSize),
        font_weight: style.fontWeight,
        text: ownText.slice(0, 40)
      });
    }
  }

  // The build contract marks the briefing's #1 differentiator with
  // `data-aioson-primary`. Raw geometry only — the fold verdict is formed in
  // `summarizeRuntime` where it can be unit-tested.
  const primaries = doc.querySelectorAll('[data-aioson-primary]');
  for (let i = 0; i < primaries.length && i < 10; i++) {
    const el = primaries[i];
    const style = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    out.primary.push({
      el: label(el),
      hidden: style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0'
        || (rect.width === 0 && rect.height === 0),
      top: Math.round(rect.top),
      height: Math.round(rect.height)
    });
  }
  return out;
}

/**
 * Turn raw per-viewport measurements into metrics and findings.
 *
 * @param {Array<{viewport: object, raw: object}>} runs
 * @returns {{metrics: object, issues: string[], warnings: string[]}}
 */
function summarizeRuntime(runs) {
  const issues = [];
  const warnings = [];
  const metrics = { viewports: [] };

  for (const { viewport, raw } of Array.isArray(runs) ? runs : []) {
    if (!raw) continue;
    const overflow = Math.max(0, (raw.scroll_width || 0) - (raw.viewport_width || 0));

    const failures = [];
    for (const sample of raw.text_samples || []) {
      const ratio = contrastRatio(sample.color, sample.background);
      if (ratio === null) continue;
      const floor = isLargeText(sample.font_size, sample.font_weight) ? CONTRAST_LARGE : CONTRAST_NORMAL;
      if (ratio < floor) failures.push({ el: sample.el, ratio, floor, text: sample.text });
    }

    const clipped = [...new Set(raw.clipped || [])];
    const offscreen = [...new Set(raw.offscreen || [])];
    const smallTargets = [...new Set(raw.small_targets || [])];

    metrics.viewports.push({
      name: viewport.name,
      width: viewport.width,
      horizontal_overflow_px: overflow,
      clipped_elements: clipped.length,
      offscreen_elements: offscreen.length,
      small_tap_targets: smallTargets.length,
      text_samples: (raw.text_samples || []).length,
      contrast_failures: failures.length
    });

    // The page is wider than its own viewport: unambiguous, and the single most
    // common defect a desktop-only inspection misses.
    if (overflow > 0) {
      issues.push(`${viewport.name} (${viewport.width}px): the page is ${overflow}px wider than the viewport — horizontal scroll`);
    }
    for (const el of clipped.slice(0, 5)) {
      issues.push(`${viewport.name}: text clipped in \`${el}\``);
    }
    for (const f of failures.slice(0, 6)) {
      issues.push(`${viewport.name}: contrast ${f.ratio}:1 below ${f.floor}:1 in \`${f.el}\` ("${f.text}")`);
    }
    if (failures.length > 6) {
      issues.push(`${viewport.name}: ${failures.length - 6} further contrast failures`);
    }

    for (const el of offscreen.slice(0, 5)) {
      warnings.push(`${viewport.name}: \`${el}\` extends outside the viewport — intentional bleed or a layout break`);
    }
    if (smallTargets.length > 0 && viewport.width <= 480) {
      warnings.push(`${viewport.name}: ${smallTargets.length} tap target(s) under ${MIN_TAP_TARGET}px (${smallTargets.slice(0, 3).join(', ')})`);
    }

    // The fold check: the marked #1 differentiator must start inside the first
    // viewport of the route it lives on. This is the exact defect class where a
    // product's core feature ships invisible and every static gate stays green.
    const primaries = raw.primary || [];
    const visiblePrimary = primaries.filter((p) => !p.hidden);
    const viewportHeight = raw.viewport_height || viewport.height;
    let belowFold = 0;
    for (const p of visiblePrimary) {
      if (p.top >= viewportHeight) {
        belowFold += 1;
        issues.push(`${viewport.name}: primary feature \`${p.el}\` starts ${p.top - viewportHeight}px below the fold — the product's #1 differentiator is invisible without scrolling`);
      }
    }
    if (primaries.length > 0 && visiblePrimary.length === 0) {
      warnings.push(`${viewport.name}: no [data-aioson-primary] element is visible on the loaded route — re-run with --route=<hash> pointing at the screen that carries the primary feature`);
    }
    const lastViewport = metrics.viewports[metrics.viewports.length - 1];
    lastViewport.primary_markers = primaries.length;
    lastViewport.primary_visible = visiblePrimary.length;
    lastViewport.primary_below_fold = belowFold;
  }

  return { metrics, issues, warnings };
}

function loadPlaywright() {
  try { return require('playwright'); } catch { return null; }
}

/**
 * Drive a real browser over `fileUrl` at each viewport and return the summary.
 * Never throws for a missing browser — that is a reported state, not an error.
 *
 * `route` appends a hash route to the file URL so a prototype's inner screen
 * (where the primary feature usually lives) can be measured, not only the
 * entry route.
 *
 * @param {{fileUrl: string, viewports?: Array, timeout?: number, launcher?: Function, route?: string|null}} options
 */
async function collectRuntimeMeasurements({ fileUrl, viewports = DEFAULT_VIEWPORTS, timeout = 20000, launcher = null, route = null } = {}) {
  const playwright = launcher ? { chromium: { launch: launcher } } : loadPlaywright();
  if (!playwright) {
    return {
      available: false,
      reason: 'playwright is not installed — runtime telemetry skipped (install with: npm i -D playwright && npx playwright install chromium)',
      runs: []
    };
  }

  const targetUrl = route
    ? `${fileUrl}${String(route).startsWith('#') ? '' : '#'}${route}`
    : fileUrl;

  let browser = null;
  try {
    browser = await playwright.chromium.launch({ headless: true });
    const runs = [];
    for (const viewport of viewports) {
      const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
      const page = await context.newPage();
      await page.goto(targetUrl, { waitUntil: 'load', timeout });
      // Hash routers render after `load`; give the route a short settle.
      if (route) await page.waitForTimeout(250);
      const raw = await page.evaluate(pageProbe);
      runs.push({ viewport, raw });
      await context.close();
    }
    return { available: true, runs };
  } catch (error) {
    return { available: false, reason: `runtime telemetry could not run: ${error.message}`, runs: [] };
  } finally {
    if (browser) { try { await browser.close(); } catch { /* nothing left to close */ } }
  }
}

module.exports = {
  collectRuntimeMeasurements,
  summarizeRuntime,
  contrastRatio,
  parseColor,
  isLargeText,
  pageProbe,
  DEFAULT_VIEWPORTS,
  MIN_TAP_TARGET
};
