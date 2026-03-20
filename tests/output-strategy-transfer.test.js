'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { runOutputStrategyExport, runOutputStrategyImport } = require('../src/commands/runtime');

async function makeTempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'aioson-output-transfer-'));
}

function createLogger() {
  const lines = [];
  return { lines, log(l) { lines.push(String(l)); }, error(l) { lines.push(String(l)); } };
}

function t(key, params) { return `${key} ${JSON.stringify(params || {})}`; }

async function writeManifest(dir, slug, extra = {}) {
  const squadDir = path.join(dir, '.aioson', 'squads', slug);
  await fs.mkdir(squadDir, { recursive: true });
  const manifest = { schemaVersion: '1.0.0', slug, name: slug, mode: 'content', mission: 'Test', goal: 'Test', ...extra };
  await fs.writeFile(path.join(squadDir, 'squad.manifest.json'), JSON.stringify(manifest, null, 2));
}

const SAMPLE_STRATEGY = {
  mode: 'hybrid',
  fileOutput: { enabled: true, dir: 'output/test/', formats: ['html', 'md'] },
  dataOutput: { enabled: true, storage: 'sqlite', table: 'content_items', contentItems: true },
  delivery: { webhooks: [{ slug: 'my-hook', url: 'https://example.com/hook', trigger: 'on-publish', format: 'json' }], cloudPublish: false, autoPublish: true }
};

test('export writes outputStrategy to JSON file', async () => {
  const dir = await makeTempDir();
  const logger = createLogger();
  try {
    await writeManifest(dir, 'source-squad', { outputStrategy: SAMPLE_STRATEGY });
    const result = await runOutputStrategyExport({ args: [dir], options: { squad: 'source-squad' }, logger, t });
    assert.equal(result.ok, true);

    const exported = JSON.parse(await fs.readFile(path.join(dir, result.file), 'utf8'));
    assert.equal(exported.mode, 'hybrid');
    assert.equal(exported.delivery.webhooks.length, 1);
    assert.equal(exported.delivery.autoPublish, true);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('export fails when no outputStrategy exists', async () => {
  const dir = await makeTempDir();
  const logger = createLogger();
  try {
    await writeManifest(dir, 'empty-squad');
    const result = await runOutputStrategyExport({ args: [dir], options: { squad: 'empty-squad' }, logger, t });
    assert.equal(result.ok, false);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('import from another squad via --from', async () => {
  const dir = await makeTempDir();
  const logger = createLogger();
  try {
    await writeManifest(dir, 'source', { outputStrategy: SAMPLE_STRATEGY });
    await writeManifest(dir, 'target');

    const result = await runOutputStrategyImport({ args: [dir], options: { squad: 'target', from: 'source' }, logger, t });
    assert.equal(result.ok, true);

    const targetManifest = JSON.parse(await fs.readFile(path.join(dir, '.aioson', 'squads', 'target', 'squad.manifest.json'), 'utf8'));
    assert.equal(targetManifest.outputStrategy.mode, 'hybrid');
    assert.equal(targetManifest.outputStrategy.delivery.autoPublish, true);
    assert.equal(targetManifest.outputStrategy.delivery.webhooks[0].slug, 'my-hook');
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('import from file via --file', async () => {
  const dir = await makeTempDir();
  const logger = createLogger();
  try {
    await writeManifest(dir, 'target');
    const strategyFile = path.join(dir, 'custom-strategy.json');
    await fs.writeFile(strategyFile, JSON.stringify({ mode: 'files', fileOutput: { enabled: true, dir: 'out/', formats: ['html'] }, dataOutput: { enabled: false }, delivery: { webhooks: [], cloudPublish: false, autoPublish: false } }));

    const result = await runOutputStrategyImport({ args: [dir], options: { squad: 'target', file: strategyFile }, logger, t });
    assert.equal(result.ok, true);

    const targetManifest = JSON.parse(await fs.readFile(path.join(dir, '.aioson', 'squads', 'target', 'squad.manifest.json'), 'utf8'));
    assert.equal(targetManifest.outputStrategy.mode, 'files');
    assert.equal(targetManifest.outputStrategy.dataOutput.enabled, false);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('import fails when source has no strategy', async () => {
  const dir = await makeTempDir();
  const logger = createLogger();
  try {
    await writeManifest(dir, 'source-empty');
    await writeManifest(dir, 'target');
    const result = await runOutputStrategyImport({ args: [dir], options: { squad: 'target', from: 'source-empty' }, logger, t });
    assert.equal(result.ok, false);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('roundtrip export then import preserves strategy', async () => {
  const dir = await makeTempDir();
  const logger = createLogger();
  try {
    await writeManifest(dir, 'origin', { outputStrategy: SAMPLE_STRATEGY });
    await writeManifest(dir, 'destination');

    const exportResult = await runOutputStrategyExport({ args: [dir], options: { squad: 'origin' }, logger, t });
    assert.equal(exportResult.ok, true);

    const importResult = await runOutputStrategyImport({ args: [dir], options: { squad: 'destination', file: path.join(dir, exportResult.file) }, logger, t });
    assert.equal(importResult.ok, true);

    const destManifest = JSON.parse(await fs.readFile(path.join(dir, '.aioson', 'squads', 'destination', 'squad.manifest.json'), 'utf8'));
    assert.deepEqual(destManifest.outputStrategy, SAMPLE_STRATEGY);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});
