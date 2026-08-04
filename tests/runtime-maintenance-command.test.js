'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createTranslator } = require('../src/i18n');
const { openRuntimeDb } = require('../src/runtime-store');
const {
  runRuntimeStorage,
  runRuntimePrune,
  runRuntimeCompact
} = require('../src/commands/runtime');

function logger() {
  return { log() {}, error() {} };
}

test('runtime maintenance commands preview before deleting and compact only when idle', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'aioson-runtime-command-'));
  const opened = await openRuntimeDb(dir);
  opened.db.prepare(`
    INSERT INTO tasks(task_key,title,status,created_at,updated_at,finished_at)
    VALUES ('old-task','Old terminal task','completed','2000-01-01T00:00:00Z','2000-01-01T00:00:00Z','2000-01-01T00:00:00Z')
  `).run();
  opened.db.close();

  const { t } = createTranslator('en');
  const storage = await runRuntimeStorage({ args: [dir], options: { json: true }, logger: logger(), t });
  assert.equal(storage.ok, true);
  assert.ok(storage.preview.directRows >= 1);

  const preview = await runRuntimePrune({ args: [dir], options: { json: true, 'dry-run': true }, logger: logger(), t });
  assert.equal(preview.ok, true);
  assert.equal(preview.dryRun, true);

  let check = await openRuntimeDb(dir);
  assert.equal(check.db.prepare("SELECT COUNT(*) count FROM tasks WHERE task_key='old-task'").get().count, 1);
  check.db.close();

  const pruned = await runRuntimePrune({ args: [dir], options: { json: true }, logger: logger(), t });
  assert.equal(pruned.ok, true);
  assert.equal(pruned.deleted.tasks, 1);

  check = await openRuntimeDb(dir);
  assert.equal(check.db.prepare("SELECT COUNT(*) count FROM tasks WHERE task_key='old-task'").get().count, 0);
  check.db.close();

  const compacted = await runRuntimeCompact({ args: [dir], options: { json: true }, logger: logger(), t });
  assert.equal(compacted.ok, true);
});

test('runtime compact refuses active execution unless force is explicit', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'aioson-runtime-active-'));
  const opened = await openRuntimeDb(dir);
  opened.db.prepare(`
    INSERT INTO tasks(task_key,title,status,created_at,updated_at)
    VALUES ('active-task','Active task','running','2026-08-03T00:00:00Z','2026-08-03T00:00:00Z')
  `).run();
  opened.db.close();

  const { t } = createTranslator('en');
  const result = await runRuntimeCompact({ args: [dir], options: { json: true }, logger: logger(), t });
  assert.equal(result.ok, false);
  assert.equal(result.error, 'active_runtime');
  assert.equal(result.busy.tasks, 1);
});
