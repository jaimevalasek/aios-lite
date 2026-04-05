'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { validateBrief, autoFixBrief, parseBrief } = require('../src/squad/brief-validator');

async function makeTempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'aioson-brief-'));
}

const FULL_BRIEF = `# Phase 1 — Authentication Module

## Objective
Implement JWT authentication middleware for the API.

## Files to read
- \`src/models/User.ts\` — existing user model
- \`.aioson/context/architecture.md\`

## Files to write
- \`src/auth/middleware.ts\` (create)
- \`src/models/User.ts\` (extend with resetToken field)

## Constraints
- Use soft deletes (decision in shared-decisions.md)
- JWT expiry: 60 min

## Out of scope
- Dashboard module
- Email notifications
- Payment integration

## Done criteria
- [ ] All files listed are created/modified

Verdict: DONE | DONE_WITH_CONCERNS | BLOCKED
`;

// ─── parseBrief ──────────────────────────────────────────────────────────────

test('parseBrief extracts all sections from a complete brief', () => {
  const result = parseBrief(FULL_BRIEF);
  assert.ok(result.sections);
  assert.ok(result.sections.phase_objective, 'should detect phase_objective section');
  assert.ok(result.sections.files_to_read, 'should detect files_to_read section');
  assert.ok(result.sections.files_to_write, 'should detect files_to_write section');
  assert.ok(result.sections.constraints, 'should detect constraints section');
  assert.ok(result.sections.out_of_scope, 'should detect out_of_scope section');
  assert.ok(result.sections.done_criteria, 'should detect done_criteria section');
});

test('parseBrief returns raw content', () => {
  const result = parseBrief(FULL_BRIEF);
  assert.equal(result.raw, FULL_BRIEF);
});

test('parseBrief returns empty sections for empty content', () => {
  const result = parseBrief('');
  assert.deepEqual(result.sections, {});
});

test('parseBrief handles alternate section heading spellings', () => {
  const content = `## Goal\nBuild something.\n\n## Read first\n- \`file.ts\`\n\n## Output files\n- \`out.ts\` (create)\n\n## Rules\n- no globals\n\n## Not in scope\n- refactors\n\n## Acceptance criteria\nDONE`;
  const result = parseBrief(content);
  assert.ok(result.sections.phase_objective);
  assert.ok(result.sections.files_to_read);
  assert.ok(result.sections.files_to_write);
  assert.ok(result.sections.constraints);
  assert.ok(result.sections.out_of_scope);
  assert.ok(result.sections.done_criteria);
});

// ─── validateBrief — READY ───────────────────────────────────────────────────

test('validateBrief returns ready:true for a complete brief', async () => {
  const tmpDir = await makeTempDir();
  try {
    const briefPath = path.join(tmpDir, 'brief.md');
    await fs.writeFile(briefPath, FULL_BRIEF, 'utf8');

    const result = await validateBrief(briefPath);
    assert.equal(result.ready, true);
    assert.equal(result.score, 6);
    assert.equal(result.total, 6);
    assert.equal(result.issues.length, 0);
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

// ─── validateBrief — MISSING fields ─────────────────────────────────────────

test('validateBrief detects missing out_of_scope as blocking', async () => {
  const tmpDir = await makeTempDir();
  try {
    const brief = FULL_BRIEF.replace(/## Out of scope[\s\S]*?(?=\n## )/m, '');
    const briefPath = path.join(tmpDir, 'brief.md');
    await fs.writeFile(briefPath, brief, 'utf8');

    const result = await validateBrief(briefPath);
    assert.equal(result.ready, false);
    const oos = result.issues.find((i) => i.field === 'out_of_scope');
    assert.ok(oos, 'should have out_of_scope issue');
    assert.equal(oos.blocking, true);
    assert.equal(oos.autoFixable, true);
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('validateBrief detects missing done criteria', async () => {
  const tmpDir = await makeTempDir();
  try {
    const brief = FULL_BRIEF.replace(/## Done criteria[\s\S]*$/m, '');
    const briefPath = path.join(tmpDir, 'brief.md');
    await fs.writeFile(briefPath, brief, 'utf8');

    const result = await validateBrief(briefPath);
    assert.equal(result.ready, false);
    const dc = result.issues.find((i) => i.field === 'done_criteria');
    assert.ok(dc, 'should have done_criteria issue');
    assert.equal(dc.autoFixable, true);
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('validateBrief detects done criteria without verdict keywords', async () => {
  const tmpDir = await makeTempDir();
  try {
    const brief = FULL_BRIEF.replace('Verdict: DONE | DONE_WITH_CONCERNS | BLOCKED', '- All done somehow');
    const briefPath = path.join(tmpDir, 'brief.md');
    await fs.writeFile(briefPath, brief, 'utf8');

    const result = await validateBrief(briefPath);
    const dc = result.issues.find((i) => i.field === 'done_criteria');
    assert.ok(dc, 'should have done_criteria issue for missing verdict keywords');
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('validateBrief detects missing constraints', async () => {
  const tmpDir = await makeTempDir();
  try {
    const brief = FULL_BRIEF.replace(/## Constraints[\s\S]*?(?=\n## )/m, '');
    const briefPath = path.join(tmpDir, 'brief.md');
    await fs.writeFile(briefPath, brief, 'utf8');

    const result = await validateBrief(briefPath);
    const c = result.issues.find((i) => i.field === 'constraints');
    assert.ok(c, 'should have constraints issue');
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('validateBrief detects missing files to write', async () => {
  const tmpDir = await makeTempDir();
  try {
    const brief = FULL_BRIEF.replace(/## Files to write[\s\S]*?(?=\n## )/m, '');
    const briefPath = path.join(tmpDir, 'brief.md');
    await fs.writeFile(briefPath, brief, 'utf8');

    const result = await validateBrief(briefPath);
    const fw = result.issues.find((i) => i.field === 'files_to_write');
    assert.ok(fw, 'should have files_to_write issue');
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('validateBrief detects files to write without action keyword', async () => {
  const tmpDir = await makeTempDir();
  try {
    const brief = FULL_BRIEF.replace('(create)', '').replace('(extend with resetToken field)', '');
    const briefPath = path.join(tmpDir, 'brief.md');
    await fs.writeFile(briefPath, brief, 'utf8');

    const result = await validateBrief(briefPath);
    const fw = result.issues.find((i) => i.field === 'files_to_write');
    assert.ok(fw, 'should detect missing action in files_to_write');
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('validateBrief returns score proportional to passing fields', async () => {
  const tmpDir = await makeTempDir();
  try {
    // Remove 2 sections: out_of_scope and done criteria
    let brief = FULL_BRIEF.replace(/## Out of scope[\s\S]*?(?=\n## )/m, '');
    brief = brief.replace(/## Done criteria[\s\S]*$/m, '');
    const briefPath = path.join(tmpDir, 'brief.md');
    await fs.writeFile(briefPath, brief, 'utf8');

    const result = await validateBrief(briefPath);
    assert.equal(result.score, 4);
    assert.equal(result.total, 6);
    assert.equal(result.issues.length, 2);
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('validateBrief returns error for non-existent file', async () => {
  const result = await validateBrief('/tmp/this-file-does-not-exist-aioson.md');
  assert.equal(result.ready, false);
  assert.equal(result.score, 0);
  const fileIssue = result.issues.find((i) => i.field === 'file');
  assert.ok(fileIssue, 'should report file read error');
});

test('validateBrief resolves relative paths against projectDir', async () => {
  const tmpDir = await makeTempDir();
  try {
    const briefPath = 'sub/brief.md';
    const fullPath = path.join(tmpDir, 'sub', 'brief.md');
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, FULL_BRIEF, 'utf8');

    const result = await validateBrief(briefPath, tmpDir);
    assert.equal(result.ready, true);
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

// ─── autoFixBrief ────────────────────────────────────────────────────────────

test('autoFixBrief adds out_of_scope section when missing', async () => {
  const tmpDir = await makeTempDir();
  try {
    const brief = FULL_BRIEF.replace(/## Out of scope[\s\S]*?(?=\n## )/m, '');
    const briefPath = path.join(tmpDir, 'brief.md');
    await fs.writeFile(briefPath, brief, 'utf8');

    const result = await autoFixBrief(briefPath);
    assert.equal(result.fixed, true);
    assert.ok(result.fieldsFixed.includes('out_of_scope'));

    const updated = await fs.readFile(briefPath, 'utf8');
    assert.ok(updated.includes('## Out of scope'), 'should add Out of scope section');
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('autoFixBrief adds done_criteria section when missing', async () => {
  const tmpDir = await makeTempDir();
  try {
    const brief = FULL_BRIEF.replace(/## Done criteria[\s\S]*$/m, '');
    const briefPath = path.join(tmpDir, 'brief.md');
    await fs.writeFile(briefPath, brief, 'utf8');

    const result = await autoFixBrief(briefPath);
    assert.equal(result.fixed, true);
    assert.ok(result.fieldsFixed.includes('done_criteria'));

    const updated = await fs.readFile(briefPath, 'utf8');
    assert.ok(updated.includes('DONE | DONE_WITH_CONCERNS | BLOCKED'), 'should add verdict keywords');
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('autoFixBrief returns fixed:false when nothing to fix', async () => {
  const tmpDir = await makeTempDir();
  try {
    const briefPath = path.join(tmpDir, 'brief.md');
    await fs.writeFile(briefPath, FULL_BRIEF, 'utf8');

    const result = await autoFixBrief(briefPath);
    assert.equal(result.fixed, false);
    assert.deepEqual(result.fieldsFixed, []);
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('autoFixBrief returns error for non-existent file', async () => {
  const result = await autoFixBrief('/tmp/non-existent-brief-aioson.md');
  assert.equal(result.fixed, false);
  assert.ok(result.error);
});

test('autoFixBrief-generated out_of_scope passes subsequent validation', async () => {
  const tmpDir = await makeTempDir();
  try {
    const brief = FULL_BRIEF.replace(/## Out of scope[\s\S]*?(?=\n## )/m, '');
    const briefPath = path.join(tmpDir, 'brief.md');
    await fs.writeFile(briefPath, brief, 'utf8');

    await autoFixBrief(briefPath);
    const validation = await validateBrief(briefPath);

    const oosIssue = validation.issues.find((i) => i.field === 'out_of_scope');
    assert.equal(oosIssue, undefined, 'out_of_scope should pass after auto-fix');
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});
