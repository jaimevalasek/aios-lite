'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const {
  generateHooksConfig,
  writeSquadHooks,
  cleanupSquadHooks,
  qualityGateAgentTemplate
} = require('../src/squad/hooks-generator');

async function makeTempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'aioson-hooks-gen-'));
}

// ─── generateHooksConfig ─────────────────────────────────────────────────────

test('generateHooksConfig generates Stop hook by default', () => {
  const hooks = generateHooksConfig('content-team');
  assert.ok(hooks.Stop, 'should have Stop hook');
  assert.equal(hooks.Stop.length, 1);
  assert.equal(hooks.Stop[0].type, 'agent');
  assert.ok(hooks.Stop[0].agent.includes('content-team'));
});

test('generateHooksConfig generates TaskCompleted hook by default', () => {
  const hooks = generateHooksConfig('my-squad');
  assert.ok(hooks.TaskCompleted, 'should have TaskCompleted hook');
  assert.equal(hooks.TaskCompleted[0].type, 'command');
  assert.ok(hooks.TaskCompleted[0].command.includes('learning-extractor'));
  assert.ok(hooks.TaskCompleted[0].command.includes('my-squad'));
});

test('generateHooksConfig skips Stop hook when disabled', () => {
  const hooks = generateHooksConfig('test-squad', { enableQualityGate: false });
  assert.ok(!hooks.Stop, 'should not have Stop hook');
});

test('generateHooksConfig skips TaskCompleted hook when learning disabled', () => {
  const hooks = generateHooksConfig('test-squad', { enableLearning: false });
  assert.ok(!hooks.TaskCompleted, 'should not have TaskCompleted hook');
});

test('generateHooksConfig adds PostToolUse hook when bus bridge enabled', () => {
  const hooks = generateHooksConfig('bridge-squad', { enableBusBridge: true });
  assert.ok(hooks.PostToolUse, 'should have PostToolUse hook');
  assert.equal(hooks.PostToolUse[0].type, 'command');
  assert.ok(hooks.PostToolUse[0].matcher, 'should have matcher');
  assert.ok(hooks.PostToolUse[0].command.includes('bus-bridge'));
});

test('generateHooksConfig does not add PostToolUse hook by default', () => {
  const hooks = generateHooksConfig('no-bridge');
  assert.ok(!hooks.PostToolUse, 'should not have PostToolUse without enableBusBridge');
});

test('generateHooksConfig includes squad slug in all commands', () => {
  const slug = 'unique-squad-xyz';
  const hooks = generateHooksConfig(slug);

  const taskHook = hooks.TaskCompleted?.[0]?.command || '';
  assert.ok(taskHook.includes(slug), 'TaskCompleted command should include squad slug');
});

// ─── qualityGateAgentTemplate ────────────────────────────────────────────────

test('qualityGateAgentTemplate returns markdown string', () => {
  const template = qualityGateAgentTemplate('content-team');
  assert.equal(typeof template, 'string');
  assert.ok(template.includes('content-team'));
});

test('qualityGateAgentTemplate includes verification tiers', () => {
  const template = qualityGateAgentTemplate('my-squad');
  assert.ok(template.includes('Tier 1') || template.includes('Exists'));
  assert.ok(template.includes('Tier 2') || template.includes('Substantive'));
  assert.ok(template.includes('Tier 3') || template.includes('Wired'));
});

test('qualityGateAgentTemplate includes allow/block decision format', () => {
  const template = qualityGateAgentTemplate('squad');
  assert.ok(template.includes('allow') || template.includes('ALLOW'));
  assert.ok(template.includes('block') || template.includes('BLOCK'));
});

test('qualityGateAgentTemplate includes bias warning about fresh context', () => {
  const template = qualityGateAgentTemplate('sq');
  assert.ok(template.includes('NO context') || template.includes('no context') || template.includes('unbiased'));
});

// ─── writeSquadHooks ─────────────────────────────────────────────────────────

test('writeSquadHooks creates .claude/settings.json', async () => {
  const tmpDir = await makeTempDir();
  try {
    const result = await writeSquadHooks(tmpDir, 'my-squad');
    assert.ok(result.settingsPath.endsWith('settings.json'));

    const settingsExists = await fs.access(result.settingsPath).then(() => true).catch(() => false);
    assert.ok(settingsExists, 'settings.json should be created');
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('writeSquadHooks creates quality gate agent file', async () => {
  const tmpDir = await makeTempDir();
  try {
    const result = await writeSquadHooks(tmpDir, 'content-team');
    assert.ok(result.agentPath);

    const agentExists = await fs.access(result.agentPath).then(() => true).catch(() => false);
    assert.ok(agentExists, 'quality gate agent file should be created');
    assert.ok(result.agentPath.includes('content-team'));
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('writeSquadHooks generates valid JSON in settings.json', async () => {
  const tmpDir = await makeTempDir();
  try {
    const result = await writeSquadHooks(tmpDir, 'test-squad');
    const settings = JSON.parse(await fs.readFile(result.settingsPath, 'utf8'));

    assert.ok(settings.hooks, 'should have hooks section');
    assert.ok(settings._squadHooksFor, 'should track which squad these hooks are for');
    assert.equal(settings._squadHooksFor, 'test-squad');
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('writeSquadHooks merges with existing settings', async () => {
  const tmpDir = await makeTempDir();
  try {
    const settingsDir = path.join(tmpDir, '.claude');
    await fs.mkdir(settingsDir, { recursive: true });
    await fs.writeFile(
      path.join(settingsDir, 'settings.json'),
      JSON.stringify({ existingKey: 'existingValue', hooks: {} }),
      'utf8'
    );

    const result = await writeSquadHooks(tmpDir, 'my-squad');
    const settings = JSON.parse(await fs.readFile(result.settingsPath, 'utf8'));

    assert.equal(settings.existingKey, 'existingValue', 'should preserve existing keys');
    assert.ok(settings.hooks.Stop || settings.hooks.TaskCompleted, 'should have squad hooks');
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('writeSquadHooks reports count of merged hooks', async () => {
  const tmpDir = await makeTempDir();
  try {
    const result = await writeSquadHooks(tmpDir, 'hooks-count-squad');
    assert.equal(typeof result.merged, 'number');
    assert.ok(result.merged >= 1, 'should report at least 1 merged hook type');
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

// ─── cleanupSquadHooks ───────────────────────────────────────────────────────

test('cleanupSquadHooks removes squad hooks from settings.json', async () => {
  const tmpDir = await makeTempDir();
  try {
    await writeSquadHooks(tmpDir, 'cleanup-squad');
    await cleanupSquadHooks(tmpDir, 'cleanup-squad');

    const settingsPath = path.join(tmpDir, '.claude', 'settings.json');
    const settings = JSON.parse(await fs.readFile(settingsPath, 'utf8'));

    assert.ok(!settings._squadHooksFor, 'should remove _squadHooksFor');
    assert.ok(!settings._squadHooksAt, 'should remove _squadHooksAt');
    assert.ok(!settings.hooks, 'should remove hooks section');
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('cleanupSquadHooks removes quality gate agent file', async () => {
  const tmpDir = await makeTempDir();
  try {
    const writeResult = await writeSquadHooks(tmpDir, 'cleanup-test');
    const agentPath = writeResult.agentPath;

    await cleanupSquadHooks(tmpDir, 'cleanup-test');

    const exists = await fs.access(agentPath).then(() => true).catch(() => false);
    assert.equal(exists, false, 'quality gate agent file should be removed');
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('cleanupSquadHooks does not remove hooks for different squad', async () => {
  const tmpDir = await makeTempDir();
  try {
    await writeSquadHooks(tmpDir, 'squad-a');
    // Try to cleanup squad-b (doesn't match)
    await cleanupSquadHooks(tmpDir, 'squad-b');

    const settingsPath = path.join(tmpDir, '.claude', 'settings.json');
    const settings = JSON.parse(await fs.readFile(settingsPath, 'utf8'));

    assert.equal(settings._squadHooksFor, 'squad-a', 'should preserve hooks for squad-a');
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test('cleanupSquadHooks is a no-op when no settings file exists', async () => {
  const tmpDir = await makeTempDir();
  try {
    // Should not throw
    await cleanupSquadHooks(tmpDir, 'nonexistent-squad');
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});
