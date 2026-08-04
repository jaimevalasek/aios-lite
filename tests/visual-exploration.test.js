'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { writeComparisonReview } = require('../src/visual-exploration/review-html');
const { runExplorationSelect } = require('../src/commands/exploration');
const { parseModelMatrix, runModelArena } = require('../src/visual-exploration/runner');
const {
  RUN_REPORT_MARKER,
  addReferences,
  addRun,
  atomicWrite,
  configureExploration,
  createExploration,
  promoteExploration,
  readManifest,
  recordRun,
  scanExploration,
  selectRun,
  updateIntake,
  validateRunArtifacts
} = require('../src/visual-exploration/store');

async function tempProject(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'aioson-visual-exploration-'));
  t.after(() => fs.rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 }));
  return root;
}

function confirmedIntake(slug) {
  return {
    version: 1,
    exploration: slug,
    understanding: {
      goal: ['Modernize the current project surface.'],
      preserve: ['Existing navigation and primary task.'],
      change: ['Visual hierarchy and responsive composition.']
    },
    coverage: {
      shell: 'covered',
      primary_surface: 'covered',
      critical_detail: 'unknown',
      important_states: 'missing',
      responsive: 'not-requested'
    },
    unknowns: ['Permission state is not visible in the supplied screenshot.'],
    assumptions: ['Keep current information architecture.'],
    references: [],
    target_kind: 'current-system-redesign',
    scan_scope: 'targeted',
    decision: 'proceed-with-assumptions'
  };
}

const VALID_HTML = '<!doctype html><html><body><main data-aioson-id="primary">Prototype</main><script>document.body.dataset.ready = "yes";</script></body></html>';
const VALID_REPORT = `# Exploration run report\n\n<!-- aioson:visual-exploration-report -->\n\n### User prompts received\n\n<!-- aioson:user-prompts -->\n\n1. Preserve navigation and improve hierarchy.\n\n## Reusable prompts\n\n${RUN_REPORT_MARKER}\n\n### Exact generation prompt\n\n<!-- aioson:exact-generation-prompt -->\n\nRecreate the surface.\n\n### One-shot prompt\n\n<!-- aioson:one-shot-prompt -->\n\nKeep the useful direction.\n\n### Incremental prompt sequence\n\n<!-- aioson:incremental-prompt-sequence -->\n\n1. Build.\n2. Inspect.\n3. Repair.\n`;

test('atomic writes retry transient Windows rename contention', async (t) => {
  const project = await tempProject(t);
  const target = path.join(project, 'manifest.json');
  let attempts = 0;
  await atomicWrite(target, '{"ok":true}\n', {
    maxRenameAttempts: 4,
    retryBaseMs: 0,
    sleep: async () => {},
    rename: async (source, destination) => {
      attempts += 1;
      if (attempts < 3) {
        const error = new Error('simulated Windows file contention');
        error.code = 'EPERM';
        throw error;
      }
      await fs.rename(source, destination);
    }
  });
  assert.equal(attempts, 3);
  assert.equal(await fs.readFile(target, 'utf8'), '{"ok":true}\n');
});

test('CLI exposes exploration initialization and structured status', async (t) => {
  const project = await tempProject(t);
  const cli = path.resolve(__dirname, '..', 'bin', 'aioson.js');
  await fs.mkdir(path.join(project, '.aioson', 'context'), { recursive: true });
  await fs.writeFile(path.join(project, '.aioson', 'context', 'project.context.md'), '---\ninteraction_language: "pt-BR"\nconversation_language: "pt-BR"\n---\n# Context\n');
  const init = spawnSync(process.execPath, [cli, 'exploration:init', project, '--slug=cli-arena', '--title=CLI arena', '--goal=Compare shells', '--strategy=arena', '--context-policy=isolated', '--display-mode=blind', '--target=current-system-redesign', '--scan=targeted', '--json'], { encoding: 'utf8' });
  assert.equal(init.status, 0, init.stderr || init.stdout);
  assert.equal(JSON.parse(init.stdout).manifest.strategy, 'arena');
  assert.equal(JSON.parse(init.stdout).manifest.language, 'pt-BR');

  const configured = spawnSync(process.execPath, [cli, 'exploration:configure', project, '--slug=cli-arena', '--strategy=sequential', '--display-mode=labeled', '--json'], { encoding: 'utf8' });
  assert.equal(configured.status, 0, configured.stderr || configured.stdout);
  assert.equal(JSON.parse(configured.stdout).manifest.strategy, 'sequential');
  await fs.rm(path.join(project, '.aioson', 'explorations', 'cli-arena', 'RELATORIO.md'));

  const status = spawnSync(process.execPath, [cli, 'exploration:status', project, '--slug=cli-arena', '--json'], { encoding: 'utf8' });
  assert.equal(status.status, 0, status.stderr || status.stdout);
  const payload = JSON.parse(status.stdout);
  assert.equal(payload.ok, true);
  assert.equal(payload.manifest.display_mode, 'labeled');
  assert.match(payload.report_path, /RELATORIO\.md$/);
  assert.equal(payload.report_available, true);
  const reportIndex = await fs.readFile(payload.report_path, 'utf8');
  assert.match(reportIndex, /aioson:visual-exploration-summary/);
  assert.match(reportIndex, /^# Relatório da exploração visual/m);
});

test('project language localizes run reports and user prompts are automatic', async (t) => {
  const project = await tempProject(t);
  const created = await createExploration(project, {
    slug: 'relatorio-localizado',
    title: 'Relatório localizado',
    goal: 'Crie uma direção dark e preserve a navegação.',
    language: 'pt-BR'
  });
  const run = await addRun(project, 'relatorio-localizado', { host: 'codex', model: 'gpt-5.6' });
  const detailed = await fs.readFile(run.report_path, 'utf8');
  assert.match(detailed, /^# Relatório da variante de exploração/m);
  assert.match(detailed, /### Prompts do usuário recebidos/);
  assert.match(detailed, /Crie uma direção dark e preserve a navegação/);
  assert.match(detailed, /aioson:exact-generation-prompt/);
  const summary = await fs.readFile(created.report_path, 'utf8');
  assert.match(summary, /## Prompts do usuário por variante/);
  assert.match(summary, /Crie uma direção dark e preserve a navegação/);
});

test('visual exploration lifecycle preserves immutable variants, review, selection, and promotion', async (t) => {
  const project = await tempProject(t);
  const created = await createExploration(project, {
    slug: 'modern-shell',
    title: 'Modern shell',
    goal: 'Explore a more modern shell.',
    strategy: 'arena',
    contextPolicy: 'isolated',
    displayMode: 'blind',
    targetKind: 'current-system-redesign',
    scanScope: 'targeted'
  });
  assert.equal(created.ok, true);
  assert.equal(created.intake.decision, 'pending');
  assert.equal(await fs.readFile(created.report_path, 'utf8').then(text => text.includes('aioson:visual-exploration-summary')), true);

  await fs.mkdir(path.join(project, 'src', 'components'), { recursive: true });
  await fs.writeFile(path.join(project, 'src', 'components', 'Shell.js'), 'export const Shell = () => null;\n');
  const scan = await scanExploration(project, 'modern-shell', { scope: 'targeted', paths: ['src'] });
  assert.equal(scan.ok, true);
  assert.equal(scan.files.some(file => file.path === 'src/components/Shell.js'), true);

  const reference = path.join(project, 'screen.png');
  await fs.writeFile(reference, Buffer.from('not-a-real-png-but-durable-test-evidence'));
  const imported = await addReferences(project, 'modern-shell', ['screen.png']);
  assert.equal(imported.ok, true);
  assert.match(imported.added[0].sha256, /^[a-f0-9]{64}$/);
  const importedAgain = await addReferences(project, 'modern-shell', ['screen.png']);
  assert.equal(importedAgain.ok, true);
  assert.match(importedAgain.added[0].copied_path, /02-screen\.png$/);

  const intake = confirmedIntake('modern-shell');
  intake.references = [...imported.added, ...importedAgain.added];
  assert.equal((await updateIntake(project, 'modern-shell', intake)).ok, true);

  const first = await addRun(project, 'modern-shell', { host: 'codex', model: 'gpt-5.6' });
  const second = await addRun(project, 'modern-shell', { host: 'claude', model: 'opus-5' });
  assert.equal(first.run.id, 'variant-a');
  assert.equal(second.run.id, 'variant-b');
  assert.notEqual(first.run.input_hash, null);
  assert.match(await fs.readFile(path.join(first.run_root, 'user-prompts.md'), 'utf8'), /Explore a more modern shell/);

  for (const run of [first, second]) {
    await fs.writeFile(path.join(run.run_root, 'prototype.html'), VALID_HTML);
    await fs.writeFile(path.join(run.run_root, 'report.md'), VALID_REPORT);
    const recorded = await recordRun(project, 'modern-shell', run.run.id, {
      modelResolved: run.run.model_requested,
      resolutionStrategy: 'exact'
    });
    assert.equal(recorded.ok, true);
  }

  const reportIndex = await fs.readFile(path.join(created.root, 'RELATORIO.md'), 'utf8');
  assert.match(reportIndex, /runs\/variant-a\/prototype\.html/);
  assert.match(reportIndex, /runs\/variant-a\/report\.md/);
  assert.match(reportIndex, /runs\/variant-b\/prototype\.html/);
  assert.match(reportIndex, /runs\/variant-b\/report\.md/);
  assert.match(reportIndex, /reusable one-shot prompt/i);
  assert.match(reportIndex, /User prompts by variant/);
  assert.match(reportIndex, /Preserve navigation and improve hierarchy/);
  const manifestView = await fs.readFile(path.join(created.root, 'exploration-manifest.md'), 'utf8');
  assert.match(manifestView, /\[report\]\(runs\/variant-a\/report\.md\)/);
  assert.match(manifestView, /\[`RELATORIO\.md`\]\(RELATORIO\.md\)/);

  const review = await writeComparisonReview(project, 'modern-shell');
  assert.equal(review.ok, true);
  assert.equal(review.variants, 2);
  const comparison = await fs.readFile(review.review_path, 'utf8');
  assert.match(comparison, /Comment mode/);
  assert.doesNotMatch(comparison, /gpt-5\.6|opus-5/); // blind comparison

  assert.equal((await selectRun(project, 'modern-shell', 'variant-b')).ok, true);
  const promoted = await promoteExploration(project, 'modern-shell', 'modern-shell-refresh');
  assert.equal(promoted.ok, true);
  const sourcePack = await fs.readFile(path.join(project, promoted.source_pack), 'utf8');
  assert.match(sourcePack, /non-canonical/i);
  assert.match(sourcePack, /Prototype SHA-256/);
  assert.match(sourcePack, /reusable prompt/i);

  const manifest = await readManifest(project, 'modern-shell');
  assert.equal(manifest.manifest.status, 'promotion-prepared');
  assert.equal(manifest.manifest.selected_run, 'variant-b');
});

test('single strategy refuses replacement and artifact validation fails closed', async (t) => {
  const project = await tempProject(t);
  await createExploration(project, { slug: 'one-look', title: 'One look', strategy: 'single' });
  const first = await addRun(project, 'one-look', { host: 'qwen', model: 'qwen3-coder' });
  assert.equal(first.ok, true);
  assert.equal((await addRun(project, 'one-look', { host: 'kimi', model: 'kimi-k3' })).reason, 'single_run_limit');
  const converted = await configureExploration(project, 'one-look', { strategy: 'sequential' });
  assert.equal(converted.ok, true);
  const second = await addRun(project, 'one-look', { host: 'kimi', model: 'kimi-k3' });
  assert.equal(second.run.id, 'variant-b');

  await fs.writeFile(path.join(first.run_root, 'prototype.html'), '<html><script src="https://bad.example/app.js"></script></html>');
  const invalid = await validateRunArtifacts(project, 'one-look', 'variant-a');
  assert.equal(invalid.ok, false);
  assert.equal(invalid.issues.some(issue => /external resources/.test(issue)), true);
  assert.equal((await recordRun(project, 'one-look', 'variant-a')).reason, 'run_artifacts_invalid');
});

test('model matrix validates explicit host bindings', () => {
  assert.deepEqual(parseModelMatrix('codex:gpt-5.6,claude:opus-5,qwen:qwen3-coder,kimi:kimi-k3').models, [
    { host: 'codex', model: 'gpt-5.6' },
    { host: 'claude', model: 'opus-5' },
    { host: 'qwen', model: 'qwen3-coder' },
    { host: 'kimi', model: 'kimi-k3' }
  ]);
  assert.equal(parseModelMatrix('unknown:model').reason, 'invalid_host');
  assert.equal(parseModelMatrix('missing-separator').reason, 'invalid_model_entry');
});

test('feedback selection rejects stale comparison hashes before changing state', async (t) => {
  const project = await tempProject(t);
  await createExploration(project, { slug: 'stale-review', title: 'Stale review', strategy: 'sequential' });
  await updateIntake(project, 'stale-review', confirmedIntake('stale-review'));
  const run = await addRun(project, 'stale-review', { host: 'codex', model: 'gpt-5.6' });
  await fs.writeFile(path.join(run.run_root, 'prototype.html'), VALID_HTML);
  await fs.writeFile(path.join(run.run_root, 'report.md'), VALID_REPORT);
  await recordRun(project, 'stale-review', run.run.id, { modelResolved: 'gpt-5.6' });
  const review = await writeComparisonReview(project, 'stale-review');
  const feedback = JSON.parse(await fs.readFile(review.feedback_path, 'utf8'));
  feedback.selected_run = 'variant-a';
  feedback.source_hash = '0'.repeat(64);
  const stalePath = path.join(project, 'stale-feedback.json');
  await fs.writeFile(stalePath, `${JSON.stringify(feedback, null, 2)}\n`);

  const selected = await runExplorationSelect({
    args: [project],
    options: { slug: 'stale-review', feedback: 'stale-feedback.json', json: true },
    logger: { log() {}, error() {} }
  });
  assert.equal(selected.ok, false);
  assert.equal(selected.reason, 'feedback_invalid_or_stale');
  assert.equal((await readManifest(project, 'stale-review')).manifest.selected_run, null);
});

test('arena allocates variants before parallel workers and parent persists their envelopes', async (t) => {
  const project = await tempProject(t);
  await createExploration(project, {
    slug: 'model-arena',
    title: 'Model arena',
    strategy: 'arena',
    contextPolicy: 'isolated',
    displayMode: 'labeled'
  });
  await updateIntake(project, 'model-arena', confirmedIntake('model-arena'));

  const execute = async (options) => {
    const boundary = options.prompt_text.match(/AIOSON_PROTOTYPE_BEGIN_([a-f0-9]+)/)?.[1];
    assert.ok(boundary, 'worker prompt must contain an unpredictable artifact boundary');
    options.onStdout(`AIOSON_PROTOTYPE_BEGIN_${boundary}\n${VALID_HTML}\nAIOSON_PROTOTYPE_END_${boundary}\nAIOSON_REPORT_BEGIN_${boundary}\n${VALID_REPORT}\nAIOSON_REPORT_END_${boundary}`);
    return { ok: true };
  };
  const result = await runModelArena({
    projectDir: project,
    slug: 'model-arena',
    models: 'codex:gpt-5.6,claude:opus-5',
    currentHost: 'codex',
    parallel: 2,
    explicitModelRequest: true,
    catalogLoader: async () => ({ available: false, reason: 'fixture', models: [] }),
    adapterRegistry: { codex: { execute }, claude: { execute } }
  });

  assert.equal(result.ok, true, JSON.stringify(result, null, 2));
  assert.equal(result.complete, true, JSON.stringify(result, null, 2));
  assert.match(result.summary_report_path, /RELATORIO\.md$/);
  assert.deepEqual(result.results.map(item => item.run), ['variant-a', 'variant-b']);
  assert.equal(result.results.every(item => /report\.md$/.test(item.report_path)), true);
  const manifest = await readManifest(project, 'model-arena');
  assert.deepEqual(manifest.manifest.runs.map(run => run.id), ['variant-a', 'variant-b']);
  assert.equal(manifest.manifest.runs.every(run => run.status === 'completed'), true);
  for (const run of manifest.manifest.runs) {
    const report = await fs.readFile(path.join(manifest.root, 'runs', run.id, 'report.md'), 'utf8');
    assert.match(report, /Execution provenance/);
    assert.match(report, /aioson:reusable-prompts/);
  }
});
