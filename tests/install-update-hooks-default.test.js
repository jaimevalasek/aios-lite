'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createTranslator } = require('../src/i18n');
const { runInstall } = require('../src/commands/install');
const { runUpdate } = require('../src/commands/update');
const { installTemplate } = require('../src/installer');
const hooksInstall = require('../src/commands/hooks-install');

async function makeTempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'aioson-lifecycle-hooks-'));
}

function createCollectLogger() {
  const lines = [];
  return {
    lines,
    log(line) {
      lines.push(String(line));
    },
    error(line) {
      lines.push(String(line));
    }
  };
}

// install/update call installDefaultHooks, which reaches runHooksInstall
// through the module namespace so it can be stubbed here — the real thing
// writes machine-global settings.
function stubHooksInstall(impl) {
  const original = hooksInstall.runHooksInstall;
  hooksInstall.runHooksInstall = impl;
  return () => {
    hooksInstall.runHooksInstall = original;
  };
}

test('install runs the default hooks install and forwards the project dir and tool', async () => {
  const tempDir = await makeTempDir();
  const calls = [];
  const restore = stubHooksInstall(async (payload) => {
    calls.push(payload);
    return { ok: true, results: [{ tool: 'claude' }], agentName: 'dev', dryRun: false };
  });

  try {
    const { t } = createTranslator('en');
    const result = await runInstall({
      args: [tempDir],
      options: { tool: 'claude' },
      logger: createCollectLogger(),
      t
    });

    assert.equal(calls.length, 1);
    assert.equal(calls[0].args[0], tempDir);
    assert.equal(calls[0].options.tool, 'claude');
    assert.equal(result.hooksInstall.ok, true);
  } finally {
    restore();
  }
});

test('install --no-hooks skips and a hooks failure never fails the install', async () => {
  const skipDir = await makeTempDir();
  const failDir = await makeTempDir();
  const calls = [];
  let shouldThrow = false;
  const restore = stubHooksInstall(async (payload) => {
    if (shouldThrow) throw new Error('settings file locked');
    calls.push(payload);
    return { ok: true };
  });

  try {
    const { t } = createTranslator('en');

    const skipLogger = createCollectLogger();
    const skipped = await runInstall({
      args: [skipDir],
      options: { 'no-hooks': true },
      logger: skipLogger,
      t
    });
    assert.equal(calls.length, 0);
    assert.equal(skipped.hooksInstall, null);
    assert.equal(
      skipLogger.lines.some((line) => line.includes('aioson hooks:install')),
      true
    );

    shouldThrow = true;
    const failLogger = createCollectLogger();
    const failed = await runInstall({
      args: [failDir],
      options: {},
      logger: failLogger,
      t
    });
    assert.equal(failed.ok, true);
    assert.equal(failed.hooksInstall.ok, false);
    assert.equal(
      failLogger.lines.some((line) => line.includes('settings file locked')),
      true
    );
  } finally {
    restore();
  }
});

test('update runs the default hooks install on an existing installation', async () => {
  const tempDir = await makeTempDir();
  await installTemplate(tempDir, { overwrite: true, mode: 'install' });

  const calls = [];
  const restore = stubHooksInstall(async (payload) => {
    calls.push(payload);
    return { ok: true, results: [], agentName: 'dev', dryRun: false };
  });

  try {
    const { t } = createTranslator('en');
    const result = await runUpdate({
      args: [tempDir],
      options: {},
      logger: createCollectLogger(),
      t
    });

    assert.equal(calls.length, 1);
    assert.equal(calls[0].args[0], tempDir);
    // update has no hooks-capable --tool flag, so the target is auto-detected.
    assert.equal(calls[0].options.tool, 'all');
    assert.equal(result.hooksInstall.ok, true);
  } finally {
    restore();
  }
});

test('update --no-hooks skips the hooks install', async () => {
  const tempDir = await makeTempDir();
  await installTemplate(tempDir, { overwrite: true, mode: 'install' });

  const calls = [];
  const restore = stubHooksInstall(async (payload) => {
    calls.push(payload);
    return { ok: true };
  });

  try {
    const { t } = createTranslator('en');
    const logger = createCollectLogger();
    const result = await runUpdate({
      args: [tempDir],
      options: { 'no-hooks': true },
      logger,
      t
    });

    assert.equal(calls.length, 0);
    assert.equal(result.hooksInstall, null);
    assert.equal(
      logger.lines.some((line) => line.includes('aioson hooks:install')),
      true
    );
  } finally {
    restore();
  }
});
