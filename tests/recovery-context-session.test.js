'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');

const { generateSessionRecovery, readSessionRecovery } = require('../src/recovery-context-session');

async function makeTmpDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'aioson-recovery-session-'));
}

test('generateSessionRecovery — creates file with ok:true', async () => {
  const tmp = await makeTmpDir();
  try {
    const result = await generateSessionRecovery(tmp, { tasks: [] });
    assert.ok(result.ok, 'should return ok:true');
    assert.ok(result.path.endsWith('recovery-context.md'), 'path ends with recovery-context.md');
    assert.ok(typeof result.tokens === 'number', 'tokens is a number');
    const content = await fs.readFile(result.path, 'utf8');
    assert.ok(content.length > 0, 'file has content');
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test('generateSessionRecovery — token budget under 2000', async () => {
  const tmp = await makeTmpDir();
  try {
    const result = await generateSessionRecovery(tmp, {
      goal: 'implement context optimizations',
      agent: 'dev',
      tasks: [
        { id: '1', title: 'Task one', status: 'completed' },
        { id: '2', title: 'Task two', status: 'in_progress' }
      ],
      notes: ['note alpha', 'note beta']
    });
    assert.ok(result.ok);
    assert.ok(result.tokens <= 2000, `tokens ${result.tokens} should be <= 2000`);
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test('generateSessionRecovery — includes goal and agent in output', async () => {
  const tmp = await makeTmpDir();
  try {
    const result = await generateSessionRecovery(tmp, {
      goal: 'build FTS5 search index',
      agent: 'deyvin'
    });
    assert.ok(result.ok);
    const content = await fs.readFile(result.path, 'utf8');
    assert.ok(content.includes('build FTS5 search index'), 'goal present in content');
    assert.ok(content.includes('deyvin'), 'agent present in content');
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test('readSessionRecovery — returns null when file missing', async () => {
  const tmp = await makeTmpDir();
  try {
    const content = await readSessionRecovery(tmp);
    assert.equal(content, null, 'should return null when no recovery file');
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test('readSessionRecovery — returns content after generate', async () => {
  const tmp = await makeTmpDir();
  try {
    await generateSessionRecovery(tmp, { goal: 'test round-trip' });
    const content = await readSessionRecovery(tmp);
    assert.ok(typeof content === 'string', 'content should be a string');
    assert.ok(content.includes('test round-trip'), 'content round-trips correctly');
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test('generateSessionRecovery — creates .aioson/context/ dir if missing', async () => {
  const tmp = await makeTmpDir();
  try {
    const result = await generateSessionRecovery(tmp, {});
    assert.ok(result.ok);
    const stat = await fs.stat(path.join(tmp, '.aioson', 'context'));
    assert.ok(stat.isDirectory(), '.aioson/context should be created');
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});
