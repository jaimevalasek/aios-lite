'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createTranslator } = require('../src/i18n');
const { runMcpInit } = require('../src/commands/mcp-init');
const { runMcpDoctor } = require('../src/commands/mcp-doctor');

async function makeTempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'aios-lite-mcp-doctor-'));
}

function createQuietLogger() {
  return {
    log() {},
    error() {}
  };
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

async function writeDappContext(dir) {
  const contextPath = path.join(dir, '.aios-lite/context/project.context.md');
  await fs.mkdir(path.dirname(contextPath), { recursive: true });
  await fs.writeFile(
    contextPath,
    `---
project_name: "demo"
project_type: "dapp"
profile: "developer"
framework: "Hardhat"
framework_installed: true
classification: "SMALL"
conversation_language: "en"
web3_enabled: true
web3_networks: "ethereum"
contract_framework: "Hardhat"
wallet_provider: ""
indexer: ""
rpc_provider: ""
aios_lite_version: "0.1.9"
---

# Project Context

## Stack
- Backend: Hardhat
- Frontend: Next.js
- Database: [not applicable]
- Auth: Custom
- UI/UX: Tailwind
`,
    'utf8'
  );
}

function withTempEnv(values, fn) {
  const previous = {};
  const keys = Object.keys(values);
  for (const key of keys) {
    previous[key] = process.env[key];
    process.env[key] = values[key];
  }

  return Promise.resolve()
    .then(fn)
    .finally(() => {
      for (const key of keys) {
        if (previous[key] === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = previous[key];
        }
      }
    });
}

test('mcp:doctor fails when MCP plan file is missing', async () => {
  const dir = await makeTempDir();
  const { t } = createTranslator('en');
  const result = await runMcpDoctor({
    args: [dir],
    options: {},
    logger: createQuietLogger(),
    t
  });

  assert.equal(result.ok, false);
  assert.equal(result.plan.exists, false);
  assert.equal(result.summary.failed >= 1, true);
});

test('mcp:doctor strict env mode fails when required variables are missing', async () => {
  const dir = await makeTempDir();
  await writeDappContext(dir);

  const { t } = createTranslator('en');
  await runMcpInit({
    args: [dir],
    options: {},
    logger: createQuietLogger(),
    t
  });

  const result = await runMcpDoctor({
    args: [dir],
    options: { 'strict-env': true },
    logger: createQuietLogger(),
    t
  });

  assert.equal(result.ok, false);
  assert.equal(result.env.required.length > 0, true);
  assert.equal(result.env.missing.length > 0, true);
  const envCheck = result.checks.find((check) => check.id === 'env.required');
  assert.equal(Boolean(envCheck), true);
  assert.equal(envCheck.severity, 'error');
  assert.equal(envCheck.ok, false);
});

test('mcp:doctor strict env mode passes when required variables exist', async () => {
  const dir = await makeTempDir();
  await writeDappContext(dir);

  const { t } = createTranslator('en');
  await runMcpInit({
    args: [dir],
    options: {},
    logger: createQuietLogger(),
    t
  });

  await withTempEnv(
    {
      CONTEXT7_MCP_URL: 'https://example.invalid/context7',
      RPC_URL: 'https://example.invalid/rpc',
      CHAIN_ID: '1',
      PRIVATE_KEY: '0xabc123'
    },
    async () => {
      const result = await runMcpDoctor({
        args: [dir],
        options: { 'strict-env': true },
        logger: createQuietLogger(),
        t
      });

      assert.equal(result.ok, true);
      assert.equal(result.summary.failed, 0);
    }
  );
});

test('mcp:doctor localizes context parse reason when context frontmatter is invalid', async () => {
  const dir = await makeTempDir();
  const contextPath = path.join(dir, '.aios-lite/context/project.context.md');
  await fs.mkdir(path.dirname(contextPath), { recursive: true });
  await fs.writeFile(
    contextPath,
    `---\nproject_name: "demo"\nframework_installed: true\n`,
    'utf8'
  );

  const { t } = createTranslator('pt-BR');
  const result = await runMcpDoctor({
    args: [dir],
    options: {},
    logger: createQuietLogger(),
    t
  });

  const check = result.checks.find((item) => item.id === 'context.parsed');
  assert.equal(Boolean(check), true);
  assert.equal(check.message.includes('bloco de frontmatter nao fechado'), true);
});

test('mcp:doctor localizes check prefixes in pt-BR output', async () => {
  const dir = await makeTempDir();
  const { t } = createTranslator('pt-BR');
  const logger = createCollectLogger();

  const result = await runMcpDoctor({
    args: [dir],
    options: {},
    logger,
    t
  });

  assert.equal(result.ok, false);
  assert.equal(logger.lines.some((line) => line.startsWith('[AVISO] context.exists')), true);
  assert.equal(logger.lines.some((line) => line.startsWith('[FALHA] plan.exists')), true);
});
