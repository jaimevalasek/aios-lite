'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { analyzeShakedown, FINDING_CLASSES, LANES } = require('../src/lib/shakedown-lint');
const { runVerifyArtifact } = require('../src/commands/verify-artifact');

function makeLogger() {
  const lines = [];
  return { log: (m = '') => lines.push(String(m)), error: (m = '') => lines.push(String(m)), warn: () => {}, lines };
}

const SLUG = 'demo-feature';

function goodReport({ frontmatter, coverage, punch, notVisited } = {}) {
  return `---
${frontmatter ?? `target: ${SLUG}
mode: post-qa
run: runtime
coverage: 2/3 surfaces`}
---

# Shakedown — ${SLUG}

## Coverage
${coverage ?? `| Surface | Visited | Verdict |
|---|---|---|
| /orders | yes | complete |
| /orders/new | yes | incomplete |
| /admin/reports | no | — |`}

## Punch list
${punch ?? `| ID | Class | Surface | Finding | Evidence | Suggested lane |
|---|---|---|---|---|---|
| SHK-01 | bug | /orders/new | Save with empty client crashes | open /orders/new → leave client empty → Save → 500; expected inline validation | simple-plan |
| SHK-02 | incomplete | /orders | Listing has no delete action | sibling /clients listing has delete; checklist item CRUD-4 | simple-plan |`}

## Quick wins
- SHK-01, SHK-02 fit one Simple Plan batch.

## Not visited
${notVisited ?? '- /admin/reports — auth wall; no seeded admin user'}
`;
}

test('a well-formed shakedown report measures clean', () => {
  const result = analyzeShakedown({ report: goodReport(), slug: SLUG });
  assert.deepEqual(result.issues, []);
  assert.equal(result.metrics.surfaces_inventoried, 3);
  assert.equal(result.metrics.surfaces_visited, 2);
  assert.equal(result.metrics.coverage_rows, 3);
  assert.equal(result.metrics.coverage_visited_rows, 2);
  assert.equal(result.metrics.punch_total, 2);
  assert.equal(result.metrics.punch_by_class.bug, 1);
  assert.equal(result.metrics.punch_by_class.incomplete, 1);
  assert.equal(result.metrics.not_visited_entries, 1);
});

test('frontmatter enums are pinned; invalid mode/run/coverage are issues', () => {
  const result = analyzeShakedown({
    report: goodReport({
      frontmatter: `target: ${SLUG}\nmode: vibes\nrun: maybe\ncoverage: lots`
    }),
    slug: SLUG
  });
  assert.ok(result.issues.some((i) => i.includes('mode "vibes"')));
  assert.ok(result.issues.some((i) => i.includes('run "maybe"')));
  assert.ok(result.issues.some((i) => i.includes('coverage "lots"')));
});

test('coverage arithmetic: table rows and visited marks must match the declared coverage', () => {
  // 3 declared inventoried, table has only 2 rows and 1 visited
  const result = analyzeShakedown({
    report: goodReport({
      coverage: `| Surface | Visited | Verdict |
|---|---|---|
| /orders | yes | complete |
| /orders/new | no | — |`
    }),
    slug: SLUG
  });
  assert.ok(result.issues.some((i) => i.includes('2 row(s) but frontmatter declares 3')));
  assert.ok(result.issues.some((i) => i.includes('marks 1 surface(s) visited but frontmatter declares 2')));
});

test('punch-list row discipline: bad id, invalid class, invalid lane, bug without evidence', () => {
  const result = analyzeShakedown({
    report: goodReport({
      punch: `| ID | Class | Surface | Finding | Evidence | Suggested lane |
|---|---|---|---|---|---|
| OOPS-1 | vibes | /x | something | - | backlog |
| SHK-03 | bug | /y | crash | - | simple-plan |`
    }),
    slug: SLUG
  });
  assert.ok(result.issues.some((i) => i.includes('invalid ID "OOPS-1"')));
  assert.ok(result.issues.some((i) => i.includes('invalid class "vibes"')));
  assert.ok(result.issues.some((i) => i.includes('invalid suggested lane "backlog"')));
  assert.ok(result.issues.some((i) => i.includes('SHK-03 has no reproduction evidence')));
  assert.deepEqual(FINDING_CLASSES, ['bug', 'incomplete', 'polish']);
  assert.deepEqual(LANES, ['simple-plan', 'feature', 'briefing']);
});

test('"Not visited empty ⇔ complete run" invariant holds in both directions', () => {
  // declared complete but Not visited lists a surface
  const complete = analyzeShakedown({
    report: goodReport({
      frontmatter: `target: ${SLUG}\nmode: post-qa\nrun: runtime\ncoverage: 3/3 surfaces`,
      coverage: `| Surface | Visited | Verdict |
|---|---|---|
| /orders | yes | complete |
| /orders/new | yes | complete |
| /admin/reports | yes | complete |`
    }),
    slug: SLUG
  });
  assert.ok(complete.issues.some((i) => i.includes('declared complete (3/3) but ## Not visited lists 1')));

  // declared incomplete but Not visited is empty
  const incomplete = analyzeShakedown({
    report: goodReport({ notVisited: '' }),
    slug: SLUG
  });
  assert.ok(incomplete.issues.some((i) => i.includes('## Not visited is empty')));
});

test('a genuinely complete run with an empty Not visited measures clean', () => {
  const result = analyzeShakedown({
    report: goodReport({
      frontmatter: `target: ${SLUG}\nmode: archived\nrun: static\ncoverage: 3/3 surfaces`,
      coverage: `| Surface | Visited | Verdict |
|---|---|---|
| /orders | yes | complete |
| /orders/new | yes | complete |
| /admin/reports | yes | complete |`,
      notVisited: '[none]'
    }),
    slug: SLUG
  });
  assert.deepEqual(result.issues, []);
});

test('unfilled template tokens are issues', () => {
  const result = analyzeShakedown({
    report: goodReport().replace('# Shakedown', '# Shakedown for {slug}'),
    slug: SLUG
  });
  assert.ok(result.issues.some((i) => i.includes('unfilled placeholder')));
});

test('kind=shakedown resolves via --file through runVerifyArtifact and needs a locator', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'aioson-shk-'));
  const rel = `.aioson/context/shakedown-${SLUG}.md`;
  await fs.mkdir(path.join(dir, '.aioson', 'context'), { recursive: true });
  await fs.writeFile(path.join(dir, rel), goodReport(), 'utf8');

  const ok = await runVerifyArtifact({
    args: [dir],
    options: { kind: 'shakedown', file: rel, advisory: true, suppressExitCode: true, json: true },
    logger: makeLogger()
  });
  assert.equal(ok.ok, true);
  assert.equal(ok.kind, 'shakedown');

  // --slug resolves the canonical context path too
  const viaSlug = await runVerifyArtifact({
    args: [dir],
    options: { kind: 'shakedown', slug: SLUG, advisory: true, suppressExitCode: true, json: true },
    logger: makeLogger()
  });
  assert.equal(viaSlug.ok, true);

  const missing = await runVerifyArtifact({
    args: [dir],
    options: { kind: 'shakedown', advisory: true, suppressExitCode: true, json: true },
    logger: makeLogger()
  });
  assert.equal(missing.ok, false);
});
