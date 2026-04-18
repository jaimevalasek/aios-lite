'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { runQaReport } = require('../src/commands/qa-report');

const mockT = (key, vars = {}) => {
  const messages = {
    'qa_report.not_found': 'Report not found',
    'qa_report.html_report_written': `HTML report written: ${vars.path || ''}`
  };
  return messages[key] || key;
};

const mockLogger = { log: () => {}, error: () => {}, warn: () => {} };

describe('qa-report.js — runQaReport', () => {
  let tmpDir;
  let originalExitCode;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-report-test-'));
    originalExitCode = process.exitCode;
    process.exitCode = 0;
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
    process.exitCode = originalExitCode;
  });

  it('returns error when no report files exist', async () => {
    const result = await runQaReport({
      args: [tmpDir],
      options: {},
      logger: mockLogger,
      t: mockT
    });
    assert.equal(result.ok, false);
    assert.equal(result.error, 'report_not_found');
  });

  it('returns markdown content when aios-qa-report.md exists', async () => {
    const content = '# QA Report\n\nSome findings here.\n';
    await fs.writeFile(path.join(tmpDir, 'aios-qa-report.md'), content);
    const result = await runQaReport({
      args: [tmpDir],
      options: {},
      logger: mockLogger,
      t: mockT
    });
    assert.equal(result.ok, true);
    assert.equal(result.path, path.join(tmpDir, 'aios-qa-report.md'));
  });

  it('returns JSON data when options.json is true and aios-qa-report.json exists', async () => {
    const data = { project: 'Test', findings: [], summary: { critical: 0, high: 0 } };
    await fs.writeFile(path.join(tmpDir, 'aios-qa-report.json'), JSON.stringify(data));
    const result = await runQaReport({
      args: [tmpDir],
      options: { json: true },
      logger: mockLogger,
      t: mockT
    });
    assert.equal(result.ok, true);
    assert.equal(result.project, 'Test');
    assert.deepEqual(result.summary, { critical: 0, high: 0 });
  });

  it('returns error for JSON mode when report JSON missing', async () => {
    const result = await runQaReport({
      args: [tmpDir],
      options: { json: true },
      logger: mockLogger,
      t: mockT
    });
    assert.equal(result.ok, false);
    assert.equal(result.error, 'report_not_found');
  });

  it('returns error for invalid JSON report', async () => {
    await fs.writeFile(path.join(tmpDir, 'aios-qa-report.json'), '{ invalid');
    const result = await runQaReport({
      args: [tmpDir],
      options: { json: true },
      logger: mockLogger,
      t: mockT
    });
    assert.equal(result.ok, false);
    assert.ok(result.error.includes('JSON') || result.error.includes('Unexpected token'));
  });
});
