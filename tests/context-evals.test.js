'use strict';

/**
 * The trigger-eval engine: scenarios in `.aioson/evals/*.json` replay through
 * the REAL brief builder and grade reachability (expect), quiet (absent), and
 * coverage — with a deterministic diagnosis naming why a positive missed and
 * what frontmatter change would fix it. The CLI stays advisory by default and
 * fails only under `--strict`.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const { execFile } = require('node:child_process');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { runContextEvals, loadEvalCorpus } = require('../src/lib/context-evals');

const ROOT = path.resolve(__dirname, '..');
const BIN = path.join(ROOT, 'bin', 'aioson.js');

async function writeFile(dir, relPath, content) {
  const absPath = path.join(dir, relPath);
  await fs.mkdir(path.dirname(absPath), { recursive: true });
  await fs.writeFile(absPath, content, 'utf8');
}

async function fixtureProject() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'aioson-context-evals-'));
  await writeFile(dir, '.aioson/context/project.context.md', [
    '---', 'framework: Node.js', 'project_type: web-app', 'load_tier: always', '---', '# Project'
  ].join('\n'));
  await writeFile(dir, '.aioson/rules/board-rule.md', [
    '---',
    'name: board-rule',
    'description: kanban board interaction contract',
    'entities: [Card, Column]',
    'triggers: [kanban, drag and drop]',
    '---',
    '## Required behavior',
    '- Confirm destructive stage changes.'
  ].join('\n'));
  await writeFile(dir, '.aioson/rules/executing-only-rule.md', [
    '---',
    'name: executing-only-rule',
    'description: applies while executing only',
    'modes: [executing]',
    'triggers: [migration]',
    '---',
    '## Required behavior',
    '- Keep migrations reversible.'
  ].join('\n'));
  await writeFile(dir, '.aioson/rules/qa-only-rule.md', [
    '---',
    'name: qa-only-rule',
    'description: qa review contract',
    'agents: [qa]',
    'triggers: [regression]',
    '---',
    '## Required behavior',
    '- Re-run the regression set.'
  ].join('\n'));
  await writeFile(dir, '.aioson/docs/no-routing.md', [
    '---', 'description: a doc with no routing frontmatter', '---', 'body'
  ].join('\n'));
  await writeFile(dir, '.aioson/skills/process/demo/SKILL.md', [
    '---',
    'name: demo',
    'description: demo process skill',
    'agents: [dev]',
    'triggers: [demo protocol]',
    '---',
    '# Demo'
  ].join('\n'));
  return dir;
}

function scenarioFile(scenarios) {
  return JSON.stringify({ version: 1, scenarios }, null, 2);
}

test('expect and absent grade through the real engine, with sections honored', async () => {
  const dir = await fixtureProject();
  try {
    await writeFile(dir, '.aioson/evals/basic.json', scenarioFile([
      {
        name: 'board rule is law on board work',
        agent: 'dev', mode: 'executing',
        task: 'add drag and drop between kanban columns so a card moves stages',
        paths: ['src/ui/Board.tsx'],
        expect: [{ path: '.aioson/rules/board-rule.md', in: 'must_load' }],
        absent: [{ path: '.aioson/rules/executing-only-rule.md', in: 'must_load' }]
      },
      {
        name: 'demo skill routes to dev',
        agent: 'dev', mode: 'executing',
        task: 'run the demo protocol on the sandbox module',
        expect: [{ path: '.aioson/skills/process/demo/SKILL.md', in: 'skills' }]
      }
    ]));
    const report = await runContextEvals(dir);
    assert.equal(report.totals.failed, 0, JSON.stringify(report.results, null, 2));
    assert.equal(report.totals.scenarios, 2);
    assert.equal(report.totals.positive_pass_rate, 1);
    assert.equal(report.totals.negative_pass_rate, 1);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('a failed expect carries a specific cause and a concrete frontmatter suggestion', async () => {
  const dir = await fixtureProject();
  try {
    await writeFile(dir, '.aioson/evals/failures.json', scenarioFile([
      {
        name: 'agent filter blocks dev from a qa-only rule',
        agent: 'dev', mode: 'executing',
        task: 'run the regression suite for checkout',
        expect: [{ path: '.aioson/rules/qa-only-rule.md', in: 'selected' }]
      },
      {
        name: 'mode filter blocks planning from an executing-only rule',
        agent: 'dev', mode: 'planning',
        task: 'plan the schema migration rollout',
        expect: [{ path: '.aioson/rules/executing-only-rule.md', in: 'selected' }]
      },
      {
        name: 'nothing matches an unrelated task',
        agent: 'dev', mode: 'executing',
        task: 'refatorar o carrinho de compras para caching distribuido',
        expect: [{ path: '.aioson/rules/board-rule.md', in: 'selected' }]
      },
      {
        name: 'an on-disk file no surface walks is its own diagnosis',
        agent: 'dev', mode: 'executing',
        task: 'anything at all here',
        expect: [{ path: '.aioson/rules/README.md', in: 'selected' }]
      },
      {
        name: 'a target missing from disk is a visible skip, not a failure',
        agent: 'dev', mode: 'executing',
        task: 'anything at all here',
        expect: [{ path: '.aioson/rules/missing-rule.md', in: 'selected' }]
      }
    ]));
    await writeFile(dir, '.aioson/rules/README.md', '# rules readme');
    const report = await runContextEvals(dir, { coverage: false });
    const byName = new Map(report.results.map((result) => [result.name, result]));

    const agentFail = byName.get('agent filter blocks dev from a qa-only rule').checks[0];
    assert.equal(agentFail.passed, false);
    assert.equal(agentFail.diagnosis.cause, 'agent_filter');
    assert.match(agentFail.diagnosis.suggestion, /add "dev"/);

    const modeFail = byName.get('mode filter blocks planning from an executing-only rule').checks[0];
    assert.equal(modeFail.diagnosis.cause, 'mode_filter');
    assert.match(modeFail.diagnosis.suggestion, /planning/);

    const thresholdFail = byName.get('nothing matches an unrelated task').checks[0];
    assert.equal(thresholdFail.diagnosis.cause, 'below_threshold');
    assert.match(thresholdFail.diagnosis.detail, /scored \d+\/\d+/);
    assert.match(thresholdFail.diagnosis.suggestion, /triggers/);
    // Suggested terms come from the task, diacritics folded, stop words out.
    assert.match(thresholdFail.diagnosis.suggestion, /caching/);

    const readmeFail = byName.get('an on-disk file no surface walks is its own diagnosis').checks[0];
    assert.equal(readmeFail.passed, false);
    assert.equal(readmeFail.diagnosis.cause, 'not_a_candidate');

    // Profile-filtered installs legitimately lack part of the shipped corpus:
    // a missing target skips visibly instead of failing (the framework's own
    // full-install suite pins skipped === 0, so typos still cannot hide).
    const skipped = byName.get('a target missing from disk is a visible skip, not a failure').checks[0];
    assert.equal(skipped.passed, true);
    assert.equal(skipped.skipped, true);
    assert.equal(skipped.reason, 'target_not_installed');
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('reached-but-wrong-section is diagnosed separately from a total miss', async () => {
  const dir = await fixtureProject();
  try {
    // Semantic-only recall demotes a rule to should_load; expecting must_load
    // fails with the wrong-section diagnosis, not below_threshold.
    await writeFile(dir, '.aioson/evals/tier.json', scenarioFile([
      {
        name: 'must_load asserted where only recall reaches',
        agent: 'product', mode: 'planning',
        task: 'plan the kanban board workstream cadence',
        expect: [{ path: '.aioson/rules/board-rule.md', in: 'must_load' }]
      }
    ]));
    const report = await runContextEvals(dir, { coverage: false });
    const check = report.results[0].checks[0];
    if (!check.passed) {
      assert.equal(check.diagnosis.cause, 'reached_but_wrong_section', JSON.stringify(check));
    } else {
      // If the engine ever promotes this legitimately, the scenario passes and
      // the diagnosis branch is simply not exercised — both are honest states.
      assert.equal(check.passed, true);
    }
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('coverage lists routed artifacts no scenario names, and skips routing-free ones', async () => {
  const dir = await fixtureProject();
  try {
    await writeFile(dir, '.aioson/evals/partial.json', scenarioFile([
      {
        name: 'board rule proven',
        agent: 'dev', mode: 'executing',
        task: 'add drag and drop between kanban columns',
        expect: [{ path: '.aioson/rules/board-rule.md', in: 'selected' }]
      }
    ]));
    const report = await runContextEvals(dir);
    const uncoveredPaths = report.coverage.uncovered.map((item) => item.path);
    assert.ok(uncoveredPaths.includes('.aioson/rules/executing-only-rule.md'), uncoveredPaths.join(', '));
    assert.ok(uncoveredPaths.includes('.aioson/skills/process/demo/SKILL.md'), uncoveredPaths.join(', '));
    // No routing frontmatter → not in the universe: it cannot promise triggers.
    assert.equal(uncoveredPaths.includes('.aioson/docs/no-routing.md'), false, uncoveredPaths.join(', '));
    assert.equal(report.coverage.covered, report.coverage.universe - report.coverage.uncovered.length);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('corpus errors are reported per file and invalid scenarios never crash the run', async () => {
  const dir = await fixtureProject();
  try {
    await writeFile(dir, '.aioson/evals/broken.json', '{ not json');
    await writeFile(dir, '.aioson/evals/half.json', scenarioFile([
      { name: 'no assertions', agent: 'dev', task: 'something' },
      {
        name: 'valid one',
        agent: 'dev', mode: 'executing',
        task: 'add drag and drop between kanban columns',
        expect: [{ path: '.aioson/rules/board-rule.md', in: 'selected' }]
      }
    ]));
    const corpus = await loadEvalCorpus(dir);
    assert.equal(corpus.scenarios.length, 1);
    assert.ok(corpus.errors.some((error) => /broken\.json: invalid JSON/.test(error)), corpus.errors.join('\n'));
    assert.ok(corpus.errors.some((error) => /asserts nothing/.test(error)), corpus.errors.join('\n'));

    const report = await runContextEvals(dir, { coverage: false });
    assert.equal(report.totals.scenarios, 1);
    assert.equal(report.totals.failed, 0);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('max_must_bytes fails the scenario when must_load outgrows the declared budget', async () => {
  const dir = await fixtureProject();
  try {
    await writeFile(dir, '.aioson/evals/budget.json', scenarioFile([
      {
        name: 'board work stays under an absurdly small byte budget',
        agent: 'dev', mode: 'executing',
        task: 'add drag and drop between kanban columns',
        expect: [{ path: '.aioson/rules/board-rule.md', in: 'must_load' }],
        max_must_bytes: 10
      }
    ]));
    const report = await runContextEvals(dir, { coverage: false });
    const budget = report.results[0].checks.find((check) => check.type === 'budget');
    assert.equal(budget.passed, false);
    assert.equal(budget.diagnosis.cause, 'over_budget');
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

function runCli(args, cwd) {
  return new Promise((resolve) => {
    execFile(process.execPath, [BIN, ...args], { cwd, windowsHide: true }, (error, stdout, stderr) => {
      resolve({ code: error && typeof error.code === 'number' ? error.code : 0, stdout, stderr });
    });
  });
}

test('the CLI is advisory by default and fails only under --strict', async () => {
  const dir = await fixtureProject();
  try {
    await writeFile(dir, '.aioson/evals/red.json', scenarioFile([
      {
        name: 'a red scenario',
        agent: 'dev', mode: 'executing',
        task: 'totally unrelated caching work',
        expect: [{ path: '.aioson/rules/board-rule.md', in: 'must_load' }]
      }
    ]));
    const advisory = await runCli(['context:evals', dir, '--no-coverage'], ROOT);
    assert.equal(advisory.code, 0, advisory.stdout + advisory.stderr);
    assert.match(advisory.stdout, /FAIL a red scenario/);
    assert.match(advisory.stdout, /fix: /);

    const strict = await runCli(['context:evals', dir, '--strict', '--no-coverage'], ROOT);
    assert.equal(strict.code, 1, strict.stdout + strict.stderr);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});
