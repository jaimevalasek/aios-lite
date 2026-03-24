'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { runSquadInvestigate, scoreCompleteness, countDimensions } = require('../src/commands/squad-investigate');
const { openRuntimeDb, insertInvestigation, getInvestigation, listInvestigations } = require('../src/runtime-store');

async function makeTempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'aioson-squad-investigate-'));
}

function createCollectLogger() {
  const lines = [];
  return { lines, log(l) { lines.push(String(l)); }, error(l) { lines.push(String(l)); } };
}

function identity(key) { return key; }

// --- Unit tests for scoreCompleteness / countDimensions ---

test('countDimensions returns 0 for empty content', () => {
  assert.equal(countDimensions(''), 0);
  assert.equal(countDimensions(null), 0);
});

test('countDimensions counts present dimension headers', () => {
  const content = [
    '# Investigation Report: youtube',
    '## D1: Domain Frameworks',
    'Some findings here',
    '## D2: Anti-patterns',
    'More findings',
    '## D5: Domain Vocabulary',
    'Vocab terms'
  ].join('\n');
  assert.equal(countDimensions(content), 3);
});

test('countDimensions returns 7 for all dimensions', () => {
  const content = [
    '## D1: Domain Frameworks',
    '## D2: Anti-patterns',
    '## D3: Quality Benchmarks',
    '## D4: Reference Voices',
    '## D5: Domain Vocabulary',
    '## D6: Competitive Landscape',
    '## D7: Structural Patterns'
  ].join('\n');
  assert.equal(countDimensions(content), 7);
});

test('scoreCompleteness calculates correct score', () => {
  const content = [
    '## D1: Frameworks',
    '## D2: Anti-patterns',
    '## D3: Quality Benchmarks',
    '## D4: Reference Voices'
  ].join('\n');
  const result = scoreCompleteness(content);
  assert.equal(result.covered, 4);
  assert.equal(result.total, 7);
  assert.equal(result.score, 0.57);
});

test('scoreCompleteness returns 1.0 for all 7 dimensions', () => {
  const content = [
    '## D1: a', '## D2: b', '## D3: c', '## D4: d',
    '## D5: e', '## D6: f', '## D7: g'
  ].join('\n');
  const result = scoreCompleteness(content);
  assert.equal(result.covered, 7);
  assert.equal(result.score, 1);
});

// --- SQLite table creation test ---

test('squad_investigations table is created by openRuntimeDb', async () => {
  const dir = await makeTempDir();
  const { db } = await openRuntimeDb(dir);
  try {
    const tables = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='squad_investigations'"
    ).all();
    assert.equal(tables.length, 1);
    assert.equal(tables[0].name, 'squad_investigations');

    const columns = db.prepare('PRAGMA table_info(squad_investigations)').all();
    const names = new Set(columns.map((c) => c.name));
    assert.ok(names.has('investigation_slug'));
    assert.ok(names.has('domain'));
    assert.ok(names.has('mode'));
    assert.ok(names.has('dimensions_covered'));
    assert.ok(names.has('confidence'));
    assert.ok(names.has('report_path'));
    assert.ok(names.has('linked_squad_slug'));
  } finally {
    db.close();
  }
});

// --- CRUD tests ---

test('insertInvestigation and listInvestigations round-trip', async () => {
  const dir = await makeTempDir();
  const { db } = await openRuntimeDb(dir);
  try {
    const slug = insertInvestigation(db, {
      investigationSlug: 'inv-youtube-test',
      domain: 'youtube',
      mode: 'full',
      dimensionsCovered: 5,
      confidence: 0.8,
      reportPath: 'squad-searches/standalone/youtube-20260323.md'
    });
    assert.equal(slug, 'inv-youtube-test');

    const rows = listInvestigations(db);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].domain, 'youtube');
    assert.equal(rows[0].dimensions_covered, 5);
    assert.equal(rows[0].confidence, 0.8);
  } finally {
    db.close();
  }
});

test('getInvestigation returns null for missing slug', async () => {
  const dir = await makeTempDir();
  const { db } = await openRuntimeDb(dir);
  try {
    const result = getInvestigation(db, 'nonexistent');
    assert.equal(result, null);
  } finally {
    db.close();
  }
});

test('linkInvestigation associates investigation to squad', async () => {
  const dir = await makeTempDir();
  const { db } = await openRuntimeDb(dir);
  try {
    insertInvestigation(db, {
      investigationSlug: 'inv-link-test',
      domain: 'gastronomy'
    });

    const { linkInvestigation } = require('../src/runtime-store');
    const ok = linkInvestigation(db, 'inv-link-test', 'my-food-squad');
    assert.ok(ok);

    const row = getInvestigation(db, 'inv-link-test');
    assert.equal(row.linked_squad_slug, 'my-food-squad');
  } finally {
    db.close();
  }
});

test('linkInvestigation returns false for nonexistent investigation', async () => {
  const dir = await makeTempDir();
  const { db } = await openRuntimeDb(dir);
  try {
    const { linkInvestigation } = require('../src/runtime-store');
    const ok = linkInvestigation(db, 'does-not-exist', 'some-squad');
    assert.ok(!ok);
  } finally {
    db.close();
  }
});

// --- CLI integration tests ---

test('squad-investigate list returns empty when no investigations', async () => {
  const dir = await makeTempDir();
  await openRuntimeDb(dir).then(({ db }) => db.close());
  const logger = createCollectLogger();
  const result = await runSquadInvestigate({
    args: [dir],
    options: { sub: 'list' },
    logger,
    t: identity
  });
  assert.equal(result.count, 0);
});

test('squad-investigate list returns registered investigations', async () => {
  const dir = await makeTempDir();
  const { db } = await openRuntimeDb(dir);
  insertInvestigation(db, { investigationSlug: 'inv-test-1', domain: 'cooking', dimensionsCovered: 3 });
  insertInvestigation(db, { investigationSlug: 'inv-test-2', domain: 'tech', dimensionsCovered: 7 });
  db.close();

  const logger = createCollectLogger();
  const result = await runSquadInvestigate({
    args: [dir],
    options: { sub: 'list' },
    logger,
    t: identity
  });
  assert.equal(result.count, 2);
});

test('squad-investigate show displays investigation details', async () => {
  const dir = await makeTempDir();
  const { db } = await openRuntimeDb(dir);
  insertInvestigation(db, {
    investigationSlug: 'inv-show-test',
    domain: 'marketing',
    confidence: 0.75
  });
  db.close();

  const logger = createCollectLogger();
  const result = await runSquadInvestigate({
    args: [dir],
    options: { sub: 'show', investigation: 'inv-show-test' },
    logger,
    t: identity
  });
  assert.ok(result.found);
  assert.ok(logger.lines.some((l) => l.includes('marketing')));
});

test('squad-investigate show errors for missing slug', async () => {
  const dir = await makeTempDir();
  await openRuntimeDb(dir).then(({ db }) => db.close());
  const logger = createCollectLogger();
  const result = await runSquadInvestigate({
    args: [dir],
    options: { sub: 'show', investigation: 'does-not-exist' },
    logger,
    t: identity
  });
  assert.ok(!result.found);
});

test('squad-investigate score calculates from report file', async () => {
  const dir = await makeTempDir();
  const reportDir = path.join(dir, 'squad-searches', 'standalone');
  await fs.mkdir(reportDir, { recursive: true });
  const reportPath = path.join(reportDir, 'test-report.md');
  await fs.writeFile(reportPath, [
    '# Investigation Report: test',
    '## D1: Domain Frameworks',
    'findings',
    '## D2: Anti-patterns',
    'findings',
    '## D3: Quality Benchmarks',
    'findings'
  ].join('\n'));

  const { db } = await openRuntimeDb(dir);
  insertInvestigation(db, {
    investigationSlug: 'inv-score-test',
    domain: 'test',
    reportPath: path.relative(dir, reportPath)
  });
  db.close();

  const logger = createCollectLogger();
  const result = await runSquadInvestigate({
    args: [dir],
    options: { sub: 'score', investigation: 'inv-score-test' },
    logger,
    t: identity
  });
  assert.ok(result.found);
  assert.equal(result.covered, 3);
  assert.equal(result.total, 7);
  assert.equal(result.score, 0.43);
});

test('squad-investigate register indexes a report file', async () => {
  const dir = await makeTempDir();
  const reportDir = path.join(dir, 'squad-searches', 'standalone');
  await fs.mkdir(reportDir, { recursive: true });
  const reportPath = path.join(reportDir, 'domain-youtube-20260323.md');
  await fs.writeFile(reportPath, [
    '# Investigation Report: YouTube',
    '## D1: Domain Frameworks',
    '## D2: Anti-patterns',
    '## D3: Quality Benchmarks',
    '## D4: Reference Voices',
    '## D5: Domain Vocabulary'
  ].join('\n'));

  await openRuntimeDb(dir).then(({ db }) => db.close());

  const logger = createCollectLogger();
  const result = await runSquadInvestigate({
    args: [dir],
    options: {
      sub: 'register',
      report: path.relative(dir, reportPath),
      domain: 'youtube'
    },
    logger,
    t: identity
  });
  assert.ok(result.registered);
  assert.ok(result.slug);

  // Verify it was saved
  const { db } = await openRuntimeDb(dir, { mustExist: true });
  try {
    const row = getInvestigation(db, result.slug);
    assert.equal(row.domain, 'youtube');
    assert.equal(row.dimensions_covered, 5);
  } finally {
    db.close();
  }
});
