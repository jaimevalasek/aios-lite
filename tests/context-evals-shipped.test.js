'use strict';

/**
 * The shipped eval corpus against the shipped knowledge tree — the CI gate
 * that turns reachability from an assumption into a regression test. Before
 * this, 169 routed artifacts (rules, docs, design-docs, skill routers)
 * declared triggers and two incident tests proved seven of them; a reworded
 * description or a tightened selector could silently strand any of the rest.
 * Now every scenario under template/.aioson/evals replays through the real
 * engine on every suite run, rules and skills carry full positive coverage,
 * and a skipped check (missing target) is impossible on a full install.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { runContextEvals } = require('../src/lib/context-evals');
const { parseFrontmatter } = require('../src/preflight-engine');

const ROOT = path.resolve(__dirname, '..');
const TEMPLATE = path.join(ROOT, 'template', '.aioson');

async function shippedProject() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'aioson-evals-shipped-'));
  for (const sub of ['docs', 'rules', 'skills', 'design-docs', 'evals']) {
    await fs.cp(path.join(TEMPLATE, sub), path.join(dir, '.aioson', sub), { recursive: true }).catch(() => {});
  }
  await fs.mkdir(path.join(dir, '.aioson', 'context'), { recursive: true });
  await fs.writeFile(path.join(dir, '.aioson', 'context', 'project.context.md'), [
    '---',
    'framework: Node.js',
    'project_type: web-app',
    'conversation_language: pt-BR',
    'load_tier: always',
    '---',
    '# Project'
  ].join('\n'), 'utf8');
  // The state every consumer is in mid-feature: a pulse naming an active
  // feature whose slug carries domain words. The corpus must hold under it —
  // without this line precision 1 was proven only where the slug could not
  // leak into the keyword lookup.
  await fs.writeFile(path.join(dir, '.aioson', 'context', 'project-pulse.md'), [
    '---',
    'active_feature: customer-onboarding-board',
    '---',
    '# Pulse'
  ].join('\n'), 'utf8');
  return dir;
}

test('every shipped eval scenario passes against the shipped corpus, with zero skips', { timeout: 300000 }, async () => {
  const dir = await shippedProject();
  try {
    const report = await runContextEvals(dir);
    assert.deepEqual(report.errors, [], report.errors.join('\n'));
    assert.ok(report.totals.scenarios >= 100, `expected a corpus-scale scenario set, found ${report.totals.scenarios}`);

    const failures = [];
    const skips = [];
    for (const result of report.results) {
      for (const check of result.checks) {
        if (check.skipped) skips.push(`${result.name}: ${check.path}`);
        else if (!check.passed) {
          failures.push(`${result.name}: ${check.type} ${check.path} (${check.in}) — ${check.diagnosis ? check.diagnosis.cause + ': ' + check.diagnosis.detail : ''}`);
        }
      }
    }
    assert.deepEqual(failures, [], `red scenarios against the shipped corpus:\n${failures.join('\n')}`);
    // A skip means an expect targets a file the full template does not ship —
    // that is a typo'd path hiding as profile tolerance.
    assert.deepEqual(skips, [], `skipped checks on a FULL install:\n${skips.join('\n')}`);

    // Rules and skill routers carry full positive coverage; docs hold the
    // measured floor and may only ratchet up.
    const uncoveredBySurface = { rules: [], docs: [], design_governance: [], skills: [] };
    for (const item of report.coverage.uncovered) {
      (uncoveredBySurface[item.surface] || (uncoveredBySurface[item.surface] = [])).push(item.path);
    }
    assert.deepEqual(uncoveredBySurface.rules, [], `uncovered rules:\n${uncoveredBySurface.rules.join('\n')}`);
    assert.deepEqual(uncoveredBySurface.skills, [], `uncovered skill routers:\n${uncoveredBySurface.skills.join('\n')}`);
    assert.ok(report.coverage.rate >= 0.95, `coverage ratchet: ${report.coverage.rate} < 0.95 — uncovered:\n${report.coverage.uncovered.map((i) => i.path).join('\n')}`);

    // Precision is only as real as the negatives behind it. The corpus carries
    // a floor of hard `absent` checks (neutral tasks against the broadest
    // triggers), so a rule that starts firing on a README typo or a database
    // column fails here — coverage alone would never see it.
    assert.ok(report.totals.negatives >= 120, `negative floor: ${report.totals.negatives} absent checks < 120 — the precision axis is under-measured`);
    assert.equal(report.totals.precision, 1, `trigger precision ${report.totals.precision}: an artifact fired on a task it was never meant for`);
    assert.equal(report.totals.recall, 1);
    assert.equal(report.totals.f1, 1);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('active registry skills declare routing frontmatter; deprecated ones stay unroutable', async () => {
  const registry = JSON.parse(await fs.readFile(path.join(TEMPLATE, 'skills', 'registry.json'), 'utf8'));
  const routingFields = ['task_types', 'triggers', 'aliases', 'entities', 'retrieval_intents', 'paths'];
  for (const skill of registry.skills) {
    const routerPath = path.join(ROOT, 'template', skill.path);
    const frontmatter = parseFrontmatter(await fs.readFile(routerPath, 'utf8'));
    const routed = routingFields.filter((field) => {
      const value = String(frontmatter[field] || '').trim();
      return value !== '' && value !== '[]';
    });
    if (skill.status === 'deprecated') {
      assert.deepEqual(routed, [], `${skill.id} is deprecated but declares routing (${routed.join(', ')}) — a retired skill must not route`);
    } else {
      assert.ok(routed.length > 0, `${skill.id} is active but selector-invisible: no ${routingFields.join('/')} in ${skill.path}`);
    }
  }
});
