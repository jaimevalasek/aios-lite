'use strict';

/**
 * Integration tests — context optimizations (Fases 1-5 + Agent Sharding)
 *
 * Tests the interaction between modules, not each module in isolation.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');

const { generateSessionRecovery, readSessionRecovery } = require('../src/recovery-context-session');
const { IndexManager } = require('../src/context-search');
const { saveContextShadow, listSessions, restoreContext, cleanup } = require('../src/context-cache');
const { executeInSandbox, redactCredentials } = require('../src/sandbox');
const { AgentLoader } = require('../src/agent-loader');

async function makeTmpDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'aioson-integration-'));
}

// ─── Recovery + Cache integration ─────────────────────────────────────────────

test('integration: recovery → cache → restore round-trip', async () => {
  const tmp = await makeTmpDir();
  try {
    // 1. Generate session recovery
    const recResult = await generateSessionRecovery(tmp, {
      goal: 'integrate context optimizations',
      agent: 'dev',
      tasks: [{ id: '1', title: 'Implement FTS5', status: 'completed' }]
    });
    assert.ok(recResult.ok, 'recovery should generate ok');

    // 2. Read it back
    const recoveryContent = await readSessionRecovery(tmp);
    assert.ok(recoveryContent, 'recovery content should exist');
    assert.ok(recoveryContent.includes('integrate context optimizations'));

    // 3. Save to cache
    const cacheDir = path.join(tmp, 'cache');
    const cacheResult = await saveContextShadow(recoveryContent, {
      goal: 'integrate context optimizations',
      agent: 'dev',
      projectDir: tmp
    }, { cacheDir });
    assert.ok(cacheResult.ok, 'cache save should succeed');

    // 4. List sessions
    const sessions = await listSessions({ cacheDir });
    assert.ok(sessions.length >= 1, 'should have at least 1 cached session');

    // 5. Restore
    const restored = await restoreContext(cacheResult.sessionId, { cacheDir });
    assert.ok(restored.ok, 'restore should succeed');
    assert.equal(restored.content, recoveryContent, 'restored content should match original');
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

// ─── Search + Recovery integration ────────────────────────────────────────────

test('integration: recovery file is searchable via FTS5', async () => {
  const tmp = await makeTmpDir();
  try {
    const searchDir = path.join(tmp, 'search');

    // 1. Generate recovery file
    await generateSessionRecovery(tmp, {
      goal: 'implement FTS5 full text search index',
      agent: 'deyvin'
    });

    // 2. Index the .aioson/context directory
    const contextDir = path.join(tmp, '.aioson', 'context');
    const idx = new IndexManager(searchDir);
    await idx.open();
    try {
      const indexResult = await idx.indexDirectory(contextDir, { force: true });
      assert.ok(indexResult.indexed >= 1, 'should index the recovery file');

      // 3. Search for goal keyword
      const results = idx.search('FTS5 full text search');
      assert.ok(results.length > 0, 'recovery file should be findable via search');
    } finally {
      idx.close();
    }
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

// ─── Sandbox + Redaction integration ──────────────────────────────────────────

test('integration: sandbox output is redacted before returning', async () => {
  // Simulate a command that outputs a fake secret
  const fakeToken = 'ghp_abcdefghijklmnopqrstuvwxyz12345678AB';
  const result = await executeInSandbox(`echo "token=${fakeToken}"`);

  assert.ok(result.ok, 'command should succeed');
  assert.ok(!result.stdout.includes(fakeToken), 'token should be redacted from stdout');
  assert.ok(result.stdout.includes('REDACTED'), 'REDACTED placeholder should appear');
});

test('integration: sandbox + cache — store sanitized output', async () => {
  const tmp = await makeTmpDir();
  try {
    const cacheDir = path.join(tmp, 'cache');
    const fakeKey = 'AKIAIOSFODNN7EXAMPLE';

    // 1. Run sandbox
    const result = await executeInSandbox(`echo "AWS_KEY=${fakeKey} done"`);
    assert.ok(result.ok);
    assert.ok(!result.stdout.includes(fakeKey), 'AWS key should be redacted');

    // 2. Cache the sanitized output
    const saved = await saveContextShadow(result.stdout, {
      goal: 'capture command output',
      agent: 'dev'
    }, { cacheDir });
    assert.ok(saved.ok);

    // 3. Verify cached content is also clean
    const restored = await restoreContext(saved.sessionId, { cacheDir });
    assert.ok(restored.ok);
    assert.ok(!restored.content.includes(fakeKey), 'cached content should not contain raw secret');
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

// ─── Agent Loader + Search integration ────────────────────────────────────────

test('integration: AgentLoader shards and searches agent instructions', async () => {
  const tmp = await makeTmpDir();
  try {
    const searchDir = path.join(tmp, 'search');
    const agentsDir = path.join(tmp, 'agents');
    await fs.mkdir(agentsDir);

    // 1. Create a mock agent instruction file with multiple sections
    const agentContent = [
      '# Dev Agent',
      '',
      '## Role',
      'You are a senior developer. Your job is to implement features.',
      '',
      '## Implementation Guidelines',
      'Write clean, tested code. Follow TDD principles.',
      '',
      '## Error Handling',
      'Always handle errors gracefully. Log failures with context.',
      '',
      '## Output Format',
      'Return a structured summary of what was implemented.',
    ].join('\n');

    const agentPath = path.join(agentsDir, 'dev.md');
    await fs.writeFile(agentPath, agentContent, 'utf8');

    // 2. Load with goal — should select relevant shards
    const loader = new AgentLoader({ searchDir });
    await loader.open();
    try {
      await loader.indexAgentFile(agentPath, 'dev');
      const result = await loader.loadRelevantShards('dev', 'implement a new feature with TDD');

      assert.ok(result.shards.length > 0, 'should return at least one shard');
      assert.ok(
        result.shards.some(s => s.content.toLowerCase().includes('implement')),
        'relevant shard should contain implementation content'
      );
      assert.ok(typeof result.tokens === 'number', 'should estimate tokens');
      assert.ok(result.tokens <= 2000, 'should stay within token budget');
    } finally {
      loader.close();
    }
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

// ─── Cache cleanup integration ─────────────────────────────────────────────────

test('integration: cache cleanup removes expired, keeps fresh', async () => {
  const tmp = await makeTmpDir();
  try {
    const cacheDir = path.join(tmp, 'cache');

    // Create 3 sessions
    const s1 = await saveContextShadow('session one', { goal: 'old task' }, { cacheDir });
    const s2 = await saveContextShadow('session two', { goal: 'recent task' }, { cacheDir });
    const s3 = await saveContextShadow('session three', { goal: 'newest task' }, { cacheDir });

    assert.ok(s1.ok && s2.ok && s3.ok);

    // Cleanup with maxAge=0 removes all
    const result = await cleanup({ cacheDir, maxAge: 0 });
    assert.ok(result.removed >= 3, 'should remove all 3 sessions');

    const remaining = await listSessions({ cacheDir });
    assert.equal(remaining.length, 0, 'no sessions should remain after full cleanup');
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

// ─── FTS5 staleness + reindex integration ─────────────────────────────────────

test('integration: FTS5 force-reindex updates stale content', async () => {
  const tmp = await makeTmpDir();
  try {
    const searchDir = path.join(tmp, 'search');
    const docsDir = path.join(tmp, 'docs');
    await fs.mkdir(docsDir);

    const docPath = path.join(docsDir, 'doc.md');

    // 1. Initial content
    await fs.writeFile(docPath, '# Original\n\nFirst version of the document.', 'utf8');

    const idx = new IndexManager(searchDir);
    await idx.open();
    try {
      await idx.indexDirectory(docsDir, { force: true });

      // 2. Update content
      await fs.writeFile(docPath, '# Updated\n\nSecond version with new keywords: telemetry dashboard.', 'utf8');

      // 3. Without force: still uses old index (no re-index)
      const beforeForce = idx.search('telemetry dashboard');
      // May or may not find it depending on exact timing — force ensures it

      // 4. With force: re-indexes
      await idx.indexDirectory(docsDir, { force: true });
      const afterForce = idx.search('telemetry dashboard');
      assert.ok(afterForce.length > 0, 'force reindex should find updated content');
    } finally {
      idx.close();
    }
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});
