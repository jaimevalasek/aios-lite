'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { queryBrains, normalizeBrainPath } = require('../src/brain-query');
const { runBrainQuery } = require('../src/commands/brain-query');

async function makeProject() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'aioson-brain-query-'));
  await fs.mkdir(path.join(dir, '.aioson', 'brains', 'dev'), { recursive: true });
  await fs.writeFile(
    path.join(dir, '.aioson', 'brains', '_index.json'),
    JSON.stringify({
      v: 1,
      brains: [{
        id: 'dev/patterns',
        agents: ['dev'],
        tags: ['node', 'testing', 'memory'],
        path: '.aioson/brains/dev/patterns.brain.json',
        nodes: 2
      }]
    }, null, 2),
    'utf8'
  );
  await fs.writeFile(
    path.join(dir, '.aioson', 'brains', 'dev', 'patterns.brain.json'),
    JSON.stringify({
      nodes: [
        {
          id: 'node-001',
          title: 'Use node:test for CLI regressions',
          tags: ['node', 'testing'],
          q: 5,
          v: 'BEST_PRACTICE',
          s: 'Keep CLI command regressions close to command modules.'
        },
        {
          id: 'node-002',
          title: 'Do not load every memory file',
          tags: ['memory'],
          q: 4,
          v: 'AVOID',
          s: 'Use focused retrieval instead of bulk context loading.',
          not: 'Opening all memory files on every activation'
        }
      ]
    }, null, 2),
    'utf8'
  );
  return dir;
}

function makeLogger() {
  const lines = [];
  return { lines, log(line = '') { lines.push(String(line)); }, error(line = '') { lines.push(String(line)); } };
}

test('normalizeBrainPath resolves index paths relative to project root', async () => {
  const dir = await makeProject();
  assert.equal(
    normalizeBrainPath(dir, '.aioson/brains/dev/patterns.brain.json'),
    path.join(dir, '.aioson', 'brains', 'dev', 'patterns.brain.json')
  );
});

test('queryBrains loads .aioson/brains paths without duplicating .aioson', async () => {
  const dir = await makeProject();
  const result = await queryBrains({
    targetDir: dir,
    tags: ['testing'],
    minQuality: 4,
    agent: 'dev'
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.warnings, []);
  assert.equal(result.nodes.length, 1);
  assert.equal(result.nodes[0].id, 'node-001');
});

test('brain:query command returns compact matches', async () => {
  const dir = await makeProject();
  const logger = makeLogger();
  const result = await runBrainQuery({
    args: [dir],
    options: { tags: 'memory', 'min-quality': 4 },
    logger
  });

  assert.equal(result.ok, true);
  assert.equal(result.nodes.length, 1);
  assert.equal(logger.lines.some((line) => line.includes('node-002')), true);
  assert.equal(logger.lines.some((line) => line.includes('1 node(s) matched')), true);
});
