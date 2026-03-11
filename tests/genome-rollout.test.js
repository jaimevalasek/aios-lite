'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
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

  assert.deepEqual(plan.map((item) => item.key), ['A', 'B', 'C', 'D']);
  assert.equal(plan[0].cwd.endsWith(path.join('aios-lite')), true);
  assert.equal(plan[1].cwd, DEFAULT_DASHBOARD_ROOT);
});

test('buildRolloutPlan supports single block selection and skip-dashboard', () => {
  const blockC = buildRolloutPlan({ block: 'C' });
  const skipped = buildRolloutPlan({ skipDashboard: true });

  assert.deepEqual(blockC.map((item) => item.key), ['C']);
  assert.deepEqual(skipped.map((item) => item.key), ['A']);
  assert.equal(BLOCKS.C.repo, 'dashboard');
});
