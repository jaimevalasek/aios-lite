'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');

const { IndexManager, sanitizeFtsQuery } = require('../src/context-search');

async function makeTmpDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'aioson-search-'));
}

test('IndexManager — opens and closes without error', async () => {
  const tmp = await makeTmpDir();
  try {
    const searchDir = path.join(tmp, 'search');
    const idx = new IndexManager(searchDir);
    await idx.open();
    idx.close();
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test('IndexManager — indexDirectory indexes markdown files', async () => {
  const tmp = await makeTmpDir();
  try {
    const searchDir = path.join(tmp, 'search');
    const docsDir = path.join(tmp, 'docs');
    await fs.mkdir(docsDir);

    await fs.writeFile(path.join(docsDir, 'README.md'), '# Hello World\n\nThis is a test document about context.', 'utf8');
    await fs.writeFile(path.join(docsDir, 'design.md'), '# Design System\n\nColor tokens and spacing.', 'utf8');

    const idx = new IndexManager(searchDir);
    await idx.open();
    try {
      const result = await idx.indexDirectory(docsDir);
      assert.ok(result.indexed >= 2, `should index at least 2 files, got ${result.indexed}`);

      const stats = idx.stats();
      assert.ok(stats.totalDocs >= 2, 'stats should reflect indexed docs');
    } finally {
      idx.close();
    }
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test('IndexManager — search returns relevant results', async () => {
  const tmp = await makeTmpDir();
  try {
    const searchDir = path.join(tmp, 'search');
    const docsDir = path.join(tmp, 'docs');
    await fs.mkdir(docsDir);

    await fs.writeFile(path.join(docsDir, 'fts5.md'), '# FTS5 Search\n\nFull text search with SQLite FTS5 module.', 'utf8');
    await fs.writeFile(path.join(docsDir, 'cache.md'), '# Cache RAM\n\nIn-memory cache for context documents.', 'utf8');

    const idx = new IndexManager(searchDir);
    await idx.open();
    try {
      await idx.indexDirectory(docsDir, { force: true });
      const results = idx.search('FTS5 search');
      assert.ok(results.length > 0, 'should return at least one result');
      assert.ok(
        results.some(r => r.relPath.includes('fts5')),
        'fts5.md should be in results'
      );
    } finally {
      idx.close();
    }
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test('IndexManager — search returns empty array for no matches', async () => {
  const tmp = await makeTmpDir();
  try {
    const searchDir = path.join(tmp, 'search');
    const docsDir = path.join(tmp, 'docs');
    await fs.mkdir(docsDir);
    await fs.writeFile(path.join(docsDir, 'doc.md'), '# Hello\n\ncontent here', 'utf8');

    const idx = new IndexManager(searchDir);
    await idx.open();
    try {
      await idx.indexDirectory(docsDir, { force: true });
      const results = idx.search('xyzzy42nonexistent');
      assert.equal(results.length, 0, 'no results for gibberish query');
    } finally {
      idx.close();
    }
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test('IndexManager — search empty query returns empty array', async () => {
  const tmp = await makeTmpDir();
  try {
    const searchDir = path.join(tmp, 'search');
    const idx = new IndexManager(searchDir);
    await idx.open();
    try {
      const results = idx.search('');
      assert.deepEqual(results, []);
    } finally {
      idx.close();
    }
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test('IndexManager — invalidateStale removes old entries', async () => {
  const tmp = await makeTmpDir();
  try {
    const searchDir = path.join(tmp, 'search');
    const docsDir = path.join(tmp, 'docs');
    await fs.mkdir(docsDir);
    await fs.writeFile(path.join(docsDir, 'old.md'), '# Old doc', 'utf8');

    const idx = new IndexManager(searchDir);
    await idx.open();
    try {
      await idx.indexDirectory(docsDir, { force: true });
      const before = idx.stats();
      assert.ok(before.totalDocs >= 1);

      // Invalidate with maxAge=0 (everything is stale)
      const removed = idx.invalidateStale(0);
      assert.ok(removed.removed >= 1, 'should remove stale entries');

      const after = idx.stats();
      assert.equal(after.totalDocs, 0, 'index should be empty after full invalidation');
    } finally {
      idx.close();
    }
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test('IndexManager — two concurrent instances (WAL mode)', async () => {
  const tmp = await makeTmpDir();
  try {
    const searchDir = path.join(tmp, 'search');
    const docsDir = path.join(tmp, 'docs');
    await fs.mkdir(docsDir);
    await fs.writeFile(path.join(docsDir, 'concurrent.md'), '# Concurrent Test\n\nconcurrency check', 'utf8');

    const idx1 = new IndexManager(searchDir);
    const idx2 = new IndexManager(searchDir);

    await idx1.open();
    await idx2.open();

    try {
      // Both index the same dir (second should skip due to already-indexed)
      const [r1, r2] = await Promise.all([
        idx1.indexDirectory(docsDir, { force: true }),
        idx2.indexDirectory(docsDir)
      ]);

      // At least one of them succeeded
      const totalIndexed = r1.indexed + r2.indexed;
      assert.ok(totalIndexed >= 1, 'at least one file should be indexed');
    } finally {
      idx1.close();
      idx2.close();
    }
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test('sanitizeFtsQuery — removes FTS5 special chars', () => {
  const result = sanitizeFtsQuery('hello "world" (test)*');
  assert.ok(!result.includes('"'), 'should remove double quotes');
  assert.ok(!result.includes('('), 'should remove parens');
  assert.ok(!result.includes(')'), 'should remove parens');
  assert.ok(!result.includes('*'), 'should remove asterisk');
  assert.ok(result.includes('hello'), 'should preserve normal words');
});

test('IndexManager — skips already-indexed files (no force)', async () => {
  const tmp = await makeTmpDir();
  try {
    const searchDir = path.join(tmp, 'search');
    const docsDir = path.join(tmp, 'docs');
    await fs.mkdir(docsDir);
    await fs.writeFile(path.join(docsDir, 'test.md'), '# Test', 'utf8');

    const idx = new IndexManager(searchDir);
    await idx.open();
    try {
      const first = await idx.indexDirectory(docsDir, { force: true });
      assert.equal(first.indexed, 1, 'first pass indexes 1 file');

      const second = await idx.indexDirectory(docsDir);
      assert.equal(second.indexed, 0, 'second pass skips already-indexed file');
      assert.equal(second.skipped, 1, 'second pass reports 1 skipped');
    } finally {
      idx.close();
    }
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});
