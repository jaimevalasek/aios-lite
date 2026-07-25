'use strict';

const fs = require('node:fs/promises');
const { existsSync } = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const SHIPPED_ROOTS = ['bin', 'src', 'scripts', 'template', 'docs'];
const REQUIRED_PACKAGE_FILES = [
  'package.json',
  'bin/aioson.js',
  'src/cli.js',
  'template/AGENTS.md',
  'template/.aioson/config.md'
];
function parseArgs(argv = []) {
  const options = {
    full: false,
    allowUntracked: false,
    json: false
  };

  for (const argument of argv) {
    if (argument === '--full') options.full = true;
    else if (argument === '--allow-untracked') options.allowUntracked = true;
    else if (argument === '--json') options.json = true;
    else throw new Error(`Unknown option: ${argument}`);
  }

  return options;
}

function normalizePackagePath(value) {
  return String(value || '').replace(/\\/g, '/').replace(/^\.\//, '');
}

function parseJsonOutput(stdout, label) {
  const text = String(stdout || '').trim();
  if (!text) throw new Error(`${label} returned no JSON output.`);
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`${label} returned invalid JSON: ${error.message}`);
  }
}

function extractPackFiles(packResult) {
  const entries = Array.isArray(packResult) ? packResult : [];
  const first = entries[0];
  if (!first || !Array.isArray(first.files)) {
    throw new Error('npm pack did not return a package file inventory.');
  }
  return first.files.map((entry) => normalizePackagePath(entry.path)).filter(Boolean);
}

function validatePackContents(packageFiles, requiredFiles = REQUIRED_PACKAGE_FILES) {
  const included = new Set(packageFiles.map(normalizePackagePath));
  return requiredFiles
    .map(normalizePackagePath)
    .filter((required) => !included.has(required));
}

function filterUntrackedShippedFiles(stdout, shippedRoots = SHIPPED_ROOTS) {
  const prefixes = shippedRoots.map((root) => `${normalizePackagePath(root).replace(/\/+$/, '')}/`);
  return String(stdout || '')
    .split(/\r?\n/)
    .map((line) => normalizePackagePath(line.trim()))
    .filter(Boolean)
    .filter((file) => prefixes.some((prefix) => file.startsWith(prefix)))
    .sort();
}

function isIdentifierChar(char) {
  return Boolean(char && /[A-Za-z0-9_$]/.test(char));
}

function skipQuotedValue(content, start) {
  const quote = content[start];
  let index = start + 1;
  let value = '';
  while (index < content.length) {
    const char = content[index];
    if (char === '\\') {
      if (index + 1 < content.length) value += content[index + 1];
      index += 2;
      continue;
    }
    if (char === quote) return { value, end: index + 1 };
    value += char;
    index += 1;
  }
  return { value, end: content.length };
}

function skipWhitespace(content, start) {
  let index = start;
  while (index < content.length && /\s/.test(content[index])) index += 1;
  return index;
}

function readCallSpecifier(content, start) {
  let index = skipWhitespace(content, start);
  if (content[index] !== '(') return null;
  index = skipWhitespace(content, index + 1);
  if (!['"', "'"].includes(content[index])) return null;
  return skipQuotedValue(content, index);
}

function collectLocalSpecifiers(content) {
  const source = String(content || '');
  const specifiers = new Set();
  let index = 0;

  while (index < source.length) {
    const char = source[index];
    if (char === '/' && source[index + 1] === '/') {
      const newline = source.indexOf('\n', index + 2);
      index = newline === -1 ? source.length : newline + 1;
      continue;
    }
    if (char === '/' && source[index + 1] === '*') {
      const end = source.indexOf('*/', index + 2);
      index = end === -1 ? source.length : end + 2;
      continue;
    }
    if (['"', "'", '`'].includes(char)) {
      index = skipQuotedValue(source, index).end;
      continue;
    }
    if (!/[A-Za-z_$]/.test(char) || isIdentifierChar(source[index - 1])) {
      index += 1;
      continue;
    }

    let end = index + 1;
    while (isIdentifierChar(source[end])) end += 1;
    const token = source.slice(index, end);

    if (token === 'require') {
      let callStart = end;
      if (source.slice(end, end + 8) === '.resolve') callStart = end + 8;
      const literal = readCallSpecifier(source, callStart);
      if (literal && /^\.{1,2}\//.test(literal.value)) specifiers.add(literal.value);
    } else if (token === 'import') {
      const dynamicLiteral = readCallSpecifier(source, end);
      if (dynamicLiteral && /^\.{1,2}\//.test(dynamicLiteral.value)) {
        specifiers.add(dynamicLiteral.value);
      } else {
        const statementEndCandidates = [
          source.indexOf('\n', end),
          source.indexOf(';', end)
        ].filter((value) => value !== -1);
        const statementEnd = statementEndCandidates.length > 0
          ? Math.min(...statementEndCandidates)
          : source.length;
        const statement = source.slice(end, statementEnd);
        const match = statement.match(/(?:\bfrom\s*)?(['"])(\.{1,2}\/[^'"]+)\1/);
        if (match) specifiers.add(match[2]);
      }
    } else if (token === 'export') {
      const statementEndCandidates = [
        source.indexOf('\n', end),
        source.indexOf(';', end)
      ].filter((value) => value !== -1);
      const statementEnd = statementEndCandidates.length > 0
        ? Math.min(...statementEndCandidates)
        : source.length;
      const statement = source.slice(end, statementEnd);
      const match = statement.match(/\bfrom\s*(['"])(\.{1,2}\/[^'"]+)\1/);
      if (match) specifiers.add(match[2]);
    }

    index = end;
  }

  return [...specifiers];
}

async function resolveLocalDependency(projectRoot, sourceFile, specifier) {
  const rawTarget = path.resolve(projectRoot, path.dirname(sourceFile), specifier);
  const candidates = path.extname(rawTarget)
    ? [rawTarget]
    : [
        rawTarget,
        `${rawTarget}.js`,
        `${rawTarget}.json`,
        path.join(rawTarget, 'index.js'),
        path.join(rawTarget, 'index.json')
      ];

  for (const candidate of candidates) {
    try {
      const stat = await fs.stat(candidate);
      if (stat.isFile()) return normalizePackagePath(path.relative(projectRoot, candidate));
    } catch {
      // Continue through Node's local resolution candidates.
    }
  }

  return null;
}

async function findMissingLocalDependencies(projectRoot, packageFiles) {
  const included = new Set(packageFiles.map(normalizePackagePath));
  const sourceFiles = packageFiles
    .map(normalizePackagePath)
    .filter((file) => /^(?:bin|src|scripts)\/.*\.(?:c?js|mjs)$/.test(file));
  const missing = [];

  for (const sourceFile of sourceFiles) {
    const absoluteSource = path.resolve(projectRoot, ...sourceFile.split('/'));
    const content = await fs.readFile(absoluteSource, 'utf8');
    for (const specifier of collectLocalSpecifiers(content)) {
      const target = await resolveLocalDependency(projectRoot, sourceFile, specifier);
      if (!target || !included.has(target)) {
        missing.push({
          source: sourceFile,
          specifier,
          resolved: target
        });
      }
    }
  }

  return missing.sort((left, right) => (
    left.source.localeCompare(right.source)
    || left.specifier.localeCompare(right.specifier)
  ));
}

function commandLabel(command, args) {
  return [command, ...args].join(' ');
}

function resolveCommandInvocation(command, args, options = {}) {
  const platform = options.platform || process.platform;
  const execPath = options.execPath || process.execPath;
  const env = options.env || process.env;
  if (platform !== 'win32' || !['npm', 'npx'].includes(command)) {
    return { command, args };
  }

  const cliName = command === 'npm' ? 'npm-cli.js' : 'npx-cli.js';
  const npmExecPath = String(env.npm_execpath || '');
  const candidates = [
    command === 'npm' ? npmExecPath : npmExecPath.replace(/npm-cli\.js$/i, 'npx-cli.js'),
    path.join(path.dirname(execPath), 'node_modules', 'npm', 'bin', cliName)
  ].filter(Boolean);
  const cliPath = candidates.find((candidate) => existsSync(candidate));
  if (!cliPath) {
    throw new Error(`Unable to locate ${cliName} for a shell-free Windows execution.`);
  }
  return {
    command: execPath,
    args: [cliPath, ...args]
  };
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    let invocation;
    try {
      invocation = resolveCommandInvocation(command, args, options);
    } catch (error) {
      reject(error);
      return;
    }
    const child = spawn(invocation.command, invocation.args, {
      cwd: options.cwd || PROJECT_ROOT,
      env: { ...process.env, ...(options.env || {}) },
      shell: false,
      windowsHide: true
    });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      const text = String(chunk);
      stdout += text;
      if (options.echo) process.stdout.write(text);
    });
    child.stderr.on('data', (chunk) => {
      const text = String(chunk);
      stderr += text;
      if (options.echo) process.stderr.write(text);
    });
    child.on('error', reject);
    child.on('close', (code) => {
      resolve({
        code: Number(code ?? 1),
        stdout,
        stderr
      });
    });
  });
}

async function requireSuccessfulCommand(command, args, options = {}) {
  const result = await runCommand(command, args, options);
  if (result.code !== 0) {
    const detail = String(result.stderr || result.stdout || '').trim();
    throw new Error(
      `${commandLabel(command, args)} failed with exit code ${result.code}`
      + (detail ? `:\n${detail}` : '.')
    );
  }
  return result;
}

async function runReleaseReadiness(options = {}) {
  const projectRoot = path.resolve(options.projectRoot || PROJECT_ROOT);
  const runner = options.runner || requireSuccessfulCommand;
  const full = Boolean(options.full);
  const echo = !options.json;
  const checks = [];

  const execute = async (id, command, args, commandOptions = {}) => {
    if (echo) process.stdout.write(`\n==> ${id}: ${commandLabel(command, args)}\n`);
    const result = await runner(command, args, {
      cwd: projectRoot,
      echo,
      ...commandOptions
    });
    checks.push({ id, ok: true });
    return result;
  };

  await execute('git-diff-check', 'git', ['diff', '--check']);

  const untrackedResult = await execute(
    'untracked-package-files',
    'git',
    ['ls-files', '--others', '--exclude-standard', '--', ...SHIPPED_ROOTS]
  );
  const untracked = filterUntrackedShippedFiles(untrackedResult.stdout);
  if (untracked.length > 0 && !options.allowUntracked) {
    throw new Error(
      'Untracked files would be shipped but are absent from the release commit:\n'
      + untracked.map((file) => `- ${file}`).join('\n')
    );
  }
  checks[checks.length - 1].untracked = untracked;
  checks[checks.length - 1].allowed = Boolean(options.allowUntracked && untracked.length);

  await execute('dependency-audit', 'npm', ['audit', '--omit=dev', '--audit-level=high']);

  const packResult = await execute('package-inventory', 'npm', ['pack', '--dry-run', '--json'], {
    echo: false
  });
  const packageFiles = extractPackFiles(parseJsonOutput(packResult.stdout, 'npm pack'));
  const missingRequired = validatePackContents(packageFiles);
  if (missingRequired.length > 0) {
    throw new Error(
      'Required package files are missing from npm pack:\n'
      + missingRequired.map((file) => `- ${file}`).join('\n')
    );
  }

  const missingDependencies = await findMissingLocalDependencies(projectRoot, packageFiles);
  if (missingDependencies.length > 0) {
    throw new Error(
      'Local runtime dependencies are missing from npm pack:\n'
      + missingDependencies
        .map((entry) => `- ${entry.source} -> ${entry.specifier}${entry.resolved ? ` (${entry.resolved})` : ''}`)
        .join('\n')
    );
  }
  checks.push({
    id: 'package-dependency-closure',
    ok: true,
    files: packageFiles.length
  });

  if (full) {
    await execute('ci', 'npm', ['run', 'ci']);
    await execute('operational-smoke', 'node', ['scripts/smoke-run-chain.js'], {
      env: { AIOSON_PREPUBLISH: 'true' }
    });
    await execute(
      'clean-package-install',
      'node',
      ['bin/aioson.js', 'test:package', '.', '--json']
    );
  }

  return {
    ok: true,
    mode: full ? 'full' : 'quick',
    package_files: packageFiles.length,
    untracked_package_files: untracked,
    checks
  };
}

if (require.main === module) {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }

  if (options) {
    runReleaseReadiness(options)
      .then((result) => {
        if (options.json) {
          process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        } else {
          process.stdout.write(
            `\nRelease readiness passed (${result.mode}, ${result.package_files} packaged files).\n`
          );
        }
      })
      .catch((error) => {
        process.stderr.write(`\nRelease readiness failed: ${error.stack || error.message}\n`);
        process.exitCode = 1;
      });
  }
}

module.exports = {
  PROJECT_ROOT,
  SHIPPED_ROOTS,
  REQUIRED_PACKAGE_FILES,
  parseArgs,
  parseJsonOutput,
  extractPackFiles,
  validatePackContents,
  filterUntrackedShippedFiles,
  collectLocalSpecifiers,
  resolveLocalDependency,
  findMissingLocalDependencies,
  resolveCommandInvocation,
  runCommand,
  requireSuccessfulCommand,
  runReleaseReadiness
};
