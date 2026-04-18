'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { buildPathGuardBlock, loadProjectMap, PROJECT_MAP_PATH } = require('../src/path-guard');

describe('path-guard.js — loadProjectMap', () => {
  let tmpDir;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'path-guard-test-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('returns fallback rules when project-map.md does not exist', async () => {
    const map = await loadProjectMap(tmpDir);
    assert.ok(map.includes('Path Conventions (fallback)'));
    assert.ok(map.includes('`/docs/`'));
  });

  it('reads project-map.md when it exists', async () => {
    const mapDir = path.join(tmpDir, '.aioson', 'context');
    await fs.mkdir(mapDir, { recursive: true });
    await fs.writeFile(path.join(mapDir, 'project-map.md'), '## Custom Map\n- src/ → source code\n');

    const map = await loadProjectMap(tmpDir);
    assert.ok(map.includes('Custom Map'));
    assert.ok(map.includes('src/'));
  });

  it('returns empty string when project-map.md is whitespace-only', async () => {
    const mapDir = path.join(tmpDir, '.aioson', 'context');
    await fs.mkdir(mapDir, { recursive: true });
    await fs.writeFile(path.join(mapDir, 'project-map.md'), '   ');

    const map = await loadProjectMap(tmpDir);
    // Note: production code returns trimmed content even if empty, rather than fallback
    assert.equal(map, '');
  });
});

describe('path-guard.js — buildPathGuardBlock', () => {
  let tmpDir;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'path-guard-test-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('returns markdown block with canonical path rules header', async () => {
    const block = await buildPathGuardBlock(tmpDir);
    assert.ok(block.startsWith('## Canonical Path Rules'));
    assert.ok(block.includes('Resolve all file paths using the map below'));
  });

  it('includes fallback rules when no project map exists', async () => {
    const block = await buildPathGuardBlock(tmpDir);
    assert.ok(block.includes('Path Conventions (fallback)'));
    assert.ok(block.includes('.aioson/context/'));
  });

  it('includes custom map content when project-map.md exists', async () => {
    const mapDir = path.join(tmpDir, '.aioson', 'context');
    await fs.mkdir(mapDir, { recursive: true });
    await fs.writeFile(path.join(mapDir, 'project-map.md'), '## My Map\n- app/ → application root\n');

    const block = await buildPathGuardBlock(tmpDir);
    assert.ok(block.includes('My Map'));
    assert.ok(block.includes('app/'));
  });
});
