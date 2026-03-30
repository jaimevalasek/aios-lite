'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');

const { saveContextShadow, listSessions, restoreContext, cleanup } = require('../src/context-cache');

async function makeTmpDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'aioson-cache-'));
}

test('saveContextShadow — creates session and returns sessionId', async () => {
  const tmp = await makeTmpDir();
  try {
    const result = await saveContextShadow('hello world context', { goal: 'test' }, { cacheDir: tmp });
    assert.ok(result.ok, 'should return ok:true');
    assert.ok(typeof result.sessionId === 'string', 'sessionId should be a string');
    assert.ok(result.path.endsWith('context.md'), 'path should end with context.md');
    const saved = await fs.readFile(result.path, 'utf8');
    assert.equal(saved, 'hello world context');
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test('listSessions — returns sessions newest first', async () => {
  const tmp = await makeTmpDir();
  try {
    const r1 = await saveContextShadow('content 1', { goal: 'first' }, { cacheDir: tmp });
    const r2 = await saveContextShadow('content 2', { goal: 'second' }, { cacheDir: tmp });

    const sessions = await listSessions({ cacheDir: tmp });
    assert.ok(sessions.length >= 2, 'should have at least 2 sessions');
    // newest first
    assert.ok(
      new Date(sessions[0].createdAt) >= new Date(sessions[1].createdAt),
      'sessions should be sorted newest first'
    );
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test('listSessions — returns empty array when no sessions', async () => {
  const tmp = await makeTmpDir();
  try {
    const sessions = await listSessions({ cacheDir: tmp });
    assert.deepEqual(sessions, []);
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test('restoreContext — returns full content', async () => {
  const tmp = await makeTmpDir();
  try {
    const content = '# Recovery\n\nThis is the full context.';
    const { sessionId } = await saveContextShadow(content, {}, { cacheDir: tmp });
    const result = await restoreContext(sessionId, { cacheDir: tmp });

    assert.ok(result.ok, 'should return ok:true');
    assert.equal(result.content, content, 'content should round-trip exactly');
    assert.equal(result.sessionId, sessionId);
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test('restoreContext — partial restore with query filter', async () => {
  const tmp = await makeTmpDir();
  try {
    const content = 'line one relevant\nline two unrelated\nline three relevant context';
    const { sessionId } = await saveContextShadow(content, {}, { cacheDir: tmp });
    const result = await restoreContext(sessionId, { cacheDir: tmp, query: 'relevant' });

    assert.ok(result.ok);
    assert.ok(result.content.includes('relevant'), 'filtered content includes keyword');
    assert.ok(!result.content.includes('unrelated'), 'unrelated line excluded');
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test('restoreContext — returns error for missing session', async () => {
  const tmp = await makeTmpDir();
  try {
    const result = await restoreContext('nonexistent-session-id', { cacheDir: tmp });
    assert.equal(result.ok, false, 'should return ok:false');
    assert.ok(result.error, 'should have error field');
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test('cleanup — removes expired sessions', async () => {
  const tmp = await makeTmpDir();
  try {
    await saveContextShadow('old content', { goal: 'old' }, { cacheDir: tmp });

    // Cleanup with maxAge=0 (everything expired)
    const result = await cleanup({ cacheDir: tmp, maxAge: 0 });
    assert.ok(result.removed >= 1, 'should remove at least 1 session');

    const sessions = await listSessions({ cacheDir: tmp });
    assert.equal(sessions.length, 0, 'no sessions should remain');
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test('cleanup — preserves fresh sessions', async () => {
  const tmp = await makeTmpDir();
  try {
    await saveContextShadow('fresh content', {}, { cacheDir: tmp });

    // Cleanup with 24h maxAge (nothing expired)
    const result = await cleanup({ cacheDir: tmp, maxAge: 24 * 60 * 60 * 1000 });
    assert.equal(result.removed, 0, 'should not remove fresh sessions');

    const sessions = await listSessions({ cacheDir: tmp });
    assert.ok(sessions.length >= 1, 'fresh session should remain');
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test('saveContextShadow — metadata is stored correctly', async () => {
  const tmp = await makeTmpDir();
  try {
    await saveContextShadow('content', {
      goal: 'implement feature',
      agent: 'dev',
      projectDir: '/my/project'
    }, { cacheDir: tmp });

    const sessions = await listSessions({ cacheDir: tmp });
    assert.ok(sessions.length >= 1);
    const s = sessions[0];
    assert.equal(s.metadata.goal, 'implement feature');
    assert.equal(s.metadata.agent, 'dev');
    assert.equal(s.metadata.projectDir, '/my/project');
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});
