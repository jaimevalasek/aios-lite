'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const {
  ENTRY_TYPES,
  getLogsForTask,
  getSessionLog
} = require('../src/squad-dashboard/execution-logs');

async function makeTempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'aioson-exec-logs-'));
}

function logsDir(tmpDir, squadSlug, taskId) {
  return path.join(tmpDir, '.aioson', 'squads', squadSlug, 'logs', taskId);
}

async function writeSession(tmpDir, squadSlug, taskId, sessionId, data) {
  const dir = logsDir(tmpDir, squadSlug, taskId);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, `${sessionId}.json`), JSON.stringify(data), 'utf8');
}

const SAMPLE_SESSION = {
  agentSlug: 'writer',
  taskId: 'task-01',
  startedAt: '2026-03-24T10:00:00Z',
  summary: 'Wrote unit tests',
  entries: [
    { type: 'tool_call', timestamp: '2026-03-24T10:01:00Z', toolName: 'Read', input: { path: 'src/foo.js' }, output: 'const x = 1;', durationMs: 50 },
    { type: 'reasoning', timestamp: '2026-03-24T10:02:00Z', text: 'Need to analyze the file' },
    { type: 'milestone', timestamp: '2026-03-24T10:03:00Z', label: 'Analysis complete' },
    { type: 'error', timestamp: '2026-03-24T10:04:00Z', message: 'File not found', stack: 'Error: File not found\n  at ...' }
  ]
};

// --- getLogsForTask ---

test('getLogsForTask returns sessions from existing log directory', async () => {
  const tmpDir = await makeTempDir();
  try {
    await writeSession(tmpDir, 'alpha', 'task-01', 'session-20260324T100000Z', SAMPLE_SESSION);
    const sessions = await getLogsForTask(tmpDir, 'alpha', 'task-01');
    assert.equal(sessions.length, 1);
    assert.equal(sessions[0].agentSlug, 'writer');
    assert.equal(sessions[0].taskId, 'task-01');
    assert.equal(sessions[0].squadSlug, 'alpha');
    assert.equal(sessions[0].entries.length, 4);
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('getLogsForTask returns empty array when directory does not exist', async () => {
  const tmpDir = await makeTempDir();
  try {
    const sessions = await getLogsForTask(tmpDir, 'ghost', 'task-xx');
    assert.deepEqual(sessions, []);
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('getLogsForTask ignores invalid JSON files without throwing', async () => {
  const tmpDir = await makeTempDir();
  try {
    const dir = logsDir(tmpDir, 'alpha', 'task-bad');
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, 'session-20260324T000000Z.json'), 'INVALID JSON', 'utf8');

    const sessions = await getLogsForTask(tmpDir, 'alpha', 'task-bad');
    assert.equal(sessions.length, 1);
    assert.equal(sessions[0].parseError, true);
    assert.deepEqual(sessions[0].entries, []);
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('getLogsForTask returns multiple sessions sorted by timestamp', async () => {
  const tmpDir = await makeTempDir();
  try {
    await writeSession(tmpDir, 'alpha', 'task-02', 'session-20260324T120000Z', { entries: [] });
    await writeSession(tmpDir, 'alpha', 'task-02', 'session-20260324T090000Z', { entries: [] });
    const sessions = await getLogsForTask(tmpDir, 'alpha', 'task-02');
    assert.equal(sessions.length, 2);
    assert.ok(sessions[0].timestamp < sessions[1].timestamp);
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

// --- entry types ---

test('tool_call entries have toolName, input, and output', async () => {
  const tmpDir = await makeTempDir();
  try {
    await writeSession(tmpDir, 'alpha', 'task-03', 'session-20260324T100000Z', SAMPLE_SESSION);
    const sessions = await getLogsForTask(tmpDir, 'alpha', 'task-03');
    const toolCall = sessions[0].entries.find(e => e.type === ENTRY_TYPES.TOOL_CALL);
    assert.ok(toolCall);
    assert.equal(toolCall.toolName, 'Read');
    assert.ok(toolCall.input);
    assert.ok(toolCall.output);
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('reasoning entries have text field', async () => {
  const tmpDir = await makeTempDir();
  try {
    await writeSession(tmpDir, 'alpha', 'task-04', 'session-20260324T100000Z', SAMPLE_SESSION);
    const sessions = await getLogsForTask(tmpDir, 'alpha', 'task-04');
    const reasoning = sessions[0].entries.find(e => e.type === ENTRY_TYPES.REASONING);
    assert.ok(reasoning);
    assert.ok(reasoning.text);
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('milestone entries have label field', async () => {
  const tmpDir = await makeTempDir();
  try {
    await writeSession(tmpDir, 'alpha', 'task-05', 'session-20260324T100000Z', SAMPLE_SESSION);
    const sessions = await getLogsForTask(tmpDir, 'alpha', 'task-05');
    const milestone = sessions[0].entries.find(e => e.type === ENTRY_TYPES.MILESTONE);
    assert.ok(milestone);
    assert.ok(milestone.label);
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('error entries have message and optional stack field', async () => {
  const tmpDir = await makeTempDir();
  try {
    await writeSession(tmpDir, 'alpha', 'task-06', 'session-20260324T100000Z', SAMPLE_SESSION);
    const sessions = await getLogsForTask(tmpDir, 'alpha', 'task-06');
    const error = sessions[0].entries.find(e => e.type === ENTRY_TYPES.ERROR);
    assert.ok(error);
    assert.ok(error.message);
    assert.ok(error.stack);
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

// --- getSessionLog ---

test('getSessionLog returns raw session data by sessionId', async () => {
  const tmpDir = await makeTempDir();
  try {
    await writeSession(tmpDir, 'alpha', 'task-07', 'session-20260324T100000Z', SAMPLE_SESSION);
    const session = await getSessionLog(tmpDir, 'alpha', 'task-07', 'session-20260324T100000Z');
    assert.equal(session.agentSlug, 'writer');
    assert.equal(session.entries.length, 4);
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('getSessionLog returns null when file does not exist', async () => {
  const tmpDir = await makeTempDir();
  try {
    const session = await getSessionLog(tmpDir, 'alpha', 'task-xx', 'session-missing');
    assert.equal(session, null);
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

// --- ENTRY_TYPES constants ---

test('ENTRY_TYPES exports expected values', () => {
  assert.equal(ENTRY_TYPES.TOOL_CALL, 'tool_call');
  assert.equal(ENTRY_TYPES.REASONING, 'reasoning');
  assert.equal(ENTRY_TYPES.MILESTONE, 'milestone');
  assert.equal(ENTRY_TYPES.ERROR, 'error');
});
