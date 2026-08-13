'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { runProfilerCoverage } = require('../src/commands/profiler-coverage');

function makeLogger() {
  const lines = [];
  return { log: (m = '') => lines.push(String(m)), error: (m = '') => lines.push(String(m)), lines };
}

async function makeReport(content, slug = 'jane-doe') {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'aioson-prof-cov-'));
  const rel = `.aioson/profiler-reports/${slug}/research-report.md`;
  const full = path.join(dir, rel);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, content, 'utf8');
  return dir;
}

const GOOD = `---
target: Jane Doe
slug: jane-doe
sources_found: 3
high_value_sources: 2
status: raw-research
---

# Research Report: Jane Doe

## Summary
- floor check below

## Source Inventory

### High-Value Sources
| # | Type | Source | URL | Tags | Quality |
|---|------|--------|-----|------|---------|
| S1 | interview | Podcast A | https://a | DECISION, HEXACO-H | 5 |
| S2 | repo | Project B | https://b | WORK-SAMPLE | 4 |

### Medium-Value Sources
| # | Type | Source | URL | Tags | Quality |
|---|------|--------|-----|------|---------|
| S3 | article | Blog C | https://c | PRINCIPLE | 3 |

### Low-Value Sources
| # | Type | Source | URL | Tags | Quality |
|---|------|--------|-----|------|---------|

## Extracted Material by Category

### FRAMEWORKS
#### Framework: Ship small
- Source: S2

### DECISIONS
#### Decision: Chose boring tech
- Source: S1

### COMMUNICATION
#### Style: Direct
- Source: S3

## Gaps and Next Research Moves
- none
`;

test('profiler:coverage counts tiers, categories, tags and passes the floor on a sufficient report', async () => {
  const dir = await makeReport(GOOD);
  const result = await runProfilerCoverage({ args: [dir], options: { slug: 'jane-doe', json: true }, logger: makeLogger() });
  assert.equal(result.ok, true);
  assert.equal(result.parsed, true);
  assert.deepEqual(result.sources, { high: 2, medium: 1, low: 0 });
  assert.equal(result.categories.DECISIONS, 1);
  assert.equal(result.categories_covered.length, 3);
  assert.equal(result.tags['WORK-SAMPLE'], 1);
  assert.deepEqual(result.orphan_source_refs, []);
  assert.equal(result.floor_pass, true);
  assert.deepEqual(result.frontmatter_delta, {});
});

test('profiler:coverage flags a below-floor report, orphan refs and frontmatter drift', async () => {
  const thin = GOOD
    .replace('| S2 | repo | Project B | https://b | WORK-SAMPLE | 4 |\n', '')
    .replace('- Source: S2', '- Source: S9')
    .replace('sources_found: 3', 'sources_found: 7');
  const dir = await makeReport(thin);
  const result = await runProfilerCoverage({ args: [dir], options: { slug: 'jane-doe', json: true }, logger: makeLogger() });
  assert.equal(result.floor_pass, false);
  assert.equal(result.floor.high_value_min_2, false);
  assert.equal(result.floor.work_sample_min_1, false);
  assert.deepEqual(result.orphan_source_refs, ['S9']);
  assert.equal(result.frontmatter_delta.sources_found.declared, 7);
  assert.equal(result.frontmatter_delta.sources_found.measured, 2);
});

test('profiler:coverage returns parsed:false on an unrecognizable report, never a silent fail', async () => {
  const dir = await makeReport('# Something else entirely\n\nfree prose\n');
  const result = await runProfilerCoverage({ args: [dir], options: { slug: 'jane-doe', json: true }, logger: makeLogger() });
  assert.equal(result.ok, true);
  assert.equal(result.parsed, false);
  assert.ok(!('floor_pass' in result));

  const missing = await runProfilerCoverage({ args: [dir], options: { slug: 'absent', json: true }, logger: makeLogger() });
  assert.equal(missing.ok, false);
  assert.equal(missing.reason, 'report_not_found');
});
