'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const {
  parseDiffHunks,
  initHunkReview,
  getHunks,
  updateHunk,
  loadHunkState,
  computeDispatch,
  getReviewProgress,
  HUNK_STATES
} = require('../src/squad-dashboard/hunk-review');

async function makeTempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'aioson-hunk-review-'));
}

const SAMPLE_DIFF = `--- a/src/foo.js
+++ b/src/foo.js
@@ -1,4 +1,5 @@
 const x = 1;
+const y = 2;
 function hello() {
-  return 'hi';
+  return 'hello';
 }
@@ -10,3 +11,4 @@
 module.exports = { hello };
+module.exports.goodbye = () => 'bye';
 // end
`;

// --- parseDiffHunks ---

test('parseDiffHunks returns 3 hunks from SAMPLE_DIFF', () => {
  // SAMPLE_DIFF has 2 @@ blocks
  const hunks = parseDiffHunks(SAMPLE_DIFF);
  assert.equal(hunks.length, 2);
  assert.equal(hunks[0].id, 'hunk-0');
  assert.equal(hunks[1].id, 'hunk-1');
});

test('parseDiffHunks populates fileHeader from +++ line', () => {
  const hunks = parseDiffHunks(SAMPLE_DIFF);
  assert.equal(hunks[0].fileHeader, 'src/foo.js');
});

test('parseDiffHunks counts additions and deletions per hunk', () => {
  const hunks = parseDiffHunks(SAMPLE_DIFF);
  // hunk-0: +const y = 2 and +return 'hello' = 2 additions; -return 'hi' = 1 deletion
  assert.equal(hunks[0].additions, 2);
  assert.equal(hunks[0].deletions, 1);
});

test('parseDiffHunks returns empty array for empty string', () => {
  assert.deepEqual(parseDiffHunks(''), []);
});

test('parseDiffHunks returns empty array for null/undefined', () => {
  assert.deepEqual(parseDiffHunks(null), []);
  assert.deepEqual(parseDiffHunks(undefined), []);
});

test('parseDiffHunks includes raw hunk header', () => {
  const hunks = parseDiffHunks(SAMPLE_DIFF);
  assert.ok(hunks[0].header.startsWith('@@ '));
});

// --- initHunkReview ---

test('initHunkReview creates hunk-review.json with pending hunks', async () => {
  const tmpDir = await makeTempDir();
  try {
    const state = await initHunkReview(tmpDir, 'alpha', 'task-01', SAMPLE_DIFF);
    assert.equal(state.taskId, 'task-01');
    assert.equal(state.squadSlug, 'alpha');
    assert.equal(state.hunks.length, 2);
    assert.ok(state.hunks.every(h => h.status === HUNK_STATES.PENDING));
    assert.ok(state.createdAt);

    // File must exist on disk
    const p = path.join(tmpDir, '.aioson', 'squads', 'alpha', 'tasks', 'task-01', 'hunk-review.json');
    const raw = JSON.parse(await fs.readFile(p, 'utf8'));
    assert.equal(raw.taskId, 'task-01');
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

// --- getHunks ---

test('getHunks loads existing state from disk', async () => {
  const tmpDir = await makeTempDir();
  try {
    await initHunkReview(tmpDir, 'alpha', 'task-02', SAMPLE_DIFF);
    const state = await getHunks(tmpDir, 'alpha', 'task-02');
    assert.equal(state.taskId, 'task-02');
    assert.equal(state.hunks.length, 2);
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('getHunks inits from diff when state file is absent', async () => {
  const tmpDir = await makeTempDir();
  try {
    const state = await getHunks(tmpDir, 'beta', 'task-03', SAMPLE_DIFF);
    assert.ok(state);
    assert.equal(state.hunks.length, 2);
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('getHunks returns null when absent and no diff provided', async () => {
  const tmpDir = await makeTempDir();
  try {
    const state = await getHunks(tmpDir, 'beta', 'task-no-diff');
    assert.equal(state, null);
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

// --- updateHunk (approve / reject / comment) ---

test('updateHunk approves a hunk and persists to disk', async () => {
  const tmpDir = await makeTempDir();
  try {
    await initHunkReview(tmpDir, 'alpha', 'task-04', SAMPLE_DIFF);
    const res = await updateHunk(tmpDir, 'alpha', 'task-04', 'hunk-0', HUNK_STATES.APPROVED, null);
    assert.equal(res.ok, true);
    assert.equal(res.hunk.status, HUNK_STATES.APPROVED);

    const state = await loadHunkState(tmpDir, 'alpha', 'task-04');
    assert.equal(state.hunks[0].status, HUNK_STATES.APPROVED);
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('updateHunk rejects a hunk with comment', async () => {
  const tmpDir = await makeTempDir();
  try {
    await initHunkReview(tmpDir, 'alpha', 'task-05', SAMPLE_DIFF);
    const res = await updateHunk(tmpDir, 'alpha', 'task-05', 'hunk-0', HUNK_STATES.REJECTED, 'needs refactor');
    assert.equal(res.ok, true);
    assert.equal(res.hunk.status, HUNK_STATES.REJECTED);
    assert.equal(res.hunk.comment, 'needs refactor');
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('updateHunk returns ok:false when state file does not exist', async () => {
  const tmpDir = await makeTempDir();
  try {
    const res = await updateHunk(tmpDir, 'ghost', 'task-xx', 'hunk-0', HUNK_STATES.APPROVED, null);
    assert.equal(res.ok, false);
    assert.ok(res.error);
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('updateHunk returns ok:false for unknown hunkId', async () => {
  const tmpDir = await makeTempDir();
  try {
    await initHunkReview(tmpDir, 'alpha', 'task-06', SAMPLE_DIFF);
    const res = await updateHunk(tmpDir, 'alpha', 'task-06', 'hunk-999', HUNK_STATES.APPROVED, null);
    assert.equal(res.ok, false);
    assert.ok(res.error);
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

// --- computeDispatch ---

test('computeDispatch returns task_done when all hunks approved', () => {
  const hunks = [
    { id: 'hunk-0', status: HUNK_STATES.APPROVED },
    { id: 'hunk-1', status: HUNK_STATES.APPROVED }
  ];
  const d = computeDispatch(hunks);
  assert.equal(d.event, 'task_done');
});

test('computeDispatch returns task_needs_revision when any hunk rejected', () => {
  const hunks = [
    { id: 'hunk-0', status: HUNK_STATES.APPROVED },
    { id: 'hunk-1', status: HUNK_STATES.REJECTED }
  ];
  const d = computeDispatch(hunks);
  assert.equal(d.event, 'task_needs_revision');
  assert.deepEqual(d.rejectedHunks, ['hunk-1']);
});

test('computeDispatch returns null when any hunk is pending', () => {
  const hunks = [
    { id: 'hunk-0', status: HUNK_STATES.APPROVED },
    { id: 'hunk-1', status: HUNK_STATES.PENDING }
  ];
  const d = computeDispatch(hunks);
  assert.equal(d, null);
});

test('computeDispatch: revised hunks do not block task_done', () => {
  const hunks = [
    { id: 'hunk-0', status: HUNK_STATES.APPROVED },
    { id: 'hunk-1', status: HUNK_STATES.REVISED }
  ];
  const d = computeDispatch(hunks);
  assert.equal(d.event, 'task_done');
});

// --- getReviewProgress ---

test('getReviewProgress returns correct counts', () => {
  const hunks = [
    { status: HUNK_STATES.APPROVED },
    { status: HUNK_STATES.REJECTED },
    { status: HUNK_STATES.PENDING },
    { status: HUNK_STATES.REVISED }
  ];
  const p = getReviewProgress(hunks);
  assert.equal(p.total, 4);
  assert.equal(p.approved, 1);
  assert.equal(p.rejected, 1);
  assert.equal(p.pending, 1);
  assert.equal(p.revised, 1);
});

test('getReviewProgress returns zeros for empty array', () => {
  const p = getReviewProgress([]);
  assert.equal(p.total, 0);
  assert.equal(p.approved, 0);
});
