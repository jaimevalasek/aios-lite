'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createTranslator } = require('../src/i18n');
const { runMcpInit, normalizeDatabaseEngine } = require('../src/commands/mcp-init');

async function makeTempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'aios-lite-mcp-init-'));
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function createQuietLogger() {
  return {
    log() {},
    error() {}
  };
}

test('normalizeDatabaseEngine maps common providers', () => {
  assert.equal(normalizeDatabaseEngine('PostgreSQL'), 'postgresql');
  assert.equal(normalizeDatabaseEngine('Supabase'), 'postgresql');
  assert.equal(normalizeDatabaseEngine('PlanetScale'), 'mysql');
  assert.equal(normalizeDatabaseEngine('SQLite'), 'sqlite');
  assert.equal(normalizeDatabaseEngine('MongoDB'), 'mongodb');
});

test('mcp:init writes plan from existing context', async () => {
  const dir = await makeTempDir();
  const contextPath = path.join(dir, '.aios-lite/context/project.context.md');
  await fs.mkdir(path.dirname(contextPath), { recursive: true });
  await fs.writeFile(
    contextPath,
    `---\nproject_name: \"demo\"\nproject_type: \"dapp\"\nprofile: \"developer\"\nframework: \"Anchor\"\nframework_installed: true\nclassification: \"SMALL\"\nconversation_language: \"en\"\nweb3_enabled: true\nweb3_networks: \"solana\"\ncontract_framework: \"Anchor\"\naios_lite_version: \"0.1.7\"\n---\n\n# Project Context\n\n## Stack\n- Backend: Anchor\n- Frontend: Next.js\n- Database: PostgreSQL\n- Auth: Custom\n- UI/UX: Tailwind\n`,
    'utf8'
  );

  const { t } = createTranslator('en');
  const result = await runMcpInit({
    args: [dir],
    options: {},
    logger: createQuietLogger(),
    t
  });

  assert.equal(result.ok, true);
  assert.equal(result.written, true);
  assert.equal(await fileExists(result.filePath), true);
  assert.equal(result.plan.database_engine, 'postgresql');
  assert.equal(result.plan.web3_enabled, true);
  assert.equal(result.plan.web3_networks.includes('solana'), true);

  const chainRpc = result.plan.servers.find((server) => server.id === 'chain-rpc');
  assert.equal(chainRpc.enabled, true);
  assert.equal(chainRpc.networks.includes('solana'), true);
});

test('mcp:init dry-run does not write file and handles missing context', async () => {
  const dir = await makeTempDir();
  const { t } = createTranslator('en');
  const result = await runMcpInit({
    args: [dir],
    options: { 'dry-run': true },
    logger: createQuietLogger(),
    t
  });

  assert.equal(result.ok, true);
  assert.equal(result.dryRun, true);
  assert.equal(result.written, false);
  assert.equal(result.contextExists, false);
  assert.equal(await fileExists(result.filePath), false);
});
