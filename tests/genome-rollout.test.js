'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const packageJson = require('../package.json');
const {
  BLOCKS,
  DEFAULT_DASHBOARD_ROOT,
  buildRolloutPlan,
  parseArgs
} = require('../scripts/testing/genome-2.0-rollout');

test('parseArgs accepts dashboard root and dry-run flags', () => {
  const options = parseArgs([
    '--block', 'c',
    '--dashboard-root', '../custom-dashboard',
    '--dry-run',
    '--json'
  ]);

  assert.equal(options.block, 'c');
  assert.equal(options.dashboardRoot, path.resolve('../custom-dashboard'));
  assert.equal(options.dryRun, true);
  assert.equal(options.json, true);
});

test('buildRolloutPlan returns all blocks by default', () => {
  const plan = buildRolloutPlan({});
  const coreRoot = path.resolve(__dirname, '..');

  assert.deepEqual(plan.map((item) => item.key), ['A', 'B', 'C', 'D']);
  assert.equal(plan[0].cwd, coreRoot);
  assert.equal(plan[1].cwd, DEFAULT_DASHBOARD_ROOT);
});

test('buildRolloutPlan supports single block selection and skip-dashboard', () => {
  const blockC = buildRolloutPlan({ block: 'C' });
  const skipped = buildRolloutPlan({ skipDashboard: true });

  assert.deepEqual(blockC.map((item) => item.key), ['C']);
  assert.deepEqual(skipped.map((item) => item.key), ['A']);
  assert.equal(BLOCKS.C.repo, 'dashboard');
});

test('Genome 2.0 block A retains smoke, focused genome, full regression, and lint gates', () => {
  assert.deepEqual(
    packageJson.scripts['test:genome-2.0:block-a'].split(/\s*&&\s*/),
    [
      'node scripts/smoke/genome-2.0-smoke.js',
      'npm run test:genome',
      'npm test',
      'npm run lint'
    ]
  );
});
