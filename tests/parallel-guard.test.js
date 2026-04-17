'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createTranslator } = require('../src/i18n');
const { runParallelInit } = require('../src/commands/parallel-init');
const { runParallelGuard } = require('../src/commands/parallel-guard');

async function makeTempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'aioson-parallel-guard-'));
}

function createQuietLogger() {
  return {
    log() {},
    error() {}
  };
}

async function writeContext(dir, classification = 'MEDIUM') {
  const contextPath = path.join(dir, '.aioson/context/project.context.md');
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
aioson_version: "0.1.9"
---

# Project Context
`,
    'utf8'
  );
}

test('parallel:guard allows writes owned by the requested lane', async () => {
  const dir = await makeTempDir();
  const { t } = createTranslator('en');
  await writeContext(dir);
  await runParallelInit({
    args: [dir],
    options: { workers: 2 },
    logger: createQuietLogger(),
    t
  });

  const lane1Path = path.join(dir, '.aioson/context/parallel/agent-1.status.md');
  const lane2Path = path.join(dir, '.aioson/context/parallel/agent-2.status.md');
  let lane1Content = await fs.readFile(lane1Path, 'utf8');
  lane1Content = lane1Content.replace('- write_paths: [unassigned]', '- write_paths: src/auth/**');
  await fs.writeFile(lane1Path, lane1Content, 'utf8');
  let lane2Content = await fs.readFile(lane2Path, 'utf8');
  lane2Content = lane2Content.replace('- write_paths: [unassigned]', '- write_paths: src/billing/**');
  await fs.writeFile(lane2Path, lane2Content, 'utf8');

  const result = await runParallelGuard({
    args: [dir],
    options: { lane: 1, paths: 'src/auth/login.js,src/auth/session.js' },
    logger: createQuietLogger(),
    t
  });

  assert.equal(result.ok, true);
  assert.equal(result.allowedCount, 2);
  assert.equal(result.deniedCount, 0);
});

test('parallel:guard blocks paths owned by another lane or left unassigned', async () => {
  const dir = await makeTempDir();
  const { t } = createTranslator('en');
  await writeContext(dir);
  await runParallelInit({
    args: [dir],
    options: { workers: 2 },
    logger: createQuietLogger(),
    t
  });

  const lane1Path = path.join(dir, '.aioson/context/parallel/agent-1.status.md');
  const lane2Path = path.join(dir, '.aioson/context/parallel/agent-2.status.md');
  let lane1Content = await fs.readFile(lane1Path, 'utf8');
  lane1Content = lane1Content.replace('- write_paths: [unassigned]', '- write_paths: src/auth/**');
  await fs.writeFile(lane1Path, lane1Content, 'utf8');
  let lane2Content = await fs.readFile(lane2Path, 'utf8');
  lane2Content = lane2Content.replace('- write_paths: [unassigned]', '- write_paths: src/billing/**');
  await fs.writeFile(lane2Path, lane2Content, 'utf8');

  const result = await runParallelGuard({
    args: [dir],
    options: { lane: 1, paths: 'src/billing/invoice.js,src/unknown/file.js' },
    logger: createQuietLogger(),
    t
  });

  assert.equal(result.ok, false);
  assert.equal(result.deniedCount, 2);
  assert.deepEqual(result.denied.map((item) => item.reason), ['owned_by_other_lane', 'unassigned_path']);
});

test('parallel:guard blocks when write scope patterns are ambiguous or invalid', async () => {
  const dir = await makeTempDir();
  const { t } = createTranslator('en');
  await writeContext(dir);
  await runParallelInit({
    args: [dir],
    options: { workers: 2 },
    logger: createQuietLogger(),
    t
  });

  const lane1Path = path.join(dir, '.aioson/context/parallel/agent-1.status.md');
  const lane2Path = path.join(dir, '.aioson/context/parallel/agent-2.status.md');
  let lane1Content = await fs.readFile(lane1Path, 'utf8');
  lane1Content = lane1Content.replace('- write_paths: [unassigned]', '- write_paths: src/shared/**');
  await fs.writeFile(lane1Path, lane1Content, 'utf8');
  let lane2Content = await fs.readFile(lane2Path, 'utf8');
  lane2Content = lane2Content.replace('- write_paths: [unassigned]', '- write_paths: src/shared/config.js, src/*');
  await fs.writeFile(lane2Path, lane2Content, 'utf8');

  const result = await runParallelGuard({
    args: [dir],
    options: { lane: 2, paths: 'src/shared/config.js' },
    logger: createQuietLogger(),
    t
  });

  assert.equal(result.ok, false);
  assert.equal(result.writeScope.conflictCount, 1);
  assert.equal(result.writeScope.invalidPatternCount, 1);
});
