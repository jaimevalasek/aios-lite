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
  assert.match(agent.description, /traversal/i);
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

test('benchmark wrapper carries the traversal orchestration exception', () => {
  const agent = getAgentDefinition('benchmark');
  const orchestrated = buildAgentPrompt(agent, 'grokbuild', {
    instructionPath: agent.path,
    interactionLanguage: 'pt-BR',
    orchestration: 'benchmark-traversal'
  });
  assert.match(orchestrated, /measured benchmark traversal/);
  assert.match(orchestrated, /benchmark:bootstrap/);
  assert.match(orchestrated, /@briefing → @briefing-refiner → @product → @sheldon → @planner → @dev → @qa/);
  assert.match(orchestrated, /\.aioson\/docs\/benchmark\/traversal\.md/);
  assert.match(orchestrated, /never ask the user anything mid-round/i);

  // Without the orchestration option the boundary keeps the manual stop.
  const plain = buildAgentPrompt(agent, 'grokbuild', { instructionPath: agent.path });
  assert.doesNotMatch(plain, /measured benchmark traversal/);
  assert.match(plain, /operate exclusively as @benchmark/);
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
    '## Traversal protocol',
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

test('benchmark kernel conducts the measured traversal instead of building alone', async () => {
  const kernel = await read('template/.aioson/agents/benchmark.md');

  // Orchestrator identity.
  assert.match(kernel, /traversal orchestrator for one run/i);
  assert.match(kernel, /aioson benchmark:bootstrap \. --json/);
  assert.match(kernel, /\.aioson\/docs\/benchmark\/traversal\.md/);
  assert.doesNotMatch(kernel, /Never activate another AIOSON agent/);

  // Route detection: prototype vs full chain.
  assert.match(kernel, /prototype route/);
  assert.match(kernel, /full route/);
  assert.match(kernel, /`@briefing → @briefing-refiner`/);
  assert.match(kernel, /`@briefing → @briefing-refiner \(no prototype\) → @product → @sheldon → @planner → @dev → @qa`/);
  assert.match(kernel, /one self-contained screen/i);
  assert.match(kernel, /When in doubt, take the full route/i);

  // Unattended posture (M1).
  assert.match(kernel, /questions are forbidden/i);
  assert.match(kernel, /recommended: true/);
  assert.match(kernel, /fails the round explicitly/i);
  assert.match(kernel, /review\.html/);

  // Human-only gates stay outside rounds.
  assert.match(kernel, /briefing:approve/);
  assert.match(kernel, /feature:close/);

  // Failure protocol keeps the result honest.
  assert.match(kernel, /known_limitations/);
  assert.match(kernel, /Never leave the round without a result file/i);
  assert.match(kernel, /Do not label a skipped check as passed/i);
  assert.match(kernel, /--kind=visual[\s\S]*--runtime[\s\S]*--screenshots/i);
  assert.match(kernel, /UNVERIFIED[\s\S]*partial/i);
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

test('traversal contract module is present, synchronized, and complete', async () => {
  const [template, workspace] = await Promise.all([
    read('template/.aioson/docs/benchmark/traversal.md'),
    read('.aioson/docs/benchmark/traversal.md')
  ]);

  assert.equal(workspace, template);
  assert.match(template, /agents: \[benchmark\]/);
  assert.match(template, /\.aioson\/benchmark\/measured-run\.json/);
  assert.match(template, /AIOSON_COCKPIT_BENCHMARK_V1/);
  assert.match(template, /benchmark:bootstrap/);
  assert.match(template, /prototype route/);
  assert.match(template, /full route/);
  assert.match(template, /recommended-or-fail|recommended option/i);
  assert.match(template, /skipped_measured_run/);

  // The stage-evidence table must name the exact artifacts the external
  // observer watches — these paths are a public contract with the Cockpit.
  for (const evidence of [
    '.aioson/briefings/{slug}/briefings.md',
    '.aioson/briefings/{slug}/refinement-report.md',
    '.aioson/context/prd-{slug}.md',
    '.aioson/context/sheldon-review-{slug}.md',
    '.aioson/context/implementation-plan-{slug}.md',
    '.aioson/context/dev-state.md',
    '.aioson/context/qa-report-{slug}.md'
  ]) {
    assert.ok(template.includes(evidence), `traversal contract missing stage evidence ${evidence}`);
  }

  // Strict schema 1 stays the result contract — the external parser rejects
  // unknown fields and other versions, so the doc must never promise schema 2.
  assert.match(template, /strict schema 1/i);
  assert.doesNotMatch(template, /schema_version.{0,12}2/);
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
  assert.equal(Object.keys(example).length, 11, 'result example must carry exactly the 11 v1 fields');
  assert.doesNotMatch(kernel, /example\.com/);
  assert.match(kernel, /objects containing `title`, `url`, and `applied_to`/);
  assert.match(kernel, /objects containing `command`, `status`, and `evidence`/);
  assert.equal(Object.hasOwn(example, 'metrics'), false);
  assert.equal(Object.hasOwn(example, 'tokens'), false);
  assert.equal(Object.hasOwn(example, 'cost'), false);
  assert.equal(Object.hasOwn(example, 'traversal'), false);
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
  assert.match(section[1], /prototype/i);
  assert.ok(section[1].length < 1200, 'benchmark help section is too long');
});
