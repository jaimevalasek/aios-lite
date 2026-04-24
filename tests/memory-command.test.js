'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { runAgentDone } = require('../src/commands/runtime');
const { runMemoryStatus, runMemorySummary } = require('../src/commands/memory');

async function makeProject() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'aioson-memory-command-'));
  const bootstrapDir = path.join(dir, '.aioson', 'context', 'bootstrap');
  await fs.mkdir(bootstrapDir, { recursive: true });
  for (const name of ['what-is.md', 'what-it-does.md', 'how-it-works.md', 'current-state.md']) {
    await fs.writeFile(path.join(bootstrapDir, name), `# ${name}\n\nAIOSON memory fixture.\n`, 'utf8');
  }
  await fs.writeFile(path.join(dir, '.aioson', 'context', 'project-pulse.md'), '# Project Pulse\n\n## Active work\nNone.\n', 'utf8');
  await fs.writeFile(path.join(dir, '.aioson', 'context', 'memory-index.md'), '# Memory Index\n', 'utf8');
  await fs.mkdir(path.join(dir, 'aioson-logs'), { recursive: true });
  await fs.writeFile(path.join(dir, 'aioson-logs', 'devlog-dev-1.md'), '---\nagent: dev\n---\n# Devlog\n', 'utf8');
  await fs.mkdir(path.join(dir, '.aioson', 'brains', 'dev'), { recursive: true });
  await fs.writeFile(
    path.join(dir, '.aioson', 'brains', '_index.json'),
    JSON.stringify({ v: 1, brains: [{ id: 'dev/patterns', path: '.aioson/brains/dev/patterns.brain.json', tags: ['dev'], agents: ['dev'] }] }),
    'utf8'
  );
  await fs.writeFile(path.join(dir, '.aioson', 'brains', 'dev', 'patterns.brain.json'), '{"nodes":[]}\n', 'utf8');
  return dir;
}

function makeLogger() {
  const lines = [];
  return { lines, log(line = '') { lines.push(String(line)); }, error(line = '') { lines.push(String(line)); } };
}

test('memory:status reports bootstrap, devlogs, brains, and runtime', async () => {
  const dir = await makeProject();
  await runAgentDone({
    args: [dir],
    options: { agent: 'dev', summary: 'Implemented memory fixture', json: true },
    logger: makeLogger(),
    t: (key) => key
  });

  const result = await runMemoryStatus({
    args: [dir],
    options: { json: true },
    logger: makeLogger()
  });

  assert.equal(result.ok, true);
  assert.equal(result.bootstrap.present, 4);
  assert.equal(result.devlogs.count, 1);
  assert.equal(result.brains.count, 1);
  assert.equal(result.brains.warnings.length, 0);
  assert.equal(result.runtime.exists, true);
  assert.equal(result.runtime.taskCounts.completed, 1);
});

test('memory:summary emits a compact startup briefing', async () => {
  const dir = await makeProject();
  await runAgentDone({
    args: [dir],
    options: { agent: 'product', summary: 'Created product memory fixture', json: true },
    logger: makeLogger(),
    t: (key) => key
  });

  const logger = makeLogger();
  const result = await runMemorySummary({
    args: [dir],
    options: { last: 3 },
    logger
  });

  assert.equal(result.ok, true);
  assert.match(result.summary, /# AIOSON Memory Summary/);
  assert.match(result.summary, /Coverage: 4\/4/);
  assert.match(result.summary, /Created product memory fixture/);
  assert.equal(logger.lines.join('\n').includes('Retrieval Hints'), true);
});
