'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs/promises');
const os = require('node:os');
const { scanFriction, buildRecommendations } = require('../src/friction-scanner');
const { runWorkflowHarden } = require('../src/commands/workflow-harden');

describe('friction-scanner', () => {
  it('detects typescript compile pattern', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'aioson-harden-'));
    await fs.mkdir(path.join(tmpDir, '.aioson', 'context'), { recursive: true });
    await fs.appendFile(
      path.join(tmpDir, '.aioson', 'context', 'workflow.errors.jsonl'),
      JSON.stringify({ ts: new Date().toISOString(), stage: 'dev', gateType: 'technical', error: 'npx tsc --noEmit failed with type mismatch' }) + '\n'
    );

    const analysis = await scanFriction(tmpDir);
    assert.ok(analysis.patterns.some((p) => p.id === 'typescript_compile'));
  });

  it('builds recommendations with priorities', async () => {
    const analysis = {
      total: 5,
      recentCount: 5,
      patterns: [
        { id: 'git_staging', name: 'Git staging accidents', count: 4, examples: [] },
        { id: 'test_mock_order', name: 'Mock ordering / test helper issues', count: 2, examples: [] }
      ]
    };
    const recs = buildRecommendations(analysis);
    assert.ok(recs.some((r) => r.pattern === 'Git staging accidents' && r.priority === 'high'));
    assert.ok(recs.some((r) => r.pattern === 'Mock ordering / test helper issues' && r.autoFixable));
  });
});

describe('workflow:harden command', () => {
  it('runs dry-run without errors on empty project', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'aioson-harden-'));
    await fs.mkdir(path.join(tmpDir, '.aioson', 'context'), { recursive: true });

    const logger = { log: () => {}, error: () => {} };
    const result = await runWorkflowHarden({ args: [tmpDir], options: { 'dry-run': true }, logger, t: (k) => k });

    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.dryRun, true);
  });

  it('applies gitignore auto-fix when git staging pattern is detected', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'aioson-harden-'));
    await fs.mkdir(path.join(tmpDir, '.aioson', 'context'), { recursive: true });
    await fs.appendFile(
      path.join(tmpDir, '.aioson', 'context', 'workflow.errors.jsonl'),
      JSON.stringify({ ts: new Date().toISOString(), stage: 'committer', gateType: 'technical', error: 'node_modules staged' }) + '\n'
    );

    const logger = { log: () => {}, error: () => {} };
    const result = await runWorkflowHarden({ args: [tmpDir], options: {}, logger, t: (k) => k });

    assert.strictEqual(result.ok, true);
    assert.ok(result.fixes.some((f) => f.action.includes('.gitignore')));

    const gitignore = await fs.readFile(path.join(tmpDir, '.gitignore'), 'utf8');
    assert.ok(gitignore.includes('node_modules/'));
  });
});
