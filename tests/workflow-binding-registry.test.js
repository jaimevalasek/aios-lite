'use strict';

// Two registries, one lie: `feature:current` answered the feature the pulse
// named while the workflow stayed bound to the previous one, and a whole
// feature ran outside the kernel — `workflow:next --complete=dev` without
// `--expect-feature` answered "@dev is already completed" for the wrong
// feature. The binding now follows the registry, the previous feature's
// progress is archived and restored instead of erased, the mismatch names
// the registry, and the QA→Dev cycle budget is read per feature.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const {
  loadOrCreateState,
  detectWorkflowMode,
  assertExpectedFeature,
  describeBinding,
  featureStateArchivePath,
  STATE_RELATIVE_PATH,
  EVENTS_RELATIVE_PATH
} = require('../src/commands/workflow-next');
const { runWorkflowStatus } = require('../src/commands/workflow-status');
const { runReviewCycle } = require('../src/commands/review-cycle');
const { resolveActiveFeature } = require('../src/commands/feature-current');

const OLD = 'play-refoundation';
const NEW = 'deploy-channel';

async function project(t, { pulse = NEW, handoff = null } = {}) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'aioson-binding-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }));
  await fs.mkdir(path.join(dir, '.aioson', 'context'), { recursive: true });
  await fs.writeFile(path.join(dir, '.aioson', 'context', 'project.context.md'), '---\nproject_name: "binding"\nproject_type: "web_app"\nclassification: "MEDIUM"\ninteraction_language: "en"\n---\n# Project Context\n', 'utf8');
  await fs.writeFile(path.join(dir, '.aioson', 'context', 'features.md'), [
    '# Features', '',
    '| slug | status | started | completed |', '|---|---|---|---|',
    '| archived-one | paused | 2026-05-21 | — |',
    `| ${OLD} | in_progress | 2026-09-01 | — |`,
    `| ${NEW} | in_progress | 2026-09-02 | — |`, ''
  ].join('\n'), 'utf8');
  await setPulse(dir, pulse);
  if (handoff) await fs.writeFile(path.join(dir, '.aioson', 'context', 'last-handoff.json'), JSON.stringify({ feature_slug: handoff, workflow_mode: 'feature' }), 'utf8');
  return dir;
}

async function setPulse(dir, slug) {
  const file = path.join(dir, '.aioson', 'context', 'project-pulse.md');
  if (slug === null) {
    await fs.rm(file, { force: true });
    return;
  }
  await fs.writeFile(file, `---\nactive_feature: ${slug}\nupdated_at: 2026-09-03\n---\n# Project Pulse\n`, 'utf8');
}

const PROGRESS = {
  version: 1,
  mode: 'feature',
  classification: 'MEDIUM',
  sequence: ['product', 'sheldon', 'planner', 'dev', 'qa'],
  current: 'qa',
  next: 'qa',
  completed: ['product', 'sheldon', 'dev'],
  skipped: ['planner'],
  featureSlug: OLD,
  detour: null,
  updatedAt: '2026-09-02T02:07:41.416Z'
};

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

test('the workflow binds to the feature the registry names: the pulse wins over the last handoff and the last feature in progress; without a pulse the old fallbacks hold; a pulse naming a paused feature is ignored', async (t) => {
  const dir = await project(t, { pulse: NEW, handoff: OLD });
  let mode = await detectWorkflowMode(dir);
  assert.equal(mode.featureSlug, NEW);
  assert.equal(mode.binding_source, 'pulse');
  assert.equal((await resolveActiveFeature(dir)).slug, NEW, 'the same feature feature:current answers');

  await setPulse(dir, null);
  mode = await detectWorkflowMode(dir);
  assert.equal(mode.featureSlug, OLD, 'the last handoff still wins when the pulse names nothing');
  assert.equal(mode.binding_source, 'last-handoff');

  await fs.rm(path.join(dir, '.aioson', 'context', 'last-handoff.json'));
  mode = await detectWorkflowMode(dir);
  assert.equal(mode.featureSlug, NEW, 'then the last feature in progress');
  assert.equal(mode.binding_source, 'features.md');

  await setPulse(dir, 'archived-one');
  mode = await detectWorkflowMode(dir);
  assert.equal(mode.featureSlug, NEW, 'a pulse naming a paused feature does not bind the workflow to it');
  assert.equal(mode.registry, 'archived-one');
  assert.equal(mode.binding_source, 'features.md');
});

test('when the registry moves, the binding moves with it: the previous feature\'s progress is archived (never erased), the new feature starts from its own artifacts, a binding_moved event is appended — and the progress comes back when the registry returns', async (t) => {
  const dir = await project(t, { pulse: OLD, handoff: OLD });
  const stateFile = path.join(dir, STATE_RELATIVE_PATH);
  await fs.writeFile(stateFile, `${JSON.stringify(PROGRESS, null, 2)}\n`, 'utf8');
  // What the engine makes of this progress when nothing moves — the same
  // reconciliation (a current Sheldon review, inferred artifacts) every
  // persisted state gets; a restore must land exactly here.
  const reference = await loadOrCreateState(dir, { persist: false });
  assert.equal(reference.state.featureSlug, OLD);
  assert.equal(reference.binding.moved, null);
  await setPulse(dir, NEW);

  // Preview (workflow:status): the move is computed, nothing is written.
  const preview = await loadOrCreateState(dir, { persist: false });
  assert.equal(preview.state.featureSlug, NEW);
  assert.deepEqual(preview.binding.moved, { from: OLD, to: NEW, mode: 'feature', archived: `.aioson/context/features/${OLD}/workflow.state.json`, persisted: false });
  assert.equal((await readJson(stateFile)).featureSlug, OLD, 'a preview leaves the state file alone');
  assert.equal(await fs.access(featureStateArchivePath(dir, OLD)).then(() => true).catch(() => false), false);
  assert.match(describeBinding(preview.binding)[0], /workflow binding moved: play-refoundation → deploy-channel \(feature registry: project-pulse\.md active_feature\); previous progress would be archived at/);

  // The real move.
  const moved = await loadOrCreateState(dir, { persist: true });
  assert.equal(moved.state.featureSlug, NEW);
  assert.deepEqual(moved.state.completed, [], 'the new feature is not "already completed" — it starts from its own artifacts');
  assert.equal(moved.binding.moved.persisted, true);
  const archived = await readJson(featureStateArchivePath(dir, OLD));
  assert.deepEqual(archived.completed, ['product', 'sheldon', 'dev']);
  assert.equal(archived.current, 'qa');
  assert.ok(archived.archived_at);
  assert.equal((await readJson(stateFile)).featureSlug, NEW);
  const events = (await fs.readFile(path.join(dir, EVENTS_RELATIVE_PATH), 'utf8')).trim().split('\n').map((line) => JSON.parse(line));
  const event = events.find((e) => e.event === 'binding_moved');
  assert.equal(event.from, OLD);
  assert.equal(event.to, NEW);
  assert.equal(event.source, 'pulse');
  assert.match(event.archived, /features\/play-refoundation\/workflow\.state\.json$/);

  // A second load stands still: nothing moves, nothing is archived twice.
  const still = await loadOrCreateState(dir, { persist: true });
  assert.equal(still.binding.moved, null);
  assert.equal(still.binding.restored, null);

  // The registry returns to the previous feature: its progress is restored and the archive consumed.
  await setPulse(dir, OLD);
  const back = await loadOrCreateState(dir, { persist: true });
  assert.equal(back.state.featureSlug, OLD);
  assert.deepEqual(back.state.completed, reference.state.completed, 'restored = as if it had never left (the archive is raw; the engine reconciles it like any persisted state)');
  assert.equal(back.state.next, reference.state.next);
  assert.deepEqual(back.binding.restored, { feature: OLD, from: `.aioson/context/features/${OLD}/workflow.state.json` });
  assert.equal(back.binding.moved.archived, null, 'the new feature had no progress: nothing to archive');
  assert.equal(await fs.access(featureStateArchivePath(dir, OLD)).then(() => true).catch(() => false), false, 'the archive is consumed on restore');
  assert.deepEqual((await readJson(stateFile)).completed, reference.state.completed);
  assert.match(describeBinding(back.binding)[1], /workflow progress restored for play-refoundation from/);
});

test('--expect-feature keeps guarding explicit continuation, and the mismatch names the registry and the command that moves it', async (t) => {
  const dir = await project(t, { pulse: NEW, handoff: OLD });
  const loaded = await loadOrCreateState(dir, { persist: false });
  assert.doesNotThrow(() => assertExpectedFeature(loaded.state, { 'expect-feature': NEW }, loaded.binding));
  assert.throws(() => assertExpectedFeature(loaded.state, { 'expect-feature': OLD }, loaded.binding), (error) => {
    assert.equal(error.code, 'WORKFLOW_FEATURE_MISMATCH');
    assert.match(error.message, /Expected feature: play-refoundation/);
    assert.match(error.message, /Active workflow: deploy-channel/);
    assert.match(error.message, /Feature registry: deploy-channel \(project-pulse\.md active_feature\)/);
    assert.match(error.message, /aioson pulse:update \. --feature=<slug>/);
    assert.match(error.message, /archived under \.aioson\/context\/features\/<slug>\/workflow\.state\.json and restored on return/);
    return true;
  });
});

test('workflow:status answers for the feature the registry names and says what moved; --json carries the binding', async (t) => {
  const dir = await project(t, { pulse: NEW, handoff: OLD });
  await fs.writeFile(path.join(dir, STATE_RELATIVE_PATH), `${JSON.stringify(PROGRESS, null, 2)}\n`, 'utf8');
  const lines = [];
  const logger = { log: (line) => lines.push(String(line)), error: (line) => lines.push(String(line)), warn: () => {} };
  const result = await runWorkflowStatus({ args: [dir], options: {}, logger });
  assert.equal(result.featureSlug, NEW);
  assert.equal(result.binding.source, 'pulse');
  assert.equal(result.binding.moved.from, OLD);
  assert.ok(lines.some((line) => /Binding: project-pulse\.md active_feature/.test(line)), lines.join('\n'));
  assert.ok(lines.some((line) => /workflow binding moved: play-refoundation → deploy-channel/.test(line)), lines.join('\n'));
  assert.equal((await readJson(path.join(dir, STATE_RELATIVE_PATH))).featureSlug, OLD, 'status stays read-only');
});

test('review-cycle:status answers for the feature asked: a cycle file left by another feature is a stale_feature, and the budget is whole', async (t) => {
  const dir = await project(t, { pulse: NEW });
  await fs.mkdir(path.join(dir, '.aioson', 'runtime'), { recursive: true });
  await fs.writeFile(path.join(dir, '.aioson', 'runtime', 'qa-dev-cycle.json'), JSON.stringify({ slug: OLD, source: 'qa', target: 'dev', cycle: 3, max_cycles: 3, status: 'limit_reached' }), 'utf8');
  const logger = { log() {}, error() {} };
  const foreign = await runReviewCycle({ args: [dir], options: { sub: 'status', feature: NEW, json: true }, logger });
  assert.equal(foreign.ok, true);
  assert.equal(foreign.exists, false);
  assert.equal(foreign.state, null);
  assert.equal(foreign.stale_feature, OLD);
  assert.equal(foreign.remaining_cycles, foreign.max_cycles, 'the new feature starts with its full budget');
  assert.match(foreign.note, /belongs to play-refoundation/);
  const own = await runReviewCycle({ args: [dir], options: { sub: 'status', feature: OLD, json: true }, logger });
  assert.equal(own.exists, true);
  assert.equal(own.remaining_cycles, 0);
  assert.equal(own.stale_feature, undefined);
  const unscoped = await runReviewCycle({ args: [dir], options: { sub: 'status', json: true }, logger });
  assert.equal(unscoped.exists, true, 'without --feature the file is reported as it is');
});
