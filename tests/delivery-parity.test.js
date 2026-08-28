'use strict';

/**
 * Delivery→git parity.
 *
 * The incident this closes: two full waves of framework work ended with every
 * done-gate green and 195 files still sitting in the working tree, because no
 * gate anywhere measured whether a delivery had reached git. The operator was
 * the only detector. These tests pin the measurement, the tiering that keeps
 * it from crying wolf on normal work in flight, and the two seams that make it
 * auto-fire: `agent:done` and the `delivery:parity` command.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');

const {
  measureDeliveryParity,
  parseParityPorcelain,
  groupByArea,
  classify,
  DEFAULT_THRESHOLD
} = require('../src/lib/delivery-parity');

const ROOT = path.resolve(__dirname, '..');

function makeRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aioson-delivery-parity-'));
  const git = (...args) => execFileSync('git', args, { cwd: dir, stdio: 'ignore' });
  git('init', '-q');
  git('config', 'user.email', 'test@example.com');
  git('config', 'user.name', 'Test');
  git('config', 'commit.gpgsign', 'false');
  fs.writeFileSync(path.join(dir, 'seed.txt'), 'seed\n');
  git('add', 'seed.txt');
  git('commit', '-qm', 'seed');
  return { dir, git };
}

function writeFile(dir, relPath, content) {
  const full = path.join(dir, relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content);
}

test('porcelain parsing keeps index and worktree columns apart', () => {
  const entries = parseParityPorcelain(
    'M  staged.js\n M unstaged.js\nMM both.js\n?? untracked.js\n'
  );
  assert.deepEqual(entries.map((e) => e.path), ['staged.js', 'unstaged.js', 'both.js', 'untracked.js']);
  assert.equal(entries[0].index, 'M');
  assert.equal(entries[0].worktree, ' ');
  assert.equal(entries[1].index, ' ');
  assert.equal(entries[1].worktree, 'M');
  assert.equal(entries[2].index, 'M');
  assert.equal(entries[2].worktree, 'M');
  assert.equal(entries[3].index, '?');
});

test('porcelain parsing survives renames, quoted paths and CRLF', () => {
  const entries = parseParityPorcelain('R  old/name.js -> new/name.js\r\nA  "with space.js"\r\n');
  // A rename reports the destination — the side actually being delivered.
  assert.deepEqual(entries.map((e) => e.path), ['new/name.js', 'with space.js']);
});

test('areas descend through nested containers to the real commit slice', () => {
  const areas = groupByArea([
    'template/.aioson/skills/design/a/SKILL.md',
    'template/.aioson/skills/design/b/SKILL.md',
    'template/.aioson/docs/gateway/routing.md',
    'src/commands/one.js',
    'src/cli.js',
    'CHANGELOG.md'
  ]);
  const byArea = Object.fromEntries(areas.map((a) => [a.area, a.count]));
  // `template/` alone would say nothing; `template/.aioson` barely more.
  assert.equal(byArea['template/.aioson/skills'], 2);
  assert.equal(byArea['template/.aioson/docs'], 1);
  assert.equal(byArea['src/commands'], 1);
  assert.equal(byArea.src, 1);
  assert.equal(byArea['(root)'], 1);
  // Sorted by weight so the heaviest slice is the one a reader sees first.
  assert.equal(areas[0].area, 'template/.aioson/skills');
});

test('tiering charges authored work only — runtime churn never raises the tier', () => {
  assert.equal(classify({ authored: 0, runtime: 0, threshold: 10 }), 'clean');
  assert.equal(classify({ authored: 0, runtime: 40, threshold: 10 }), 'runtime_only');
  assert.equal(classify({ authored: 3, runtime: 0, threshold: 10 }), 'noted');
  assert.equal(classify({ authored: 10, runtime: 0, threshold: 10 }), 'advisory');
  assert.equal(DEFAULT_THRESHOLD, 10);
});

test('a clean tree measures clean; a wave of authored work measures advisory', async () => {
  const { dir, git } = makeRepo();

  const clean = await measureDeliveryParity({ targetDir: dir });
  assert.equal(clean.tier, 'clean');
  assert.equal(clean.authored, 0);
  assert.equal(clean.git, true);

  for (let i = 0; i < 12; i += 1) writeFile(dir, `src/feature-${i}.js`, `// ${i}\n`);
  const dirty = await measureDeliveryParity({ targetDir: dir });
  assert.equal(dirty.tier, 'advisory');
  assert.equal(dirty.authored, 12);
  assert.equal(dirty.untracked, 12);
  assert.match(dirty.reason, /has not reached git/);
  assert.match(dirty.reason, /@committer/);
  assert.equal(dirty.areas[0].area, 'src');

  git('add', '-A');
  git('commit', '-qm', 'ship it');
  const after = await measureDeliveryParity({ targetDir: dir });
  assert.equal(after.tier, 'clean');
});

test('framework runtime state alone never fires the advisory', async () => {
  const { dir } = makeRepo();
  for (let i = 0; i < 30; i += 1) {
    writeFile(dir, `.aioson/context/report-${i}.json`, '{}\n');
  }
  const report = await measureDeliveryParity({ targetDir: dir });
  assert.equal(report.tier, 'runtime_only');
  assert.equal(report.authored, 0);
  assert.equal(report.runtime, 30);
});

test('the threshold is configurable and a non-git directory is a state, not a finding', async () => {
  const { dir } = makeRepo();
  writeFile(dir, 'src/one.js', 'x\n');
  writeFile(dir, 'src/two.js', 'y\n');
  assert.equal((await measureDeliveryParity({ targetDir: dir })).tier, 'noted');
  assert.equal((await measureDeliveryParity({ targetDir: dir, threshold: 2 })).tier, 'advisory');

  const plain = fs.mkdtempSync(path.join(os.tmpdir(), 'aioson-parity-nogit-'));
  const report = await measureDeliveryParity({ targetDir: plain });
  assert.equal(report.ok, true);
  assert.equal(report.tier, 'skipped');
  assert.equal(report.git, false);
});

test('the delivery:parity command reports an advisory tree without failing the process', () => {
  const { dir } = makeRepo();
  for (let i = 0; i < 12; i += 1) writeFile(dir, `src/feature-${i}.js`, `// ${i}\n`);

  // src/cli.js fails the process on any `ok:false`; an advisory command that
  // reported a dirty tree as a failure would break every script calling it.
  const human = spawnSync(process.execPath, [path.join(ROOT, 'bin/aioson.js'), 'delivery:parity', dir], {
    encoding: 'utf8'
  });
  assert.equal(human.status, 0, human.stderr);
  assert.match(human.stdout, /ADVISORY/);
  assert.match(human.stdout, /Outstanding by area/);

  const json = spawnSync(process.execPath, [path.join(ROOT, 'bin/aioson.js'), 'delivery:parity', dir, '--json'], {
    encoding: 'utf8'
  });
  assert.equal(json.status, 0, json.stderr);
  const payload = JSON.parse(json.stdout);
  assert.equal(payload.ok, true);
  assert.equal(payload.tier, 'advisory');
  assert.equal(payload.authored, 12);
});

test('agent:done carries the parity measurement so every session end sees it', async () => {
  const { dir } = makeRepo();
  for (let i = 0; i < 12; i += 1) writeFile(dir, `src/feature-${i}.js`, `// ${i}\n`);

  const { runAgentDone } = require('../src/commands/runtime');
  const result = await runAgentDone({
    args: [dir],
    options: { agent: 'dev', summary: 'implemented the wave', json: true },
    logger: { log() {}, error() {}, warn() {} }
  });

  assert.equal(result.ok, true);
  assert.ok(result.delivery_parity, 'agent:done must carry delivery_parity');
  assert.equal(result.delivery_parity.tier, 'advisory');
  assert.equal(result.delivery_parity.authored, 12);
});

test('a dirty tree never blocks a session end — the parity gate is advisory in every tier', async () => {
  const { dir } = makeRepo();
  for (let i = 0; i < 40; i += 1) writeFile(dir, `src/feature-${i}.js`, `// ${i}\n`);

  const { runAgentDone } = require('../src/commands/runtime');
  const result = await runAgentDone({
    args: [dir],
    options: { agent: 'qa', summary: 'reviewed', json: true },
    logger: { log() {}, error() {}, warn() {} }
  });
  assert.equal(result.ok, true, 'advisory parity must never flip agent:done');
});

test('the committer routes through the measurement and ships its partition doc to consumers', async () => {
  const fsp = require('node:fs/promises');
  const kernel = await fsp.readFile(path.join(ROOT, 'template/.aioson/agents/committer.md'), 'utf8');
  // The kernel opens the stage on a measurement, not a raw status dump, and
  // knows a wave is not a commit.
  assert.match(kernel, /aioson delivery:parity/);
  assert.match(kernel, /outstanding-work\.md/);

  const doc = path.join(ROOT, 'template/.aioson/docs/committer/outstanding-work.md');
  await fsp.access(doc);

  // Shipped AND kept current in consumer projects by `aioson update` — a doc
  // outside MANAGED_FILES is written once and then silently goes stale.
  const { MANAGED_FILES } = require('../src/constants');
  assert.ok(
    MANAGED_FILES.includes('.aioson/docs/committer/outstanding-work.md'),
    'the partition doc must be managed or consumers never receive updates to it'
  );
});
