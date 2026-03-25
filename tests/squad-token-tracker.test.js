'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const {
  getTokenUsage,
  estimateSessionCost,
  detectWaste,
  TOKEN_CATEGORIES
} = require('../src/squad-dashboard/token-tracker');

async function makeTempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'aioson-token-tracker-'));
}

async function setupTokenUsage(tmpDir, squadSlug, data) {
  const squadDir = path.join(tmpDir, '.aioson', 'squads', squadSlug);
  await fs.mkdir(squadDir, { recursive: true });
  await fs.writeFile(
    path.join(squadDir, 'token-usage.json'),
    JSON.stringify(data, null, 2)
  );
  return squadDir;
}

function makeBreakdown(input, output, toolUseInput, toolOutputs, cacheWrite, cacheRead) {
  return { input_tokens: input, output_tokens: output, tool_use_input: toolUseInput, tool_outputs: toolOutputs, cache_write: cacheWrite, cache_read: cacheRead };
}

// --- getTokenUsage ---

test('getTokenUsage returns agents and totals from existing file', async () => {
  const tmpDir = await makeTempDir();
  try {
    await setupTokenUsage(tmpDir, 'test-squad', {
      updatedAt: '2026-03-24T00:00:00Z',
      agents: {
        writer: {
          totalTokens: 10000,
          sessions: [
            { sessionId: 'sess-1', breakdown: makeBreakdown(3000, 2000, 500, 1000, 0, 3500) }
          ]
        }
      }
    });
    const result = await getTokenUsage(tmpDir, 'test-squad');
    assert.ok(result);
    assert.equal(result.squadSlug, 'test-squad');
    assert.ok(result.agents);
    assert.ok(result.agents.writer);
    assert.equal(result.agents.writer.totalTokens, 10000);
    assert.equal(typeof result.agents.writer.totalCostUsd, 'number');
    assert.equal(typeof result.agents.writer.wasteFlag, 'boolean');
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('getTokenUsage returns null when file is absent', async () => {
  const tmpDir = await makeTempDir();
  try {
    const result = await getTokenUsage(tmpDir, 'nonexistent-squad');
    assert.equal(result, null);
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('getTokenUsage with breakdown=true includes sessions array', async () => {
  const tmpDir = await makeTempDir();
  try {
    await setupTokenUsage(tmpDir, 'test-squad', {
      agents: {
        writer: {
          sessions: [
            { sessionId: 'sess-1', breakdown: makeBreakdown(1000, 500, 0, 200, 0, 0) }
          ]
        }
      }
    });
    const result = await getTokenUsage(tmpDir, 'test-squad', true);
    assert.ok(result.agents.writer.sessions);
    assert.equal(result.agents.writer.sessions.length, 1);
    assert.equal(result.agents.writer.sessions[0].sessionId, 'sess-1');
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('getTokenUsage without breakdown omits sessions', async () => {
  const tmpDir = await makeTempDir();
  try {
    await setupTokenUsage(tmpDir, 'test-squad', {
      agents: {
        writer: {
          sessions: [
            { sessionId: 'sess-1', breakdown: makeBreakdown(1000, 500, 0, 200, 0, 0) }
          ]
        }
      }
    });
    const result = await getTokenUsage(tmpDir, 'test-squad', false);
    assert.equal(result.agents.writer.sessions, undefined);
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('getTokenUsage computes totalTokens from breakdown when missing', async () => {
  const tmpDir = await makeTempDir();
  try {
    await setupTokenUsage(tmpDir, 'test-squad', {
      agents: {
        writer: {
          // totalTokens omitted — should be computed from sessions
          sessions: [
            { sessionId: 'sess-1', breakdown: makeBreakdown(1000, 500, 100, 200, 50, 150) }
          ]
        }
      }
    });
    const result = await getTokenUsage(tmpDir, 'test-squad');
    // total = 1000 + 500 + 100 + 200 + 50 + 150 = 2000
    assert.equal(result.agents.writer.totalTokens, 2000);
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('getTokenUsage sets wasteFlag true when tool_outputs > 60% of total', async () => {
  const tmpDir = await makeTempDir();
  try {
    // tool_outputs = 700, total = 1000 → 70%
    await setupTokenUsage(tmpDir, 'test-squad', {
      agents: {
        writer: {
          sessions: [
            { sessionId: 's1', breakdown: makeBreakdown(100, 100, 0, 700, 0, 100) }
          ]
        }
      }
    });
    const result = await getTokenUsage(tmpDir, 'test-squad');
    assert.equal(result.agents.writer.wasteFlag, true);
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

// --- estimateSessionCost ---

test('estimateSessionCost returns 0 for null or undefined', () => {
  assert.equal(estimateSessionCost(null), 0);
  assert.equal(estimateSessionCost(undefined), 0);
});

test('estimateSessionCost computes input token cost correctly', () => {
  // 1M input tokens @ $3/M = $3.00
  const breakdown = makeBreakdown(1000000, 0, 0, 0, 0, 0);
  assert.equal(estimateSessionCost(breakdown), 3.0);
});

test('estimateSessionCost computes output token cost correctly', () => {
  // 1M output tokens @ $15/M = $15.00
  const breakdown = makeBreakdown(0, 1000000, 0, 0, 0, 0);
  assert.equal(estimateSessionCost(breakdown), 15.0);
});

test('estimateSessionCost rounds to at most 4 decimal places', () => {
  const breakdown = makeBreakdown(1, 0, 0, 0, 0, 0);
  const cost = estimateSessionCost(breakdown);
  const str = cost.toString();
  const decimals = str.includes('.') ? str.split('.')[1].length : 0;
  assert.ok(decimals <= 4, `Expected ≤4 decimals, got ${decimals}: ${str}`);
});

// --- detectWaste ---

test('detectWaste returns true when tool_outputs > 60% of total', () => {
  // tool_outputs = 700, total = 1000 → 70%
  const sessions = [
    { breakdown: makeBreakdown(100, 100, 0, 700, 0, 100) }
  ];
  assert.equal(detectWaste(sessions), true);
});

test('detectWaste returns false when tool_outputs <= 60% of total', () => {
  // tool_outputs = 400, total = 1000 → 40%
  const sessions = [
    { breakdown: makeBreakdown(300, 200, 0, 400, 0, 100) }
  ];
  assert.equal(detectWaste(sessions), false);
});

test('detectWaste returns false for empty sessions array', () => {
  assert.equal(detectWaste([]), false);
});

test('detectWaste returns false for null sessions', () => {
  assert.equal(detectWaste(null), false);
});

test('detectWaste aggregates tool_outputs across multiple sessions', () => {
  // sess1: tool_outputs=200, total=500; sess2: tool_outputs=500, total=500
  // combined: 700/1000 = 70%
  const sessions = [
    { breakdown: makeBreakdown(100, 100, 100, 200, 0, 0) },
    { breakdown: makeBreakdown(0, 0, 0, 500, 0, 0) }
  ];
  assert.equal(detectWaste(sessions), true);
});

// --- TOKEN_CATEGORIES ---

test('TOKEN_CATEGORIES contains all 6 expected categories', () => {
  assert.equal(TOKEN_CATEGORIES.length, 6);
  assert.ok(TOKEN_CATEGORIES.includes('input_tokens'));
  assert.ok(TOKEN_CATEGORIES.includes('output_tokens'));
  assert.ok(TOKEN_CATEGORIES.includes('tool_use_input'));
  assert.ok(TOKEN_CATEGORIES.includes('tool_outputs'));
  assert.ok(TOKEN_CATEGORIES.includes('cache_write'));
  assert.ok(TOKEN_CATEGORIES.includes('cache_read'));
});
