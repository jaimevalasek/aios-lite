'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { scaffoldSquad } = require('../src/squad/squad-scaffold');

async function makeTempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'aioson-scaffold-'));
}

async function exists(filePath) {
  return fs.access(filePath).then(() => true).catch(() => false);
}

// ─── Validation ──────────────────────────────────────────────────────────────

test('scaffoldSquad returns error when slug is missing', async () => {
  const tmpDir = await makeTempDir();
  try {
    const result = await scaffoldSquad(tmpDir, { name: 'Test Squad', mode: 'hybrid' });
    assert.equal(result.ok, false);
    assert.ok(result.error.includes('slug'));
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('scaffoldSquad returns error when name is missing', async () => {
  const tmpDir = await makeTempDir();
  try {
    const result = await scaffoldSquad(tmpDir, { slug: 'test-squad', mode: 'hybrid' });
    assert.equal(result.ok, false);
    assert.ok(result.error.includes('name'));
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('scaffoldSquad returns error for invalid mode', async () => {
  const tmpDir = await makeTempDir();
  try {
    const result = await scaffoldSquad(tmpDir, { slug: 'test', name: 'Test', mode: 'invalid' });
    assert.equal(result.ok, false);
    assert.ok(result.error.includes('mode'));
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('scaffoldSquad returns error when squad already exists', async () => {
  const tmpDir = await makeTempDir();
  try {
    await scaffoldSquad(tmpDir, { slug: 'my-squad', name: 'My Squad', mode: 'hybrid' });
    const result = await scaffoldSquad(tmpDir, { slug: 'my-squad', name: 'My Squad', mode: 'hybrid' });
    assert.equal(result.ok, false);
    assert.ok(result.error.includes('already exists'));
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

// ─── Success — file creation ─────────────────────────────────────────────────

test('scaffoldSquad creates core squad files', async () => {
  const tmpDir = await makeTempDir();
  try {
    const result = await scaffoldSquad(tmpDir, { slug: 'content-team', name: 'Content Team', mode: 'content' });

    assert.equal(result.ok, true);
    assert.equal(result.slug, 'content-team');

    const base = path.join(tmpDir, '.aioson', 'squads', 'content-team');

    assert.ok(await exists(path.join(base, 'agents', 'agents.md')), 'agents.md');
    assert.ok(await exists(path.join(base, 'squad.manifest.json')), 'squad.manifest.json');
    assert.ok(await exists(path.join(base, 'squad.md')), 'squad.md');
    assert.ok(await exists(path.join(base, 'docs', 'design-doc.md')), 'design-doc.md');
    assert.ok(await exists(path.join(base, 'docs', 'readiness.md')), 'readiness.md');
    assert.ok(await exists(path.join(base, 'checklists', 'quality.md')), 'quality.md');
    assert.ok(await exists(path.join(base, 'learnings', 'index.md')), 'learnings/index.md');
    assert.ok(await exists(path.join(base, 'STATE.md')), 'STATE.md');
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('scaffoldSquad creates output directories', async () => {
  const tmpDir = await makeTempDir();
  try {
    await scaffoldSquad(tmpDir, { slug: 'backend', name: 'Backend Squad', mode: 'code' });

    assert.ok(await exists(path.join(tmpDir, 'output', 'backend')), 'output/backend');
    assert.ok(await exists(path.join(tmpDir, 'aioson-logs', 'backend')), 'aioson-logs/backend');
    assert.ok(await exists(path.join(tmpDir, 'media', 'backend')), 'media/backend');
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('scaffoldSquad creates empty workflow/scripts/bus directories', async () => {
  const tmpDir = await makeTempDir();
  try {
    await scaffoldSquad(tmpDir, { slug: 'myteam', name: 'My Team', mode: 'hybrid' });

    const base = path.join(tmpDir, '.aioson', 'squads', 'myteam');
    assert.ok(await exists(path.join(base, 'workflows')), 'workflows/');
    assert.ok(await exists(path.join(base, 'workers')), 'workers/');
    assert.ok(await exists(path.join(base, 'skills')), 'skills/');
    assert.ok(await exists(path.join(base, 'templates')), 'templates/');
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('scaffoldSquad generates valid squad.manifest.json', async () => {
  const tmpDir = await makeTempDir();
  try {
    await scaffoldSquad(tmpDir, { slug: 'api-team', name: 'API Team', mode: 'code' });

    const manifestPath = path.join(tmpDir, '.aioson', 'squads', 'api-team', 'squad.manifest.json');
    const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));

    assert.equal(manifest.slug, 'api-team');
    assert.equal(manifest.name, 'API Team');
    assert.equal(manifest.mode, 'software');
    assert.ok(manifest.created_at);
    assert.ok(manifest.budget, 'should have budget field');
    assert.ok(Array.isArray(manifest.depends_on), 'depends_on should be array');
    assert.ok(manifest.anti_loop, 'should have anti_loop field');
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('scaffoldSquad manifest budget has correct structure', async () => {
  const tmpDir = await makeTempDir();
  try {
    await scaffoldSquad(tmpDir, { slug: 'budget-test', name: 'Budget Test', mode: 'hybrid' });

    const manifestPath = path.join(tmpDir, '.aioson', 'squads', 'budget-test', 'squad.manifest.json');
    const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));

    assert.ok('max_tokens_per_session' in manifest.budget);
    assert.ok('max_tokens_per_task' in manifest.budget);
    assert.equal(manifest.budget.action_on_exceed, 'pause');
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('scaffoldSquad agents.md includes mode-specific executor slots', async () => {
  const tmpDir = await makeTempDir();
  try {
    await scaffoldSquad(tmpDir, { slug: 'code-squad', name: 'Code Squad', mode: 'code' });

    const agentsPath = path.join(tmpDir, '.aioson', 'squads', 'code-squad', 'agents', 'agents.md');
    const content = await fs.readFile(agentsPath, 'utf8');

    // code mode should have developer, reviewer, tester
    assert.ok(content.includes('developer') || content.includes('reviewer') || content.includes('tester'));
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('scaffoldSquad returns count of created files and directories', async () => {
  const tmpDir = await makeTempDir();
  try {
    const result = await scaffoldSquad(tmpDir, { slug: 'analytics', name: 'Analytics', mode: 'hybrid' });

    assert.ok(result.files.length > 0, 'should report created files');
    assert.ok(result.directories.length > 0, 'should report created directories');
    assert.ok(result.total > 10, 'should create more than 10 items total');
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('scaffoldSquad works for all three modes', async () => {
  const tmpDir = await makeTempDir();
  try {
    const modeMap = { content: 'content', code: 'software', hybrid: 'mixed' };
    for (const [input, normalized] of Object.entries(modeMap)) {
      const result = await scaffoldSquad(tmpDir, { slug: `squad-${input}`, name: `Squad ${input}`, mode: input });
      assert.equal(result.ok, true, `should succeed for mode=${input}`);
      assert.equal(result.mode, normalized, `mode=${input} should normalize to ${normalized}`);
    }
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('scaffoldSquad quality.md has meaningful checklist content', async () => {
  const tmpDir = await makeTempDir();
  try {
    await scaffoldSquad(tmpDir, { slug: 'ql', name: 'QL Squad', mode: 'hybrid' });

    const qualityPath = path.join(tmpDir, '.aioson', 'squads', 'ql', 'checklists', 'quality.md');
    const content = await fs.readFile(qualityPath, 'utf8');

    assert.ok(content.includes('- [ ]'), 'should have checklist items');
    assert.ok(content.toLowerCase().includes('criteria') || content.toLowerCase().includes('check'));
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});
