'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

// We test the validation logic extracted from squad-validate.js by calling it
// through runSquadValidate with a real temp manifest.

const { runSquadValidate } = require('../src/commands/squad-validate');

async function makeTempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'aioson-review-loops-'));
}

async function writeManifest(tmpDir, slug, data) {
  const squadDir = path.join(tmpDir, '.aioson', 'squads', slug);
  await fs.mkdir(path.join(squadDir, 'agents'), { recursive: true });
  // Minimal required files
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

// --- reviewer validation ---

test('review loop: valid reviewer (exists as executor) → no error', async () => {
  const tmpDir = await makeTempDir();
  try {
    await writeManifest(tmpDir, 'alpha', {
      executors: [
        { slug: 'writer', title: 'Writer', type: 'agent' },
        { slug: 'editor', title: 'Editor', type: 'agent' }
      ],
      workflows: [{
        slug: 'content',
        phases: [{
          id: 'write',
          executor: 'writer',
          review: { reviewer: 'editor', criteria: ['Quality'], onReject: 'write' },
          vetoConditions: [{ condition: 'placeholder text', action: 'block' }]
        }]
      }]
    });
    const logger = makeLogger();
    const result = await runSquadValidate({ args: [tmpDir], options: { squad: 'alpha' }, logger });
    const reviewErrors = result.errors.filter(e => e.includes('reviewer'));
    assert.equal(reviewErrors.length, 0);
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('review loop: reviewer not declared as executor → error', async () => {
  const tmpDir = await makeTempDir();
  try {
    await writeManifest(tmpDir, 'beta', {
      executors: [
        { slug: 'writer', title: 'Writer', type: 'agent' }
      ],
      workflows: [{
        slug: 'content',
        phases: [{
          id: 'write',
          executor: 'writer',
          review: { reviewer: 'ghost-editor', onReject: 'write' },
          vetoConditions: [{ condition: 'x', action: 'block' }]
        }]
      }]
    });
    const logger = makeLogger();
    const result = await runSquadValidate({ args: [tmpDir], options: { squad: 'beta' }, logger });
    assert.ok(result.errors.some(e => e.includes('ghost-editor')));
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('review loop: reviewer same as creator → warning', async () => {
  const tmpDir = await makeTempDir();
  try {
    await writeManifest(tmpDir, 'gamma', {
      executors: [
        { slug: 'writer', title: 'Writer', type: 'agent' }
      ],
      workflows: [{
        slug: 'content',
        phases: [{
          id: 'write',
          executor: 'writer',
          review: { reviewer: 'writer', onReject: 'write' },
          vetoConditions: [{ condition: 'x', action: 'block' }]
        }]
      }]
    });
    const logger = makeLogger();
    const result = await runSquadValidate({ args: [tmpDir], options: { squad: 'gamma' }, logger });
    assert.ok(result.warnings.some(w => w.includes('reviewer should not be the same')));
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

// --- onReject validation ---

test('review loop: onReject targeting valid phase ID → no error', async () => {
  const tmpDir = await makeTempDir();
  try {
    await writeManifest(tmpDir, 'delta', {
      executors: [
        { slug: 'writer', title: 'Writer', type: 'agent' },
        { slug: 'editor', title: 'Editor', type: 'agent' }
      ],
      workflows: [{
        slug: 'content',
        phases: [
          { id: 'research', executor: 'writer' },
          {
            id: 'write',
            executor: 'writer',
            review: { reviewer: 'editor', onReject: 'research' },
            vetoConditions: [{ condition: 'x', action: 'block' }]
          }
        ]
      }]
    });
    const logger = makeLogger();
    const result = await runSquadValidate({ args: [tmpDir], options: { squad: 'delta' }, logger });
    const onRejectErrors = result.errors.filter(e => e.includes('onReject'));
    assert.equal(onRejectErrors.length, 0);
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('review loop: onReject targeting non-existent phase ID → error', async () => {
  const tmpDir = await makeTempDir();
  try {
    await writeManifest(tmpDir, 'epsilon', {
      executors: [
        { slug: 'writer', title: 'Writer', type: 'agent' },
        { slug: 'editor', title: 'Editor', type: 'agent' }
      ],
      workflows: [{
        slug: 'content',
        phases: [{
          id: 'write',
          executor: 'writer',
          review: { reviewer: 'editor', onReject: 'non-existent-phase' },
          vetoConditions: [{ condition: 'x', action: 'block' }]
        }]
      }]
    });
    const logger = makeLogger();
    const result = await runSquadValidate({ args: [tmpDir], options: { squad: 'epsilon' }, logger });
    assert.ok(result.errors.some(e => e.includes('non-existent-phase')));
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

// --- vetoConditions advisory ---

test('review loop: review without vetoConditions → warning', async () => {
  const tmpDir = await makeTempDir();
  try {
    await writeManifest(tmpDir, 'zeta', {
      executors: [
        { slug: 'writer', title: 'Writer', type: 'agent' },
        { slug: 'editor', title: 'Editor', type: 'agent' }
      ],
      workflows: [{
        slug: 'content',
        phases: [{
          id: 'write',
          executor: 'writer',
          review: { reviewer: 'editor', onReject: 'write' }
          // no vetoConditions
        }]
      }]
    });
    const logger = makeLogger();
    const result = await runSquadValidate({ args: [tmpDir], options: { squad: 'zeta' }, logger });
    assert.ok(result.warnings.some(w => w.includes('vetoConditions')));
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('review loop: review with vetoConditions → no veto warning', async () => {
  const tmpDir = await makeTempDir();
  try {
    await writeManifest(tmpDir, 'eta', {
      executors: [
        { slug: 'writer', title: 'Writer', type: 'agent' },
        { slug: 'editor', title: 'Editor', type: 'agent' }
      ],
      workflows: [{
        slug: 'content',
        phases: [{
          id: 'write',
          executor: 'writer',
          review: { reviewer: 'editor', onReject: 'write' },
          vetoConditions: [{ condition: 'Output has placeholder text', action: 'block' }]
        }]
      }]
    });
    const logger = makeLogger();
    const result = await runSquadValidate({ args: [tmpDir], options: { squad: 'eta' }, logger });
    assert.ok(!result.warnings.some(w => w.includes('vetoConditions')));
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

// --- no review → no review errors ---

test('phase without review block → no review validation errors', async () => {
  const tmpDir = await makeTempDir();
  try {
    await writeManifest(tmpDir, 'theta', {
      executors: [{ slug: 'writer', title: 'Writer', type: 'agent' }],
      workflows: [{
        slug: 'content',
        phases: [{ id: 'write', executor: 'writer' }]
      }]
    });
    const logger = makeLogger();
    const result = await runSquadValidate({ args: [tmpDir], options: { squad: 'theta' }, logger });
    const reviewErrors = result.errors.filter(e => e.includes('reviewer') || e.includes('onReject'));
    assert.equal(reviewErrors.length, 0);
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});
