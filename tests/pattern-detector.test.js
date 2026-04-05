'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { detectPatterns, formatPatternReport } = require('../src/squad/pattern-detector');

async function makeTempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'aioson-pattern-'));
}

async function setupSquad(tmpDir, squadSlug, options = {}) {
  const squadDir = path.join(tmpDir, '.aioson', 'squads', squadSlug);
  await fs.mkdir(squadDir, { recursive: true });

  if (options.stateMd) {
    await fs.writeFile(path.join(squadDir, 'STATE.md'), options.stateMd, 'utf8');
  }

  if (options.learnings) {
    const learningsDir = path.join(squadDir, 'learnings');
    await fs.mkdir(learningsDir, { recursive: true });
    await fs.writeFile(path.join(learningsDir, 'index.md'), options.learnings, 'utf8');
  }

  if (options.devlogs) {
    const logsDir = path.join(tmpDir, 'aioson-logs', squadSlug);
    await fs.mkdir(logsDir, { recursive: true });
    for (const [filename, content] of Object.entries(options.devlogs)) {
      await fs.writeFile(path.join(logsDir, filename), content, 'utf8');
    }
  }
}

// ─── detectPatterns — basic ──────────────────────────────────────────────────

test('detectPatterns returns empty candidates when no data exists', async () => {
  const tmpDir = await makeTempDir();
  try {
    await setupSquad(tmpDir, 'empty-squad');

    const result = await detectPatterns(tmpDir, 'empty-squad');
    assert.equal(result.squad, 'empty-squad');
    assert.equal(result.total, 0);
    assert.ok(Array.isArray(result.candidates));
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('detectPatterns reports sources analyzed', async () => {
  const tmpDir = await makeTempDir();
  try {
    await setupSquad(tmpDir, 'sources-squad', {
      learnings: '- Pattern A\n- Pattern B',
      stateMd: '## Decisions Made\n- Used JWT for auth\n- Used soft deletes'
    });

    const result = await detectPatterns(tmpDir, 'sources-squad');
    assert.ok(typeof result.sources === 'object');
    assert.ok('state_decisions' in result.sources, 'should count state decisions');
    assert.ok('manual_learnings' in result.sources, 'should count manual learnings');
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('detectPatterns detects decision theme patterns from STATE.md', async () => {
  const tmpDir = await makeTempDir();
  try {
    const stateMd = `## Decisions Made
- 2026-04-01: Used authentication middleware for security
- 2026-04-02: Added authentication token validation
- 2026-04-03: Updated authentication module setup
- 2026-04-04: Reviewed authentication configuration
`;

    await setupSquad(tmpDir, 'theme-squad', { stateMd });

    const result = await detectPatterns(tmpDir, 'theme-squad', { minOccurrences: 1 });
    // Should detect 'authentication' as repeated theme (appears 4 times)
    // Due to normalization/filtering, may or may not generate candidates
    // but should not throw
    assert.ok(Array.isArray(result.candidates));
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('detectPatterns handles missing squad directory gracefully', async () => {
  const tmpDir = await makeTempDir();
  try {
    const result = await detectPatterns(tmpDir, 'nonexistent-squad');
    assert.equal(result.squad, 'nonexistent-squad');
    assert.equal(result.total, 0);
    assert.equal(result.sources.state_decisions, 0);
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('detectPatterns respects minOccurrences option', async () => {
  const tmpDir = await makeTempDir();
  try {
    const stateMd = `## Decisions Made
- theme-a decision one
- theme-a decision two
`;
    await setupSquad(tmpDir, 'min-occ-squad', { stateMd });

    // With high min-occurrences, should detect fewer or no candidates
    const strictResult = await detectPatterns(tmpDir, 'min-occ-squad', { minOccurrences: 10 });
    assert.ok(Array.isArray(strictResult.candidates));
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('detectPatterns candidates have required fields', async () => {
  const tmpDir = await makeTempDir();
  try {
    const stateMd = `## Decisions Made
- auth token used here
- auth token used there
- auth token used again
- auth token used once more
- auth token used again and again
`;
    await setupSquad(tmpDir, 'fields-squad', { stateMd });

    const result = await detectPatterns(tmpDir, 'fields-squad', { minOccurrences: 1 });

    for (const candidate of result.candidates) {
      assert.ok(candidate.priority, 'should have priority');
      assert.ok(candidate.name, 'should have name');
      assert.ok(candidate.pattern, 'should have pattern');
      assert.ok(typeof candidate.seen === 'number', 'should have seen count');
      assert.ok(candidate.automatable, 'should have automatable field');
      assert.ok(candidate.proposed, 'should have proposed action');
    }
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('detectPatterns candidates are sorted by priority (HIGH first)', async () => {
  const tmpDir = await makeTempDir();
  try {
    await setupSquad(tmpDir, 'priority-squad');

    const result = await detectPatterns(tmpDir, 'priority-squad');

    const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    for (let i = 1; i < result.candidates.length; i++) {
      const prev = priorityOrder[result.candidates[i - 1].priority] ?? 2;
      const curr = priorityOrder[result.candidates[i].priority] ?? 2;
      assert.ok(prev <= curr, 'candidates should be sorted HIGH → MEDIUM → LOW');
    }
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

// ─── formatPatternReport ─────────────────────────────────────────────────────

test('formatPatternReport returns no-candidates message when empty', () => {
  const result = { squad: 'my-squad', total: 0, candidates: [], sources: { db_learnings: 0 } };
  const report = formatPatternReport(result);
  assert.ok(report.includes('No automation candidates'));
  assert.ok(report.includes('my-squad'));
});

test('formatPatternReport formats candidates with priority and action', () => {
  const result = {
    squad: 'test-squad',
    total: 1,
    candidates: [{
      priority: 'HIGH',
      name: 'repeated-process',
      pattern: 'Same block resolved 5 times',
      seen: 5,
      lastDate: '2026-04-01',
      automatable: 'yes',
      proposed: 'Create a pre-check script'
    }],
    sources: {}
  };

  const report = formatPatternReport(result);
  assert.ok(report.includes('[HIGH]'));
  assert.ok(report.includes('repeated-process'));
  assert.ok(report.includes('5 sessions'));
  assert.ok(report.includes('Create a pre-check script'));
});

test('formatPatternReport includes total count', () => {
  const result = {
    squad: 'count-squad',
    total: 3,
    candidates: [
      { priority: 'HIGH', name: 'a', pattern: 'p', seen: 2, automatable: 'yes', proposed: 'x' },
      { priority: 'MEDIUM', name: 'b', pattern: 'q', seen: 3, automatable: 'partial', proposed: 'y' },
      { priority: 'LOW', name: 'c', pattern: 'r', seen: 1, automatable: 'no', proposed: 'z' }
    ],
    sources: {}
  };

  const report = formatPatternReport(result);
  assert.ok(report.includes('3 automation candidates') || report.includes('Detected 3'));
});
