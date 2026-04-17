'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs/promises');
const os = require('node:os');
const {
  getRetryCount,
  incrementRetryCount,
  logError,
  getLastError,
  canRetry,
  buildHealingPrompt
} = require('../src/self-healing');

describe('self-healing utilities', () => {
  let tmpDir;

  it('increments retry count and reads it back', async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'aioson-heal-'));
    await fs.mkdir(path.join(tmpDir, '.aioson', 'context', 'pipeline-retries'), { recursive: true });

    const c1 = await getRetryCount(tmpDir, 'dev');
    assert.strictEqual(c1, 0);

    await incrementRetryCount(tmpDir, 'dev', 'compile error');
    const c2 = await getRetryCount(tmpDir, 'dev');
    assert.strictEqual(c2, 1);

    await incrementRetryCount(tmpDir, 'dev', 'another error');
    const c3 = await getRetryCount(tmpDir, 'dev');
    assert.strictEqual(c3, 2);
  });

  it('blocks retry after 3 attempts', async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'aioson-heal-'));
    await fs.mkdir(path.join(tmpDir, '.aioson', 'context', 'pipeline-retries'), { recursive: true });

    await incrementRetryCount(tmpDir, 'dev', 'e1');
    await incrementRetryCount(tmpDir, 'dev', 'e2');
    await incrementRetryCount(tmpDir, 'dev', 'e3');

    const ok = await canRetry(tmpDir, 'dev');
    assert.strictEqual(ok, false);
  });

  it('logs errors and retrieves the last one', async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'aioson-heal-'));
    await fs.mkdir(path.join(tmpDir, '.aioson', 'context'), { recursive: true });

    await logError(tmpDir, 'dev', 'TypeError: foo', 'technical');
    await logError(tmpDir, 'dev', 'SyntaxError: bar', 'technical');

    const last = await getLastError(tmpDir, 'dev');
    assert.strictEqual(last.error, 'SyntaxError: bar');
    assert.strictEqual(last.gateType, 'technical');
    assert.strictEqual(last.stage, 'dev');
  });

  it('builds a healing prompt containing the error', () => {
    const prompt = buildHealingPrompt('BASE PROMPT', 'dev', { error: 'tsc failed' }, 1);
    assert.ok(prompt.includes('BASE PROMPT'));
    assert.ok(prompt.includes('tsc failed'));
    assert.ok(prompt.includes('retry attempt **1**'));
    assert.ok(prompt.includes('Self-Healing Context'));
  });
});
