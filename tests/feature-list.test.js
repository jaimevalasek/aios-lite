'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const { runFeatureList } = require('../src/commands/feature-list');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const execFileAsync = promisify(execFile);

const FEATURES_MD = `# Features

| slug | status | started | completed |
|------|--------|---------|-----------|
| old-billing | done | 2026-01-04 | 2026-01-09 |
| checkout-rework | in_progress | 2026-03-11 | — |
| legacy-import | paused | 2026-02-02 | — |
| no-date-feature | draft | — | — |
`;

async function writeProject(root, { pulse } = {}) {
  const contextDir = path.join(root, '.aioson', 'context');
  await fs.mkdir(contextDir, { recursive: true });
  await fs.writeFile(path.join(contextDir, 'features.md'), FEATURES_MD, 'utf8');
  if (pulse) {
    await fs.writeFile(
      path.join(contextDir, 'project-pulse.md'),
      `---\nactive_feature: ${pulse}\n---\n\n# Pulse\n`,
      'utf8'
    );
  }
  return contextDir;
}

describe('feature:list', () => {
  let root;

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'feature-list-'));
  });

  afterEach(async () => {
    await fs.rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 25 });
  });

  it('lists every registered feature newest first and marks the active one', async () => {
    await writeProject(root, { pulse: 'checkout-rework' });

    const result = await runFeatureList({
      args: [root],
      options: { json: true },
      logger: { log: () => {} },
      t: (key) => key
    });

    assert.equal(result.ok, true);
    assert.equal(result.total, 4);
    assert.equal(result.active, 'checkout-rework');
    assert.deepEqual(
      result.features.map((feature) => feature.slug),
      ['checkout-rework', 'legacy-import', 'old-billing', 'no-date-feature']
    );
    assert.equal(result.features[0].active, true);
    assert.equal(result.features[0].status, 'in_progress');
    assert.equal(result.features[3].started, null, 'an empty date cell is null, not "—"');
  });

  it('filters by status and truncates with an explicit hint', async () => {
    await writeProject(root);

    const filtered = await runFeatureList({
      args: [root],
      options: { json: true, status: 'in_progress,paused' },
      logger: { log: () => {} },
      t: (key) => key
    });
    assert.deepEqual(
      filtered.features.map((feature) => feature.slug),
      ['checkout-rework', 'legacy-import']
    );

    const logs = [];
    const truncated = await runFeatureList({
      args: [root],
      options: { limit: '2' },
      logger: { log: (value) => logs.push(value) },
      t: (key) => key
    });
    assert.equal(truncated.returned, 2);
    assert.equal(truncated.total, 4);
    assert.ok(logs.includes('feature_list.truncated'));

    const all = await runFeatureList({
      args: [root],
      options: { json: true, limit: '0' },
      logger: { log: () => {} },
      t: (key) => key
    });
    assert.equal(all.returned, 4, '--limit=0 lists everything');
  });

  it('reports an empty project instead of failing', async () => {
    const logs = [];
    const result = await runFeatureList({
      args: [root],
      options: {},
      logger: { log: (value) => logs.push(value) },
      t: (key) => key
    });

    assert.equal(result.ok, true);
    assert.deepEqual(result.features, []);
    assert.equal(result.active, '');
    assert.ok(logs.includes('feature_list.empty'));
  });

  it('is wired through the CLI in JSON mode', async () => {
    await writeProject(root, { pulse: 'checkout-rework' });

    const { stdout, stderr } = await execFileAsync(process.execPath, [
      path.join(PROJECT_ROOT, 'src', 'cli.js'),
      'feature:list',
      root,
      '--status=in_progress',
      '--json'
    ], { cwd: PROJECT_ROOT });

    assert.equal(stderr, '');
    const result = JSON.parse(stdout);
    assert.equal(result.ok, true);
    assert.equal(result.features.length, 1);
    assert.equal(result.features[0].slug, 'checkout-rework');
    assert.equal(result.features[0].active, true);
  });
});
