'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { getAgentDefinition, buildAgentPrompt } = require('../src/agents');
const { MVP_AGENTS } = require('../src/jargon-leak-doctor');

const ROOT = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');

test('@help is a registered standalone educational agent', () => {
  const help = getAgentDefinition('help');

  assert.equal(help.id, 'help');
  assert.equal(help.command, '@help');
  assert.deepEqual(help.dependsOn, []);
  assert.match(help.description, /Beginner-friendly guide/);
});

test('@help direct prompt preserves teaching instead of forcing a handoff-only answer', () => {
  const prompt = buildAgentPrompt(getAgentDefinition('help'), 'codex', {
    interactionLanguage: 'pt-BR',
    autonomyMode: 'guarded'
  });

  assert.match(prompt, /Teach and explain in chat/);
  assert.match(prompt, /Recommend one next action only when it helps/);
  assert.match(prompt, /--agent=help --mode=planning/);
  assert.doesNotMatch(prompt, /--agent=help --mode=executing/);
  assert.doesNotMatch(prompt, /output only the handoff/);
});

test('@help kernel is beginner-friendly, evidence-bound, and read-only', () => {
  const kernel = read('template/.aioson/agents/help.md');

  assert.match(kernel, /without assuming software-development or AIOSON knowledge/i);
  assert.match(kernel, /Never guess a flag/i);
  assert.match(kernel, /one concept at a time/i);
  assert.match(kernel, /recommend `@neo`/i);
  assert.match(kernel, /Remain read-only/i);
  assert.match(kernel, /aioson agent:done \. --agent=help/);
});

test('@help is covered by creator-profile jargon leak detection', () => {
  assert.ok(MVP_AGENTS.includes('help'));
});

test('@help has quick-help and routing documentation', () => {
  assert.match(read('template/.aioson/docs/agent-help.md'), /## @help/);
  assert.match(read('template/.aioson/docs/gateway/agent-routing.md'), /Learn AIOSON.*`help`/);
  assert.match(read('template/.aioson/docs/neo/agent-catalog.md'), /`@help`/);
});

test('@help CLI guidance avoids the client-native /help collision', () => {
  const result = spawnSync(process.execPath, [path.join(ROOT, 'bin/aioson.js'), 'agent:help', 'help'], {
    cwd: ROOT,
    encoding: 'utf8'
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /\/aioson:agent:help \[task description\]/);
  assert.doesNotMatch(result.stdout, /^\s*\/help \[task description\]/m);
});
