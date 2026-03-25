'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { runSquadValidate } = require('../src/commands/squad-validate');

async function makeTempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'aioson-task-decomp-'));
}

async function writeManifest(tmpDir, slug, data) {
  const squadDir = path.join(tmpDir, '.aioson', 'squads', slug);
  await fs.mkdir(path.join(squadDir, 'agents'), { recursive: true });
  await fs.writeFile(path.join(squadDir, 'agents', 'agents.md'), '# Agents', 'utf8');
  await fs.writeFile(path.join(squadDir, 'agents', 'orquestrador.md'), '# Orquestrador', 'utf8');
  await fs.writeFile(
    path.join(squadDir, 'squad.manifest.json'),
    JSON.stringify({
      schemaVersion: '2.0.0',
      slug,
      name: 'Test Squad',
      mode: 'content',
      mission: 'Test mission',
      goal: 'Test goal',
      ...data
    }),
    'utf8'
  );
  return squadDir;
}

function makeLogger() {
  const lines = [];
  const errors = [];
  return {
    log: (msg) => lines.push(msg),
    error: (msg) => errors.push(msg),
    lines,
    errors
  };
}

// --- task order validation ---

test('task decomposition: sequential order [1,2,3] → no warning', async () => {
  const tmpDir = await makeTempDir();
  try {
    await writeManifest(tmpDir, 'alpha', {
      executors: [{
        slug: 'writer',
        title: 'Writer',
        type: 'agent',
        tasks: [
          { slug: 'research', title: 'Research', order: 1 },
          { slug: 'draft', title: 'Draft', order: 2 },
          { slug: 'optimize', title: 'Optimize', order: 3 }
        ]
      }]
    });
    const logger = makeLogger();
    const result = await runSquadValidate({ args: [tmpDir], options: { squad: 'alpha' }, logger });
    const taskWarnings = result.warnings.filter(w => w.includes('task order'));
    assert.equal(taskWarnings.length, 0);
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('task decomposition: gap in order [1,3] → warning', async () => {
  const tmpDir = await makeTempDir();
  try {
    await writeManifest(tmpDir, 'beta', {
      executors: [{
        slug: 'writer',
        title: 'Writer',
        type: 'agent',
        tasks: [
          { slug: 'research', title: 'Research', order: 1 },
          { slug: 'optimize', title: 'Optimize', order: 3 } // gap: missing 2
        ]
      }]
    });
    const logger = makeLogger();
    const result = await runSquadValidate({ args: [tmpDir], options: { squad: 'beta' }, logger });
    assert.ok(result.warnings.some(w => w.includes('task order') && w.includes('writer')));
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('task decomposition: duplicate order [1,1,2] → warning', async () => {
  const tmpDir = await makeTempDir();
  try {
    await writeManifest(tmpDir, 'gamma', {
      executors: [{
        slug: 'writer',
        title: 'Writer',
        type: 'agent',
        tasks: [
          { slug: 'a', title: 'A', order: 1 },
          { slug: 'b', title: 'B', order: 1 }, // duplicate
          { slug: 'c', title: 'C', order: 2 }
        ]
      }]
    });
    const logger = makeLogger();
    const result = await runSquadValidate({ args: [tmpDir], options: { squad: 'gamma' }, logger });
    assert.ok(result.warnings.some(w => w.includes('task order') && w.includes('writer')));
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('task decomposition: order starting at 2 instead of 1 → warning', async () => {
  const tmpDir = await makeTempDir();
  try {
    await writeManifest(tmpDir, 'delta', {
      executors: [{
        slug: 'writer',
        title: 'Writer',
        type: 'agent',
        tasks: [
          { slug: 'a', title: 'A', order: 2 },
          { slug: 'b', title: 'B', order: 3 }
        ]
      }]
    });
    const logger = makeLogger();
    const result = await runSquadValidate({ args: [tmpDir], options: { squad: 'delta' }, logger });
    assert.ok(result.warnings.some(w => w.includes('task order')));
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('task decomposition: single task with order 1 → no warning', async () => {
  const tmpDir = await makeTempDir();
  try {
    await writeManifest(tmpDir, 'epsilon', {
      executors: [{
        slug: 'formatter',
        title: 'Formatter',
        type: 'worker',
        tasks: [{ slug: 'format', title: 'Format', order: 1 }]
      }]
    });
    const logger = makeLogger();
    const result = await runSquadValidate({ args: [tmpDir], options: { squad: 'epsilon' }, logger });
    const taskWarnings = result.warnings.filter(w => w.includes('task order'));
    assert.equal(taskWarnings.length, 0);
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('task decomposition: executor without tasks → no task order warning', async () => {
  const tmpDir = await makeTempDir();
  try {
    await writeManifest(tmpDir, 'zeta', {
      executors: [{
        slug: 'writer',
        title: 'Writer',
        type: 'agent'
        // no tasks field
      }]
    });
    const logger = makeLogger();
    const result = await runSquadValidate({ args: [tmpDir], options: { squad: 'zeta' }, logger });
    const taskWarnings = result.warnings.filter(w => w.includes('task order'));
    assert.equal(taskWarnings.length, 0);
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

// --- model tiering validation ---

test('model tiering: usesLLM=false with modelTier="none" → no warning', async () => {
  const tmpDir = await makeTempDir();
  try {
    await writeManifest(tmpDir, 'iota', {
      executors: [{
        slug: 'formatter',
        title: 'Formatter',
        type: 'worker',
        usesLLM: false,
        modelTier: 'none'
      }]
    });
    const logger = makeLogger();
    const result = await runSquadValidate({ args: [tmpDir], options: { squad: 'iota' }, logger });
    const tierWarnings = result.warnings.filter(w => w.includes('modelTier'));
    assert.equal(tierWarnings.length, 0);
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('model tiering: usesLLM=false with modelTier="powerful" → warning', async () => {
  const tmpDir = await makeTempDir();
  try {
    await writeManifest(tmpDir, 'kappa', {
      executors: [{
        slug: 'formatter',
        title: 'Formatter',
        type: 'worker',
        usesLLM: false,
        modelTier: 'powerful'
      }]
    });
    const logger = makeLogger();
    const result = await runSquadValidate({ args: [tmpDir], options: { squad: 'kappa' }, logger });
    assert.ok(result.warnings.some(w => w.includes('formatter') && w.includes('modelTier')));
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('model tiering: type="worker" with modelTier="balanced" → warning', async () => {
  const tmpDir = await makeTempDir();
  try {
    await writeManifest(tmpDir, 'lambda', {
      executors: [{
        slug: 'publisher',
        title: 'Publisher',
        type: 'worker',
        modelTier: 'balanced'
      }]
    });
    const logger = makeLogger();
    const result = await runSquadValidate({ args: [tmpDir], options: { squad: 'lambda' }, logger });
    assert.ok(result.warnings.some(w => w.includes('publisher') && w.includes('modelTier')));
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('model tiering: type="agent" with modelTier="powerful" → no warning', async () => {
  const tmpDir = await makeTempDir();
  try {
    await writeManifest(tmpDir, 'mu', {
      executors: [{
        slug: 'copywriter',
        title: 'Copywriter',
        type: 'agent',
        modelTier: 'powerful'
      }]
    });
    const logger = makeLogger();
    const result = await runSquadValidate({ args: [tmpDir], options: { squad: 'mu' }, logger });
    const tierWarnings = result.warnings.filter(w => w.includes('modelTier'));
    assert.equal(tierWarnings.length, 0);
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});
