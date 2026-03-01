'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

async function makeTempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'aios-lite-json-cli-'));
}

function runCli(args, cwd = process.cwd()) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(process.cwd(), 'bin/aios-lite.js'), ...args], {
      cwd,
      env: process.env
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });
    child.on('close', (code) => {
      resolve({ code, stdout, stderr });
    });
  });
}

test('info --json returns structured payload', async () => {
  const dir = await makeTempDir();
  const cli = await runCli(['info', dir, '--json']);
  assert.equal(cli.code, 0);
  assert.equal(cli.stderr.trim(), '');
  const parsed = JSON.parse(cli.stdout);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.targetDir, path.resolve(dir));
});

test('context:validate --json returns non-zero and reason for missing file', async () => {
  const dir = await makeTempDir();
  const cli = await runCli(['context:validate', dir, '--json']);
  assert.equal(cli.code, 1);
  assert.equal(cli.stderr.trim(), '');
  const parsed = JSON.parse(cli.stdout);
  assert.equal(parsed.ok, false);
  assert.equal(parsed.reason, 'missing_file');
});

test('doctor --json returns report payload and non-zero for unhealthy workspace', async () => {
  const dir = await makeTempDir();
  const cli = await runCli(['doctor', dir, '--json']);
  assert.equal(cli.code, 1);
  assert.equal(cli.stderr.trim(), '');
  const parsed = JSON.parse(cli.stdout);
  assert.equal(parsed.ok, false);
  assert.equal(parsed.fix.enabled, false);
  assert.equal(Array.isArray(parsed.report.checks), true);
});

test('test:smoke --json returns structured success payload', async () => {
  const cli = await runCli(['test:smoke', '--json', '--web3=ethereum']);
  assert.equal(cli.code, 0);
  assert.equal(cli.stderr.trim(), '');
  const parsed = JSON.parse(cli.stdout);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.profile, 'standard');
  assert.equal(parsed.web3Target, 'ethereum');
  assert.equal(parsed.stepCount >= 10, true);
});

test('test:smoke --json works with es and fr locales', async () => {
  for (const locale of ['es', 'fr']) {
    const cli = await runCli(['test:smoke', '--json', `--locale=${locale}`]);
    assert.equal(cli.code, 0);
    assert.equal(cli.stderr.trim(), '');
    const parsed = JSON.parse(cli.stdout);
    assert.equal(parsed.ok, true);
    assert.equal(parsed.profile, 'standard');
    assert.equal(parsed.web3Target, null);
    assert.equal(parsed.stepCount >= 8, true);
  }
});

test('mcp:init --json returns structured plan payload', async () => {
  const dir = await makeTempDir();
  const cli = await runCli(['mcp:init', dir, '--json']);
  assert.equal(cli.code, 0);
  assert.equal(cli.stderr.trim(), '');
  const parsed = JSON.parse(cli.stdout);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.serverCount >= 4, true);
  assert.equal(parsed.presetCount >= 1, true);
  assert.equal(Array.isArray(parsed.presetFiles), true);
  assert.equal(Array.isArray(parsed.plan.servers), true);
});

test('mcp:doctor --json returns structured validation payload', async () => {
  const dir = await makeTempDir();
  const init = await runCli(['mcp:init', dir, '--json']);
  assert.equal(init.code, 0);

  const cli = await runCli(['mcp:doctor', dir, '--json']);
  assert.equal(cli.code, 0);
  assert.equal(cli.stderr.trim(), '');
  const parsed = JSON.parse(cli.stdout);
  assert.equal(parsed.ok, true);
  assert.equal(typeof parsed.strictEnv, 'boolean');
  assert.equal(Array.isArray(parsed.checks), true);
  assert.equal(typeof parsed.summary.total, 'number');
  assert.equal(typeof parsed.summary.failed, 'number');
});

test('test:package --dry-run --json returns plan payload', async () => {
  const cli = await runCli(['test:package', '--dry-run', '--json']);
  assert.equal(cli.code, 0);
  assert.equal(cli.stderr.trim(), '');
  const parsed = JSON.parse(cli.stdout);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.dryRun, true);
  assert.equal(Array.isArray(parsed.steps), true);
});

test('workflow:plan --json returns workflow payload', async () => {
  const cli = await runCli(['workflow:plan', '--classification=SMALL', '--json']);
  assert.equal(cli.code, 0);
  assert.equal(cli.stderr.trim(), '');
  const parsed = JSON.parse(cli.stdout);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.classification, 'SMALL');
  assert.equal(Array.isArray(parsed.commands), true);
  assert.equal(parsed.commands.includes('@architect'), true);
});

test('parallel:init --json returns structured parallel workspace payload', async () => {
  const dir = await makeTempDir();
  const contextPath = path.join(dir, '.aios-lite/context/project.context.md');
  await fs.mkdir(path.dirname(contextPath), { recursive: true });
  await fs.writeFile(
    contextPath,
    `---\nproject_name: \"demo\"\nproject_type: \"web_app\"\nprofile: \"developer\"\nframework: \"Node\"\nframework_installed: true\nclassification: \"MEDIUM\"\nconversation_language: \"en\"\naios_lite_version: \"0.1.9\"\n---\n\n# Project Context\n`,
    'utf8'
  );

  const cli = await runCli(['parallel:init', dir, '--json', '--workers=2']);
  assert.equal(cli.code, 0);
  assert.equal(cli.stderr.trim(), '');
  const parsed = JSON.parse(cli.stdout);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.workers, 2);
  assert.equal(parsed.classification, 'MEDIUM');
  assert.equal(Array.isArray(parsed.files), true);
  assert.equal(parsed.files.length, 3);
});

test('parallel:doctor --json returns structured diagnosis payload', async () => {
  const dir = await makeTempDir();
  const contextPath = path.join(dir, '.aios-lite/context/project.context.md');
  await fs.mkdir(path.dirname(contextPath), { recursive: true });
  await fs.writeFile(
    contextPath,
    `---\nproject_name: \"demo\"\nproject_type: \"web_app\"\nprofile: \"developer\"\nframework: \"Node\"\nframework_installed: true\nclassification: \"MEDIUM\"\nconversation_language: \"en\"\naios_lite_version: \"0.1.9\"\n---\n\n# Project Context\n`,
    'utf8'
  );

  const init = await runCli(['parallel:init', dir, '--workers=2', '--json']);
  assert.equal(init.code, 0);

  const cli = await runCli(['parallel:doctor', dir, '--workers=2', '--json']);
  assert.equal(cli.code, 0);
  assert.equal(cli.stderr.trim(), '');
  const parsed = JSON.parse(cli.stdout);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.workers, 2);
  assert.equal(typeof parsed.fix.enabled, 'boolean');
  assert.equal(Array.isArray(parsed.checks), true);
  assert.equal(typeof parsed.summary.failed, 'number');
});

test('parallel:assign --json returns structured assignment payload', async () => {
  const dir = await makeTempDir();
  const contextPath = path.join(dir, '.aios-lite/context/project.context.md');
  const architecturePath = path.join(dir, '.aios-lite/context/architecture.md');
  await fs.mkdir(path.dirname(contextPath), { recursive: true });
  await fs.writeFile(
    contextPath,
    `---\nproject_name: \"demo\"\nproject_type: \"web_app\"\nprofile: \"developer\"\nframework: \"Node\"\nframework_installed: true\nclassification: \"MEDIUM\"\nconversation_language: \"en\"\naios_lite_version: \"0.1.9\"\n---\n\n# Project Context\n`,
    'utf8'
  );
  await fs.writeFile(
    architecturePath,
    '# Architecture\n\n## Auth Module\n## Billing Module\n## Notification Pipeline\n',
    'utf8'
  );

  const init = await runCli(['parallel:init', dir, '--workers=2', '--json']);
  assert.equal(init.code, 0);

  const cli = await runCli([
    'parallel:assign',
    dir,
    '--source=architecture',
    '--workers=2',
    '--json'
  ]);
  assert.equal(cli.code, 0);
  assert.equal(cli.stderr.trim(), '');
  const parsed = JSON.parse(cli.stdout);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.workers, 2);
  assert.equal(parsed.source, 'architecture');
  assert.equal(typeof parsed.scopeCount, 'number');
  assert.equal(Array.isArray(parsed.assignments), true);
});

test('unknown command with --json returns structured error', async () => {
  const cli = await runCli(['unknown', '--json']);
  assert.equal(cli.code, 1);
  assert.equal(cli.stderr.trim(), '');
  const parsed = JSON.parse(cli.stdout);
  assert.equal(parsed.ok, false);
  assert.equal(parsed.error.code, 'unknown_command');
});
