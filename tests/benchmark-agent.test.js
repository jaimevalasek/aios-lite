'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { AGENT_DEFINITIONS, MANAGED_FILES } = require('../src/constants');
const { getAgentDefinition, buildAgentPrompt } = require('../src/agents');

const ROOT = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFile(path.join(ROOT, relativePath), 'utf8');

test('benchmark is a managed, promptable official agent', () => {
  const agent = getAgentDefinition('benchmark');

  assert.ok(agent);
  assert.equal(agent.id, 'benchmark');
  assert.equal(agent.command, '@benchmark');
  assert.equal(agent.path, '.aioson/agents/benchmark.md');
  assert.ok(agent.dependsOn.includes('.aioson/context/project.context.md'));
  assert.match(agent.output, /benchmark-result\.json/);
  assert.match(agent.output, /report\.md/);
  assert.ok(MANAGED_FILES.includes('.aioson/agents/benchmark.md'));
  assert.ok(AGENT_DEFINITIONS.some((candidate) => candidate.id === 'benchmark'));

  const prompt = buildAgentPrompt(agent, 'grokbuild', {
    instructionPath: agent.path,
    interactionLanguage: 'pt-BR',
    autonomyMode: 'trusted'
  });
  assert.match(prompt, /execute @benchmark/);
  assert.match(prompt, /\.aioson\/agents\/benchmark\.md/);
  assert.match(prompt, /benchmark-result\.json/);
});

test('benchmark kernel has the structural contract and template parity', async () => {
  const [template, workspace] = await Promise.all([
    read('template/.aioson/agents/benchmark.md'),
    read('.aioson/agents/benchmark.md')
  ]);

  assert.equal(workspace, template);
  for (const heading of [
    'LANGUAGE BOUNDARY',
    '## Mission',
    '## Required input',
    '## Hard constraints',
    '## Output contract',
    '## Observability'
  ]) {
    assert.ok(template.includes(heading), `benchmark kernel missing ${heading}`);
  }
  assert.ok(template.indexOf('LANGUAGE BOUNDARY') < template.indexOf('## Mission'));
  assert.ok(template.indexOf('## Mission') < template.indexOf('## Required input'));
  assert.ok(template.indexOf('## Required input') < template.indexOf('## Hard constraints'));
  const done = template.lastIndexOf('aioson agent:done . --agent=benchmark');
  assert.ok(done > 0, 'benchmark kernel missing agent:done');
  assert.equal(template.slice(done).includes('aioson runtime:emit'), false);
  assert.match(template.slice(done), /2>\/dev\/null \|\| true/);
  assert.ok(template.length < 14000, 'benchmark kernel exceeded the compact prompt budget');
});

test('benchmark kernel forces autonomous expansion, research, implementation quality, and proof', async () => {
  const kernel = await read('template/.aioson/agents/benchmark.md');

  assert.match(kernel, /Do not ask clarification or preference questions/i);
  assert.match(kernel, /record[^\n]*assumptions/i);
  assert.match(kernel, /targeted web research/i);
  assert.match(kernel, /Never fabricate sources, citations, research, or findings/i);
  assert.match(kernel, /mature libraries/i);
  assert.match(kernel, /premium visual direction/i);
  assert.match(kernel, /Read `design_skill` only from project context/i);
  assert.match(kernel, /load exactly one contained package/i);
  assert.match(kernel, /\.aioson\/skills\/design\/\{design_skill\}\/SKILL\.md/i);
  assert.match(kernel, /\.aioson\/installed-skills\/\{design_skill\}\/SKILL\.md/i);
  assert.match(kernel, /single visual system/i);
  assert.match(kernel, /Never auto-select `interface-design`/i);
  assert.match(kernel, /repeated em-dash cadence/i);
  assert.match(kernel, /responsive/i);
  assert.match(kernel, /accessib/i);
  assert.match(kernel, /reduced motion/i);
  assert.match(kernel, /performance/i);
  assert.match(kernel, /happy path/i);
  assert.match(kernel, /loading, empty, error/i);
  assert.match(kernel, /real build, test, lint, typecheck, or smoke commands/i);
  assert.match(kernel, /Do not claim completion when the normal entrypoint does not run/i);
});

test('benchmark kernel preserves run fairness and external orchestration ownership', async () => {
  const kernel = await read('template/.aioson/agents/benchmark.md');

  assert.match(kernel, /frozen original prompt/i);
  assert.match(kernel, /assigned run root/i);
  assert.match(kernel, /delivery root must be contained by the run root/i);
  assert.match(kernel, /Never inspect sibling runs/i);
  assert.match(kernel, /Never orchestrate other models, harnesses, or accounts/i);
  assert.match(kernel, /Never create a benchmark slug, Arena, leaderboard, or comparison/i);
  assert.match(kernel, /Never invent or estimate duration, tokens, prices, or monetary cost/i);
  assert.match(kernel, /outside the assigned run root/i);
  assert.match(kernel, /external orchestrator owns/i);
  assert.match(kernel, /only handoff is back to the caller or external orchestrator/i);
});

test('benchmark result example is valid JSON and excludes orchestrator metrics', async () => {
  const kernel = await read('template/.aioson/agents/benchmark.md');
  const match = kernel.match(
    /<!-- BENCHMARK_RESULT_EXAMPLE:BEGIN -->\s*```json\s*([\s\S]*?)\s*```\s*<!-- BENCHMARK_RESULT_EXAMPLE:END -->/
  );

  assert.ok(match, 'benchmark result example markers are missing');
  const example = JSON.parse(match[1]);
  assert.equal(example.schema_version, 1);
  assert.equal(example.status, 'completed');
  assert.equal(typeof example.summary, 'string');
  assert.ok(Array.isArray(example.entrypoints));
  assert.ok(example.entrypoints.every((entrypoint) => typeof entrypoint === 'string'));
  assert.equal(example.entrypoints[0], 'workspace/index.html');
  assert.ok(Array.isArray(example.run_instructions));
  assert.ok(Array.isArray(example.assumptions));
  assert.ok(Array.isArray(example.research));
  assert.ok(Array.isArray(example.features));
  assert.ok(Array.isArray(example.validation));
  assert.ok(Array.isArray(example.known_limitations));
  assert.equal(example.artifacts.report, 'report.md');
  assert.doesNotMatch(kernel, /example\.com/);
  assert.match(kernel, /objects containing `title`, `url`, and `applied_to`/);
  assert.match(kernel, /objects containing `command`, `status`, and `evidence`/);
  assert.equal(Object.hasOwn(example, 'metrics'), false);
  assert.equal(Object.hasOwn(example, 'tokens'), false);
  assert.equal(Object.hasOwn(example, 'cost'), false);
});

test('benchmark quick help is concise and synchronized', async () => {
  const [template, workspace] = await Promise.all([
    read('template/.aioson/docs/agent-help.md'),
    read('.aioson/docs/agent-help.md')
  ]);

  assert.equal(workspace, template);
  const section = template.match(/## @benchmark\s+([\s\S]*?)(?=\n## @|$)/);
  assert.ok(section, 'benchmark help section is missing');
  assert.match(section[1], /without clarification questions/i);
  assert.match(section[1], /benchmark-result\.json/);
  assert.match(section[1], /external orchestrator/i);
  assert.ok(section[1].length < 1200, 'benchmark help section is too long');
});
