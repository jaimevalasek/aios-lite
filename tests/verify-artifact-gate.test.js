'use strict';

// Tests for the artifact done-gate bridge (src/artifact-kinds.js): the map that
// makes `verify:artifact` AUTO-FIRE (advisory) at `agent:done` for the peripheral
// artifact-producing agents, instead of relying on each agent to run its own
// `## Done gate` line.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { resolveAgentArtifact, verifyAgentArtifact, AGENT_ARTIFACT_KIND } = require('../src/artifact-kinds');
const { availableKinds } = require('../src/commands/verify-artifact');

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'aioson-vag-'));
}

function writeBootstrap(root, { valid = true } = {}) {
  const dir = path.join(root, '.aioson', 'context', 'bootstrap');
  fs.mkdirSync(dir, { recursive: true });
  for (const f of ['what-is.md', 'what-it-does.md', 'how-it-works.md', 'current-state.md']) {
    const body = valid
      ? `---\ngenerated_by: discover\nconfidence: high\n---\n\nReal content for ${f}.\n`
      : `---\ngenerated_by: discover\nconfidence: high\n---\n\nTODO fill ${f}.\n`;
    fs.writeFileSync(path.join(dir, f), body, 'utf8');
  }
}

test('resolveAgentArtifact maps the periphery and ignores everyone else', () => {
  assert.deepEqual(resolveAgentArtifact('setup'), { kind: 'project-context', needs: 'none' });
  assert.deepEqual(resolveAgentArtifact('@discover'), { kind: 'bootstrap', needs: 'none' });
  assert.equal(resolveAgentArtifact('genome').needs, 'slug');
  assert.equal(resolveAgentArtifact('profiler-researcher').kind, 'research-report');
  assert.equal(resolveAgentArtifact('orache').needs, 'file');
  assert.equal(resolveAgentArtifact('site-forge').needs, 'dir');
  // workflow + non-artifact agents resolve to null (no auto-fire for them)
  for (const a of ['dev', 'qa', 'product', 'sheldon', 'orchestrator', '', undefined]) {
    assert.equal(resolveAgentArtifact(a), null, `expected null for "${a}"`);
  }
});

test('every mapped kind exists in the verify:artifact registry', () => {
  const kinds = new Set(availableKinds());
  for (const [agent, m] of Object.entries(AGENT_ARTIFACT_KIND)) {
    assert.equal(kinds.has(m.kind), true, `${agent} -> kind "${m.kind}" not registered in verify:artifact`);
    for (const extra of m.also || []) {
      assert.equal(kinds.has(extra.kind), true, `${agent} -> secondary kind "${extra.kind}" not registered in verify:artifact`);
    }
  }
});

test('briefing-refiner auto-fires the visual gate next to the review gate — and stays quiet without a prototype', async () => {
  // Non-visual feature: no prototype.html, so the secondary visual check is a
  // skipped hint, never an advisory failure nagging every text-only briefing.
  const nonVisual = tmpDir();
  const quiet = await verifyAgentArtifact({ targetDir: nonVisual, agent: 'briefing-refiner', options: { feature: 'texto' } });
  assert.equal(quiet.kind, 'review');
  const quietVisual = (quiet.also || []).find((entry) => entry.kind === 'visual');
  assert.ok(quietVisual, 'the visual gate must ride along with the review gate');
  assert.equal(quietVisual.skipped, true);
  assert.match(quietVisual.reason, /prototype\.html not present/);

  // Visual feature: the prototype exists, so the visual check actually runs
  // (and fails here — no manifest, no measurable system — proving it is live).
  const visual = tmpDir();
  fs.mkdirSync(path.join(visual, '.aioson', 'briefings', 'painel'), { recursive: true });
  fs.writeFileSync(path.join(visual, '.aioson', 'briefings', 'painel', 'prototype.html'), '<style>.a{padding:7px;margin:3px;color:#123;gap:5px;border-radius:3px;font-size:13px;background:#fff;border:1px solid #eee;box-shadow:none;fill:#123}</style><div class="a">x</div>', 'utf8');
  const live = await verifyAgentArtifact({ targetDir: visual, agent: 'briefing-refiner', options: { feature: 'painel' } });
  const liveVisual = (live.also || []).find((entry) => entry.kind === 'visual');
  assert.ok(liveVisual);
  assert.equal(liveVisual.skipped, false);
  assert.equal(liveVisual.ok, false);
  assert.match(liveVisual.reason, /verify-artifact-visual\.json/);
});

test('verifyAgentArtifact returns null for an agent with no artifact', async () => {
  assert.equal(await verifyAgentArtifact({ targetDir: tmpDir(), agent: 'dev' }), null);
  assert.equal(await verifyAgentArtifact({ targetDir: tmpDir(), agent: '@product' }), null);
});

test('verifyAgentArtifact hints (skipped, never fails) when a locator-keyed kind has no locator', async () => {
  const genome = await verifyAgentArtifact({ targetDir: tmpDir(), agent: 'genome' });
  assert.equal(genome.skipped, true);
  assert.equal(genome.ok, true); // a hint must never fail the close
  assert.match(genome.reason, /--slug=<slug>/);
  assert.match(genome.reason, /aioson verify:artifact \. --kind=genome/);

  const orache = await verifyAgentArtifact({ targetDir: tmpDir(), agent: 'orache' });
  assert.equal(orache.skipped, true);
  assert.match(orache.reason, /--file=<path>/);

  const site = await verifyAgentArtifact({ targetDir: tmpDir(), agent: 'site-forge' });
  assert.equal(site.skipped, true);
  assert.match(site.reason, /--dir=<dir>/);
});

test('verifyAgentArtifact runs the real check for a self-resolving kind (discover/bootstrap)', async () => {
  const good = tmpDir();
  writeBootstrap(good, { valid: true });
  const okRes = await verifyAgentArtifact({ targetDir: good, agent: 'discover' });
  assert.equal(okRes.skipped, false);
  assert.equal(okRes.ok, true);
  assert.equal(okRes.kind, 'bootstrap');

  const bad = tmpDir();
  writeBootstrap(bad, { valid: false }); // TODO placeholder trips must_not_match
  const failRes = await verifyAgentArtifact({ targetDir: bad, agent: 'discover' });
  assert.equal(failRes.skipped, false);
  assert.equal(failRes.ok, false);
  assert.match(failRes.reason, /verify-artifact-bootstrap\.json/);

  const empty = tmpDir(); // no bootstrap files at all
  const missingRes = await verifyAgentArtifact({ targetDir: empty, agent: 'discover' });
  assert.equal(missingRes.ok, false);
});

test('feature-slugged kinds fall back to --feature when no --slug was threaded', async () => {
  // tester/test-report is keyed by the feature slug: a plain
  // `agent:done --feature={slug}` must fire the real check, not the hint.
  const dir = tmpDir();
  const viaFeature = await verifyAgentArtifact({ targetDir: dir, agent: 'tester', options: { feature: 'demo' } });
  assert.equal(viaFeature.skipped, false);
  assert.equal(viaFeature.ok, false); // no report written -> a real (advisory) failure
  assert.equal(viaFeature.kind, 'test-report');

  // an explicit --slug still wins over --feature
  const explicit = await verifyAgentArtifact({ targetDir: dir, agent: 'tester', options: { slug: 'other', feature: 'demo' } });
  assert.equal(explicit.skipped, false);

  // non-feature-slugged kinds do NOT inherit the fallback (genome slug != feature)
  const genome = await verifyAgentArtifact({ targetDir: dir, agent: 'genome', options: { feature: 'demo' } });
  assert.equal(genome.skipped, true);
  assert.match(genome.reason, /--slug=<slug>/);
});

test('shakedown maps to kind=shakedown via --file (hint without it, real check with it)', async () => {
  const dir = tmpDir();
  const hint = await verifyAgentArtifact({ targetDir: dir, agent: 'shakedown' });
  assert.equal(hint.skipped, true);
  assert.match(hint.reason, /--file=<path>/);
  assert.match(hint.reason, /--kind=shakedown/);

  const rel = '.aioson/context/shakedown-demo.md';
  fs.mkdirSync(path.join(dir, '.aioson', 'context'), { recursive: true });
  fs.writeFileSync(path.join(dir, rel), '# not a shakedown report\n', 'utf8');
  const real = await verifyAgentArtifact({ targetDir: dir, agent: 'shakedown', options: { file: rel } });
  assert.equal(real.skipped, false);
  assert.equal(real.ok, false);
  assert.equal(real.kind, 'shakedown');
});

test('verifyAgentArtifact flags a missing project.context.md for setup', async () => {
  const res = await verifyAgentArtifact({ targetDir: tmpDir(), agent: 'setup' });
  assert.equal(res.skipped, false);
  assert.equal(res.ok, false);
  assert.equal(res.kind, 'project-context');
  assert.ok(res.issues.length > 0);
});

test('verifyAgentArtifact persists the report json the same way the CLI does', async () => {
  const root = tmpDir();
  writeBootstrap(root, { valid: true });
  await verifyAgentArtifact({ targetDir: root, agent: 'discover' });
  const report = path.join(root, '.aioson', 'context', 'verify-artifact-bootstrap.json');
  assert.equal(fs.existsSync(report), true);
  const parsed = JSON.parse(fs.readFileSync(report, 'utf8'));
  assert.equal(parsed.kind, 'bootstrap');
  assert.equal(parsed.mode, 'advisory');
});
