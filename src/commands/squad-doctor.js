'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { openRuntimeDb } = require('../runtime-store');
const { exists } = require('../utils');
const { runSquadValidate } = require('./squad-validate');

function normalizeRel(value) {
  return String(value || '')
    .replace(/\\/g, '/')
    .replace(/^\.\//, '')
    .replace(/\/+$/, '');
}

function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

async function readJsonIfExists(filePath) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function listFilesRecursive(rootDir) {
  const result = [];
  const queue = [rootDir];

  while (queue.length > 0) {
    const current = queue.shift();
    const entries = await fs.readdir(current, { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        queue.push(fullPath);
      } else if (entry.isFile()) {
        result.push(fullPath);
      }
    }
  }

  return result;
}

async function resolveSquadSlug(targetDir, requestedSlug) {
  if (requestedSlug) return String(requestedSlug).trim();

  const metadataDir = path.join(targetDir, '.aioson', 'squads');
  const agentsDir = path.join(targetDir, 'agents');
  const candidates = new Set();

  const metadataEntries = await fs.readdir(metadataDir, { withFileTypes: true }).catch(() => []);
  for (const entry of metadataEntries) {
    if (entry.isDirectory()) candidates.add(entry.name);
    if (entry.isFile() && entry.name.endsWith('.md')) candidates.add(entry.name.replace(/\.md$/i, ''));
  }

  const agentEntries = await fs.readdir(agentsDir, { withFileTypes: true }).catch(() => []);
  for (const entry of agentEntries) {
    if (entry.isDirectory()) candidates.add(entry.name);
  }

  const slugs = Array.from(candidates).filter(Boolean);
  if (slugs.length === 1) return slugs[0];
  if (slugs.length === 0) {
    throw new Error('No squad found. Create a squad first or provide --squad=<slug>.');
  }
  throw new Error('Multiple squads found. Provide --squad=<slug>.');
}

async function parseSquadPaths(targetDir, slug) {
  const packageDir = path.join(targetDir, '.aioson', 'squads', slug);
  const hasPackageDir = await pathExists(packageDir);
  const metadataPath = hasPackageDir
    ? path.join(packageDir, 'squad.md')
    : path.join(targetDir, '.aioson', 'squads', `${slug}.md`);
  const manifestPath = hasPackageDir
    ? path.join(packageDir, 'squad.manifest.json')
    : path.join(targetDir, 'agents', slug, 'squad.manifest.json');
  const rulesPath = hasPackageDir
    ? path.join(packageDir, 'agents', 'agents.md')
    : path.join(targetDir, 'agents', slug, 'agents.md');
  const designDocPath = hasPackageDir
    ? path.join(packageDir, 'docs', 'design-doc.md')
    : path.join(targetDir, 'agents', slug, 'design-doc.md');
  const readinessPath = hasPackageDir
    ? path.join(packageDir, 'docs', 'readiness.md')
    : path.join(targetDir, 'agents', slug, 'readiness.md');

  const manifest = (await readJsonIfExists(manifestPath)) || {};
  const rules = asObject(manifest.rules) || {};
  const packageInfo = asObject(manifest.package) || {};

  return {
    packageDir,
    metadataPath,
    manifestPath,
    rulesPath,
    designDocPath,
    readinessPath,
    manifest,
    agentsDir: hasPackageDir
      ? path.join(targetDir, normalizeRel(packageInfo.agentsDir || `.aioson/squads/${slug}/agents`))
      : path.join(targetDir, 'agents', slug),
    outputDir: path.join(targetDir, normalizeRel(rules.outputsDir || `output/${slug}`)),
    logsDir: path.join(targetDir, normalizeRel(rules.logsDir || `aios-logs/${slug}`)),
    mediaDir: path.join(targetDir, normalizeRel(rules.mediaDir || `media/${slug}`))
  };
}

function makeCheck(id, ok, severity, message, meta = {}) {
  return { id, ok, severity, message, ...meta };
}

function inferStale(run, staleMinutes) {
  const updatedAt = Date.parse(run.updated_at || run.updatedAt || '');
  if (!updatedAt) return false;
  return Date.now() - updatedAt > staleMinutes * 60 * 1000;
}

async function detectContentCandidates(outputDir, projectRoot) {
  const existsOutput = await pathExists(outputDir);
  if (!existsOutput) return [];

  const allFiles = await listFilesRecursive(outputDir);
  const contentJsonDirs = new Set(
    allFiles
      .filter((filePath) => path.basename(filePath).toLowerCase() === 'content.json')
      .map((filePath) => path.dirname(filePath))
  );

  return allFiles
    .filter((filePath) => {
      const base = path.basename(filePath).toLowerCase();
      const ext = path.extname(filePath).toLowerCase();
      if (base === 'content.json') return true;
      if (ext !== '.md' && ext !== '.html' && ext !== '.htm') return false;
      if (contentJsonDirs.has(path.dirname(filePath))) return false;
      return true;
    })
    .map((filePath) => path.relative(projectRoot, filePath).replace(/\\/g, '/'));
}

async function runSquadDoctor({ args, options = {}, logger, t }) {
  const targetDir = path.resolve(process.cwd(), args[0] || '.');
  const slug = await resolveSquadSlug(targetDir, options.squad);
  const staleMinutes = Number(options['stale-minutes'] || 5);
  const paths = await parseSquadPaths(targetDir, slug);
  const manifest = asObject(paths.manifest) || {};
  const executors = asArray(manifest.executors).filter((executor) => asObject(executor));

  const checks = [];

  const metadataExists = await exists(paths.metadataPath);
  checks.push(makeCheck('metadata', metadataExists, metadataExists ? 'info' : 'error', t('squad_doctor.check_metadata', { path: paths.metadataPath })));

  const manifestExists = await exists(paths.manifestPath);
  checks.push(makeCheck('manifest', manifestExists, manifestExists ? 'info' : 'error', t('squad_doctor.check_manifest', { path: paths.manifestPath })));

  const rulesExists = await exists(paths.rulesPath);
  checks.push(makeCheck('rules', rulesExists, rulesExists ? 'info' : 'error', t('squad_doctor.check_rules', { path: paths.rulesPath })));

  const designDocExists = await exists(paths.designDocPath);
  checks.push(makeCheck('design_doc', designDocExists, designDocExists ? 'info' : 'warn', t('squad_doctor.check_design_doc', { path: paths.designDocPath })));

  const readinessExists = await exists(paths.readinessPath);
  checks.push(makeCheck('readiness', readinessExists, readinessExists ? 'info' : 'warn', t('squad_doctor.check_readiness', { path: paths.readinessPath })));

  const executorFilesMissing = [];
  for (const executor of executors) {
    const relFile = normalizeRel(executor.file || '');
    if (!relFile) continue;
    const absFile = path.join(targetDir, relFile);
    if (!(await exists(absFile))) executorFilesMissing.push(relFile);
  }

  checks.push(
    makeCheck(
      'executors',
      executors.length > 0 && executorFilesMissing.length === 0,
      executors.length === 0 || executorFilesMissing.length > 0 ? 'error' : 'info',
      t('squad_doctor.check_executors', {
        count: executors.length,
        missing: executorFilesMissing.length
      }),
      { missingExecutors: executorFilesMissing }
    )
  );

  const outputExists = await exists(paths.outputDir);
  const mediaExists = await exists(paths.mediaDir);
  checks.push(makeCheck('output_dir', outputExists, outputExists ? 'info' : 'warn', t('squad_doctor.check_output_dir', { path: paths.outputDir })));
  checks.push(makeCheck('media_dir', mediaExists, mediaExists ? 'info' : 'warn', t('squad_doctor.check_media_dir', { path: paths.mediaDir })));

  const runtimeHandle = await openRuntimeDb(targetDir, { mustExist: true });
  if (!runtimeHandle) {
    checks.push(makeCheck('runtime_store', false, 'warn', t('squad_doctor.check_runtime_missing')));
  } else {
    const { db } = runtimeHandle;
    try {
      const activeRuns = db
        .prepare(
          `
            SELECT run_key, agent_name, title, status, updated_at
            FROM agent_runs
            WHERE squad_slug = ? AND status IN ('queued', 'running')
            ORDER BY updated_at DESC
          `
        )
        .all(slug);
      const staleRuns = activeRuns.filter((run) => inferStale(run, staleMinutes));
      checks.push(
        makeCheck(
          'runtime_active_runs',
          staleRuns.length === 0,
          staleRuns.length > 0 ? 'warn' : 'info',
          t('squad_doctor.check_active_runs', {
            count: activeRuns.length,
            stale: staleRuns.length,
            minutes: staleMinutes
          }),
          { activeRuns, staleRuns }
        )
      );

      const indexedRows = db
        .prepare(
          `
            SELECT content_key, json_path, html_path
            FROM content_items
            WHERE squad_slug = ?
          `
        )
        .all(slug);
      const indexedPaths = new Set();
      for (const row of indexedRows) {
        if (row.json_path) indexedPaths.add(normalizeRel(row.json_path));
        if (row.html_path) indexedPaths.add(normalizeRel(row.html_path));
      }

      const candidatePaths = await detectContentCandidates(paths.outputDir, targetDir);
      const unindexedPaths = candidatePaths.filter((candidate) => !indexedPaths.has(normalizeRel(candidate)));
      checks.push(
        makeCheck(
          'content_indexing',
          unindexedPaths.length === 0,
          unindexedPaths.length > 0 ? 'warn' : 'info',
          t('squad_doctor.check_content_indexing', {
            indexed: indexedRows.length,
            pending: unindexedPaths.length
          }),
          { indexedRows, unindexedPaths }
        )
      );
    } finally {
      db.close();
    }
  }

  // Formal validation via squad-validate
  const silentLogger = { log() {}, error() {} };
  const validateResult = await runSquadValidate({
    args: [targetDir],
    options: { squad: slug },
    logger: silentLogger
  });
  if (!validateResult.valid || validateResult.warnings.length > 0) {
    checks.push(
      makeCheck(
        'formal_validation',
        validateResult.valid,
        validateResult.valid ? 'warn' : 'error',
        validateResult.valid
          ? `Manifest valid with ${validateResult.warnings.length} warning(s)`
          : `Manifest invalid: ${validateResult.errors[0] || 'see details'}`,
        { validateErrors: validateResult.errors, validateWarnings: validateResult.warnings }
      )
    );
  } else {
    checks.push(makeCheck('formal_validation', true, 'info', 'Manifest formally valid'));
  }

  const summary = {
    failed: checks.filter((check) => check.severity === 'error' && !check.ok).length,
    warned: checks.filter((check) => check.severity === 'warn' && !check.ok).length,
    passed: checks.filter((check) => check.ok).length
  };

  const output = {
    ok: summary.failed === 0,
    targetDir,
    squad: slug,
    staleMinutes,
    summary,
    checks
  };

  if (options.json) {
    return output;
  }

  logger.log(t('squad_doctor.report_title', { squad: slug, path: targetDir }));
  for (const check of checks) {
    const prefix = check.severity === 'warn'
      ? t('squad_doctor.prefix_warn')
      : check.ok
        ? t('squad_doctor.prefix_ok')
        : t('squad_doctor.prefix_fail');
    logger.log(t('squad_doctor.check_line', { prefix, message: check.message }));
    if (Array.isArray(check.missingExecutors) && check.missingExecutors.length > 0) {
      for (const item of check.missingExecutors.slice(0, 10)) {
        logger.log(`  - ${item}`);
      }
    }
    if (Array.isArray(check.unindexedPaths) && check.unindexedPaths.length > 0) {
      for (const item of check.unindexedPaths.slice(0, 10)) {
        logger.log(`  - ${item}`);
      }
    }
    if (Array.isArray(check.staleRuns) && check.staleRuns.length > 0) {
      for (const item of check.staleRuns.slice(0, 10)) {
        logger.log(`  - ${item.agent_name} | ${item.title || '—'} | ${item.updated_at}`);
      }
    }
  }

  logger.log('');
  logger.log(
    t('squad_doctor.summary', {
      passed: summary.passed,
      warned: summary.warned,
      failed: summary.failed
    })
  );

  return output;
}

module.exports = {
  runSquadDoctor
};
