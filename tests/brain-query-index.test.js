'use strict';

/**
 * `brain:query --format=index`: one line per node — title plus the first
 * sentence of its statement. The compact format printed every statement in
 * full (~14 KB for the visual-quality lens on every visual touch of a dev
 * session); the index keeps every criterion nameable at a fraction of the
 * cost, and one node's full text is `--id=<id> --format=compact` away.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { formatBrainNodesIndex, formatBrainNodesCompact, firstSentence } = require('../src/brain-query');
const { runBrainQuery } = require('../src/commands/brain-query');

function makeLogger() {
  const lines = [];
  return { log: (m = '') => lines.push(String(m)), error: (m = '') => lines.push(String(m)), warn: () => {}, lines };
}

async function makeProject() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'aioson-brain-index-'));
  await fs.mkdir(path.join(dir, '.aioson', 'brains', 'design'), { recursive: true });
  const nodes = Array.from({ length: 6 }, (_, i) => ({
    id: `vq-10${i}`,
    title: `Criterion number ${i}`,
    tags: ['visual-quality'],
    q: 5,
    v: i === 3 ? 'AVOID' : 'BEST_PRACTICE',
    s: `First sentence of criterion ${i} states the rule. ${'A much longer explanation follows with examples and edge cases. '.repeat(6)}`
  }));
  await fs.writeFile(path.join(dir, '.aioson', 'brains', '_index.json'), JSON.stringify({
    v: 1,
    brains: [{ id: 'design/visual-quality', agents: ['dev'], tags: ['visual-quality'], path: '.aioson/brains/design/visual-quality.brain.json', nodes: nodes.length }]
  }, null, 2));
  await fs.writeFile(path.join(dir, '.aioson', 'brains', 'design', 'visual-quality.brain.json'), JSON.stringify({ nodes }, null, 2));
  return { dir, nodes };
}

test('firstSentence keeps the first sentence and caps the length', () => {
  assert.equal(firstSentence('Reject a surface that could serve any SaaS. Rework its composition.'), 'Reject a surface that could serve any SaaS.');
  assert.equal(firstSentence('No terminal punctuation here'), 'No terminal punctuation here');
  assert.equal(firstSentence('x'.repeat(200) + '. tail'), `${'x'.repeat(139)}…`);
  assert.equal(firstSentence(''), '');
});

test('the index prints one line per node with the first sentence, at a fraction of the compact cost', async () => {
  const { dir, nodes } = await makeProject();
  try {
    const index = formatBrainNodesIndex(nodes);
    const compact = formatBrainNodesCompact(nodes);
    assert.equal(index.split('\n').length, nodes.length);
    assert.match(index, /^\[5\* BEST_PRACTICE\] vq-100 - Criterion number 0 — First sentence of criterion 0 states the rule\.$/m);
    assert.match(index, /\[5\* AVOID\] vq-103/);
    assert.doesNotMatch(index, /edge cases/);
    assert.ok(index.length * 3 < compact.length, `index ${index.length} vs compact ${compact.length}`);
    assert.equal(formatBrainNodesIndex([]), '(no matches)');

    const logger = makeLogger();
    const result = await runBrainQuery({ args: [dir], options: { agent: 'dev', tags: 'visual-quality', 'min-quality': 4, format: 'index' }, logger });
    assert.equal(result.ok, true);
    const out = logger.lines.join('\n');
    assert.match(out, /vq-105 - Criterion number 5 — First sentence of criterion 5 states the rule\./);
    assert.match(out, /full statement of one node: aioson brain:query \. --id=<id> --format=compact/);
    assert.match(out, /6 node\(s\) matched/);

    // The named node's full statement is one call away.
    const one = makeLogger();
    await runBrainQuery({ args: [dir], options: { id: 'vq-102', format: 'compact' }, logger: one });
    assert.match(one.lines.join('\n'), /edge cases/);
    assert.match(one.lines.join('\n'), /1 node\(s\) matched/);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('dev and deyvin read the visual-quality lens as an index; the refiner (origination) keeps the full statements', async () => {
  const root = path.resolve(__dirname, '..', 'template', '.aioson');
  const [dev, deyvin, refiner] = await Promise.all([
    fs.readFile(path.join(root, 'docs', 'dev', 'visual-implementation.md'), 'utf8'),
    fs.readFile(path.join(root, 'agents', 'deyvin.md'), 'utf8'),
    fs.readFile(path.join(root, 'agents', 'refiner.md'), 'utf8')
  ]);
  assert.match(dev, /brain:query \. --agent=dev --tags=visual-quality,layout --min-quality=4 --format=index/);
  assert.match(dev, /--id=<id> --format=compact/);
  assert.match(deyvin, /brain:query \. --agent=deyvin --tags=visual-quality,layout --min-quality=4 --format=index/);
  assert.match(refiner, /brain:query \. --agent=refiner --tags=visual-quality,layout --min-quality=4 --format=compact/);
});
