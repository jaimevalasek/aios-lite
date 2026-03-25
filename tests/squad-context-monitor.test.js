'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const {
  getContextUsage,
  computeWarningLevel,
  checkNotificationEvents,
  isCompactDetected
} = require('../src/squad-dashboard/context-monitor');

async function makeTempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'aioson-ctx-monitor-'));
}

async function setupContextMonitor(tmpDir, squadSlug, data) {
  const squadDir = path.join(tmpDir, '.aioson', 'squads', squadSlug);
  await fs.mkdir(squadDir, { recursive: true });
  await fs.writeFile(
    path.join(squadDir, 'context-monitor.json'),
    JSON.stringify(data, null, 2)
  );
  return squadDir;
}

// --- getContextUsage ---

test('getContextUsage returns enriched data from existing file', async () => {
  const tmpDir = await makeTempDir();
  try {
    await setupContextMonitor(tmpDir, 'test-squad', {
      updatedAt: '2026-03-24T00:00:00Z',
      agents: {
        writer: { totalUsed: 50000, windowSize: 200000 }
      }
    });
    const result = await getContextUsage(tmpDir, 'test-squad');
    assert.ok(result);
    assert.equal(result.squadSlug, 'test-squad');
    assert.equal(result.updatedAt, '2026-03-24T00:00:00Z');
    assert.ok(result.agents);
    assert.equal(result.agents.writer.totalUsed, 50000);
    assert.equal(result.agents.writer.warningLevel, 'normal');
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('getContextUsage returns null when file is absent', async () => {
  const tmpDir = await makeTempDir();
  try {
    const result = await getContextUsage(tmpDir, 'no-such-squad');
    assert.equal(result, null);
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('getContextUsage filters by agentSlug when provided', async () => {
  const tmpDir = await makeTempDir();
  try {
    await setupContextMonitor(tmpDir, 'test-squad', {
      agents: {
        writer: { totalUsed: 50000, windowSize: 200000 },
        editor: { totalUsed: 100000, windowSize: 200000 }
      }
    });
    const result = await getContextUsage(tmpDir, 'test-squad', 'writer');
    assert.ok(result);
    assert.equal(result.agentSlug, 'writer');
    assert.equal(result.totalUsed, 50000);
    assert.equal(result.warningLevel, 'normal');
    assert.equal(result.agents, undefined);
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('getContextUsage returns null for unknown agentSlug', async () => {
  const tmpDir = await makeTempDir();
  try {
    await setupContextMonitor(tmpDir, 'test-squad', {
      agents: { writer: { totalUsed: 50000, windowSize: 200000 } }
    });
    const result = await getContextUsage(tmpDir, 'test-squad', 'ghost');
    assert.equal(result, null);
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

// --- computeWarningLevel ---

test('computeWarningLevel: 0-84.9% returns normal', () => {
  assert.equal(computeWarningLevel(0, 200000), 'normal');
  assert.equal(computeWarningLevel(140000, 200000), 'normal'); // 70%
  assert.equal(computeWarningLevel(168000, 200000), 'normal'); // 84%
});

test('computeWarningLevel: 85-94.9% returns warning', () => {
  assert.equal(computeWarningLevel(170000, 200000), 'warning'); // 85%
  assert.equal(computeWarningLevel(185000, 200000), 'warning'); // 92.5%
  assert.equal(computeWarningLevel(189000, 200000), 'warning'); // 94.5%
});

test('computeWarningLevel: 95-99.9% returns critical', () => {
  assert.equal(computeWarningLevel(190000, 200000), 'critical'); // 95%
  assert.equal(computeWarningLevel(199000, 200000), 'critical'); // 99.5%
});

test('computeWarningLevel: 100%+ returns overflow', () => {
  assert.equal(computeWarningLevel(200000, 200000), 'overflow'); // 100%
  assert.equal(computeWarningLevel(250000, 200000), 'overflow'); // 125%
});

test('computeWarningLevel: returns unknown for zero or null windowSize', () => {
  assert.equal(computeWarningLevel(1000, 0), 'unknown');
  assert.equal(computeWarningLevel(1000, null), 'unknown');
});

// --- isCompactDetected ---

test('isCompactDetected returns true when drop > 30%', () => {
  // 200000 → 100000 = 50% drop
  assert.equal(isCompactDetected(200000, 100000), true);
  // 100 → 60 = 40% drop
  assert.equal(isCompactDetected(100, 60), true);
});

test('isCompactDetected returns false when drop <= 30%', () => {
  // 200000 → 150000 = 25% drop
  assert.equal(isCompactDetected(200000, 150000), false);
  // No drop
  assert.equal(isCompactDetected(100, 100), false);
  // Increase
  assert.equal(isCompactDetected(100, 150), false);
  // Exactly 30% drop (not strictly greater)
  assert.equal(isCompactDetected(100, 70), false);
});

test('isCompactDetected returns false when prevUsed is zero or falsy', () => {
  assert.equal(isCompactDetected(0, 50), false);
  assert.equal(isCompactDetected(null, 100), false);
  assert.equal(isCompactDetected(undefined, 100), false);
});

// --- checkNotificationEvents ---

test('checkNotificationEvents emits context_warning for warning level', () => {
  const data = {
    agents: {
      writer: { warningLevel: 'warning', totalUsed: 170000, windowSize: 200000 }
    }
  };
  const events = checkNotificationEvents('test-squad', data);
  assert.equal(events.length, 1);
  assert.equal(events[0].type, 'context_warning');
  assert.equal(events[0].squadSlug, 'test-squad');
  assert.equal(events[0].agentSlug, 'writer');
});

test('checkNotificationEvents emits context_critical for critical level', () => {
  const data = {
    agents: {
      writer: { warningLevel: 'critical', totalUsed: 191000, windowSize: 200000 }
    }
  };
  const events = checkNotificationEvents('test-squad', data);
  assert.equal(events.length, 1);
  assert.equal(events[0].type, 'context_critical');
});

test('checkNotificationEvents emits context_critical for overflow level', () => {
  const data = {
    agents: {
      writer: { warningLevel: 'overflow', totalUsed: 210000, windowSize: 200000 }
    }
  };
  const events = checkNotificationEvents('test-squad', data);
  assert.equal(events.length, 1);
  assert.equal(events[0].type, 'context_critical');
});

test('checkNotificationEvents emits no events for normal level', () => {
  const data = {
    agents: {
      writer: { warningLevel: 'normal', totalUsed: 50000, windowSize: 200000 }
    }
  };
  const events = checkNotificationEvents('test-squad', data);
  assert.equal(events.length, 0);
});

test('checkNotificationEvents returns empty array for null contextData', () => {
  assert.deepEqual(checkNotificationEvents('squad', null), []);
});

test('checkNotificationEvents handles multiple agents', () => {
  const data = {
    agents: {
      writer: { warningLevel: 'warning' },
      editor: { warningLevel: 'critical' },
      reviewer: { warningLevel: 'normal' }
    }
  };
  const events = checkNotificationEvents('test-squad', data);
  assert.equal(events.length, 2);
  const types = events.map(e => e.type);
  assert.ok(types.includes('context_warning'));
  assert.ok(types.includes('context_critical'));
});
