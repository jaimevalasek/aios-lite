'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { runQaInit } = require('../src/commands/qa-init');

const mockT = (key, vars = {}) => {
  const messages = {
    'qa_init.context_found': `Context found: ${vars.name || ''} @ ${vars.url || ''}`,
    'qa_init.prd_found': `PRD found: ${vars.count || 0} ACs`,
    'qa_init.prd_missing': 'PRD missing',
    'qa_init.generated': `Generated: ${vars.path || ''}`,
    'qa_init.dry_run_generated': `Dry run: ${vars.path || ''}`,
    'qa_init.scenarios_count': `Scenarios: ${vars.count || 0}`,
    'qa_init.personas_count': `Personas: ${vars.count || 0}`,
    'qa_init.probes_count': `Probes: ${vars.count || 0}`,
    'qa_init.next_steps': 'Next steps:',
    'qa_init.step_doctor': '  1. Run doctor',
    'qa_init.step_run': '  2. Run tests'
  };
  return messages[key] || key;
};

const mockLogger = { log: () => {}, error: () => {}, warn: () => {} };

describe('qa-init.js — runQaInit', () => {
  let tmpDir;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-init-test-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('generates config with defaults when no context exists', async () => {
    const result = await runQaInit({
      args: [tmpDir],
      options: {},
      logger: mockLogger,
      t: mockT
    });
    assert.equal(result.ok, true);
    assert.equal(result.written, true);
    assert.equal(result.scenariosCount, 0);
    assert.equal(result.projectName, path.basename(tmpDir));
    assert.equal(result.url, 'http://localhost:3000');
    assert.ok(result.config);
    assert.ok(Array.isArray(result.config.personas));
    assert.ok(Array.isArray(result.config.security_probes));

    const fileContent = await fs.readFile(path.join(tmpDir, 'aios-qa.config.json'), 'utf8');
    const parsed = JSON.parse(fileContent);
    assert.equal(parsed.url, 'http://localhost:3000');
    assert.equal(parsed.project_name, path.basename(tmpDir));
  });

  it('dry-run does not write file', async () => {
    const result = await runQaInit({
      args: [tmpDir],
      options: { 'dry-run': true },
      logger: mockLogger,
      t: mockT
    });
    assert.equal(result.ok, true);
    assert.equal(result.dryRun, true);
    assert.equal(result.written, false);

    try {
      await fs.access(path.join(tmpDir, 'aios-qa.config.json'));
      assert.fail('Config file should not exist in dry-run mode');
    } catch {
      // expected
    }
  });

  it('extracts AC items from prd.md', async () => {
    await fs.mkdir(path.join(tmpDir, '.aioson', 'context'), { recursive: true });
    await fs.writeFile(
      path.join(tmpDir, '.aioson', 'context', 'prd.md'),
      '| AC-01 | User can login |\n| AC-02 | User can logout |\n'
    );
    const result = await runQaInit({
      args: [tmpDir],
      options: {},
      logger: mockLogger,
      t: mockT
    });
    assert.equal(result.scenariosCount, 2);
    assert.equal(result.config.scenarios.length, 2);
    assert.equal(result.config.scenarios[0].id, 'AC-01');
    assert.equal(result.config.scenarios[1].id, 'AC-02');
  });

  it('reads URL from project.context.md list-style frontmatter', async () => {
    await fs.mkdir(path.join(tmpDir, '.aioson', 'context'), { recursive: true });
    await fs.writeFile(
      path.join(tmpDir, '.aioson', 'context', 'project.context.md'),
      '- app_url: http://localhost:8080\n'
    );
    const result = await runQaInit({
      args: [tmpDir],
      options: {},
      logger: mockLogger,
      t: mockT
    });
    assert.equal(result.url, 'http://localhost:8080');
    assert.equal(result.config.url, 'http://localhost:8080');
  });

  it('reads URL from project.context.md pure YAML frontmatter', async () => {
    await fs.mkdir(path.join(tmpDir, '.aioson', 'context'), { recursive: true });
    await fs.writeFile(
      path.join(tmpDir, '.aioson', 'context', 'project.context.md'),
      '---\napp_url: http://localhost:9090\n---\n'
    );
    const result = await runQaInit({
      args: [tmpDir],
      options: {},
      logger: mockLogger,
      t: mockT
    });
    assert.equal(result.url, 'http://localhost:9090');
    assert.equal(result.config.url, 'http://localhost:9090');
  });

  it('CLI --url overrides context frontmatter', async () => {
    await fs.mkdir(path.join(tmpDir, '.aioson', 'context'), { recursive: true });
    await fs.writeFile(
      path.join(tmpDir, '.aioson', 'context', 'project.context.md'),
      '---\napp_url: http://localhost:8080\n---\n'
    );
    const result = await runQaInit({
      args: [tmpDir],
      options: { url: 'http://localhost:9999' },
      logger: mockLogger,
      t: mockT
    });
    assert.equal(result.url, 'http://localhost:9999');
  });

  it('returns JSON when options.json is true', async () => {
    const result = await runQaInit({
      args: [tmpDir],
      options: { json: true },
      logger: mockLogger,
      t: mockT
    });
    assert.equal(typeof result, 'object');
    assert.equal(result.ok, true);
    assert.ok(result.config);
  });
});
