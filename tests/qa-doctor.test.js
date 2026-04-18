'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { runQaDoctor } = require('../src/commands/qa-doctor');

const mockT = (key, vars = {}) => {
  const messages = {
    'qa_doctor.playwright_ok': 'Playwright OK',
    'qa_doctor.playwright_missing': 'Playwright missing',
    'qa_doctor.playwright_missing_hint': 'Install playwright',
    'qa_doctor.chromium_ok': 'Chromium OK',
    'qa_doctor.chromium_missing': 'Chromium missing',
    'qa_doctor.chromium_missing_hint': 'Install chromium',
    'qa_doctor.config_ok': 'Config OK',
    'qa_doctor.config_missing': 'Config missing',
    'qa_doctor.config_missing_hint': 'Create config',
    'qa_doctor.config_invalid': `Config invalid: ${vars.error || ''}`,
    'qa_doctor.url_ok': `URL OK: ${vars.url || ''}`,
    'qa_doctor.url_missing': 'URL missing',
    'qa_doctor.url_missing_hint': 'Add URL',
    'qa_doctor.url_unreachable': `URL unreachable: ${vars.url || ''} (${vars.error || ''})`,
    'qa_doctor.url_unreachable_hint': 'Check URL',
    'qa_doctor.context_ok': 'Context OK',
    'qa_doctor.context_missing': 'Context missing',
    'qa_doctor.prd_ok': `PRD OK: ${vars.count || 0} ACs`,
    'qa_doctor.prd_missing': 'PRD missing',
    'qa_doctor.report_title': 'QA Doctor Report',
    'qa_doctor.prefix_ok': '[OK]',
    'qa_doctor.prefix_warn': '[WARN]',
    'qa_doctor.prefix_fail': '[FAIL]',
    'qa_doctor.check_line': `${vars.prefix || ''} ${vars.id || ''}: ${vars.message || ''}`,
    'qa_doctor.hint_line': `  Hint: ${vars.hint || ''}`,
    'qa_doctor.summary': `Passed: ${vars.passed || 0}, Failed: ${vars.failed || 0}, Warnings: ${vars.warnings || 0}`
  };
  return messages[key] || key;
};

const mockLogger = { log: () => {}, error: () => {}, warn: () => {} };

describe('qa-doctor.js — runQaDoctor', () => {
  let tmpDir;
  let originalExitCode;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-doctor-test-'));
    originalExitCode = process.exitCode;
    process.exitCode = 0;
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
    process.exitCode = originalExitCode;
  });

  it('returns ok=false when no config exists', async () => {
    const result = await runQaDoctor({
      args: [tmpDir],
      options: {},
      logger: mockLogger,
      t: mockT
    });
    assert.equal(result.ok, false);
    assert.equal(result.configExists, false);
    assert.equal(result.configParsed, false);
    const configCheck = result.checks.find((c) => c.id === 'config.exists');
    assert.ok(configCheck);
    assert.equal(configCheck.ok, false);
    assert.equal(configCheck.severity, 'error');
  });

  it('returns ok=false when config is invalid JSON', async () => {
    await fs.writeFile(path.join(tmpDir, 'aios-qa.config.json'), '{ invalid');
    const result = await runQaDoctor({
      args: [tmpDir],
      options: {},
      logger: mockLogger,
      t: mockT
    });
    assert.equal(result.ok, false);
    assert.equal(result.configExists, true);
    assert.equal(result.configParsed, false);
    const configCheck = result.checks.find((c) => c.id === 'config.parsed');
    assert.ok(configCheck);
    assert.equal(configCheck.ok, false);
    assert.equal(configCheck.severity, 'error');
  });

  it('marks missing URL as warn when config exists but URL is empty', async () => {
    await fs.writeFile(path.join(tmpDir, 'aios-qa.config.json'), JSON.stringify({ url: '' }));
    const result = await runQaDoctor({
      args: [tmpDir],
      options: {},
      logger: mockLogger,
      t: mockT
    });
    const urlCheck = result.checks.find((c) => c.id === 'url.reachable');
    assert.ok(urlCheck);
    assert.equal(urlCheck.ok, false);
    assert.equal(urlCheck.severity, 'warn');
    // ok may be false if playwright is not installed — that is environment-dependent
    assert.equal(typeof result.ok, 'boolean');
  });

  it('counts AC items in prd.md', async () => {
    await fs.writeFile(path.join(tmpDir, 'aios-qa.config.json'), JSON.stringify({ url: 'http://localhost:3000' }));
    await fs.mkdir(path.join(tmpDir, '.aioson', 'context'), { recursive: true });
    await fs.writeFile(path.join(tmpDir, '.aioson', 'context', 'prd.md'), '| AC-01 | First item |\n| AC-02 | Second item |\n');
    const result = await runQaDoctor({
      args: [tmpDir],
      options: {},
      logger: mockLogger,
      t: mockT
    });
    const prdCheck = result.checks.find((c) => c.id === 'prd.exists');
    assert.ok(prdCheck);
    assert.equal(prdCheck.ok, true);
  });

  it('includes project.context.md check', async () => {
    await fs.writeFile(path.join(tmpDir, 'aios-qa.config.json'), JSON.stringify({ url: 'http://localhost:3000' }));
    const result = await runQaDoctor({
      args: [tmpDir],
      options: {},
      logger: mockLogger,
      t: mockT
    });
    const contextCheck = result.checks.find((c) => c.id === 'context.exists');
    assert.ok(contextCheck);
    assert.equal(contextCheck.ok, false); // no context file
    assert.equal(contextCheck.severity, 'warn');
  });

  it('returns JSON when options.json is true', async () => {
    await fs.writeFile(path.join(tmpDir, 'aios-qa.config.json'), JSON.stringify({ url: 'http://localhost:3000' }));
    const result = await runQaDoctor({
      args: [tmpDir],
      options: { json: true },
      logger: mockLogger,
      t: mockT
    });
    assert.equal(typeof result, 'object');
    assert.ok(Array.isArray(result.checks));
    assert.ok(result.summary);
  });
});
