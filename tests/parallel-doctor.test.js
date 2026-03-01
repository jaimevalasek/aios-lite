'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createTranslator } = require('../src/i18n');
const { runParallelInit } = require('../src/commands/parallel-init');
const { runParallelDoctor } = require('../src/commands/parallel-doctor');

async function makeTempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'aios-lite-parallel-doctor-'));
}

function createQuietLogger() {
  return {
    log() {},
    error() {}
  };
}

async function writeContext(dir, classification = 'MEDIUM') {
  const contextPath = path.join(dir, '.aios-lite/context/project.context.md');
  await fs.mkdir(path.dirname(contextPath), { recursive: true });
  await fs.writeFile(
    contextPath,
    `---
project_name: "demo"
project_type: "web_app"
profile: "developer"
framework: "Node"
framework_installed: true
classification: "${classification}"
conversation_language: "en"
aios_lite_version: "0.1.9"
---

# Project Context
`,
    'utf8'
  );
}

test('parallel:doctor reports invalid state when context/parallel files are missing', async () => {
  const dir = await makeTempDir();
  const { t } = createTranslator('en');

  const result = await runParallelDoctor({
    args: [dir],
    options: {},
    logger: createQuietLogger(),
    t
  });

  assert.equal(result.ok, false);
  assert.equal(result.summary.failed >= 1, true);
});

test('parallel:doctor localizes check messages with pt-BR locale', async () => {
  const dir = await makeTempDir();
  const { t } = createTranslator('pt-BR');

  const result = await runParallelDoctor({
    args: [dir],
    options: {},
    logger: createQuietLogger(),
    t
  });

  const check = result.checks.find((item) => item.id === 'context.exists');
  assert.equal(Boolean(check), true);
  assert.equal(check.message.includes('ausente'), true);
});

test('parallel:doctor passes after parallel:init baseline', async () => {
  const dir = await makeTempDir();
  const { t } = createTranslator('en');
  await writeContext(dir, 'MEDIUM');
  await runParallelInit({
    args: [dir],
    options: { workers: 3 },
    logger: createQuietLogger(),
    t
  });

  const result = await runParallelDoctor({
    args: [dir],
    options: { workers: 3 },
    logger: createQuietLogger(),
    t
  });

  assert.equal(result.ok, true);
  assert.equal(result.summary.failed, 0);
});

test('parallel:doctor --fix restores missing shared and lane files', async () => {
  const dir = await makeTempDir();
  const { t } = createTranslator('en');
  await writeContext(dir, 'MEDIUM');
  await runParallelInit({
    args: [dir],
    options: { workers: 3 },
    logger: createQuietLogger(),
    t
  });

  await fs.rm(path.join(dir, '.aios-lite/context/parallel/shared-decisions.md'));
  await fs.rm(path.join(dir, '.aios-lite/context/parallel/agent-2.status.md'));

  const result = await runParallelDoctor({
    args: [dir],
    options: { workers: 3, fix: true },
    logger: createQuietLogger(),
    t
  });

  assert.equal(result.ok, true);
  assert.equal(result.fix.enabled, true);
  assert.equal(result.fix.changedCount >= 2, true);

  await assert.doesNotReject(() =>
    fs.access(path.join(dir, '.aios-lite/context/parallel/shared-decisions.md'))
  );
  await assert.doesNotReject(() =>
    fs.access(path.join(dir, '.aios-lite/context/parallel/agent-2.status.md'))
  );
});

test('parallel:doctor --fix localizes unknown classification fallback in pt-BR', async () => {
  const dir = await makeTempDir();
  const { t } = createTranslator('pt-BR');
  await writeContext(dir, '');

  await assert.rejects(
    runParallelDoctor({
      args: [dir],
      options: { fix: true },
      logger: createQuietLogger(),
      t
    }),
    /desconhecida/
  );
});

test('parallel:doctor localizes unknown classification fallback in check message (pt-BR)', async () => {
  const dir = await makeTempDir();
  const { t } = createTranslator('pt-BR');
  await writeContext(dir, '');

  const result = await runParallelDoctor({
    args: [dir],
    options: {},
    logger: createQuietLogger(),
    t
  });

  const check = result.checks.find((item) => item.id === 'context.classification');
  assert.equal(Boolean(check), true);
  assert.equal(check.message.includes('desconhecida'), true);
});
