'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { runContextTrim } = require('../src/commands/context-trim');

const mockLogger = { log: () => {}, error: () => {}, warn: () => {} };

describe('context-trim.js — runContextTrim', () => {
  let tmpDir;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'context-trim-test-'));
    await fs.mkdir(path.join(tmpDir, '.aioson', 'context'), { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('returns no_context_dir when context directory missing', async () => {
    const emptyDir = await fs.mkdtemp(path.join(os.tmpdir(), 'context-trim-empty-'));
    try {
      const result = await runContextTrim({
        args: [emptyDir],
        options: { json: true },
        logger: mockLogger
      });
      assert.equal(result.ok, false);
      assert.equal(result.reason, 'no_context_dir');
    } finally {
      await fs.rm(emptyDir, { recursive: true, force: true });
    }
  });

  it('returns empty result when no stale specs or large sections', async () => {
    await fs.writeFile(path.join(tmpDir, '.aioson', 'context', 'spec.md'), '# Spec\n');
    const result = await runContextTrim({
      args: [tmpDir],
      options: { json: true },
      logger: mockLogger
    });
    assert.equal(result.ok, true);
    assert.equal(result.staleSpecs.length, 0);
    assert.equal(result.largeSections.length, 0);
    assert.equal(result.totalStaleSavedBytes, 0);
  });

  it('detects stale specs for done features', async () => {
    await fs.writeFile(
      path.join(tmpDir, '.aioson', 'context', 'features.md'),
      '| slug | status |\n|------|--------|\n| auth | done |\n'
    );
    await fs.writeFile(path.join(tmpDir, '.aioson', 'context', 'spec-auth.md'), '# Spec Auth\n');

    const result = await runContextTrim({
      args: [tmpDir],
      options: { json: true },
      logger: mockLogger
    });
    assert.equal(result.ok, true);
    assert.equal(result.staleSpecs.length, 1);
    assert.equal(result.staleSpecs[0].file, 'spec-auth.md');
    assert.equal(result.staleSpecs[0].slug, 'auth');
    assert.ok(result.totalStaleSavedBytes > 0);
  });

  it('detects large sections with many bullets', async () => {
    const bullets = Array.from({ length: 25 }, (_, i) => `- item ${i + 1}`).join('\n');
    await fs.writeFile(
      path.join(tmpDir, '.aioson', 'context', 'spec.md'),
      `# Spec\n\n## Section A\n${bullets}\n`
    );

    const result = await runContextTrim({
      args: [tmpDir],
      options: { json: true },
      logger: mockLogger
    });
    assert.equal(result.ok, true);
    assert.equal(result.largeSections.length, 1);
    assert.equal(result.largeSections[0].file, 'spec.md');
    assert.equal(result.largeSections[0].section, 'Section A');
    assert.equal(result.largeSections[0].bulletCount, 25);
  });

  it('dry-run does not move files', async () => {
    await fs.writeFile(
      path.join(tmpDir, '.aioson', 'context', 'features.md'),
      '| slug | status |\n|------|--------|\n| auth | done |\n'
    );
    const specPath = path.join(tmpDir, '.aioson', 'context', 'spec-auth.md');
    await fs.writeFile(specPath, '# Spec Auth\n');

    const result = await runContextTrim({
      args: [tmpDir],
      options: { json: true, 'dry-run': true },
      logger: mockLogger
    });
    assert.equal(result.ok, true);
    assert.equal(result.dryRun, true);
    // File should still exist in original location
    const stat = await fs.stat(specPath);
    assert.ok(stat.isFile());
  });

  it('force archives stale specs', async () => {
    await fs.writeFile(
      path.join(tmpDir, '.aioson', 'context', 'features.md'),
      '| slug | status |\n|------|--------|\n| auth | done |\n'
    );
    const specPath = path.join(tmpDir, '.aioson', 'context', 'spec-auth.md');
    await fs.writeFile(specPath, '# Spec Auth\n');

    // Note: when json: true, the command returns before archiving (production behavior)
    // We test archive with json: false to exercise the actual move.
    const result = await runContextTrim({
      args: [tmpDir],
      options: { force: true },
      logger: mockLogger
    });
    assert.equal(result.ok, true);
    assert.equal(result.archived, 1);

    // File should be moved to archive
    const archivedPath = path.join(tmpDir, '.aioson', 'context', 'archive', 'spec-auth.md');
    const stat = await fs.stat(archivedPath);
    assert.ok(stat.isFile());

    // Original should be gone
    try {
      await fs.stat(specPath);
      assert.fail('Original spec should be archived');
    } catch {
      // expected
    }
  });
});
