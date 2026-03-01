'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { validateProjectContextFile } = require('../context');
const { exists, ensureDir } = require('../utils');
const {
  parseWorkers,
  renderSharedDecisions,
  renderAgentStatus,
  PREREQUISITE_FILES
} = require('./parallel-init');

const DEFAULT_FIX_WORKERS = 3;

function makeCheck(id, ok, severity, message, hint = '') {
  return {
    id,
    ok: Boolean(ok),
    severity,
    message: String(message || ''),
    hint: String(hint || '')
  };
}

function buildLaneFilename(index) {
  return `agent-${index}.status.md`;
}

function parseLaneIndex(fileName) {
  const match = String(fileName || '').match(/^agent-(\d+)\.status\.md$/);
  if (!match) return null;
  const value = Number(match[1]);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.floor(value);
}

function laneRange(count) {
  const output = [];
  for (let i = 1; i <= count; i += 1) {
    output.push(i);
  }
  return output;
}

function summarizeChecks(checks) {
  const passed = checks.filter((item) => item.ok).length;
  const failed = checks.filter((item) => !item.ok && item.severity === 'error').length;
  const warnings = checks.filter((item) => !item.ok && item.severity === 'warn').length;
  return {
    total: checks.length,
    passed,
    failed,
    warnings
  };
}

function formatCheckPrefix(check, t) {
  if (check.ok) return t('parallel_doctor.prefix_ok');
  if (check.severity === 'warn') return t('parallel_doctor.prefix_warn');
  return t('parallel_doctor.prefix_fail');
}

async function collectPrerequisites(targetDir) {
  const items = [];
  for (const rel of PREREQUISITE_FILES) {
    items.push({
      path: rel,
      exists: await exists(path.join(targetDir, rel))
    });
  }
  return items;
}

function resolveExpectedWorkers(state, workersOption) {
  if (workersOption !== undefined && workersOption !== null) return workersOption;
  if (state.laneIndices.length > 0) return Math.max(...state.laneIndices);
  return DEFAULT_FIX_WORKERS;
}

async function inspectParallelState(targetDir, workersOption) {
  const parallelDir = path.join(targetDir, '.aios-lite/context/parallel');
  const dirExists = await exists(parallelDir);
  const entries = dirExists ? await fs.readdir(parallelDir) : [];
  const sharedExists = entries.includes('shared-decisions.md');
  const laneIndices = entries
    .map(parseLaneIndex)
    .filter((value) => value !== null)
    .sort((a, b) => a - b);
  const laneFiles = laneIndices.map((index) => buildLaneFilename(index));

  const expectedWorkers = resolveExpectedWorkers(
    {
      laneIndices
    },
    workersOption
  );
  const expectedLaneIndices = laneRange(expectedWorkers);
  const missingLaneIndices = expectedLaneIndices.filter((index) => !laneIndices.includes(index));

  return {
    parallelDir,
    dirExists,
    entries,
    sharedExists,
    laneIndices,
    laneFiles,
    expectedWorkers,
    expectedLaneIndices,
    missingLaneIndices
  };
}

function buildChecks(context, state, prerequisites, workersOption, force, t) {
  const checks = [];

  checks.push(
    makeCheck(
      'context.exists',
      context.exists,
      'error',
      context.exists
        ? t('parallel_doctor.check_context_exists_ok')
        : t('parallel_doctor.check_context_exists_missing'),
      context.exists ? '' : t('parallel_doctor.check_context_exists_hint')
    )
  );

  checks.push(
    makeCheck(
      'context.parsed',
      context.parsed,
      'error',
      context.parsed
        ? t('parallel_doctor.check_context_parsed_ok')
        : t('parallel_doctor.check_context_parsed_invalid'),
      context.parsed ? '' : t('parallel_doctor.check_context_parsed_hint')
    )
  );

  const classification = String(context.data && context.data.classification ? context.data.classification : '');
  const isMedium = classification === 'MEDIUM';
  const classificationOk = isMedium || force;
  checks.push(
    makeCheck(
      'context.classification',
      classificationOk,
      'error',
      classificationOk
        ? t('parallel_doctor.check_context_classification_ok', {
            classification: classification || t('parallel_doctor.classification_unknown')
          })
        : t('parallel_doctor.check_context_classification_invalid', {
            classification: classification || t('parallel_doctor.classification_unknown')
          }),
      classificationOk ? '' : t('parallel_doctor.check_context_classification_hint')
    )
  );

  checks.push(
    makeCheck(
      'parallel.dir',
      state.dirExists,
      'error',
      state.dirExists
        ? t('parallel_doctor.check_parallel_dir_ok')
        : t('parallel_doctor.check_parallel_dir_missing'),
      state.dirExists ? '' : t('parallel_doctor.check_parallel_dir_hint')
    )
  );

  checks.push(
    makeCheck(
      'parallel.shared',
      state.sharedExists,
      'error',
      state.sharedExists
        ? t('parallel_doctor.check_parallel_shared_ok')
        : t('parallel_doctor.check_parallel_shared_missing'),
      state.sharedExists ? '' : t('parallel_doctor.check_parallel_shared_hint')
    )
  );

  checks.push(
    makeCheck(
      'parallel.lanes.present',
      state.laneIndices.length > 0,
      'error',
      state.laneIndices.length > 0
        ? t('parallel_doctor.check_lanes_present_ok', {
            count: state.laneIndices.length
          })
        : t('parallel_doctor.check_lanes_present_missing'),
      state.laneIndices.length > 0 ? '' : t('parallel_doctor.check_lanes_present_hint')
    )
  );

  checks.push(
    makeCheck(
      'parallel.lanes.sequence',
      state.missingLaneIndices.length === 0,
      'error',
      state.missingLaneIndices.length === 0
        ? t('parallel_doctor.check_lanes_sequence_ok', {
            workers: state.expectedWorkers
          })
        : t('parallel_doctor.check_lanes_sequence_missing', {
            lanes: state.missingLaneIndices.join(', ')
          }),
      state.missingLaneIndices.length === 0 ? '' : t('parallel_doctor.check_lanes_sequence_hint')
    )
  );

  if (workersOption !== undefined && workersOption !== null) {
    checks.push(
      makeCheck(
        'parallel.workers.option',
        state.expectedWorkers === workersOption,
        'info',
        t('parallel_doctor.check_workers_option', { workers: workersOption })
      )
    );
  }

  const missingPrereq = prerequisites.filter((item) => !item.exists).length;
  checks.push(
    makeCheck(
      'parallel.prerequisites',
      missingPrereq === 0,
      missingPrereq === 0 ? 'info' : 'warn',
      missingPrereq === 0
        ? t('parallel_doctor.check_prereq_ok')
        : t('parallel_doctor.check_prereq_missing', { count: missingPrereq }),
      missingPrereq === 0 ? '' : t('parallel_doctor.check_prereq_hint')
    )
  );

  return checks;
}

async function applyParallelFixes(targetDir, context, state, options) {
  const dryRun = Boolean(options.dryRun);
  const generatedAt = new Date().toISOString();
  const projectName =
    String((context.data && context.data.project_name) || '').trim() || path.basename(targetDir) || 'project';
  const classification = String((context.data && context.data.classification) || 'MEDIUM');
  const actions = [];
  let changedCount = 0;

  if (!state.dirExists) {
    if (!dryRun) {
      await ensureDir(state.parallelDir);
    }
    actions.push({
      id: 'parallel_dir',
      applied: true,
      count: 1
    });
    changedCount += 1;
  } else {
    actions.push({
      id: 'parallel_dir',
      applied: false,
      skipped: true,
      count: 0
    });
  }

  if (!state.sharedExists) {
    const sharedPath = path.join(state.parallelDir, 'shared-decisions.md');
    const content = renderSharedDecisions({
      projectName,
      classification,
      workers: state.expectedWorkers,
      generatedAt
    });
    if (!dryRun) {
      await ensureDir(path.dirname(sharedPath));
      await fs.writeFile(sharedPath, content, 'utf8');
    }
    actions.push({
      id: 'shared_decisions',
      applied: true,
      count: 1
    });
    changedCount += 1;
  } else {
    actions.push({
      id: 'shared_decisions',
      applied: false,
      skipped: true,
      count: 0
    });
  }

  if (state.missingLaneIndices.length > 0) {
    for (const index of state.missingLaneIndices) {
      const lanePath = path.join(state.parallelDir, buildLaneFilename(index));
      const content = renderAgentStatus({
        index,
        generatedAt
      });
      if (!dryRun) {
        await ensureDir(path.dirname(lanePath));
        await fs.writeFile(lanePath, content, 'utf8');
      }
    }
    actions.push({
      id: 'lane_files',
      applied: true,
      count: state.missingLaneIndices.length
    });
    changedCount += state.missingLaneIndices.length;
  } else {
    actions.push({
      id: 'lane_files',
      applied: false,
      skipped: true,
      count: 0
    });
  }

  return {
    dryRun,
    actions,
    changedCount
  };
}

async function runParallelDoctor({ args, options = {}, logger, t }) {
  const targetDir = path.resolve(process.cwd(), args[0] || '.');
  const dryRun = Boolean(options['dry-run']);
  const fix = Boolean(options.fix);
  const force = Boolean(options.force);
  const workersOptionRaw = options.workers;
  const workersOption = workersOptionRaw !== undefined ? parseWorkers(workersOptionRaw) : undefined;
  if (workersOptionRaw !== undefined && workersOption === null) {
    throw new Error(
      t('parallel_doctor.invalid_workers', {
        min: 2,
        max: 6
      })
    );
  }

  const context = await validateProjectContextFile(targetDir);
  const prerequisites = await collectPrerequisites(targetDir);
  let state = await inspectParallelState(targetDir, workersOption);
  let checks = buildChecks(context, state, prerequisites, workersOption, force, t);
  let fixResult = null;

  if (fix) {
    const classification = String((context.data && context.data.classification) || '');
    if (classification !== 'MEDIUM' && !force) {
      throw new Error(
        t('parallel_doctor.requires_medium', {
          classification: classification || t('parallel_doctor.classification_unknown')
        })
      );
    }
    fixResult = await applyParallelFixes(targetDir, context, state, {
      dryRun
    });

    state = await inspectParallelState(targetDir, workersOption);
    checks = buildChecks(context, state, prerequisites, workersOption, force, t);
  }

  const summary = summarizeChecks(checks);
  const output = {
    ok: summary.failed === 0,
    targetDir,
    workers: state.expectedWorkers,
    fix: {
      enabled: fix,
      dryRun,
      force,
      ...(fixResult
        ? {
            changedCount: fixResult.changedCount,
            actions: fixResult.actions
          }
        : {})
    },
    state: {
      parallelDir: state.parallelDir,
      dirExists: state.dirExists,
      sharedExists: state.sharedExists,
      laneFiles: state.laneFiles,
      laneIndices: state.laneIndices,
      missingLaneIndices: state.missingLaneIndices
    },
    checks,
    summary
  };

  if (options.json) {
    return output;
  }

  logger.log(t('parallel_doctor.report_title', { path: targetDir }));
  for (const check of checks) {
    logger.log(
      t('parallel_doctor.check_line', {
        prefix: formatCheckPrefix(check, t),
        id: check.id,
        message: check.message
      })
    );
    if (check.hint) {
      logger.log(t('parallel_doctor.hint_line', { hint: check.hint }));
    }
  }
  logger.log(
    t('parallel_doctor.summary', {
      passed: summary.passed,
      failed: summary.failed,
      warnings: summary.warnings
    })
  );

  if (fixResult) {
    logger.log(
      dryRun
        ? t('parallel_doctor.fix_summary_dry_run', { count: fixResult.changedCount })
        : t('parallel_doctor.fix_summary', { count: fixResult.changedCount })
    );
  }

  return output;
}

module.exports = {
  runParallelDoctor,
  parseLaneIndex,
  summarizeChecks
};
