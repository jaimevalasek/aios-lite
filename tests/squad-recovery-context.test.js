'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const {
  generateRecovery,
  readRecovery,
  shouldRefreshOnEvent,
  REFRESH_EVENTS
} = require('../src/squad/recovery-context');

async function makeTempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'aioson-recovery-'));
}

function squadDir(tmpDir, squadSlug) {
  return path.join(tmpDir, '.aioson', 'squads', squadSlug);
}

async function writeManifest(tmpDir, squadSlug, data) {
  const dir = squadDir(tmpDir, squadSlug);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, 'squad.manifest.json'), JSON.stringify(data), 'utf8');
}

// --- generateRecovery ---

test('generateRecovery creates recovery-context.md in squad directory', async () => {
  const tmpDir = await makeTempDir();
  try {
    await writeManifest(tmpDir, 'odonto', {
      goal: 'Automate dental clinic workflows',
      executors: [{ slug: 'writer', title: 'Content Writer', role: 'Writes copy and docs' }]
    });

    const result = await generateRecovery(tmpDir, 'odonto', 'writer');
    assert.equal(result.ok, true);
    assert.ok(result.path.endsWith('recovery-context.md'));
    assert.ok(result.tokens > 0);

    const exists = await fs.access(result.path).then(() => true).catch(() => false);
    assert.equal(exists, true);
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('generateRecovery content includes squad and agent identifiers', async () => {
  const tmpDir = await makeTempDir();
  try {
    await writeManifest(tmpDir, 'ecommerce', {
      goal: 'Build online store',
      executors: [{ slug: 'analyst', title: 'Analyst', role: 'Analyses requirements' }]
    });

    const result = await generateRecovery(tmpDir, 'ecommerce', 'analyst');
    const content = await fs.readFile(result.path, 'utf8');
    assert.ok(content.includes('ecommerce'));
    assert.ok(content.includes('analyst'));
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('generateRecovery content includes squad goal from manifest', async () => {
  const tmpDir = await makeTempDir();
  try {
    await writeManifest(tmpDir, 'alpha', {
      goal: 'Launch MVP by Q2',
      executors: []
    });

    const result = await generateRecovery(tmpDir, 'alpha', 'writer');
    const content = await fs.readFile(result.path, 'utf8');
    assert.ok(content.includes('Launch MVP by Q2'));
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('generateRecovery content is under 2000 estimated tokens', async () => {
  const tmpDir = await makeTempDir();
  try {
    await writeManifest(tmpDir, 'alpha', { goal: 'test', executors: [] });
    const result = await generateRecovery(tmpDir, 'alpha', 'writer');
    // estimateTokens = ceil(len/4); max 2000 tokens ≈ 8000 chars
    const content = await fs.readFile(result.path, 'utf8');
    const estimatedTokens = Math.ceil(content.length / 4);
    assert.ok(estimatedTokens <= 2000, `Estimated tokens: ${estimatedTokens}`);
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('generateRecovery works without manifest (best-effort, no throw)', async () => {
  const tmpDir = await makeTempDir();
  try {
    // No manifest written — should still succeed (readManifest returns {} on failure)
    const result = await generateRecovery(tmpDir, 'no-manifest-squad', 'writer');
    assert.equal(result.ok, true);
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('generateRecovery overwrites existing recovery-context.md on second call', async () => {
  const tmpDir = await makeTempDir();
  try {
    await writeManifest(tmpDir, 'alpha', { goal: 'v1', executors: [] });
    await generateRecovery(tmpDir, 'alpha', 'writer');

    await writeManifest(tmpDir, 'alpha', { goal: 'v2 updated goal', executors: [] });
    const result2 = await generateRecovery(tmpDir, 'alpha', 'writer');
    const content = await fs.readFile(result2.path, 'utf8');
    assert.ok(content.includes('v2 updated goal'));
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

// --- readRecovery ---

test('readRecovery returns content of existing recovery-context.md', async () => {
  const tmpDir = await makeTempDir();
  try {
    await writeManifest(tmpDir, 'alpha', { goal: 'test', executors: [] });
    await generateRecovery(tmpDir, 'alpha', 'writer');
    const content = await readRecovery(tmpDir, 'alpha');
    assert.ok(typeof content === 'string');
    assert.ok(content.length > 0);
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('readRecovery returns null when file does not exist', async () => {
  const tmpDir = await makeTempDir();
  try {
    const content = await readRecovery(tmpDir, 'no-squad');
    assert.equal(content, null);
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

// --- shouldRefreshOnEvent ---

test('shouldRefreshOnEvent returns true for task_completed', () => {
  assert.equal(shouldRefreshOnEvent('task_completed'), true);
});

test('shouldRefreshOnEvent returns true for decision_made', () => {
  assert.equal(shouldRefreshOnEvent('decision_made'), true);
});

test('shouldRefreshOnEvent returns true for handoff', () => {
  assert.equal(shouldRefreshOnEvent('handoff'), true);
});

test('shouldRefreshOnEvent returns false for unknown events', () => {
  assert.equal(shouldRefreshOnEvent('some_random_event'), false);
  assert.equal(shouldRefreshOnEvent('task_started'), false);
  assert.equal(shouldRefreshOnEvent(''), false);
});

// --- REFRESH_EVENTS ---

test('REFRESH_EVENTS Set contains expected events', () => {
  assert.ok(REFRESH_EVENTS.has('task_completed'));
  assert.ok(REFRESH_EVENTS.has('decision_made'));
  assert.ok(REFRESH_EVENTS.has('handoff'));
});
