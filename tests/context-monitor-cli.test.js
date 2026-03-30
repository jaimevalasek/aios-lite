'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');

const { runContextMonitor } = require('../src/commands/context-monitor');

function createCollectLogger() {
  const lines = [];
  return {
    lines,
    log(line) { lines.push(String(line)); },
    error(line) { lines.push(String(line)); }
  };
}

async function makeTmpDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'aioson-ctx-monitor-'));
}

test('context:monitor — no squad flag shows usage hint', async () => {
  const tmp = await makeTmpDir();
  try {
    const logger = createCollectLogger();
    const result = await runContextMonitor({ args: [tmp], options: {}, logger });
    assert.ok(result.ok);
    const output = logger.lines.join('\n');
    assert.ok(output.includes('--squad'), 'should show --squad hint');
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test('context:monitor — missing context-monitor.json returns ok with no agents', async () => {
  const tmp = await makeTmpDir();
  try {
    const logger = createCollectLogger();
    const result = await runContextMonitor({
      args: [tmp],
      options: { squad: 'my-squad' },
      logger
    });
    assert.ok(result.ok);
    const output = logger.lines.join('\n');
    assert.ok(output.includes('my-squad'), 'squad slug should appear in output');
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test('context:monitor — renders agents from context-monitor.json', async () => {
  const tmp = await makeTmpDir();
  try {
    const squadDir = path.join(tmp, '.aioson', 'squads', 'test-squad');
    await fs.mkdir(squadDir, { recursive: true });

    const monitorData = {
      updatedAt: new Date().toISOString(),
      agents: {
        dev: { totalUsed: 85000, windowSize: 100000 },
        qa: { totalUsed: 50000, windowSize: 100000 }
      }
    };
    await fs.writeFile(
      path.join(squadDir, 'context-monitor.json'),
      JSON.stringify(monitorData),
      'utf8'
    );

    const logger = createCollectLogger();
    const result = await runContextMonitor({
      args: [tmp],
      options: { squad: 'test-squad' },
      logger
    });

    assert.ok(result.ok);
    const output = logger.lines.join('\n');
    assert.ok(output.includes('dev'), 'dev agent rendered');
    assert.ok(output.includes('qa'), 'qa agent rendered');
    // 85% usage → warning
    assert.ok(output.includes('WARNING') || output.includes('warning') || output.includes('⚠') || output.includes('!'), 'warning level shown for 85% usage');
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test('context:monitor — json option returns structured data', async () => {
  const tmp = await makeTmpDir();
  try {
    const squadDir = path.join(tmp, '.aioson', 'squads', 'json-squad');
    await fs.mkdir(squadDir, { recursive: true });
    await fs.writeFile(
      path.join(squadDir, 'context-monitor.json'),
      JSON.stringify({ agents: { dev: { totalUsed: 1000, windowSize: 100000 } } }),
      'utf8'
    );

    const logger = createCollectLogger();
    const result = await runContextMonitor({
      args: [tmp],
      options: { squad: 'json-squad', json: true },
      logger
    });

    assert.ok(result.ok);
    assert.ok(result.agents, 'json result has agents key');
    assert.ok(result.agents.dev, 'json result has dev agent');
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test('context:monitor — renderBar stays within bounds', async () => {
  // Test the bar rendering logic via high usage (>100%) without crashing
  const tmp = await makeTmpDir();
  try {
    const squadDir = path.join(tmp, '.aioson', 'squads', 'overflow-squad');
    await fs.mkdir(squadDir, { recursive: true });
    await fs.writeFile(
      path.join(squadDir, 'context-monitor.json'),
      JSON.stringify({ agents: { dev: { totalUsed: 110000, windowSize: 100000 } } }),
      'utf8'
    );

    const logger = createCollectLogger();
    const result = await runContextMonitor({
      args: [tmp],
      options: { squad: 'overflow-squad' },
      logger
    });

    assert.ok(result.ok, 'should not throw on overflow');
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});
