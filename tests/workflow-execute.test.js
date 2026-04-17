'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const {
  runWorkflowExecute,
  EXECUTION_STATE_RELATIVE_PATH
} = require('../src/commands/workflow-execute');

async function makeTmpDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'aioson-workflow-exec-'));
}

async function writeFile(dir, relPath, content) {
  const full = path.join(dir, relPath);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, content, 'utf8');
}

function makeLogger() {
  const lines = [];
  const errors = [];
  return {
    log: (msg = '') => lines.push(String(msg)),
    error: (msg = '') => errors.push(String(msg)),
    lines,
    errors
  };
}

test('workflow:execute: requires --feature', async () => {
  const tmpDir = await makeTmpDir();
  const result = await runWorkflowExecute({
    args: [tmpDir],
    options: { json: true, 'dry-run': true },
    logger: makeLogger()
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'missing_feature');
});

test('workflow:execute: dry-run returns plan without executing', async () => {
  const tmpDir = await makeTmpDir();
  const result = await runWorkflowExecute({
    args: [tmpDir],
    options: { json: true, feature: 'checkout', 'dry-run': true, classification: 'SMALL' },
    logger: makeLogger()
  });
  assert.equal(result.ok, true);
  assert.equal(result.dry_run, true);
  assert.ok(Array.isArray(result.steps));
  assert.ok(result.steps.length > 0);
  assert.equal(result.feature, 'checkout');
  assert.equal(result.execution_state_path, EXECUTION_STATE_RELATIVE_PATH);
  assert.equal(typeof result.resume_command, 'string');
  assert.ok(result.status_snapshot);
  assert.ok(result.suggestion);
});

test('workflow:execute: dry-run SMALL has product, analyst, dev, qa steps', async () => {
  const tmpDir = await makeTmpDir();
  const result = await runWorkflowExecute({
    args: [tmpDir],
    options: { json: true, feature: 'checkout', 'dry-run': true, classification: 'SMALL' },
    logger: makeLogger()
  });
  const agents = result.steps.map((s) => s.agent);
  assert.ok(agents.includes('product'));
  assert.ok(agents.includes('analyst'));
  assert.ok(agents.includes('dev'));
  assert.ok(agents.includes('qa'));
});

test('workflow:execute: dry-run MICRO follows the official feature sequence', async () => {
  const tmpDir = await makeTmpDir();
  const result = await runWorkflowExecute({
    args: [tmpDir],
    options: { json: true, feature: 'small-fix', 'dry-run': true, classification: 'MICRO' },
    logger: makeLogger()
  });
  const agents = result.steps.map((s) => s.agent);
  assert.ok(agents.includes('product'));
  assert.ok(agents.includes('dev'));
  assert.ok(agents.includes('qa'));
});

test('workflow:execute: dry-run skips product when prd already exists', async () => {
  const tmpDir = await makeTmpDir();
  await writeFile(tmpDir, '.aioson/context/prd-checkout.md', '# PRD');
  const result = await runWorkflowExecute({
    args: [tmpDir],
    options: { json: true, feature: 'checkout', 'dry-run': true, classification: 'SMALL' },
    logger: makeLogger()
  });
  const productStep = result.steps.find((s) => s.agent === 'product');
  assert.ok(productStep);
  assert.equal(productStep.status, 'completed');
  assert.equal(productStep.skip, true);
});

test('workflow:execute: reads classification from project.context.md', async () => {
  const tmpDir = await makeTmpDir();
  await writeFile(tmpDir, '.aioson/context/project.context.md', '---\nclassification: MEDIUM\n---');
  const result = await runWorkflowExecute({
    args: [tmpDir],
    options: { json: true, feature: 'feat', 'dry-run': true },
    logger: makeLogger()
  });
  assert.equal(result.classification, 'MEDIUM');
});

test('workflow:execute: dry-run human output mentions plan', async () => {
  const tmpDir = await makeTmpDir();
  const logger = makeLogger();
  await runWorkflowExecute({
    args: [tmpDir],
    options: { feature: 'checkout', 'dry-run': true, classification: 'SMALL' },
    logger
  });
  assert.ok(logger.lines.some((l) => l.includes('Plan') || l.includes('Step') || l.includes('@')));
});

test('workflow:execute: start-from skips earlier steps', async () => {
  const tmpDir = await makeTmpDir();
  const result = await runWorkflowExecute({
    args: [tmpDir],
    options: {
      json: true, feature: 'checkout', 'dry-run': true,
      classification: 'SMALL', 'start-from': 'dev'
    },
    logger: makeLogger()
  });
  const agents = result.steps.map((s) => s.agent);
  assert.ok(!agents.includes('product'));
  assert.ok(!agents.includes('analyst'));
  assert.ok(agents.includes('dev'));
});

test('workflow:execute: blocks explicit headless mode when tool policy requires tty', async () => {
  const tmpDir = await makeTmpDir();
  const result = await runWorkflowExecute({
    args: [tmpDir],
    options: { json: true, feature: 'checkout', 'dry-run': true, classification: 'SMALL', tool: 'gemini', mode: 'headless' },
    logger: makeLogger()
  });

  assert.equal(result.ok, false);
  assert.equal(result.reason, 'headless_not_supported');
  assert.equal(result.tool, 'gemini');
});

test('workflow:execute: dry-run predicts blockers for an active stage with missing contract items', async () => {
  const tmpDir = await makeTmpDir();
  await writeFile(tmpDir, '.aioson/context/project.context.md', '---\nclassification: SMALL\n---');
  await writeFile(tmpDir, '.aioson/context/prd-checkout.md', '# PRD');
  await writeFile(tmpDir, '.aioson/context/requirements-checkout.md', '# Requirements');
  await writeFile(tmpDir, '.aioson/context/spec-checkout.md', '---\ngate_requirements: approved\ngate_plan: pending\n---\n# Spec');
  await writeFile(
    tmpDir,
    '.aioson/context/workflow.state.json',
    JSON.stringify({
      version: 1,
      mode: 'feature',
      classification: 'SMALL',
      sequence: ['product', 'analyst', 'dev', 'qa'],
      current: 'dev',
      next: 'qa',
      completed: ['product', 'analyst'],
      skipped: [],
      featureSlug: 'checkout',
      detour: null,
      updatedAt: new Date().toISOString()
    }, null, 2)
  );

  const result = await runWorkflowExecute({
    args: [tmpDir],
    options: { json: true, feature: 'checkout', 'dry-run': true, tool: 'codex' },
    logger: makeLogger()
  });

  const devStep = result.steps.find((step) => step.agent === 'dev');
  assert.equal(result.ok, true);
  assert.equal(result.resumed, true);
  assert.equal(devStep.status, 'active');
  assert.ok(devStep.predicted_blockers.some((item) => item.includes('gate C')));
});

test('workflow:execute: resumes an existing feature workflow and writes a checkpoint file', async () => {
  const tmpDir = await makeTmpDir();
  await writeFile(
    tmpDir,
    '.aioson/context/project.context.md',
    `---\nproject_name: "demo"\nproject_type: "api"\nprofile: "developer"\nframework: "Node.js"\nframework_installed: true\nclassification: "SMALL"\nconversation_language: "en"\naioson_version: "1.2.1"\n---\n`
  );
  await writeFile(tmpDir, '.aioson/context/prd-checkout.md', '# PRD');
  await writeFile(tmpDir, '.aioson/context/requirements-checkout.md', '# Requirements');
  await writeFile(tmpDir, '.aioson/context/spec-checkout.md', '---\ngate_requirements: approved\ngate_plan: approved\n---\n# Spec');
  await writeFile(tmpDir, '.aioson/context/project-pulse.md', '# Pulse');
  await writeFile(tmpDir, '.aioson/context/dev-state.md', '# Dev State');
  await writeFile(
    tmpDir,
    '.aioson/config/autonomy-protocol.json',
    JSON.stringify({
      version: '1.0',
      global_mode: 'guarded',
      tools: {
        codex: {
          mode: 'trusted',
          requires_tty: false
        }
      },
      agents: {
        dev: {
          max_mode: 'trusted'
        }
      }
    }, null, 2)
  );
  await writeFile(
    tmpDir,
    '.aioson/context/workflow.state.json',
    JSON.stringify({
      version: 1,
      mode: 'feature',
      classification: 'SMALL',
      sequence: ['product', 'analyst', 'dev', 'qa'],
      current: 'dev',
      next: 'qa',
      completed: ['product', 'analyst'],
      skipped: [],
      featureSlug: 'checkout',
      detour: null,
      updatedAt: new Date().toISOString()
    }, null, 2)
  );

  const result = await runWorkflowExecute({
    args: [tmpDir],
    options: { json: true, feature: 'checkout', tool: 'codex' },
    logger: makeLogger()
  });

  assert.equal(result.ok, true);
  assert.equal(result.resumed, true);
  assert.equal(result.active_stage, 'qa');
  assert.equal(result.checkpoint.active_stage, 'qa');
  assert.equal(result.checkpoint.effective_mode, 'guarded');
  assert.ok(result.status_snapshot);
  assert.ok(result.suggestion);
  assert.equal(typeof result.resume_command, 'string');

  const executionState = JSON.parse(
    await fs.readFile(path.join(tmpDir, EXECUTION_STATE_RELATIVE_PATH), 'utf8')
  );
  assert.equal(executionState.feature, 'checkout');
  assert.equal(executionState.status, 'active');
  assert.equal(executionState.checkpoint.active_stage, 'qa');
  assert.ok(Array.isArray(executionState.history));
  assert.equal(executionState.history.length, 1);
  assert.ok(executionState.status_snapshot);
  assert.ok(executionState.suggestion);
  assert.equal(typeof executionState.resume_command, 'string');
});

test('workflow:execute: advances multiple checkpoints when --max-checkpoints is provided', async () => {
  const tmpDir = await makeTmpDir();
  await writeFile(
    tmpDir,
    '.aioson/context/project.context.md',
    `---\nproject_name: "demo"\nproject_type: "api"\nprofile: "developer"\nframework: "Node.js"\nframework_installed: true\nclassification: "SMALL"\nconversation_language: "en"\naioson_version: "1.2.1"\n---\n`
  );
  await writeFile(tmpDir, '.aioson/context/prd-checkout.md', '# PRD');
  await writeFile(tmpDir, '.aioson/context/requirements-checkout.md', '# Requirements');
  await writeFile(
    tmpDir,
    '.aioson/context/spec-checkout.md',
    '---\ngate_requirements: approved\ngate_plan: approved\n---\n# Spec'
  );
  await writeFile(tmpDir, '.aioson/context/project-pulse.md', '# Pulse');
  await writeFile(
    tmpDir,
    '.aioson/context/workflow.state.json',
    JSON.stringify({
      version: 1,
      mode: 'feature',
      classification: 'SMALL',
      sequence: ['product', 'analyst', 'dev', 'qa'],
      current: 'product',
      next: 'analyst',
      completed: [],
      skipped: [],
      featureSlug: 'checkout',
      detour: null,
      updatedAt: new Date().toISOString()
    }, null, 2)
  );

  const result = await runWorkflowExecute({
    args: [tmpDir],
    options: { json: true, feature: 'checkout', tool: 'codex', 'max-checkpoints': 2 },
    logger: makeLogger()
  });

  assert.equal(result.ok, true);
  assert.equal(result.max_checkpoints, 2);
  assert.equal(result.active_stage, 'dev');
  assert.ok(Array.isArray(result.transitions));
  assert.equal(result.transitions.length, 2);
  assert.deepEqual(
    result.transitions.map((transition) => transition.transition),
    ['complete', 'complete']
  );
  assert.deepEqual(
    result.transitions.map((transition) => transition.agent),
    ['product', 'analyst']
  );
  assert.equal(result.execution_state.checkpoint.active_stage, 'dev');
  assert.equal(result.execution_state.status_snapshot.activeStage, 'dev');
  assert.equal(result.execution_state.suggestion.action, 'complete_stage');
  assert.ok(result.resume_command.includes('--max-checkpoints=2'));

  const executionState = JSON.parse(
    await fs.readFile(path.join(tmpDir, EXECUTION_STATE_RELATIVE_PATH), 'utf8')
  );
  assert.equal(executionState.status, 'active');
  assert.equal(executionState.checkpoint.active_stage, 'dev');
  assert.ok(Array.isArray(executionState.history));
  assert.equal(executionState.history.length, 1);
});

test('workflow:execute: completes cleanly when the workflow has no pending stage', async () => {
  const tmpDir = await makeTmpDir();
  await writeFile(
    tmpDir,
    '.aioson/context/project.context.md',
    `---\nproject_name: "demo"\nproject_type: "api"\nprofile: "developer"\nframework: "Node.js"\nframework_installed: true\nclassification: "SMALL"\nconversation_language: "en"\naioson_version: "1.2.1"\n---\n`
  );
  await writeFile(
    tmpDir,
    '.aioson/context/workflow.state.json',
    JSON.stringify({
      version: 1,
      mode: 'feature',
      classification: 'SMALL',
      sequence: ['product', 'analyst', 'dev', 'qa'],
      current: null,
      next: null,
      completed: ['product', 'analyst', 'dev', 'qa'],
      skipped: [],
      featureSlug: 'checkout',
      detour: null,
      updatedAt: new Date().toISOString()
    }, null, 2)
  );

  const result = await runWorkflowExecute({
    args: [tmpDir],
    options: { json: true, feature: 'checkout', tool: 'codex' },
    logger: makeLogger()
  });

  assert.equal(result.ok, true);
  assert.equal(result.active_stage, null);
  assert.equal(result.checkpoint.active_stage, null);
  assert.equal(result.execution_state.status, 'completed');
  assert.equal(result.suggestion.action, 'workflow_complete');
  assert.deepEqual(result.transitions, []);
});

test('workflow:execute: refuses to override a different active feature workflow', async () => {
  const tmpDir = await makeTmpDir();
  await writeFile(tmpDir, '.aioson/context/project.context.md', '---\nclassification: SMALL\n---');
  await writeFile(
    tmpDir,
    '.aioson/context/workflow.state.json',
    JSON.stringify({
      version: 1,
      mode: 'feature',
      classification: 'SMALL',
      sequence: ['product', 'analyst', 'dev', 'qa'],
      current: 'dev',
      next: 'qa',
      completed: ['product', 'analyst'],
      skipped: [],
      featureSlug: 'billing',
      detour: null,
      updatedAt: new Date().toISOString()
    }, null, 2)
  );

  const result = await runWorkflowExecute({
    args: [tmpDir],
    options: { json: true, feature: 'checkout', tool: 'codex' },
    logger: makeLogger()
  });

  assert.equal(result.ok, false);
  assert.equal(result.reason, 'different_active_feature');
  assert.equal(result.active_feature, 'billing');
});

test('workflow:execute: --lane skips guard when no parallel workspace exists', async () => {
  const tmpDir = await makeTmpDir();
  await writeFile(
    tmpDir,
    '.aioson/context/project.context.md',
    '---\nclassification: SMALL\n---'
  );

  const result = await runWorkflowExecute({
    args: [tmpDir],
    options: { json: true, feature: 'checkout', 'dry-run': true, lane: 1 },
    logger: makeLogger()
  });

  assert.equal(result.ok, true);
  assert.ok(result.parallel_guard);
  assert.equal(result.parallel_guard.skipped, true);
  assert.equal(result.parallel_guard.reason, 'no_parallel_workspace');
});

test('workflow:execute: --lane returns ok=false when lane not found in parallel workspace', async () => {
  const tmpDir = await makeTmpDir();
  await writeFile(
    tmpDir,
    '.aioson/context/project.context.md',
    '---\nclassification: MEDIUM\n---'
  );
  await writeFile(
    tmpDir,
    '.aioson/context/parallel/agent-1.status.md',
    '# Lane 1\n- owner: dev\n- status: pending\n\n## Ownership\n- write_paths: src/api/**\n'
  );

  const result = await runWorkflowExecute({
    args: [tmpDir],
    options: { json: true, feature: 'checkout', 'dry-run': true, lane: 9 },
    logger: makeLogger()
  });

  assert.equal(result.ok, false);
  assert.equal(result.reason, 'parallel_lane_not_found');
  assert.equal(result.lane, 9);
});

test('workflow:execute: --lane reports ok=true when lane has write paths with no conflicts', async () => {
  const tmpDir = await makeTmpDir();
  await writeFile(
    tmpDir,
    '.aioson/context/project.context.md',
    '---\nclassification: MEDIUM\n---'
  );
  await writeFile(
    tmpDir,
    '.aioson/context/parallel/agent-1.status.md',
    '# Lane 1\n- owner: backend\n- status: pending\n\n## Ownership\n- write_paths: src/api/**\n'
  );
  await writeFile(
    tmpDir,
    '.aioson/context/parallel/agent-2.status.md',
    '# Lane 2\n- owner: frontend\n- status: pending\n\n## Ownership\n- write_paths: src/ui/**\n'
  );

  const result = await runWorkflowExecute({
    args: [tmpDir],
    options: { json: true, feature: 'checkout', 'dry-run': true, lane: 1 },
    logger: makeLogger()
  });

  assert.equal(result.ok, true);
  assert.ok(result.parallel_guard);
  assert.equal(result.parallel_guard.skipped, false);
  assert.equal(result.parallel_guard.ok, true);
  assert.equal(result.parallel_guard.lane, 1);
  assert.equal(result.parallel_guard.conflictCount, 0);
});

test('workflow:execute: --lane warns when lane write paths conflict with another lane', async () => {
  const tmpDir = await makeTmpDir();
  const logger = makeLogger();
  await writeFile(
    tmpDir,
    '.aioson/context/project.context.md',
    '---\nclassification: MEDIUM\n---'
  );
  await writeFile(
    tmpDir,
    '.aioson/context/parallel/agent-1.status.md',
    '# Lane 1\n- owner: dev1\n- status: pending\n\n## Ownership\n- write_paths: src/shared/**\n'
  );
  await writeFile(
    tmpDir,
    '.aioson/context/parallel/agent-2.status.md',
    '# Lane 2\n- owner: dev2\n- status: pending\n\n## Ownership\n- write_paths: src/shared/**\n'
  );

  const result = await runWorkflowExecute({
    args: [tmpDir],
    options: { json: true, feature: 'checkout', 'dry-run': true, lane: 1 },
    logger
  });

  assert.equal(result.ok, true);
  assert.ok(result.parallel_guard);
  assert.equal(result.parallel_guard.ok, false);
  assert.equal(result.parallel_guard.conflictCount, 1);
  assert.ok(logger.errors.some((line) => line.includes('[parallel:guard]')));
});

test('workflow:execute: parallel_guard is null when no --lane is provided', async () => {
  const tmpDir = await makeTmpDir();
  await writeFile(
    tmpDir,
    '.aioson/context/project.context.md',
    '---\nclassification: SMALL\n---'
  );

  const result = await runWorkflowExecute({
    args: [tmpDir],
    options: { json: true, feature: 'checkout', 'dry-run': true },
    logger: makeLogger()
  });

  assert.equal(result.ok, true);
  assert.equal(result.parallel_guard, null);
});
