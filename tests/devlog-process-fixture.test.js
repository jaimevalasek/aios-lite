'use strict';

/**
 * AC-SDLC-36 — devlog:process tests use fixture copies, not real project devlogs.
 *
 * All operations run in isolated temp directories. The real aioson-logs/ directory
 * and the project SQLite runtime are never read or written.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { runDevlogProcess } = require('../src/commands/devlog-process');

const FIXTURE_DEVLOG = `---
agent: dev
feature: fixture-feature
session_key: direct-session:9999999999:dev
started_at: 2026-01-01T00:00:00Z
finished_at: 2026-01-01T01:00:00Z
status: completed
verdict: null
plan_step: null
---

# Devlog: @dev — fixture-feature — 2026-01-01

## Summary
Fixture devlog for testing devlog:process without touching real project logs.

## Artifacts
- .aioson/context/spec-fixture-feature.md

## Decisions
- Use fixture devlog → avoids polluting real aioson-logs/

## Learnings
- [process] Fixture-based tests isolate devlog processing from real project state
- [domain] devlog:process reads from aioson-logs/ and writes to SQLite runtime
`;

const FIXTURE_DEVLOG_ALREADY_PROCESSED = `---
agent: qa
feature: another-feature
session_key: direct-session:8888888888:qa
started_at: 2026-01-01T00:00:00Z
finished_at: 2026-01-01T02:00:00Z
status: completed
processed_at: 2026-01-02T00:00:00Z
---

# Devlog: @qa — already-processed — 2026-01-01

## Summary
Already-processed devlog.
`;

const FIXTURE_DEVLOG_MALFORMED = `# No frontmatter here

Just a markdown document without YAML frontmatter.
`;

async function makeTmpDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'aioson-devlog-fixture-'));
}

async function writeFixture(tmpDir, filename, content) {
  const logsDir = path.join(tmpDir, 'aioson-logs');
  await fs.mkdir(logsDir, { recursive: true });
  const filePath = path.join(logsDir, filename);
  await fs.writeFile(filePath, content, 'utf8');
  return filePath;
}

function makeLogger() {
  const lines = [];
  return {
    log: (msg = '') => lines.push(String(msg)),
    error: (msg = '') => lines.push(String(msg)),
    lines
  };
}

test('devlog:process: processes fixture devlog without touching real project logs', async () => {
  const tmpDir = await makeTmpDir();
  await writeFixture(tmpDir, 'devlog-dev-9999999999.md', FIXTURE_DEVLOG);

  const result = await runDevlogProcess({
    args: [tmpDir],
    options: { json: true },
    logger: makeLogger()
  });

  assert.equal(result.ok, true);
  assert.equal(result.processed, 1, 'must process 1 devlog');
  assert.equal(result.skipped, 0);
  assert.equal(result.malformed, 0);
  assert.equal(result.totalArtifacts, 1, 'must count 1 artifact');
  assert.equal(result.totalLearnings, 2, 'must count 2 learnings');
});

test('devlog:process: skips already-processed devlogs', async () => {
  const tmpDir = await makeTmpDir();
  await writeFixture(tmpDir, 'devlog-dev-9999999999.md', FIXTURE_DEVLOG);
  await writeFixture(tmpDir, 'devlog-qa-8888888888.md', FIXTURE_DEVLOG_ALREADY_PROCESSED);

  const result = await runDevlogProcess({
    args: [tmpDir],
    options: { json: true },
    logger: makeLogger()
  });

  assert.equal(result.ok, true);
  assert.equal(result.processed, 1, 'must process only the unprocessed devlog');
  assert.equal(result.skipped, 1, 'must skip the already-processed devlog');
});

test('devlog:process: marks fixture devlog as processed (injects processed_at)', async () => {
  const tmpDir = await makeTmpDir();
  const filePath = await writeFixture(tmpDir, 'devlog-dev-9999999999.md', FIXTURE_DEVLOG);

  await runDevlogProcess({
    args: [tmpDir],
    options: { json: true },
    logger: makeLogger()
  });

  const contentAfter = await fs.readFile(filePath, 'utf8');
  assert.ok(contentAfter.includes('processed_at:'), 'must inject processed_at into fixture devlog frontmatter');
});

test('devlog:process: does NOT read from real project aioson-logs/', async () => {
  const tmpDir = await makeTmpDir();
  // No aioson-logs/ created in tmpDir — real project logs untouched

  const result = await runDevlogProcess({
    args: [tmpDir],
    options: { json: true },
    logger: makeLogger()
  });

  assert.equal(result.ok, true);
  assert.equal(result.processed, 0, 'must process nothing when no logs in fixture dir');
});

test('devlog:process: reports malformed devlogs (missing frontmatter)', async () => {
  const tmpDir = await makeTmpDir();
  await writeFixture(tmpDir, 'devlog-malformed-0000.md', FIXTURE_DEVLOG_MALFORMED);

  const result = await runDevlogProcess({
    args: [tmpDir],
    options: { json: true },
    logger: makeLogger()
  });

  assert.equal(result.ok, true);
  assert.equal(result.malformed, 1, 'must count malformed devlog');
  assert.equal(result.processed, 0);
});

test('devlog:process: uses isolated SQLite db in temp dir (not project db)', async () => {
  const tmpDir = await makeTmpDir();
  await writeFixture(tmpDir, 'devlog-dev-9999999999.md', FIXTURE_DEVLOG);

  const result = await runDevlogProcess({
    args: [tmpDir],
    options: { json: true },
    logger: makeLogger()
  });

  assert.equal(result.ok, true);
  // dbPath should point to tmpDir, not the real project
  const cwd = process.cwd();
  assert.ok(
    result.dbPath.startsWith(tmpDir),
    `dbPath must be inside temp dir, not project dir. Got: ${result.dbPath}`
  );
  assert.ok(
    !result.dbPath.startsWith(cwd),
    `dbPath must NOT be inside real project dir. Got: ${result.dbPath}`
  );
});
