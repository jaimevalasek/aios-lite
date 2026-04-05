'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { generateAgentCard, runSquadCard } = require('../src/commands/squad-card');

async function makeTempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'aioson-squad-card-'));
}

const SAMPLE_MANIFEST = {
  slug: 'content-team',
  name: 'Content Team',
  mission: 'Produce viral YouTube content',
  schemaVersion: '2.0.0',
  executors: [
    { slug: 'researcher', title: 'Researcher', role: 'Researches trends' },
    { slug: 'scriptwriter', title: 'Script Writer', role: 'Writes scripts' }
  ],
  workflows: [
    { slug: 'episode-flow', title: 'Episode Production' }
  ]
};

async function writeManifest(tmpDir, squadSlug, manifest) {
  const dir = path.join(tmpDir, '.aioson', 'squads', squadSlug);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, 'squad.manifest.json'), JSON.stringify(manifest), 'utf8');
}

// ─── generateAgentCard ───────────────────────────────────────────────────────

test('generateAgentCard produces valid A2A card structure', () => {
  const card = generateAgentCard(SAMPLE_MANIFEST);

  assert.equal(card.name, 'Content Team');
  assert.ok(card.description.includes('YouTube') || card.description.includes('Content'));
  assert.ok(card.url);
  assert.ok(card.version);
  assert.ok(card.capabilities);
  assert.ok(card.skills);
});

test('generateAgentCard maps executors to skills', () => {
  const card = generateAgentCard(SAMPLE_MANIFEST);

  const researcherSkill = card.skills.find((s) => s.id === 'researcher');
  assert.ok(researcherSkill, 'should have researcher skill');
  assert.equal(researcherSkill.name, 'Researcher');
  assert.ok(researcherSkill.description.includes('Researches'));
});

test('generateAgentCard maps workflows to skills', () => {
  const card = generateAgentCard(SAMPLE_MANIFEST);

  const wfSkill = card.skills.find((s) => s.id === 'workflow-episode-flow');
  assert.ok(wfSkill, 'should have workflow skill');
  assert.ok(wfSkill.name.includes('Episode'));
});

test('generateAgentCard total skills = executors + workflows', () => {
  const card = generateAgentCard(SAMPLE_MANIFEST);
  assert.equal(card.skills.length, 3); // 2 executors + 1 workflow
});

test('generateAgentCard uses correct URL format', () => {
  const card = generateAgentCard(SAMPLE_MANIFEST, { port: 4000, host: 'myhost' });
  assert.equal(card.url, 'http://myhost:4000/a2a/content-team');
});

test('generateAgentCard uses default port 3847', () => {
  const card = generateAgentCard(SAMPLE_MANIFEST);
  assert.ok(card.url.includes(':3847'));
});

test('generateAgentCard enables streaming and pushNotifications', () => {
  const card = generateAgentCard(SAMPLE_MANIFEST);
  assert.equal(card.capabilities.streaming, true);
  assert.equal(card.capabilities.pushNotifications, true);
});

test('generateAgentCard sets text/plain and application/json modes', () => {
  const card = generateAgentCard(SAMPLE_MANIFEST);
  assert.ok(card.defaultInputModes.includes('text/plain'));
  assert.ok(card.defaultInputModes.includes('application/json'));
  assert.ok(card.defaultOutputModes.includes('application/json'));
});

test('generateAgentCard uses manifest schemaVersion', () => {
  const card = generateAgentCard(SAMPLE_MANIFEST);
  assert.equal(card.version, '2.0.0');
});

test('generateAgentCard falls back to "1.0.0" when no schemaVersion', () => {
  const manifest = { ...SAMPLE_MANIFEST, schemaVersion: undefined };
  const card = generateAgentCard(manifest);
  assert.equal(card.version, '1.0.0');
});

test('generateAgentCard uses goal as fallback description', () => {
  const manifest = { ...SAMPLE_MANIFEST, mission: undefined, goal: 'Build great content' };
  const card = generateAgentCard(manifest);
  assert.ok(card.description.includes('Build great content'));
});

test('generateAgentCard uses default description when neither mission nor goal', () => {
  const manifest = { ...SAMPLE_MANIFEST, mission: undefined, goal: undefined };
  const card = generateAgentCard(manifest);
  assert.ok(card.description.includes('content-team'));
});

test('generateAgentCard maps port definitions when present', () => {
  const manifest = {
    ...SAMPLE_MANIFEST,
    ports: {
      inputs: [{ key: 'brief', dataType: 'text/plain', description: 'Task brief', required: true }],
      outputs: [{ key: 'result', dataType: 'application/json', description: 'Output' }]
    }
  };
  const card = generateAgentCard(manifest);
  assert.ok(card.inputPorts);
  assert.equal(card.inputPorts[0].key, 'brief');
  assert.equal(card.inputPorts[0].required, true);
  assert.ok(card.outputPorts);
  assert.equal(card.outputPorts[0].key, 'result');
});

// ─── runSquadCard ─────────────────────────────────────────────────────────────

test('runSquadCard writes agent card JSON file', async () => {
  const tmpDir = await makeTempDir();
  try {
    await writeManifest(tmpDir, 'content-team', SAMPLE_MANIFEST);

    const logs = [];
    const logger = { log: (msg) => logs.push(msg), error: (msg) => logs.push(msg) };

    const result = await runSquadCard({ args: [tmpDir], options: { squad: 'content-team' }, logger });

    assert.equal(result.ok, true);
    assert.ok(result.outputPath);

    const cardPath = path.join(tmpDir, result.outputPath);
    const card = JSON.parse(await fs.readFile(cardPath, 'utf8'));
    assert.equal(card.name, 'Content Team');
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('runSquadCard writes to custom output path', async () => {
  const tmpDir = await makeTempDir();
  try {
    await writeManifest(tmpDir, 'content-team', SAMPLE_MANIFEST);
    const logger = { log: () => {}, error: () => {} };

    const customOutput = 'custom/agent-card.json';
    await runSquadCard({
      args: [tmpDir],
      options: { squad: 'content-team', output: customOutput },
      logger
    });

    const exists = await fs.access(path.join(tmpDir, customOutput)).then(() => true).catch(() => false);
    assert.ok(exists, 'custom output file should exist');
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('runSquadCard returns error when --squad is missing', async () => {
  const tmpDir = await makeTempDir();
  try {
    const logger = { log: () => {}, error: () => {} };
    const result = await runSquadCard({ args: [tmpDir], options: {}, logger });
    assert.equal(result.ok, false);
    assert.ok(result.error.includes('squad'));
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('runSquadCard returns error for missing manifest', async () => {
  const tmpDir = await makeTempDir();
  try {
    const logger = { log: () => {}, error: () => {} };
    const result = await runSquadCard({ args: [tmpDir], options: { squad: 'nonexistent' }, logger });
    assert.equal(result.ok, false);
    assert.ok(result.error.includes('manifest'));
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('runSquadCard json option returns card object directly', async () => {
  const tmpDir = await makeTempDir();
  try {
    await writeManifest(tmpDir, 'content-team', SAMPLE_MANIFEST);
    const logger = { log: () => {}, error: () => {} };

    const result = await runSquadCard({
      args: [tmpDir],
      options: { squad: 'content-team', json: true },
      logger
    });

    assert.equal(result.name, 'Content Team');
    assert.ok(Array.isArray(result.skills));
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('runSquadCard uses custom port from options', async () => {
  const tmpDir = await makeTempDir();
  try {
    await writeManifest(tmpDir, 'content-team', SAMPLE_MANIFEST);
    const logger = { log: () => {}, error: () => {} };

    const result = await runSquadCard({
      args: [tmpDir],
      options: { squad: 'content-team', port: '4000', json: true },
      logger
    });

    assert.ok(result.url.includes(':4000'));
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});
