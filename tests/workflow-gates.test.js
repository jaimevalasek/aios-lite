'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { detectStack, runTechnicalGate, formatGateError } = require('../src/workflow-gates');

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

describe('workflow-gates.js — detectStack', () => {
  let tmpDir;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'workflow-gates-test-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('detects TypeScript stack', async () => {
    await fs.writeFile(path.join(tmpDir, 'tsconfig.json'), '{}');
    const checks = await detectStack(tmpDir);
    assert.ok(checks.some((c) => c.id === 'tsc'));
  });

  it('detects Rust stack', async () => {
    await fs.writeFile(path.join(tmpDir, 'Cargo.toml'), '[package]');
    const checks = await detectStack(tmpDir);
    assert.ok(checks.some((c) => c.id === 'cargo-check'));
    assert.ok(checks.some((c) => c.id === 'cargo-test'));
    assert.ok(checks.find((c) => c.id === 'cargo-test').optional);
  });

  it('detects Node.js stack with npm scripts', async () => {
    const pkg = {
      name: 'test',
      scripts: { test: 'node --test', lint: 'eslint .', 'test:unit': 'jest' }
    };
    await fs.writeFile(path.join(tmpDir, 'package.json'), JSON.stringify(pkg, null, 2));
    const checks = await detectStack(tmpDir);
    assert.ok(checks.some((c) => c.id === 'npm-test'));
    assert.ok(checks.some((c) => c.id === 'npm-lint'));
    assert.ok(checks.some((c) => c.id === 'npm-test-unit'));
  });

  it('skips npm test if script is an echo placeholder', async () => {
    const pkg = { name: 'test', scripts: { test: 'echo "Error: no test specified"' } };
    await fs.writeFile(path.join(tmpDir, 'package.json'), JSON.stringify(pkg, null, 2));
    const checks = await detectStack(tmpDir);
    assert.ok(!checks.some((c) => c.id === 'npm-test'));
  });

  it('detects Python stack', async () => {
    await fs.writeFile(path.join(tmpDir, 'pytest.ini'), '[pytest]');
    const checks = await detectStack(tmpDir);
    assert.ok(checks.some((c) => c.id === 'pytest'));
    assert.ok(checks.find((c) => c.id === 'pytest').optional);
  });

  it('detects Python stack via pyproject.toml', async () => {
    await fs.writeFile(path.join(tmpDir, 'pyproject.toml'), '[tool.pytest.ini_options]');
    const checks = await detectStack(tmpDir);
    assert.ok(checks.some((c) => c.id === 'pytest'));
  });

  it('returns empty array when no stack detected', async () => {
    const checks = await detectStack(tmpDir);
    assert.deepEqual(checks, []);
  });
});

describe('workflow-gates.js — runTechnicalGate', () => {
  let tmpDir;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'workflow-gates-test-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('returns forced ok when options.force is true', async () => {
    const result = await runTechnicalGate(tmpDir, 'dev', { force: true });
    assert.equal(result.ok, true);
    assert.equal(result.forced, true);
    assert.equal(result.stage, 'dev');
  });

  it('skips gate for non-dev/qa stages when stack exists', async () => {
    // Create a TypeScript stack so detectStack returns checks
    await fs.writeFile(path.join(tmpDir, 'tsconfig.json'), '{"compilerOptions": {}}');
    const result = await runTechnicalGate(tmpDir, 'product');
    assert.equal(result.ok, true);
    assert.ok(result.reason.includes('No technical gate for this stage'));
  });

  it('skips gate when no stack is detected regardless of stage', async () => {
    const result = await runTechnicalGate(tmpDir, 'product');
    assert.equal(result.ok, true);
    assert.ok(result.reason.includes('No detectable stack'));
  });

  it('skips when no stack is detected', async () => {
    const result = await runTechnicalGate(tmpDir, 'dev');
    assert.equal(result.ok, true);
    assert.ok(result.reason.includes('No detectable stack'));
  });

  it('runs checks for dev stage with Node.js stack', async () => {
    const pkg = { name: 'test', scripts: { test: 'node --test' } };
    await fs.writeFile(path.join(tmpDir, 'package.json'), JSON.stringify(pkg, null, 2));
    const result = await runTechnicalGate(tmpDir, 'dev');
    assert.equal(result.ok, true);
    assert.ok(result.results.length > 0);
    assert.ok(result.results.some((r) => r.check === 'npm-test'));
  });

  it('runs checks for qa stage with Node.js stack', async () => {
    const pkg = { name: 'test', scripts: { test: 'node --test' } };
    await fs.writeFile(path.join(tmpDir, 'package.json'), JSON.stringify(pkg, null, 2));
    const result = await runTechnicalGate(tmpDir, 'qa');
    assert.equal(result.ok, true);
    assert.ok(result.results.length > 0);
  });

  it('blocks dev stage when TypeScript compilation fails', async () => {
    await fs.writeFile(path.join(tmpDir, 'tsconfig.json'), '{"compilerOptions": {}}');
    // Create a TS file with syntax error to make tsc fail
    await fs.writeFile(path.join(tmpDir, 'index.ts'), 'const x: = 1;');
    const result = await runTechnicalGate(tmpDir, 'dev');
    assert.equal(result.ok, false);
    assert.equal(result.blocked, true);
    assert.ok(result.reasons.length > 0);
  });
});

describe('workflow-gates.js — formatGateError', () => {
  it('formats blocked gate with reasons and results', () => {
    const gateResult = {
      stage: 'dev',
      reasons: ['npm test failed'],
      results: [
        { ok: false, name: 'npm test', command: 'npm test', output: 'Error: 1 test failed' }
      ]
    };
    const msg = formatGateError(gateResult);
    assert.ok(msg.includes('[Technical Gate BLOCKED]'));
    assert.ok(msg.includes('Stage: @dev'));
    assert.ok(msg.includes('npm test failed'));
    assert.ok(msg.includes('Fix the errors above'));
    assert.ok(msg.includes('--force'));
  });
});
