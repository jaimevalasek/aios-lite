'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { runHarnessInit, runHarnessValidate } = require('../src/commands/harness');

async function makeTmpDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'aioson-harness-test-'));
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

const mockT = (key, params) => {
  if (params && params.path) return `Harness already initialized in ${params.path}`;
  if (params && params.slug) return `Harness initialized for feature: ${params.slug}`;
  return key;
};

test('harness:init: cria arquivos de contrato e progresso em projeto MEDIUM', async () => {
  const tmpDir = await makeTmpDir();
  const slug = 'test-feature';
  
  const result = await runHarnessInit({
    args: [tmpDir],
    options: { slug },
    logger: makeLogger(),
    t: mockT
  });

  const planDir = path.join(tmpDir, '.aioson', 'plans', slug);
  const contractPath = path.join(planDir, 'harness-contract.json');
  const progressPath = path.join(planDir, 'progress.json');

  assert.strictEqual(result.ok, true);
  
  const contractExists = await fs.access(contractPath).then(() => true).catch(() => false);
  const progressExists = await fs.access(progressPath).then(() => true).catch(() => false);
  
  assert.ok(contractExists, 'harness-contract.json deve existir');
  assert.ok(progressExists, 'progress.json deve existir');

  const contractContent = JSON.parse(await fs.readFile(contractPath, 'utf8'));
  assert.strictEqual(contractContent.feature, slug);
  assert.strictEqual(contractContent.contract_mode, 'BALANCED');

  const progressContent = JSON.parse(await fs.readFile(progressPath, 'utf8'));
  assert.strictEqual(progressContent.circuit_state, 'CLOSED');
  assert.strictEqual(progressContent.iterations, 0);
});

test('harness:init: é idempotente e não sobrescreve arquivos existentes', async () => {
  const tmpDir = await makeTmpDir();
  const slug = 'test-feature';
  const planDir = path.join(tmpDir, '.aioson', 'plans', slug);
  const contractPath = path.join(planDir, 'harness-contract.json');
  
  await fs.mkdir(planDir, { recursive: true });
  const initialContent = JSON.stringify({ feature: 'original' });
  await fs.writeFile(contractPath, initialContent, 'utf8');

  const logger = makeLogger();
  const result = await runHarnessInit({
    args: [tmpDir],
    options: { slug },
    logger,
    t: mockT
  });

  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.skipped, true);
  
  const finalContent = await fs.readFile(contractPath, 'utf8');
  assert.strictEqual(finalContent, initialContent, 'O conteúdo do contrato não deve ser alterado');
  assert.ok(logger.lines.some(l => l.includes('already initialized')), 'Deve exibir mensagem de aviso');
});

test('harness:init: requer --slug', async () => {
  const tmpDir = await makeTmpDir();
  const logger = makeLogger();
  
  const result = await runHarnessInit({
    args: [tmpDir],
    options: {}, // Sem slug
    logger,
    t: mockT
  });

  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.error, 'missing_slug');
});

test('harness:validate: falha se contrato não existir', async () => {
  const tmpDir = await makeTmpDir();
  const slug = 'non-existent-feature';
  
  const result = await runHarnessValidate({
    args: [tmpDir],
    options: { slug },
    logger: makeLogger(),
    t: mockT
  });

  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.error, 'contract_not_found');
});

test('harness:validate: bloqueia se circuit estiver OPEN', async () => {
  const tmpDir = await makeTmpDir();
  const slug = 'open-feature';
  
  // Setup: Criar contrato e progresso com circuit OPEN
  const planDir = path.join(tmpDir, '.aioson', 'plans', slug);
  await fs.mkdir(planDir, { recursive: true });
  
  const contract = {
    feature: slug,
    governor: { max_steps: 10, error_streak_limit: 3 }
  };
  const progress = {
    circuit_state: 'OPEN',
    iterations: 5,
    consecutive_errors: 3
  };
  
  await fs.writeFile(path.join(planDir, 'harness-contract.json'), JSON.stringify(contract), 'utf8');
  await fs.writeFile(path.join(planDir, 'progress.json'), JSON.stringify(progress), 'utf8');

  const logger = makeLogger();
  const result = await runHarnessValidate({
    args: [tmpDir],
    options: { slug },
    logger,
    t: (key) => {
      if (key === 'harness.blocked') return 'Execution paused: circuit_open';
      return key;
    }
  });

  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.reason, 'circuit_open');
  assert.ok(logger.lines.some(l => l.includes('Execution paused')), 'Deve informar que a execução está pausada');
});
