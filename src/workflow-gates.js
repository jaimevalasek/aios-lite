'use strict';

/**
 * workflow-gates — technical compilation/test gates enforced by the workflow engine.
 *
 * DEV owns compilation. QA owns one comprehensive verification pass.
 * Successful evidence is reused only while the git-backed implementation
 * fingerprint and selected commands remain unchanged.
 */

const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const fsSync = require('node:fs');
const path = require('node:path');
const { execFileSync, execSync } = require('node:child_process');
const { readFileSafe, fileExists } = require('./preflight-engine');
const { ensureDir } = require('./utils');

const MAX_OUTPUT_LINES = 60;
const EVIDENCE_RELATIVE_PATH = '.aioson/runtime/technical-evidence.json';
const MAX_EVIDENCE_ENTRIES = 20;
const MAX_FINGERPRINT_FILE_BYTES = 16 * 1024 * 1024;
const MAX_FINGERPRINT_TOTAL_BYTES = 64 * 1024 * 1024;

async function detectStack(targetDir) {
  const checks = [];

  // TypeScript
  if (await fileExists(path.join(targetDir, 'tsconfig.json'))) {
    checks.push({ id: 'tsc', kind: 'compile', name: 'TypeScript compilation', command: 'npx tsc --noEmit', files: ['tsconfig.json'] });
  }

  // Rust
  if (await fileExists(path.join(targetDir, 'Cargo.toml'))) {
    checks.push({ id: 'cargo-check', kind: 'compile', name: 'Rust compilation', command: 'cargo check', files: ['Cargo.toml'] });
    checks.push({ id: 'cargo-test', kind: 'verify', name: 'Rust tests', command: 'cargo test', files: ['Cargo.toml'], optional: true });
  }

  // Node.js / package.json based
  const pkgPath = path.join(targetDir, 'package.json');
  if (await fileExists(pkgPath)) {
    const pkgRaw = await readFileSafe(pkgPath);
    let pkg = null;
    try { pkg = JSON.parse(pkgRaw); } catch { /* ignore */ }

    if (pkg && pkg.scripts) {
      const scripts = pkg.scripts;
      const isRunnable = (script) => typeof script === 'string' && !/\becho\b/i.test(script);
      if (isRunnable(scripts.ci)) {
        checks.push({ id: 'npm-ci', kind: 'verify', name: 'npm ci verification', command: 'npm run ci', files: ['package.json'], optional: true });
      } else if (isRunnable(scripts['test:ci'])) {
        checks.push({ id: 'npm-test-ci', kind: 'verify', name: 'npm test:ci', command: 'npm run test:ci', files: ['package.json'], optional: true });
      } else {
        if (isRunnable(scripts.test)) {
          checks.push({ id: 'npm-test', kind: 'verify', name: 'npm test', command: 'npm test', files: ['package.json'], optional: true });
        } else if (isRunnable(scripts['test:unit'])) {
          checks.push({ id: 'npm-test-unit', kind: 'verify', name: 'npm test:unit', command: 'npm run test:unit', files: ['package.json'], optional: true });
        }
        if (isRunnable(scripts.lint)) {
          checks.push({ id: 'npm-lint', kind: 'verify', name: 'npm lint', command: 'npm run lint', files: ['package.json'], optional: true });
        }
      }
    }
  }

  // Python
  if (await fileExists(path.join(targetDir, 'pytest.ini')) || await fileExists(path.join(targetDir, 'pyproject.toml'))) {
    checks.push({ id: 'pytest', kind: 'verify', name: 'Pytest', command: 'pytest', files: ['pytest.ini', 'pyproject.toml'], optional: true });
  }

  return checks;
}

function truncateOutput(stdout, stderr) {
  const combined = [stdout, stderr].filter(Boolean).join('\n').trim();
  if (!combined) return '';
  const lines = combined.split('\n');
  if (lines.length <= MAX_OUTPUT_LINES) return combined;
  return lines.slice(0, MAX_OUTPUT_LINES).join('\n') + '\n... (truncated)';
}

function runCheck(targetDir, check) {
  const startedAt = Date.now();
  try {
    const stdout = execSync(check.command, {
      cwd: targetDir,
      encoding: 'utf8',
      maxBuffer: 4 * 1024 * 1024,
      timeout: 300000, // 5 minutes
      stdio: ['ignore', 'pipe', 'pipe']
    });
    return {
      ok: true,
      check: check.id,
      name: check.name,
      command: check.command,
      duration_ms: Date.now() - startedAt,
      output: truncateOutput(stdout, '')
    };
  } catch (err) {
    return {
      ok: false,
      check: check.id,
      name: check.name,
      command: check.command,
      duration_ms: Date.now() - startedAt,
      output: truncateOutput(err.stdout || '', err.stderr || '')
    };
  }
}

function hashParts(parts) {
  const hash = crypto.createHash('sha256');
  for (const part of parts) {
    hash.update(Buffer.isBuffer(part) ? part : Buffer.from(String(part)));
    hash.update('\0');
  }
  return hash.digest('hex');
}

function computeImplementationFingerprint(targetDir, checks, limits = {}) {
  try {
    const normalizeLimit = (value, fallback) => {
      const parsed = Number(value);
      return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
    };
    const maxFileBytes = normalizeLimit(limits.maxFileBytes, MAX_FINGERPRINT_FILE_BYTES);
    const maxTotalBytes = normalizeLimit(limits.maxTotalBytes, MAX_FINGERPRINT_TOTAL_BYTES);
    const implementationPathspec = [
      '.',
      ':(exclude).aioson/runtime/**',
      ':(exclude).aioson/context/**'
    ];
    const repoRoot = String(execFileSync('git', ['rev-parse', '--show-toplevel'], {
      cwd: targetDir,
      encoding: 'utf8',
      timeout: 10000,
      stdio: ['ignore', 'pipe', 'ignore']
    })).trim();
    const head = execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: targetDir,
      encoding: null,
      timeout: 10000,
      stdio: ['ignore', 'pipe', 'ignore']
    });
    const diff = execFileSync('git', ['diff', '--binary', '--no-ext-diff', 'HEAD', '--', ...implementationPathspec], {
      cwd: targetDir,
      encoding: null,
      maxBuffer: 64 * 1024 * 1024,
      timeout: 30000,
      stdio: ['ignore', 'pipe', 'ignore']
    });
    const untrackedRaw = execFileSync('git', ['ls-files', '--others', '--exclude-standard', '-z', '--', ...implementationPathspec], {
      cwd: targetDir,
      encoding: 'utf8',
      maxBuffer: 16 * 1024 * 1024,
      timeout: 30000,
      stdio: ['ignore', 'pipe', 'ignore']
    });
    const hash = crypto.createHash('sha256');
    const update = (part) => {
      hash.update(Buffer.isBuffer(part) ? part : Buffer.from(String(part)));
      hash.update('\0');
    };
    update(head);
    update(diff);
    update(JSON.stringify(checks.map((check) => [check.id, check.command])));
    let totalBytes = 0;
    for (const relativePath of untrackedRaw.split('\0').filter(Boolean).sort()) {
      const absolute = path.resolve(repoRoot, relativePath);
      const insideRepo = path.relative(repoRoot, absolute);
      if (insideRepo.startsWith('..') || path.isAbsolute(insideRepo)) continue;
      update(relativePath);
      try {
        const stat = fsSync.lstatSync(absolute);
        if (stat.isSymbolicLink()) {
          update(`<symlink:${fsSync.readlinkSync(absolute)}>`);
          continue;
        }
        if (!stat.isFile()) {
          update('<non-regular>');
          continue;
        }
        if (stat.size > maxFileBytes || totalBytes + stat.size > maxTotalBytes) {
          return null;
        }
        totalBytes += stat.size;
        const handle = fsSync.openSync(absolute, 'r');
        try {
          const buffer = Buffer.allocUnsafe(Math.min(64 * 1024, Math.max(1, stat.size)));
          let bytesRead;
          do {
            bytesRead = fsSync.readSync(handle, buffer, 0, buffer.length, null);
            if (bytesRead > 0) hash.update(buffer.subarray(0, bytesRead));
          } while (bytesRead > 0);
          hash.update('\0');
        } finally {
          fsSync.closeSync(handle);
        }
      } catch {
        update('<unreadable>');
      }
    }
    return `sha256:${hash.digest('hex')}`;
  } catch {
    return null;
  }
}

async function readEvidence(targetDir) {
  try {
    const raw = await fs.readFile(path.join(targetDir, EVIDENCE_RELATIVE_PATH), 'utf8');
    const parsed = JSON.parse(raw);
    return parsed && parsed.version === 1 && parsed.entries && typeof parsed.entries === 'object'
      ? parsed
      : { version: 1, entries: {} };
  } catch {
    return { version: 1, entries: {} };
  }
}

async function writeEvidence(targetDir, payload) {
  const evidencePath = path.join(targetDir, EVIDENCE_RELATIVE_PATH);
  await ensureDir(path.dirname(evidencePath));
  await fs.writeFile(evidencePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function evidenceKey(stage, checks) {
  return hashParts([stage, JSON.stringify(checks.map((check) => [check.id, check.command]))]);
}

async function runTechnicalGate(targetDir, stage, options = {}) {
  if (options.force) {
    return { ok: true, stage, forced: true, results: [] };
  }

  const checks = await detectStack(targetDir);
  if (checks.length === 0) {
    return { ok: true, stage, results: [], reason: 'No detectable stack — skipping technical gate.' };
  }

  let relevantChecks = [];
  if (stage === 'dev') {
    relevantChecks = checks
      .filter((check) => check.kind === 'compile')
      .map((check) => ({ ...check, blocking: true }));
  } else if (stage === 'qa') {
    const verification = checks.filter((check) => check.kind === 'verify');
    relevantChecks = (verification.length > 0 ? verification : checks.filter((check) => check.kind === 'compile'))
      .map((check) => ({ ...check, blocking: true }));
  } else {
    return { ok: true, stage, results: [], reason: 'No technical gate for this stage.' };
  }

  if (relevantChecks.length === 0) {
    return {
      ok: true,
      stage,
      results: [],
      reason: stage === 'dev'
        ? 'No compile gate for this stack; focused implementation checks remain DEV-owned.'
        : 'No comprehensive verification command detected.'
    };
  }

  const fingerprint = options.fingerprint
    || computeImplementationFingerprint(targetDir, relevantChecks);
  const cacheKey = evidenceKey(stage, relevantChecks);
  if (fingerprint && options.cache !== false) {
    const evidence = await readEvidence(targetDir);
    const cached = evidence.entries[cacheKey];
    if (cached && cached.ok === true && cached.fingerprint === fingerprint) {
      return {
        ok: true,
        stage,
        cached: true,
        fingerprint,
        evidence_path: EVIDENCE_RELATIVE_PATH,
        completed_at: cached.completed_at,
        results: cached.results.map((result) => ({ ...result, cached: true }))
      };
    }
  }

  const results = [];
  let blocked = false;
  const blockReasons = [];

  for (const check of relevantChecks) {
    const result = runCheck(targetDir, check);
    results.push(result);
    if (!result.ok && check.blocking) {
      blocked = true;
      blockReasons.push(`${check.name} failed`);
    }
  }

  if (blocked) {
    return {
      ok: false,
      stage,
      blocked: true,
      reasons: blockReasons,
      fingerprint,
      results
    };
  }

  const completedAt = new Date().toISOString();
  if (fingerprint && options.cache !== false) {
    const evidence = await readEvidence(targetDir);
    evidence.entries[cacheKey] = {
      stage,
      fingerprint,
      ok: true,
      completed_at: completedAt,
      checks: relevantChecks.map((check) => ({ id: check.id, command: check.command })),
      results
    };
    const entries = Object.entries(evidence.entries)
      .sort(([, left], [, right]) => String(right.completed_at || '').localeCompare(String(left.completed_at || '')))
      .slice(0, MAX_EVIDENCE_ENTRIES);
    evidence.entries = Object.fromEntries(entries);
    await writeEvidence(targetDir, evidence);
  }

  return {
    ok: true,
    stage,
    cached: false,
    fingerprint,
    evidence_path: fingerprint ? EVIDENCE_RELATIVE_PATH : null,
    completed_at: completedAt,
    results
  };
}

function formatGateError(gateResult) {
  const lines = [
    '[Technical Gate BLOCKED]',
    `Stage: @${gateResult.stage}`,
    'Reasons:',
    ...gateResult.reasons.map((r) => `  - ${r}`),
    '',
    'Fix the errors above before completing this stage.',
    'Use --force to override (not recommended).',
    '',
    '=== Command output ==='
  ];
  for (const r of gateResult.results) {
    if (!r.ok) {
      lines.push(`\n[${r.name}] ${r.command}`);
      lines.push(r.output || '(no output)');
    }
  }
  return lines.join('\n');
}

module.exports = {
  MAX_FINGERPRINT_FILE_BYTES,
  MAX_FINGERPRINT_TOTAL_BYTES,
  EVIDENCE_RELATIVE_PATH,
  detectStack,
  computeImplementationFingerprint,
  runTechnicalGate,
  formatGateError
};
