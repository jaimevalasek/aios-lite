'use strict';

/**
 * Embedded bytes never sit among authored code.
 *
 * Measured on consumer prototypes: a 1.8 MB document was 98% base64, its
 * 155 KB stylesheet 139 KB of WOFF2 — every surgical polish pass reread font
 * bytes to find a rule. The build contract quarantines embedded assets in one
 * trailing zone (`<style data-aioson-assets>` for fonts, a JSON
 * `<script data-aioson-assets>` for images/media); the telemetry measures how
 * much base64 still sits in the authored stylesheet and markup and names it.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

process.env.AIOSON_DESIGN_REGISTRY = path.join(__filename, 'no-registry', 'design-fingerprints.json');

const { analyzeVisualSources, embeddedAssetProfile, EMBEDDED_ASSET_ZONE_MIN_BYTES } = require('../src/lib/visual-telemetry');

const BIG = 'A'.repeat(48 * 1024); // 48 KB of base64, over the 32 KB floor
const RULES = `
  :root { --s2: 8px; --fg: #1a1a1a; --bg: #fff; }
  body { font-family: "Face", serif; color: var(--fg); background: var(--bg); }
  h1 { font-size: 40px; margin: 0; }
  .card { padding: var(--s2); border: 1px solid #ddd; border-radius: 8px; }
  .btn { padding: var(--s2); transition: opacity .2s; }
  .btn:focus-visible { outline: 2px solid var(--fg); }
`;

function page({ fontZone = 'authored', imageZone = 'none' } = {}) {
  const fontFace = `@font-face { font-family: "Face"; src: url(data:font/woff2;base64,${BIG}) format("woff2"); }`;
  const authoredStyle = `<style>${fontZone === 'authored' ? fontFace : ''}${RULES}</style>`;
  const assetStyle = fontZone === 'zone' ? `<style data-aioson-assets>${fontFace}</style>` : '';
  const inlineImage = imageZone === 'markup' ? `<img src="data:image/webp;base64,${BIG}" alt="Prancha">` : (imageZone === 'zone' ? '<img data-asset="hero" alt="Prancha">' : '');
  const assetScript = imageZone === 'zone' ? `<script type="application/json" data-aioson-assets>{"hero":"data:image/webp;base64,${BIG}"}</script>` : '';
  return `<!doctype html><html><head>${authoredStyle}</head><body><main><h1>Estúdio</h1>${inlineImage}<div class="card"><button class="btn">Ok</button></div></main>${assetStyle}${assetScript}</body></html>`;
}

test('the profile splits base64 bytes by zone: authored stylesheet, markup, quarantined', () => {
  const authored = embeddedAssetProfile(page({ fontZone: 'authored', imageZone: 'markup' }));
  assert.ok(authored.authored_style_bytes > EMBEDDED_ASSET_ZONE_MIN_BYTES);
  assert.ok(authored.authored_style_share_pct >= 25, `share ${authored.authored_style_share_pct}`);
  assert.ok(authored.markup_bytes > EMBEDDED_ASSET_ZONE_MIN_BYTES);
  assert.equal(authored.quarantined_bytes, 0);
  assert.deepEqual(Object.keys(authored.kinds).sort(), ['font', 'image']);

  const zoned = embeddedAssetProfile(page({ fontZone: 'zone', imageZone: 'zone' }));
  assert.equal(zoned.authored_style_bytes, 0);
  assert.equal(zoned.markup_bytes, 0);
  assert.ok(zoned.quarantined_bytes > 2 * EMBEDDED_ASSET_ZONE_MIN_BYTES);
  assert.equal(zoned.bytes, authored.bytes, 'the same bytes, moved — nothing lost');

  assert.equal(embeddedAssetProfile('<style>.a{color:red}</style><p>x</p>').bytes, 0);
});

test('kind=visual names base64 sitting in the authored stylesheet or markup, and stays silent once quarantined', () => {
  const inline = analyzeVisualSources({ html: page({ fontZone: 'authored', imageZone: 'markup' }) });
  assert.equal(inline.applicable, true);
  assert.ok(inline.metrics.embedded_assets.authored_style_bytes > EMBEDDED_ASSET_ZONE_MIN_BYTES);
  const styleWarning = inline.warnings.find((w) => /embedded assets inside the authored stylesheet/.test(w));
  assert.ok(styleWarning, inline.warnings.join('\n'));
  assert.match(styleWarning, /data-aioson-assets/);
  const markupWarning = inline.warnings.find((w) => /embedded assets inside the markup/.test(w));
  assert.ok(markupWarning, inline.warnings.join('\n'));
  assert.match(markupWarning, /application\/json/);

  const zoned = analyzeVisualSources({ html: page({ fontZone: 'zone', imageZone: 'zone' }) });
  assert.equal(zoned.warnings.some((w) => /embedded assets inside/.test(w)), false, zoned.warnings.join('\n'));
  assert.ok(zoned.metrics.embedded_assets.quarantined_bytes > 0);
  // The delivered face is still delivered from the zone — quarantine costs no lever.
  assert.equal(zoned.metrics.craft.levers.typeface, inline.metrics.craft.levers.typeface);

  // A small inline asset (an icon, a tiny placeholder) is never charged.
  const small = analyzeVisualSources({ html: `<!doctype html><html><head><style>${RULES}</style></head><body><img src="data:image/png;base64,${'A'.repeat(2048)}" alt="ícone"></body></html>` });
  assert.equal(small.warnings.some((w) => /embedded assets inside/.test(w)), false);
});
