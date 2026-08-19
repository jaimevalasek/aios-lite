'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const {
  rgbToOklch,
  oklchToRgb,
  parseCssColor,
  contrastRatio,
  clampChroma,
  inSrgbGamut,
  hueDeltaDeg
} = require('../src/lib/color-math');
const {
  generateSeedCandidates,
  readRegistry,
  recordFingerprint,
  findRepetition,
  fingerprintMatchReason,
  registryPath,
  REGISTERS,
  TYPEFACE_BANK
} = require('../src/lib/design-seed');
const { runDesignSeed } = require('../src/commands/design-seed');
const { runVerifyArtifact } = require('../src/commands/verify-artifact');

function makeLogger() {
  const lines = [];
  return { log: (m = '') => lines.push(String(m)), error: (m = '') => lines.push(String(m)), warn: () => {}, lines };
}

async function makeTmpDir(prefix = 'aioson-seed-') {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

async function withTempRegistry(fn) {
  const dir = await makeTmpDir('aioson-registry-');
  const file = path.join(dir, 'design-fingerprints.json');
  const previous = process.env.AIOSON_DESIGN_REGISTRY;
  process.env.AIOSON_DESIGN_REGISTRY = file;
  try {
    return await fn(file);
  } finally {
    if (previous === undefined) delete process.env.AIOSON_DESIGN_REGISTRY;
    else process.env.AIOSON_DESIGN_REGISTRY = previous;
    await fs.rm(dir, { recursive: true, force: true });
  }
}

// ─── color math ─────────────────────────────────────────────────────────────

test('color math matches the published OKLCH reference values', () => {
  const red = rgbToOklch({ r: 255, g: 0, b: 0 });
  assert.ok(Math.abs(red.l - 0.628) < 0.005, `red L ${red.l}`);
  assert.ok(Math.abs(red.c - 0.258) < 0.005, `red C ${red.c}`);
  assert.ok(Math.abs(red.h - 29.2) < 0.5, `red H ${red.h}`);

  const white = rgbToOklch({ r: 255, g: 255, b: 255 });
  assert.ok(Math.abs(white.l - 1) < 0.001);
  assert.ok(white.c < 0.001);

  // round trip survives quantization
  const back = oklchToRgb(rgbToOklch({ r: 140, g: 47, b: 31 }));
  assert.deepEqual(back, { r: 140, g: 47, b: 31 });

  assert.ok(Math.abs(contrastRatio({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 }) - 21) < 0.01);
  assert.equal(hueDeltaDeg(350, 10), 20);
  assert.equal(hueDeltaDeg(28, 52), 24);

  // chroma clamping lands inside the sRGB gamut
  const clamped = clampChroma(0.85, 0.4, 95);
  assert.ok(clamped < 0.4);
  assert.ok(inSrgbGamut({ l: 0.85, c: clamped, h: 95 }));
});

test('parseCssColor covers the literal forms real prototypes ship', () => {
  assert.equal(parseCssColor('#8C2F1F').r, 140);
  assert.equal(parseCssColor('#fff').g, 255);
  assert.ok(Math.abs(parseCssColor('#00000080').alpha - 0.5) < 0.01);
  assert.equal(parseCssColor('rgb(10, 20, 30)').b, 30);
  assert.ok(Math.abs(parseCssColor('rgba(255, 193, 7, 0.5)').alpha - 0.5) < 0.001);
  const hsl = parseCssColor('hsl(210, 50%, 40%)');
  assert.ok(Math.abs(hsl.oklch.h - 250) < 5, `hsl hue ${hsl.oklch.h}`);
  const ok = parseCssColor('oklch(73% 0.13 28)');
  assert.deepEqual(ok.oklch, { l: 0.73, c: 0.13, h: 28 });
  assert.ok(Math.abs(parseCssColor('oklch(50% 0.1 200 / .4)').alpha - 0.4) < 0.001);
  assert.equal(parseCssColor('var(--x)'), null);
  assert.equal(parseCssColor('currentColor'), null);
});

// ─── seed generation ────────────────────────────────────────────────────────

test('the draw is deterministic per project and re-rolls with --seed', () => {
  const a = generateSeedCandidates({ slug: 'demo-site', register: 'editorial', count: 3 });
  const b = generateSeedCandidates({ slug: 'demo-site', register: 'editorial', count: 3 });
  assert.deepEqual(a, b);

  const other = generateSeedCandidates({ slug: 'another-site', register: 'editorial', count: 3 });
  assert.notEqual(a.candidates[0].base_hue, other.candidates[0].base_hue);

  const rerolled = generateSeedCandidates({ slug: 'demo-site', register: 'editorial', count: 3, seed: 1 });
  assert.notEqual(a.candidates[0].base_hue, rerolled.candidates[0].base_hue);
});

test('every candidate across registers and slugs is contrast-solved raw material', () => {
  let minInk = Infinity;
  let minAccentInk = Infinity;
  let minAccent = Infinity;
  const slugs = ['alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta', 'eta', 'theta'];
  for (const slug of slugs) {
    for (const register of [null, ...REGISTERS]) {
      const { candidates } = generateSeedCandidates({ slug, register, count: 3 });
      for (const c of candidates) {
        minInk = Math.min(minInk, c.contrast.ink_on_ground);
        minAccentInk = Math.min(minAccentInk, c.contrast.accent_ink_on_accent);
        minAccent = Math.min(minAccent, c.contrast.accent_on_ground);
        assert.ok(/^#[0-9a-f]{6}$/.test(c.roles.ground.hex));
        assert.ok(['light', 'dark', 'chromatic'].includes(c.pole));
        if (register) assert.equal(c.register, register);
        if (c.scheme === 'color-block') {
          assert.equal(c.blocks.length, 3);
          for (const block of c.blocks) assert.ok(['#ffffff', '#101010'].includes(block.ink));
        }
      }
    }
  }
  assert.ok(minInk >= 4.5, `ink floor ${minInk}`);
  assert.ok(minAccentInk >= 4.5, `accent-ink floor ${minAccentInk}`);
  assert.ok(minAccent >= 3, `accent floor ${minAccent}`);
});

test('the draw steers the BUILT accent away from recent fingerprints', () => {
  const free = generateSeedCandidates({ slug: 'demo-site', register: 'editorial', count: 3 });
  const taken = free.candidates[0];
  const avoided = generateSeedCandidates({
    slug: 'demo-site',
    register: 'editorial',
    count: 3,
    avoid: [{ accent_hue: taken.accent_hue, ground_pole: taken.pole }]
  });
  const delta = hueDeltaDeg(avoided.candidates[0].accent_hue, taken.accent_hue);
  assert.ok(delta > 18, `first candidate accent still within Δ${delta}° of the avoided fingerprint`);
});

test('candidates in one draw do not waste slots on repeated pairings or heroes', () => {
  const { candidates } = generateSeedCandidates({ slug: 'variety-check', register: 'editorial', count: 3 });
  const displays = new Set(candidates.map((c) => c.pairing.display));
  const heroes = new Set(candidates.map((c) => c.composition.hero));
  assert.equal(displays.size, candidates.length);
  assert.equal(heroes.size, candidates.length);
  const bankDisplays = new Set(TYPEFACE_BANK.map((p) => p.display));
  for (const c of candidates) assert.ok(bankDisplays.has(c.pairing.display));
});

// ─── fingerprint registry ───────────────────────────────────────────────────

test('registry round-trips, dedupes by project+slug, and honors the env override', async () => {
  await withTempRegistry(async (file) => {
    assert.equal(registryPath(), file);
    assert.deepEqual(readRegistry().entries, []);

    assert.ok(recordFingerprint({ project: 'p1', slug: 's1', accent_hue: 40, ground_pole: 'dark', display_face: 'fraunces' }));
    assert.ok(recordFingerprint({ project: 'p1', slug: 's1', accent_hue: 44, ground_pole: 'dark', display_face: 'fraunces' }));
    assert.ok(recordFingerprint({ project: 'p2', slug: 's2', accent_hue: 200, ground_pole: 'light' }));

    const { entries } = readRegistry();
    assert.equal(entries.length, 2); // p1/s1 upserted, not duplicated
    assert.equal(entries.find((e) => e.project === 'p1').accent_hue, 44);
    assert.ok(entries.every((e) => typeof e.at === 'string'));

    // an unusable fingerprint is refused, not recorded broken
    assert.equal(recordFingerprint({ project: 'p3' }), false);
  });
});

test('repetition matches the same family on one pole, or a tight match with the polarity flipped', () => {
  const entries = [
    { project: 'site-a', accent_hue: 49, ground_pole: 'dark', display_face: 'fraunces' },
    { project: 'site-b', accent_hue: 200, ground_pole: 'light' }
  ];
  // same pole, Δ within 24°
  const samePole = findRepetition({ project: 'site-c', accent_hue: 60, ground_pole: 'dark' }, entries);
  assert.equal(samePole.entry.project, 'site-a');
  assert.match(samePole.reason, /same ground pole/);
  // the measured incident shape: Δ17° with the ground polarity flipped
  const flipped = findRepetition({ project: 'site-c', accent_hue: 32, ground_pole: 'light' }, entries);
  assert.equal(flipped.entry.project, 'site-a');
  assert.equal(flipped.delta, 17);
  assert.match(flipped.reason, /polarity flipped/);
  // far hue: no hit; same project: never compared against itself
  assert.equal(findRepetition({ project: 'site-c', accent_hue: 120, ground_pole: 'dark' }, entries), null);
  assert.equal(findRepetition({ project: 'site-a', accent_hue: 49, ground_pole: 'dark' }, entries), null);
  // flipped polarity only matches tightly
  assert.equal(fingerprintMatchReason(22, false), null);
  assert.match(fingerprintMatchReason(22, true), /same ground pole/);
});

// ─── design:seed command ────────────────────────────────────────────────────

test('design:seed returns the JSON contract and rejects an unknown register', async () => {
  await withTempRegistry(async () => {
    const dir = await makeTmpDir('aioson-seed-proj-');
    try {
      const logger = makeLogger();
      const result = await runDesignSeed({ args: [dir], options: { json: true, register: 'editorial', slug: 'feat-x', count: 2 }, logger });
      assert.equal(result.ok, true);
      assert.equal(result.register, 'editorial');
      assert.equal(result.candidates.length, 2);
      assert.equal(result.registry.entries, 0);
      for (const c of result.candidates) {
        assert.ok(c.roles.ground.hex && c.roles.accent.hex && c.roles.accent_ink.hex);
        assert.ok(c.pairing.display && c.pairing.host);
        assert.ok(c.composition.hero && c.composition.material);
        assert.match(c.composition.finishing, /shadow vocabulary/, 'every candidate carries its finish floor — the drawn material is the signature, never the whole system');
      }

      const bad = await runDesignSeed({ args: [dir], options: { json: true, register: 'vaporwave' }, logger });
      assert.equal(bad.ok, false);
      assert.equal(bad.error, 'unknown_register');
      process.exitCode = 0;

      const human = makeLogger();
      await runDesignSeed({ args: [dir], options: { register: 'quiet' }, logger: human });
      const text = human.lines.join('\n');
      assert.match(text, /contrast-solved candidate/);
      assert.match(text, /Build FROM one candidate/);
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });
});

// ─── verify:artifact integration ────────────────────────────────────────────

// Full surface (≥150 declarations) — fingerprinting deliberately ignores
// fragments, so the fixture has to look like a real page's stylesheet.
const REPEAT_CSS = (bg, ink, accent) => {
  const filler = Array.from({ length: 36 }, (_, i) => `
      .s${i} { background: ${bg}; color: ${ink}; padding: ${8 + (i % 4) * 8}px; margin: 8px; border: 1px solid ${accent}; }`).join('');
  return `
    <style>
      :root { --bg: ${bg}; --ink: ${ink}; --accent: ${accent}; }
      body { background: ${bg}; color: ${ink}; margin: 0; padding: 24px; font-family: Georgia, serif; }
      .hero { background: ${bg}; color: ${ink}; padding: 48px; }
      .cta { background: ${accent}; color: #ffffff; padding: 12px; border: 0; }
      .card { background: ${bg}; border: 1px solid ${accent}; padding: 16px; margin: 8px; }
      .note { color: ${accent}; font-size: 14px; }
      h1 { font-size: 48px; color: ${ink}; }
      ${filler}
    </style>
    <h1>Surface</h1><div class="hero">hero</div><button class="cta">Go</button>
  `;
};

test('the second project re-wearing a palette gets the cross-project repetition warning', async () => {
  await withTempRegistry(async (file) => {
    const projectA = await makeTmpDir('aioson-proj-a-');
    const projectB = await makeTmpDir('aioson-proj-b-');
    try {
      await fs.writeFile(path.join(projectA, 'page.html'), REPEAT_CSS('#241a12', '#f2e7db', '#c85a2e'));
      // same wardrobe, polarity flipped — the measured incident shape
      await fs.writeFile(path.join(projectB, 'page.html'), REPEAT_CSS('#f6f0e8', '#2c211a', '#c85a2e'));

      const first = await runVerifyArtifact({
        args: [projectA],
        options: { kind: 'visual', file: path.join(projectA, 'page.html'), advisory: true, json: true, suppressExitCode: true },
        logger: makeLogger()
      });
      assert.equal(first.warnings.some((w) => /cross-project palette repetition/.test(w)), false);
      assert.ok(first.metrics.palette.accent_hue != null);

      const registry = JSON.parse(await fs.readFile(file, 'utf8'));
      assert.equal(registry.entries.length, 1);
      assert.equal(registry.entries[0].project, path.basename(projectA));

      const second = await runVerifyArtifact({
        args: [projectB],
        options: { kind: 'visual', file: path.join(projectB, 'page.html'), advisory: true, json: true, suppressExitCode: true },
        logger: makeLogger()
      });
      const warning = second.warnings.find((w) => /cross-project palette repetition/.test(w));
      assert.ok(warning, `expected repetition warning, got: ${second.warnings.join(' | ')}`);
      assert.ok(warning.includes(path.basename(projectA)));
      assert.match(warning, /design:seed/);
      assert.equal(second.metrics.palette_repeat.project, path.basename(projectA));

      const after = JSON.parse(await fs.readFile(file, 'utf8'));
      assert.equal(after.entries.length, 2);
    } finally {
      await fs.rm(projectA, { recursive: true, force: true });
      await fs.rm(projectB, { recursive: true, force: true });
    }
  });
});

test('a diversified second project draws no repetition warning', async () => {
  await withTempRegistry(async () => {
    const projectA = await makeTmpDir('aioson-proj-c-');
    const projectB = await makeTmpDir('aioson-proj-d-');
    try {
      await fs.writeFile(path.join(projectA, 'page.html'), REPEAT_CSS('#241a12', '#f2e7db', '#c85a2e'));
      await fs.writeFile(path.join(projectB, 'page.html'), REPEAT_CSS('#0a1420', '#e8f1fb', '#3b82f6'));

      await runVerifyArtifact({
        args: [projectA],
        options: { kind: 'visual', file: path.join(projectA, 'page.html'), advisory: true, json: true, suppressExitCode: true },
        logger: makeLogger()
      });
      const second = await runVerifyArtifact({
        args: [projectB],
        options: { kind: 'visual', file: path.join(projectB, 'page.html'), advisory: true, json: true, suppressExitCode: true },
        logger: makeLogger()
      });
      assert.equal(second.warnings.some((w) => /cross-project palette repetition/.test(w)), false);
    } finally {
      await fs.rm(projectA, { recursive: true, force: true });
      await fs.rm(projectB, { recursive: true, force: true });
    }
  });
});
