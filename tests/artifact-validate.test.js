'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { runArtifactValidate } = require('../src/commands/artifact-validate');

async function makeTmpDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'aioson-artifact-val-'));
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

test('artifact:validate: requires --feature', async () => {
  const tmpDir = await makeTmpDir();
  const result = await runArtifactValidate({
    args: [tmpDir],
    options: { json: true },
    logger: makeLogger()
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'missing_feature');
});

test('artifact:validate: INVALID when required files missing', async () => {
  const tmpDir = await makeTmpDir();
  const result = await runArtifactValidate({
    args: [tmpDir],
    options: { json: true, feature: 'checkout' },
    logger: makeLogger()
  });
  assert.equal(result.ok, false);
  assert.equal(result.integrity, 'INVALID');
  assert.ok(result.missing_required.length > 0);
});

test('artifact:validate: VALID when all required files exist for SMALL', async () => {
  const tmpDir = await makeTmpDir();
  await writeFile(tmpDir, '.aioson/context/project.context.md', '---\nclassification: SMALL\n---');
  await writeFile(tmpDir, '.aioson/context/prd-checkout.md', '# PRD');
  await writeFile(tmpDir, '.aioson/context/requirements-checkout.md', '# Reqs');
  await writeFile(tmpDir, '.aioson/context/spec-checkout.md', '---\nversion: 3\n---\n# Spec');
  await writeFile(tmpDir, '.aioson/context/architecture.md', '# Arch');
  await writeFile(tmpDir, '.aioson/context/implementation-plan-checkout.md', '---\nstatus: approved\n---\n# Plan');

  const result = await runArtifactValidate({
    args: [tmpDir],
    options: { json: true, feature: 'checkout' },
    logger: makeLogger()
  });
  assert.equal(result.ok, true);
  assert.equal(result.integrity, 'VALID');
  assert.equal(result.missing_required.length, 0);
});

test('artifact:validate: conformance not required for SMALL classification', async () => {
  const tmpDir = await makeTmpDir();
  await writeFile(tmpDir, '.aioson/context/project.context.md', '---\nclassification: SMALL\n---');
  await writeFile(tmpDir, '.aioson/context/prd-checkout.md', '# PRD');
  await writeFile(tmpDir, '.aioson/context/requirements-checkout.md', '# Reqs');
  await writeFile(tmpDir, '.aioson/context/spec-checkout.md', '---\nversion: 1\n---');
  await writeFile(tmpDir, '.aioson/context/architecture.md', '# Arch');
  await writeFile(tmpDir, '.aioson/context/implementation-plan-checkout.md', '# Plan');

  const result = await runArtifactValidate({
    args: [tmpDir],
    options: { json: true, feature: 'checkout' },
    logger: makeLogger()
  });
  // conformance is missing but not required for SMALL
  const conformanceChain = result.chain.find((c) => c.name.includes('conformance'));
  assert.ok(conformanceChain);
  assert.equal(conformanceChain.required, false);
});

test('artifact:validate: shows spec version and gates in chain detail', async () => {
  const tmpDir = await makeTmpDir();
  await writeFile(tmpDir, '.aioson/context/project.context.md', '---\nclassification: SMALL\n---');
  await writeFile(tmpDir, '.aioson/context/prd-checkout.md', '# PRD');
  await writeFile(tmpDir, '.aioson/context/requirements-checkout.md', '# Reqs');
  await writeFile(tmpDir, '.aioson/context/spec-checkout.md',
    '---\nversion: 5\ngate_requirements: approved\ngate_plan: approved\n---\n# Spec');
  await writeFile(tmpDir, '.aioson/context/architecture.md', '# Arch');
  await writeFile(tmpDir, '.aioson/context/implementation-plan-checkout.md', '# Plan');

  const result = await runArtifactValidate({
    args: [tmpDir],
    options: { json: true, feature: 'checkout' },
    logger: makeLogger()
  });

  const specEntry = result.chain.find((c) => c.name.includes('spec-checkout'));
  assert.ok(specEntry);
  assert.ok(specEntry.detail && specEntry.detail.includes('5'));
});

test('artifact:validate: human output contains chain integrity line', async () => {
  const tmpDir = await makeTmpDir();
  const logger = makeLogger();
  await runArtifactValidate({ args: [tmpDir], options: { feature: 'checkout' }, logger });
  assert.ok(logger.lines.some((l) => l.includes('integrity') || l.includes('Chain') || l.includes('INVALID')));
});

test('artifact:validate: feature is in result', async () => {
  const tmpDir = await makeTmpDir();
  const result = await runArtifactValidate({
    args: [tmpDir],
    options: { json: true, feature: 'my-feature' },
    logger: makeLogger()
  });
  assert.equal(result.feature, 'my-feature');
});
