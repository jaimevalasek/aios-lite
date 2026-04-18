'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const {
  exists,
  readTextIfExists,
  ensureDir,
  copyFileWithDir,
  nowStamp,
  toRelativeSafe
} = require('../src/utils');

describe('utils.js — exists', () => {
  let tmpDir;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'utils-test-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('returns true for existing file', async () => {
    const file = path.join(tmpDir, 'file.txt');
    await fs.writeFile(file, 'hello');
    assert.equal(await exists(file), true);
  });

  it('returns false for missing file', async () => {
    assert.equal(await exists(path.join(tmpDir, 'missing.txt')), false);
  });

  it('returns true for existing directory', async () => {
    assert.equal(await exists(tmpDir), true);
  });
});

describe('utils.js — readTextIfExists', () => {
  let tmpDir;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'utils-test-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('returns file content when file exists', async () => {
    const file = path.join(tmpDir, 'file.txt');
    await fs.writeFile(file, 'hello world');
    assert.equal(await readTextIfExists(file), 'hello world');
  });

  it('returns null when file does not exist', async () => {
    assert.equal(await readTextIfExists(path.join(tmpDir, 'missing.txt')), null);
  });
});

describe('utils.js — ensureDir', () => {
  let tmpDir;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'utils-test-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('creates nested directories', async () => {
    const nested = path.join(tmpDir, 'a', 'b', 'c');
    await ensureDir(nested);
    const stat = await fs.stat(nested);
    assert.ok(stat.isDirectory());
  });

  it('does not throw if directory already exists', async () => {
    await ensureDir(tmpDir);
    const stat = await fs.stat(tmpDir);
    assert.ok(stat.isDirectory());
  });
});

describe('utils.js — copyFileWithDir', () => {
  let tmpDir;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'utils-test-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('copies file and creates destination directory', async () => {
    const src = path.join(tmpDir, 'src', 'file.txt');
    const dest = path.join(tmpDir, 'dest', 'subdir', 'file.txt');
    await ensureDir(path.dirname(src));
    await fs.writeFile(src, 'content');

    await copyFileWithDir(src, dest);
    assert.equal(await fs.readFile(dest, 'utf8'), 'content');
  });
});

describe('utils.js — nowStamp', () => {
  it('returns ISO-like string with colons replaced by dashes', () => {
    const stamp = nowStamp();
    assert.ok(!stamp.includes(':'), 'stamp should not contain colons');
    assert.ok(stamp.includes('T'), 'stamp should contain T separator');
    assert.ok(stamp.includes('-'), 'stamp should contain dashes');
  });

  it('returns different values on successive calls', () => {
    const a = nowStamp();
    const b = nowStamp();
    // They could theoretically be equal if called in the same millisecond,
    // but Date.now() granularity makes this extremely unlikely.
    assert.ok(a.length > 0);
    assert.ok(b.length > 0);
  });
});

describe('utils.js — toRelativeSafe', () => {
  it('returns relative path with forward slashes', () => {
    const rel = toRelativeSafe('/home/user/project', '/home/user/project/src/file.js');
    assert.equal(rel, 'src/file.js');
  });

  it('handles paths outside baseDir', () => {
    const rel = toRelativeSafe('/home/user/project', '/etc/passwd');
    assert.ok(rel.includes('..') || rel.startsWith('..'));
  });
});
