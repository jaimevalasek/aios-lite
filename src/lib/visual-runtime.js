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
const RUNTIME_PROBE_VERSION = 2;

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
    primary: [],
    assurance: null
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
  const usedFamilies = new Set();
  let maxFontSize = 0;
  let gradientSurfaces = 0;
  let shadowSurfaces = 0;
  let blurSurfaces = 0;
  let blendSurfaces = 0;
  let maskSurfaces = 0;
  for (let i = 0; i < all.length && i < 3000; i++) {
    const el = all[i];
    const style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') continue;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) continue;

    const family = String(style.fontFamily || '').split(',')[0].trim().replace(/^['"]|['"]$/g, '').toLowerCase();
    if (family) usedFamilies.add(family);
    maxFontSize = Math.max(maxFontSize, parseFloat(style.fontSize) || 0);
    if (/(?:linear|radial|conic)-gradient\(/i.test(`${style.backgroundImage} ${style.background}`)) gradientSurfaces += 1;
    if (style.boxShadow && style.boxShadow !== 'none') shadowSurfaces += 1;
    if ((style.filter && style.filter !== 'none') || (style.backdropFilter && style.backdropFilter !== 'none')) blurSurfaces += 1;
    if ((style.mixBlendMode && style.mixBlendMode !== 'normal') || (style.backgroundBlendMode && style.backgroundBlendMode !== 'normal')) blendSurfaces += 1;
    if ((style.maskImage && style.maskImage !== 'none') || (style.webkitMaskImage && style.webkitMaskImage !== 'none')) maskSurfaces += 1;

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

  const normalizeFamily = (value) => String(value || '').trim().replace(/^['"]|['"]$/g, '').replace(/\s+/g, ' ').toLowerCase();
  const defaultFamilies = new Set([
    'system-ui', '-apple-system', 'blinkmacsystemfont', 'ui-serif', 'ui-sans-serif', 'ui-monospace',
    'segoe ui', 'roboto', 'arial', 'helvetica', 'georgia', 'times new roman', 'serif', 'sans-serif',
    'monospace', 'cursive', 'fantasy', 'math', 'emoji'
  ]);
  const faces = [];
  try {
    if (doc.fonts) {
      doc.fonts.forEach((face) => faces.push({ family: normalizeFamily(face.family), status: face.status || 'unknown' }));
    }
  } catch { /* an older browser may not expose the iterable FontFaceSet */ }
  const customUsed = [...usedFamilies].filter((family) => !defaultFamilies.has(family));
  const loadedFamilies = [...new Set(faces.filter((face) => face.status === 'loaded').map((face) => face.family).filter(Boolean))];
  const undeliveredFamilies = customUsed.filter((family) => !loadedFamilies.includes(family));

  const media = [];
  const mediaNodes = doc.querySelectorAll('img,video');
  for (let i = 0; i < mediaNodes.length && i < 100; i++) {
    const el = mediaNodes[i];
    const kind = el.tagName.toLowerCase();
    const source = el.currentSrc || el.src || el.poster || '';
    const alt = kind === 'img' ? String(el.alt || '').trim() : '';
    if (kind === 'img' && (!alt || /^(?:logo|logotipo|icon|icone|ícone|avatar|placeholder|decorative|decora)/i.test(alt))) continue;
    const loaded = kind === 'img' ? Boolean(el.complete && el.naturalWidth > 0) : Boolean(el.readyState >= 2);
    media.push({ el: label(el), kind, source: String(source).slice(0, 160), loaded, alt: alt.slice(0, 80) });
  }

  let animations = [];
  try {
    animations = typeof doc.getAnimations === 'function'
      ? doc.getAnimations().slice(0, 100).map((animation) => ({
        state: animation.playState || 'unknown',
        iterations: animation.effect && animation.effect.getTiming ? animation.effect.getTiming().iterations : null
      }))
      : [];
  } catch { /* runtime animation inventory stays empty when unsupported */ }

  const stateSelectors = {
    loading: '.is-loading,.loading,.skeleton,.spinner,[aria-busy="true"],[data-state="loading"],progress',
    empty: '.is-empty,.empty-state,.no-results,[data-state="empty"]',
    error: '.is-error,.has-error,.error-state,[aria-invalid="true"],[data-state="error"],[role="alert"]',
    disabled: ':disabled,[aria-disabled="true"]',
    // `role=status` is an ARIA live region, not proof of a successful outcome;
    // loading announcements commonly use it too.
    success: '.is-success,.success-state,[data-state="success"]'
  };
  const statesPresent = [];
  const statesVisible = [];
  for (const state of Object.keys(stateSelectors)) {
    let nodes = [];
    try { nodes = doc.querySelectorAll(stateSelectors[state]); } catch { nodes = []; }
    if (nodes.length > 0) statesPresent.push(state);
    for (let i = 0; i < nodes.length; i++) {
      const style = getComputedStyle(nodes[i]);
      const rect = nodes[i].getBoundingClientRect();
      if (style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0' && rect.width > 0 && rect.height > 0) {
        statesVisible.push(state);
        break;
      }
    }
  }

  const materialTechniques = [
    gradientSurfaces > 0 && 'gradients',
    shadowSurfaces > 0 && 'shadows',
    blurSurfaces > 0 && 'blur',
    blendSurfaces > 0 && 'blend',
    maskSurfaces > 0 && 'mask'
  ].filter(Boolean);
  out.assurance = {
    probe_version: RUNTIME_PROBE_VERSION,
    elements_measured: Math.min(all.length, 3000),
    max_font_size_px: Math.round(maxFontSize * 100) / 100,
    fonts: {
      used_families: [...usedFamilies],
      custom_used: customUsed,
      loaded_families: loadedFamilies,
      undelivered_families: undeliveredFamilies,
      faces: faces.length
    },
    media: {
      candidates: media.length,
      loaded: media.filter((item) => item.loaded).length,
      broken: media.filter((item) => !item.loaded)
    },
    material: {
      techniques: materialTechniques,
      gradient_surfaces: gradientSurfaces,
      shadow_surfaces: shadowSurfaces,
      blur_surfaces: blurSurfaces,
      blend_surfaces: blendSurfaces,
      mask_surfaces: maskSurfaces
    },
    motion: {
      active: animations.filter((animation) => animation.state === 'running' || animation.state === 'pending').length,
      ambient: animations.filter((animation) => animation.iterations === Infinity).length
    },
    states: { present: statesPresent, visible: statesVisible }
  };
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
  const metrics = {
    viewports: [],
    assurance: {
      craft_verified: false,
      probe_runs: 0,
      expected_runs: Array.isArray(runs) ? runs.length : 0,
      routes_verified: [],
      states_verified: [],
      font_failures: [],
      broken_media: [],
      material_techniques: [],
      max_font_size_px: 0,
      craft_axes: { typeface: false, display_scale: false, material: false, motion: false, evidence: false }
    },
    screenshots: []
  };

  for (const run of Array.isArray(runs) ? runs : []) {
    const { viewport, raw } = run;
    if (!raw) continue;
    const routeName = run.route && (run.route.route || run.route.state)
      ? (run.route.name || run.route.route)
      : null;
    const scope = routeName ? `${routeName} / ${viewport.name}` : viewport.name;
    if (run.screenshot) metrics.screenshots.push(run.screenshot);
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
      ...(routeName ? { route: routeName } : {}),
      ...(run.route && run.route.state ? { state: run.route.state } : {}),
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
      issues.push(`${scope} (${viewport.width}px): the page is ${overflow}px wider than the viewport — horizontal scroll`);
    }
    for (const el of clipped.slice(0, 5)) {
      issues.push(`${scope}: text clipped in \`${el}\``);
    }
    for (const f of failures.slice(0, 6)) {
      issues.push(`${scope}: contrast ${f.ratio}:1 below ${f.floor}:1 in \`${f.el}\` ("${f.text}")`);
    }
    if (failures.length > 6) {
      issues.push(`${scope}: ${failures.length - 6} further contrast failures`);
    }

    for (const el of offscreen.slice(0, 5)) {
      warnings.push(`${scope}: \`${el}\` extends outside the viewport — intentional bleed or a layout break`);
    }
    if (smallTargets.length > 0 && viewport.width <= 480) {
      warnings.push(`${scope}: ${smallTargets.length} tap target(s) under ${MIN_TAP_TARGET}px (${smallTargets.slice(0, 3).join(', ')})`);
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
        issues.push(`${scope}: primary feature \`${p.el}\` starts ${p.top - viewportHeight}px below the fold — the product's #1 differentiator is invisible without scrolling`);
      }
    }
    if (primaries.length > 0 && visiblePrimary.length === 0) {
      warnings.push(`${scope}: no [data-aioson-primary] element is visible on the loaded route — declare the primary route in the manifest's Runtime matrix or re-run with --route=<hash>`);
    }
    const lastViewport = metrics.viewports[metrics.viewports.length - 1];
    lastViewport.primary_markers = primaries.length;
    lastViewport.primary_visible = visiblePrimary.length;
    lastViewport.primary_below_fold = belowFold;

    const assurance = raw.assurance;
    if (assurance && Number(assurance.probe_version) >= 2) {
      metrics.assurance.probe_runs += 1;
      if (routeName && !metrics.assurance.routes_verified.includes(routeName)) metrics.assurance.routes_verified.push(routeName);
      metrics.assurance.max_font_size_px = Math.max(metrics.assurance.max_font_size_px, Number(assurance.max_font_size_px) || 0);
      for (const technique of (assurance.material && assurance.material.techniques) || []) {
        if (!metrics.assurance.material_techniques.includes(technique)) metrics.assurance.material_techniques.push(technique);
      }
      for (const family of (assurance.fonts && assurance.fonts.undelivered_families) || []) {
        if (!metrics.assurance.font_failures.includes(family)) metrics.assurance.font_failures.push(family);
      }
      for (const item of (assurance.media && assurance.media.broken) || []) {
        const label = item.el || item.source || 'media';
        if (!metrics.assurance.broken_media.includes(label)) metrics.assurance.broken_media.push(label);
      }
      const visibleStates = (assurance.states && assurance.states.visible) || [];
      for (const state of visibleStates) if (!metrics.assurance.states_verified.includes(state)) metrics.assurance.states_verified.push(state);
      if (run.route && run.route.state && !visibleStates.includes(run.route.state)) {
        issues.push(`${scope}: declared runtime state "${run.route.state}" has no visible structural state marker`);
      }
      const axes = metrics.assurance.craft_axes;
      axes.typeface = axes.typeface || Boolean(assurance.fonts && assurance.fonts.custom_used && assurance.fonts.custom_used.length > 0 && assurance.fonts.undelivered_families.length === 0);
      axes.display_scale = axes.display_scale || Number(assurance.max_font_size_px) >= 56;
      axes.material = axes.material || ((assurance.material && assurance.material.techniques) || []).length >= 2;
      axes.motion = axes.motion || Boolean(assurance.motion && assurance.motion.active > 0);
      axes.evidence = axes.evidence || Boolean(assurance.media && assurance.media.loaded > 0);
    }
  }

  metrics.assurance.craft_verified = metrics.assurance.expected_runs > 0 && metrics.assurance.probe_runs === metrics.assurance.expected_runs;
  for (const family of metrics.assurance.font_failures) {
    issues.push(`runtime font delivery failed for "${family}" — the computed surface uses the family but no loaded FontFace matches it`);
  }
  for (const media of metrics.assurance.broken_media) {
    issues.push(`runtime media failed to load in \`${media}\` — broken assets are not product evidence`);
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
function normalizeRoutes(route, routes) {
  const input = Array.isArray(routes) && routes.length > 0 ? routes : [route || null];
  return input.map((item, index) => {
    if (item && typeof item === 'object') {
      const target = item.route || item.path || item.url || null;
      return { name: item.name || item.label || item.state || target || (index === 0 ? 'entry' : `route-${index + 1}`), route: target, state: item.state || null };
    }
    const target = item ? String(item) : null;
    return { name: target || 'entry', route: target, state: null };
  });
}

function runtimeUrl(fileUrl, route) {
  if (!route) return fileUrl;
  if (/^(?:https?|file):/i.test(route)) return route;
  const base = String(fileUrl).replace(/#.*$/, '');
  return `${base}${String(route).startsWith('#') ? '' : '#'}${route}`;
}

async function collectRuntimeMeasurements({ fileUrl, viewports = DEFAULT_VIEWPORTS, timeout = 20000, launcher = null, route = null, routes = null, screenshotDir = null } = {}) {
  const playwright = launcher ? { chromium: { launch: launcher } } : loadPlaywright();
  if (!playwright) {
    return {
      available: false,
      reason: 'playwright is not installed — runtime telemetry skipped (install with: npm i -D playwright && npx playwright install chromium)',
      runs: []
    };
  }

  let browser = null;
  try {
    browser = await playwright.chromium.launch({ headless: true });
    const runs = [];
    for (const routeSpec of normalizeRoutes(route, routes)) {
      const targetUrl = runtimeUrl(fileUrl, routeSpec.route);
      for (const viewport of viewports) {
        const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
        try {
          const page = await context.newPage();
          await page.goto(targetUrl, { waitUntil: 'load', timeout });
          // Hash routers and state fixtures render after `load`; give them a
          // bounded settle before measuring or capturing evidence.
          if (routeSpec.route && typeof page.waitForTimeout === 'function') await page.waitForTimeout(250);
          const raw = await page.evaluate(pageProbe);
          let screenshot = null;
          if (screenshotDir && typeof page.screenshot === 'function') {
            const safe = `${routeSpec.name}-${viewport.name}`.replace(/[^a-z0-9_-]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
            screenshot = require('node:path').join(screenshotDir, `${safe || 'runtime'}.png`);
            require('node:fs').mkdirSync(screenshotDir, { recursive: true });
            await page.screenshot({ path: screenshot, fullPage: true });
          }
          runs.push({ viewport, route: routeSpec, url: targetUrl, raw, screenshot });
        } finally {
          await context.close();
        }
      }
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
  normalizeRoutes,
  runtimeUrl,
  DEFAULT_VIEWPORTS,
  RUNTIME_PROBE_VERSION,
  MIN_TAP_TARGET
};
