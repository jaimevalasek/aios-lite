'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawn } = require('node:child_process');

function runCli(args, options = {}) {
  const cwd = options.cwd || process.cwd();
  const env = { ...process.env, ...(options.env || {}) };
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(process.cwd(), 'bin/aioson.js'), ...args], {
      cwd,
      env
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

test('help output is localized with --locale=pt-BR', async () => {
  const cli = await runCli(['help', '--locale=pt-BR']);
  assert.equal(cli.code, 0);
  assert.equal(cli.stdout.includes('CLI do AIOSON'), true);
  assert.equal(cli.stdout.includes('Uso:'), true);
});

test('unknown command error is localized in pt-BR', async () => {
  const cli = await runCli(['comando-inexistente', '--locale=pt-BR']);
  assert.equal(cli.code, 1);
  assert.equal(cli.stderr.includes('Comando desconhecido'), true);
});

test('legacy dashboard command error is localized in pt-BR', async () => {
  const cli = await runCli(['dashboard:init', '--locale=pt-BR']);
  assert.equal(cli.code, 1);
  assert.equal(cli.stderr.includes('foi removido do CLI'), true);
  assert.equal(cli.stderr.includes('.aioson/'), true);
});

test('env locale pt resolves to pt-BR dictionary', async () => {
  const cli = await runCli(['help'], { env: { AIOS_LITE_LOCALE: 'pt' } });
  assert.equal(cli.code, 0);
  assert.equal(cli.stdout.includes('Uso:'), true);
  assert.equal(cli.stdout.includes('CLI do AIOSON'), true);
});

test('regional locale es-MX resolves to es dictionary', async () => {
  const cli = await runCli(['help', '--locale=es-MX']);
  assert.equal(cli.code, 0);
  assert.equal(cli.stdout.includes('Uso:'), true);
  assert.equal(cli.stdout.includes('AIOSON CLI'), true);
});

test('regional locale fr_CA resolves to fr dictionary', async () => {
  const cli = await runCli(['help'], { env: { AIOS_LITE_LOCALE: 'fr_CA' } });
  assert.equal(cli.code, 0);
  assert.equal(cli.stdout.includes('Utilisation :'), true);
  assert.equal(cli.stdout.includes('AIOSON CLI'), true);
});
