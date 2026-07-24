'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', 'template', '.aioson', 'skills', 'process', 'decision-presentation');

test('decision-presentation keeps its hot path compact without losing decision safeguards', async () => {
  const [kernel, diagnostics] = await Promise.all([
    fs.readFile(path.join(ROOT, 'SKILL.md'), 'utf8'),
    fs.readFile(path.join(ROOT, 'references', 'compatibility-and-doctor.md'), 'utf8')
  ]);

  assert.equal(kernel.length < 7000, true, `decision-presentation kernel is ${kernel.length} chars`);
  assert.match(kernel, /Rule 1[\s\S]*Rule 2[\s\S]*Rule 3[\s\S]*Rule 4[\s\S]*Rule 5[\s\S]*Rule 6[\s\S]*Rule 7/i);
  assert.match(kernel, /one per turn|one question per turn/i);
  assert.match(kernel, /recommended first option/i);
  assert.match(kernel, /pause option/i);
  assert.match(kernel, /jargon-map\.\{interaction_language\}\.yaml/i);
  assert.match(kernel, /No question without a blocked decision/i);
  assert.match(kernel, /compatibility-and-doctor\.md.*only when/is);
  assert.match(diagnostics, /jargon_leak_detection[\s\S]*warning/i);
  assert.match(diagnostics, /profile: beginner[\s\S]*profile: creator/i);
});
