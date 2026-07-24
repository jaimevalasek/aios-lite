'use strict';

const fs = require('node:fs');
const Module = require('node:module');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
// Test files are parsed by `node --test`; checking them again would double
// process startup cost in CI. This pass covers shipped runtime and scripts.
const TARGET_DIRS = ['src', 'bin', 'scripts'];
const EXTENSIONS = new Set(['.js', '.cjs', '.mjs']);

function collectJsFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...collectJsFiles(abs));
    } else if (entry.isFile() && EXTENSIONS.has(path.extname(entry.name))) {
      out.push(abs);
    }
  }
  return out;
}

function resolveConcurrency(value = process.env.AIOSON_SYNTAX_WORKERS) {
  const requested = Number.parseInt(String(value || ''), 10);
  if (Number.isInteger(requested) && requested > 0) return Math.min(requested, 32);
  return Math.max(1, Math.min(8, os.availableParallelism?.() || os.cpus().length || 1));
}

function checkFile(file) {
  if (path.extname(file) !== '.mjs') {
    try {
      const source = fs.readFileSync(file, 'utf8')
        .replace(/^\uFEFF/, '')
        .replace(/^#!.*(?:\r?\n|$)/, '');
      new vm.Script(Module.wrap(source), { filename: file, displayErrors: true });
      return Promise.resolve({ file, ok: true, output: '' });
    } catch (error) {
      return Promise.resolve({ file, ok: false, output: error.stack || error.message });
    }
  }
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ['--check', file], {
      cwd: ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true
    });
    let output = '';
    child.stdout.on('data', (chunk) => { output += chunk; });
    child.stderr.on('data', (chunk) => { output += chunk; });
    child.on('error', (error) => resolve({ file, ok: false, output: error.message }));
    child.on('close', (code) => resolve({ file, ok: code === 0, output: output.trim() }));
  });
}

async function runSyntaxCheck(options = {}) {
  const files = (options.files || TARGET_DIRS
    .map((dir) => path.join(ROOT, dir))
    .filter((dir) => fs.existsSync(dir))
    .flatMap(collectJsFiles))
    .sort();
  const concurrency = resolveConcurrency(options.concurrency);
  const failures = [];
  let cursor = 0;

  async function worker() {
    while (cursor < files.length) {
      const file = files[cursor];
      cursor += 1;
      const result = await checkFile(file);
      if (!result.ok) failures.push(result);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, Math.max(files.length, 1)) }, () => worker())
  );
  return { ok: failures.length === 0, files: files.length, concurrency, failures };
}

if (require.main === module) {
  runSyntaxCheck()
    .then((result) => {
      for (const failure of result.failures) {
        process.stderr.write(`\n[syntax] ${path.relative(ROOT, failure.file)}\n${failure.output || '(no output)'}\n`);
      }
      process.stdout.write(`Syntax checked ${result.files} JavaScript files with ${result.concurrency} workers.\n`);
      if (!result.ok) process.exitCode = 1;
    })
    .catch((error) => {
      process.stderr.write(`${error.stack || error.message}\n`);
      process.exitCode = 1;
    });
}

module.exports = {
  TARGET_DIRS,
  collectJsFiles,
  resolveConcurrency,
  runSyntaxCheck
};
