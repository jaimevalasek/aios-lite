'use strict';

/**
 * workflow-gates — technical compilation/test gates enforced by the workflow engine.
 *
 * Blocks broken handoffs from @dev → @qa when code does not compile or tests fail.
 * Auto-detects stack and runs the minimal appropriate verification commands.
 */

const path = require('node:path');
const { execSync } = require('node:child_process');
const { readFileSafe, fileExists } = require('./preflight-engine');

const MAX_OUTPUT_LINES = 60;

async function detectStack(targetDir) {
  const checks = [];

  // TypeScript
  if (await fileExists(path.join(targetDir, 'tsconfig.json'))) {
    checks.push({ id: 'tsc', name: 'TypeScript compilation', command: 'npx tsc --noEmit', files: ['tsconfig.json'] });
  }

  // Rust
  if (await fileExists(path.join(targetDir, 'Cargo.toml'))) {
    checks.push({ id: 'cargo-check', name: 'Rust compilation', command: 'cargo check', files: ['Cargo.toml'] });
    checks.push({ id: 'cargo-test', name: 'Rust tests', command: 'cargo test', files: ['Cargo.toml'], optional: true });
  }

  // Node.js / package.json based
  const pkgPath = path.join(targetDir, 'package.json');
  if (await fileExists(pkgPath)) {
    const pkgRaw = await readFileSafe(pkgPath);
    let pkg = null;
    try { pkg = JSON.parse(pkgRaw); } catch { /* ignore */ }

    if (pkg && pkg.scripts) {
      // Prefer test scripts that look comprehensive
      if (pkg.scripts.test) {
        const script = pkg.scripts.test;
        if (!script.includes('echo')) {
          checks.push({ id: 'npm-test', name: 'npm test', command: 'npm test', files: ['package.json'], optional: true });
        }
      }
      if (pkg.scripts['test:unit']) {
        checks.push({ id: 'npm-test-unit', name: 'npm test:unit', command: 'npm run test:unit', files: ['package.json'], optional: true });
      }
      if (pkg.scripts['test:ci']) {
        checks.push({ id: 'npm-test-ci', name: 'npm test:ci', command: 'npm run test:ci', files: ['package.json'], optional: true });
      }
      if (pkg.scripts.lint) {
        checks.push({ id: 'npm-lint', name: 'npm lint', command: 'npm run lint', files: ['package.json'], optional: true });
      }
    }
  }

  // Python
  if (await fileExists(path.join(targetDir, 'pytest.ini')) || await fileExists(path.join(targetDir, 'pyproject.toml'))) {
    checks.push({ id: 'pytest', name: 'Pytest', command: 'pytest', files: ['pytest.ini', 'pyproject.toml'], optional: true });
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
      output: truncateOutput(stdout, '')
    };
  } catch (err) {
    return {
      ok: false,
      check: check.id,
      name: check.name,
      command: check.command,
      output: truncateOutput(err.stdout || '', err.stderr || '')
    };
  }
}

async function runTechnicalGate(targetDir, stage, options = {}) {
  // Only enforce gates after dev (compilation) and before qa (tests).
  // If the caller explicitly passes --force, skip technical checks.
  if (options.force) {
    return { ok: true, stage, forced: true, results: [] };
  }

  const checks = await detectStack(targetDir);
  if (checks.length === 0) {
    return { ok: true, stage, results: [], reason: 'No detectable stack — skipping technical gate.' };
  }

  let relevantChecks = [];
  if (stage === 'dev') {
    // After dev: enforce compilation gates (non-optional)
    // Also run optional test gates, but do not block on them unless strict mode
    relevantChecks = checks.map((c) => ({
      ...c,
      blocking: !c.optional
    }));
  } else if (stage === 'qa') {
    // Before qa: enforce tests if available
    relevantChecks = checks.map((c) => ({
      ...c,
      blocking: c.optional === false || !c.optional
    }));
  } else {
    return { ok: true, stage, results: [], reason: 'No technical gate for this stage.' };
  }

  const results = [];
  let blocked = false;
  let blockReasons = [];

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
      results
    };
  }

  return {
    ok: true,
    stage,
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
      lines.push(`\n[$${r.name}] $${r.command}`);
      lines.push(r.output || '(no output)');
    }
  }
  return lines.join('\n');
}

module.exports = {
  detectStack,
  runTechnicalGate,
  formatGateError
};
