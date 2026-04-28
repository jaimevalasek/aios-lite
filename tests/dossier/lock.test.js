'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const fssync = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const {
  LOCK_FILENAME,
  acquireLock,
  isStaleLock
} = require('../../src/dossier/lock');

let tmpDir;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'aioson-dossier-lock-'));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

function readLock(dir) {
  const raw = fssync.readFileSync(path.join(dir, LOCK_FILENAME), 'utf8');
  return JSON.parse(raw);
}

describe('dossier/lock — acquireLock', () => {
  it('creates lockfile with pid, section and ISO acquired_at', async () => {
    const release = await acquireLock(tmpDir, 'agent-trail');
    try {
      const payload = readLock(tmpDir);
      assert.equal(payload.section, 'agent-trail');
      assert.equal(payload.pid, process.pid);
      assert.ok(!Number.isNaN(Date.parse(payload.acquired_at)));
    } finally {
      await release();
    }
  });

  it('release() removes the lockfile', async () => {
    const release = await acquireLock(tmpDir, 'agent-trail');
    await release();
    assert.equal(fssync.existsSync(path.join(tmpDir, LOCK_FILENAME)), false);
  });

  it('release() is idempotent', async () => {
    const release = await acquireLock(tmpDir, 'agent-trail');
    await release();
    await assert.doesNotReject(release());
  });

  it('creates the lockDir if it does not exist', async () => {
    const nested = path.join(tmpDir, 'features', 'feature-x');
    const release = await acquireLock(nested, 'code-map');
    try {
      assert.equal(fssync.existsSync(path.join(nested, LOCK_FILENAME)), true);
    } finally {
      await release();
    }
  });

  it('throws EDOSSIERLOCK when an alive lock holder is still active and timeout elapses', async () => {
    // Pre-write a lock that will appear "fresh + alive"
    const fakeNow = Date.parse('2026-04-28T10:00:00Z');
    const lockPath = path.join(tmpDir, LOCK_FILENAME);
    await fs.writeFile(lockPath, JSON.stringify({
      pid: 99999,
      section: 'agent-trail',
      acquired_at: new Date(fakeNow).toISOString()
    }));

    let t = fakeNow;
    await assert.rejects(
      acquireLock(tmpDir, 'agent-trail', {
        timeoutMs: 100,
        pollIntervalMs: 10,
        staleTtlMs: 60_000,
        now: () => t,
        isAlive: () => true,
        sleepFn: async () => { t += 50; }
      }),
      (err) => err.code === 'EDOSSIERLOCK'
    );
  });

  it('overrides a stale lock (older than staleTtlMs)', async () => {
    const lockPath = path.join(tmpDir, LOCK_FILENAME);
    await fs.writeFile(lockPath, JSON.stringify({
      pid: 99999,
      section: 'agent-trail',
      acquired_at: '2026-04-28T10:00:00Z'
    }));

    // now() is well past acquired_at + 60s
    const fakeNow = Date.parse('2026-04-28T10:05:00Z');
    let warned = null;
    const release = await acquireLock(tmpDir, 'code-map', {
      timeoutMs: 1000,
      pollIntervalMs: 5,
      staleTtlMs: 60_000,
      now: () => fakeNow,
      isAlive: () => true,
      onWarn: (msg) => { warned = msg; },
      sleepFn: async () => {}
    });
    try {
      const payload = readLock(tmpDir);
      assert.equal(payload.section, 'code-map');
      assert.match(warned, /stale dossier lockfile/);
    } finally {
      await release();
    }
  });

  it('overrides a lock whose holder pid is dead', async () => {
    const lockPath = path.join(tmpDir, LOCK_FILENAME);
    const fakeNow = Date.parse('2026-04-28T10:00:00Z');
    await fs.writeFile(lockPath, JSON.stringify({
      pid: 12345,
      section: 'agent-trail',
      acquired_at: new Date(fakeNow).toISOString()
    }));

    let warned = null;
    const release = await acquireLock(tmpDir, 'code-map', {
      timeoutMs: 1000,
      pollIntervalMs: 5,
      now: () => fakeNow + 1000,
      isAlive: () => false, // simulate dead pid
      onWarn: (msg) => { warned = msg; },
      sleepFn: async () => {}
    });
    try {
      assert.equal(readLock(tmpDir).pid, process.pid);
      assert.match(warned, /pid=12345/);
    } finally {
      await release();
    }
  });

  it('overrides an unparseable lockfile as stale', async () => {
    const lockPath = path.join(tmpDir, LOCK_FILENAME);
    await fs.writeFile(lockPath, 'not-json');

    const release = await acquireLock(tmpDir, 'agent-trail', {
      timeoutMs: 1000,
      pollIntervalMs: 5,
      onWarn: () => {},
      sleepFn: async () => {}
    });
    try {
      assert.equal(readLock(tmpDir).pid, process.pid);
    } finally {
      await release();
    }
  });

  it('rejects bad inputs', async () => {
    await assert.rejects(acquireLock('', 'x'), TypeError);
    await assert.rejects(acquireLock(tmpDir, ''), TypeError);
  });
});

describe('dossier/lock — isStaleLock', () => {
  const baseOpts = {
    staleTtlMs: 60_000,
    now: () => Date.parse('2026-04-28T10:00:00Z'),
    isAlive: () => true
  };

  it('treats null/undefined as stale', () => {
    assert.equal(isStaleLock(null, baseOpts), true);
    assert.equal(isStaleLock(undefined, baseOpts), true);
  });

  it('treats malformed acquired_at as stale', () => {
    assert.equal(isStaleLock({ pid: 1, acquired_at: 'nope' }, baseOpts), true);
  });

  it('treats payload older than ttl as stale', () => {
    assert.equal(
      isStaleLock(
        { pid: 1, acquired_at: '2026-04-28T09:58:00Z' },
        baseOpts
      ),
      true
    );
  });

  it('treats payload with dead pid as stale', () => {
    assert.equal(
      isStaleLock(
        { pid: 1, acquired_at: '2026-04-28T09:59:30Z' },
        { ...baseOpts, isAlive: () => false }
      ),
      true
    );
  });

  it('returns false for a fresh, alive lock', () => {
    assert.equal(
      isStaleLock(
        { pid: 1, acquired_at: '2026-04-28T09:59:30Z' },
        baseOpts
      ),
      false
    );
  });
});
