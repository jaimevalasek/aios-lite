'use strict';

/**
 * aioson workflow:harden — autonomous friction detection and codebase hardening.
 *
 * Reads workflow error logs, identifies recurring patterns, and applies
 * preventive fixes where possible (git hooks, test helpers, rules, etc.).
 *
 * Usage:
 *   aioson workflow:harden .
 *   aioson workflow:harden . --dry-run
 *   aioson workflow:harden . --json
 */

const path = require('node:path');
const fs = require('node:fs/promises');
const { scanFriction, buildRecommendations } = require('../friction-scanner');
const { ensureDir, exists } = require('../utils');
const { installPreCommitHook } = require('../lib/git-commit-guard');

async function ensureGitignoreBlocks(targetDir, blocks) {
  const gitignorePath = path.join(targetDir, '.gitignore');
  let content = '';
  try {
    content = await fs.readFile(gitignorePath, 'utf8');
  } catch {
    content = '';
  }
  const lines = content.split('\n');
  const added = [];
  for (const block of blocks) {
    if (!lines.some((l) => l.trim() === block)) {
      lines.push(block);
      added.push(block);
    }
  }
  if (added.length > 0) {
    await fs.writeFile(gitignorePath, lines.join('\n') + '\n', 'utf8');
  }
  return added;
}

async function ensureMockHelperStub(targetDir) {
  const helperPath = path.join(targetDir, 'tests', 'helpers', 'mocks.ts');
  if (await exists(helperPath)) return { created: false, path: helperPath };
  const jsPath = path.join(targetDir, 'tests', 'helpers', 'mocks.js');
  if (await exists(jsPath)) return { created: false, path: jsPath };

  const stub = `/**
 * Shared mock factory — prevents ordering bugs and inconsistent mocks.
 *
 * Usage:
 *   import { createServiceMock } from './helpers/mocks';
 */

export function createServiceMock(overrides = {}) {
  return {
    get: vi.fn(),
    post: vi.fn(),
    ...overrides
  };
}
`;
  await ensureDir(path.dirname(helperPath));
  await fs.writeFile(helperPath, stub, 'utf8');
  return { created: true, path: helperPath };
}

async function applyAutoFixes(targetDir, recommendations, dryRun) {
  const fixes = [];
  for (const rec of recommendations) {
    if (!rec.autoFixable) continue;

    if (rec.pattern === 'Git staging accidents') {
      const blocks = ['node_modules/', 'dist/', '.next/', '*.db', 'build/', 'coverage/'];
      if (!dryRun) {
        const added = await ensureGitignoreBlocks(targetDir, blocks);
        if (added.length > 0) {
          fixes.push({ ok: true, action: 'Updated .gitignore', details: added });
        }
      } else {
        fixes.push({ ok: true, action: 'Would update .gitignore', details: blocks });
      }

      if (!dryRun) {
        try {
          const hookResult = await installPreCommitHook(targetDir, { force: false });
          fixes.push({
            ok: hookResult.ok,
            action: hookResult.ok ? 'Installed pre-commit hook' : 'Pre-commit hook already exists or blocked',
            details: hookResult.message || null
          });
        } catch (err) {
          fixes.push({ ok: false, action: 'Failed to install pre-commit hook', details: err.message });
        }
      } else {
        fixes.push({ ok: true, action: 'Would install pre-commit hook', details: null });
      }
    }

    if (rec.pattern === 'Mock ordering / test helper issues') {
      if (!dryRun) {
        const result = await ensureMockHelperStub(targetDir);
        fixes.push({
          ok: true,
          action: result.created ? 'Created shared mock helper stub' : 'Shared mock helper already exists',
          path: result.path
        });
      } else {
        fixes.push({ ok: true, action: 'Would create shared mock helper stub', path: 'tests/helpers/mocks.ts' });
      }
    }
  }
  return fixes;
}

function buildReport(analysis, recommendations, fixes) {
  const lines = [
    '---',
    `generated_at: ${new Date().toISOString()}`,
    `total_errors_scanned: ${analysis.total}`,
    `patterns_found: ${analysis.patterns.length}`,
    '---',
    '',
    '# Codebase Hardening Report',
    '',
    '## Recurring friction patterns',
    ''
  ];

  if (analysis.patterns.length === 0) {
    lines.push('No recurring patterns detected. Great job!');
  } else {
    for (const p of analysis.patterns) {
      lines.push(`### ${p.name} (${p.count} occurrences)`);
      if (p.examples.length > 0) {
        lines.push('Recent examples:');
        for (const ex of p.examples) {
          lines.push(`- \`${ex}\``);
        }
      }
      lines.push('');
    }
  }

  lines.push('## Recommendations');
  lines.push('');
  if (recommendations.length === 0) {
    lines.push('None.');
  } else {
    for (const r of recommendations) {
      lines.push(`- **${r.pattern}** — priority: ${r.priority}`);
      lines.push(`  - Action: ${r.action}`);
      lines.push(`  - Auto-fixable: ${r.autoFixable ? 'yes' : 'no'}`);
      lines.push('');
    }
  }

  lines.push('## Auto-fixes applied');
  lines.push('');
  if (fixes.length === 0) {
    lines.push('No auto-fixes were applicable.');
  } else {
    for (const f of fixes) {
      lines.push(`- ${f.action}${f.details ? ` (${Array.isArray(f.details) ? f.details.join(', ') : f.details})` : ''}`);
    }
  }

  lines.push('');
  lines.push('## Next steps');
  lines.push('- Review high-priority recommendations.');
  lines.push('- Run the full test suite to verify no regressions from auto-fixes.');
  lines.push('- Update `.aioson/rules/` with project-specific conventions.');
  lines.push('');

  return lines.join('\n');
}

async function runWorkflowHarden({ args, options, logger }) {
  const targetDir = path.resolve(process.cwd(), args[0] || '.');
  const dryRun = Boolean(options['dry-run'] || options.dryRun);
  const jsonMode = Boolean(options.json);

  const analysis = await scanFriction(targetDir);
  const recommendations = buildRecommendations(analysis);
  const fixes = await applyAutoFixes(targetDir, recommendations, dryRun);

  const reportMd = buildReport(analysis, recommendations, fixes);
  const reportPath = path.join(targetDir, '.aioson', 'context', 'hardening-report.md');

  if (!dryRun) {
    await ensureDir(path.dirname(reportPath));
    await fs.writeFile(reportPath, reportMd, 'utf8');
  }

  const result = {
    ok: true,
    targetDir,
    dryRun,
    totalErrors: analysis.total,
    patternsFound: analysis.patterns.length,
    patterns: analysis.patterns,
    recommendations,
    fixes,
    reportPath: path.relative(targetDir, reportPath)
  };

  if (jsonMode) {
    return result;
  }

  logger.log('');
  logger.log(`Codebase Hardening — ${dryRun ? 'DRY RUN' : 'ACTIVE'}`);
  logger.log('━'.repeat(40));
  logger.log(`Errors scanned: ${analysis.total}`);
  logger.log(`Patterns found: ${analysis.patterns.length}`);
  logger.log(`Auto-fixes applied: ${fixes.length}`);
  if (analysis.patterns.length > 0) {
    logger.log('');
    logger.log('Top patterns:');
    for (const p of analysis.patterns.slice(0, 5)) {
      logger.log(`  - ${p.name}: ${p.count}`);
    }
  }
  logger.log('');
  logger.log(`Report: ${result.reportPath}`);

  return result;
}

module.exports = { runWorkflowHarden };
