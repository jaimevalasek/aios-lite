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
  assert.equal(parsed.web3Target, 'ethereum');
  assert.equal(parsed.stepCount >= 10, true);
});

test('mcp:init --json returns structured plan payload', async () => {
  const dir = await makeTempDir();
  const cli = await runCli(['mcp:init', dir, '--json']);
  assert.equal(cli.code, 0);
  assert.equal(cli.stderr.trim(), '');
  const parsed = JSON.parse(cli.stdout);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.serverCount >= 4, true);
  assert.equal(Array.isArray(parsed.plan.servers), true);
});

test('unknown command with --json returns structured error', async () => {
  const cli = await runCli(['unknown', '--json']);
  assert.equal(cli.code, 1);
  assert.equal(cli.stderr.trim(), '');
  const parsed = JSON.parse(cli.stdout);
  assert.equal(parsed.ok, false);
  assert.equal(parsed.error.code, 'unknown_command');
});
