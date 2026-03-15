'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { validateProjectContextFile } = require('../context');
const { ensureDir, exists, toRelativeSafe } = require('../utils');
const { recordRuntimeOperation } = require('../execution-gateway');

const MIN_WORKERS = 2;
const MAX_WORKERS = 6;
const DEFAULT_WORKERS = 3;
const PREREQUISITE_FILES = [
  '.aioson/context/discovery.md',
  '.aioson/context/architecture.md',
  '.aioson/context/prd.md'
];

function normalizeClassification(value) {
  return String(value || '').trim().toUpperCase();
}

function parseWorkers(value) {
  if (value === undefined || value === null || value === '') return DEFAULT_WORKERS;
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  const normalized = Math.floor(num);
  if (normalized < MIN_WORKERS || normalized > MAX_WORKERS) return null;
  return normalized;
}

function renderSharedDecisions(input) {
  return `# Shared Decisions

## Session
- Project: ${input.projectName}
- Classification: ${input.classification}
- Workers: ${input.workers}
- Generated at: ${input.generatedAt}

## Protocol
- Record only decisions that affect more than one parallel lane.
- When a decision changes a contract, update all impacted lane files.
- Keep entries concise and include rationale plus impact.

## Decision Log
| time | decision | rationale | impact |
|------|----------|-----------|--------|
| ${input.generatedAt} | Parallel workspace initialized | Baseline orchestration context created | Ready for @orchestrator assignment |
`;
}

function renderAgentStatus(input) {
  const lane = `agent-${input.index}`;
  return `# Parallel Lane Status - ${lane}

## Metadata
- lane: ${lane}
- role: @dev
- owner: [unassigned]
- status: pending
- priority: medium
- updated_at: ${input.generatedAt}

## Scope
- [define module or feature boundary]

## Dependencies
- [list dependencies on other lanes or shared decisions]

## Deliverables
- [ ] Code changes completed
- [ ] Self-check completed
- [ ] Handoff note written

## Blockers
- [none]

## Notes
- Created by \`aioson parallel:init\`.
`;
}

async function collectPrerequisites(targetDir) {
  const items = [];
  for (const rel of PREREQUISITE_FILES) {
    const abs = path.join(targetDir, rel);
    items.push({
      path: rel,
      exists: await exists(abs)
    });
  }
  return items;
}

function buildTargetFiles(targetDir, workers) {
  const parallelDir = path.join(targetDir, '.aioson/context/parallel');
  const files = [path.join(parallelDir, 'shared-decisions.md')];
  for (let i = 1; i <= workers; i += 1) {
    files.push(path.join(parallelDir, `agent-${i}.status.md`));
  }
  return files;
}

async function runParallelInit({ args, options = {}, logger, t }) {
  const targetDir = path.resolve(process.cwd(), args[0] || '.');
  const dryRun = Boolean(options['dry-run']);
  const force = Boolean(options.force);
  const workers = parseWorkers(options.workers);

  if (workers === null) {
    throw new Error(
      t('parallel_init.invalid_workers', {
        min: MIN_WORKERS,
        max: MAX_WORKERS
      })
    );
  }

  const context = await validateProjectContextFile(targetDir);
  const contextPath = path.join(targetDir, '.aioson/context/project.context.md');
  if (!context.exists) {
    throw new Error(t('parallel_init.context_missing', { path: contextPath }));
  }
  if (!context.parsed) {
    throw new Error(t('parallel_init.context_invalid', { path: contextPath }));
  }

  const classification = normalizeClassification(
    options.classification || (context.data && context.data.classification) || ''
  );
  if (classification !== 'MEDIUM' && !force) {
    throw new Error(
      t('parallel_init.requires_medium', {
        classification: classification || t('parallel_init.classification_unknown')
      })
    );
  }

  const generatedAt = new Date().toISOString();
  const projectName =
    String((context.data && context.data.project_name) || '').trim() || path.basename(targetDir) || 'project';
  const prerequisiteChecks = await collectPrerequisites(targetDir);
  const missingPrerequisites = prerequisiteChecks
    .filter((item) => !item.exists)
    .map((item) => item.path);

  const targetFiles = buildTargetFiles(targetDir, workers);
  const existingFiles = [];
  for (const absPath of targetFiles) {
    if (await exists(absPath)) {
      existingFiles.push(toRelativeSafe(targetDir, absPath));
    }
  }

  if (existingFiles.length > 0 && !force) {
    throw new Error(
      t('parallel_init.already_exists', {
        count: existingFiles.length
      })
    );
  }

  if (!dryRun) {
    const parallelDir = path.join(targetDir, '.aioson/context/parallel');
    await ensureDir(parallelDir);

    const sharedContent = renderSharedDecisions({
      projectName,
      classification: classification || 'MEDIUM',
      workers,
      generatedAt
    });
    await fs.writeFile(path.join(parallelDir, 'shared-decisions.md'), sharedContent, 'utf8');

    for (let i = 1; i <= workers; i += 1) {
      const statusContent = renderAgentStatus({ index: i, generatedAt });
      await fs.writeFile(path.join(parallelDir, `agent-${i}.status.md`), statusContent, 'utf8');
    }
  }

  const output = {
    ok: true,
    targetDir,
    classification: classification || 'MEDIUM',
    workers,
    dryRun,
    force,
    generatedAt,
    files: targetFiles.map((absPath) => toRelativeSafe(targetDir, absPath)),
    existingFiles,
    prerequisites: prerequisiteChecks,
    missingPrerequisites
  };

  if (!dryRun) {
    output.runtime = await recordRuntimeOperation(targetDir, {
      agentName: 'orchestrator',
      source: 'orchestration',
      sessionKey: 'parallel:workspace',
      title: 'Parallel orchestration workspace',
      goal: 'Prepare and manage parallel development lanes',
      runTitle: 'parallel:init',
      message: 'Parallel workspace initialization started',
      summary: `Parallel workspace initialized with ${workers} lanes`,
      eventType: 'parallel.initialized',
      phase: 'parallel',
      payload: {
        command: 'parallel:init',
        classification: output.classification,
        workers,
        files: output.files,
        missingPrerequisites
      }
    });
  }

  if (options.json) {
    return output;
  }

  logger.log(
    dryRun
      ? t('parallel_init.dry_run_prepared', { path: path.join(targetDir, '.aioson/context/parallel') })
      : t('parallel_init.prepared', { path: path.join(targetDir, '.aioson/context/parallel') })
  );
  logger.log(t('parallel_init.workers_count', { count: workers }));
  logger.log(t('parallel_init.files_count', { count: output.files.length }));
  if (missingPrerequisites.length > 0) {
    logger.log(
      t('parallel_init.missing_prereq_count', {
        count: missingPrerequisites.length
      })
    );
  }
  for (const file of output.files) {
    logger.log(t('parallel_init.file_line', { file }));
  }

  return output;
}

module.exports = {
  runParallelInit,
  parseWorkers,
  normalizeClassification,
  renderSharedDecisions,
  renderAgentStatus,
  PREREQUISITE_FILES
};
