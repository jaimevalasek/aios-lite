'use strict';

/**
 * aioson git:guard — inspect staged files before commit
 *
 * Usage:
 *   aioson git:guard .
 *   aioson git:guard . --json
 *   aioson git:guard . --allow-warnings --json
 *   aioson git:guard . --install-hook
 *   aioson git:guard . --uninstall-hook
 */

const path = require('node:path');
const {
  inspectStagedChanges,
  installPreCommitHook,
  uninstallPreCommitHook
} = require('../lib/git-commit-guard');

function formatFinding(prefix, finding) {
  const line = finding.line ? `:${finding.line}` : '';
  return `${prefix} ${finding.path}${line} — ${finding.reason} [${finding.id}]`;
}

async function runGitGuard({ args, options = {}, logger }) {
  const targetDir = path.resolve(process.cwd(), args[0] || '.');
  const allowWarnings = Boolean(options['allow-warnings'] || options.allowWarnings);
  const installHook = Boolean(options['install-hook'] || options.installHook);
  const uninstallHook = Boolean(options['uninstall-hook'] || options.uninstallHook || options['remove-hook'] || options.removeHook);

  if (installHook && uninstallHook) {
    process.exitCode = 1;
    const failure = {
      ok: false,
      error: 'git_guard_invalid_options',
      message: 'Use either --install-hook or --uninstall-hook, not both.',
      projectDir: targetDir
    };
    if (!options.json) logger.error(failure.message);
    return failure;
  }

  if (installHook || uninstallHook) {
    let hookResult;
    try {
      hookResult = installHook
        ? await installPreCommitHook(targetDir, options)
        : await uninstallPreCommitHook(targetDir, options);
    } catch (error) {
      process.exitCode = 1;
      const failure = {
        ok: false,
        error: 'git_guard_hook_failed',
        message: error.message,
        projectDir: targetDir
      };
      if (!options.json) logger.error(`Commit hook operation failed: ${error.message}`);
      return failure;
    }

    if (!hookResult.ok) process.exitCode = 1;
    if (options.json) return hookResult;

    logger.log('');
    logger.log(`Commit hook — ${hookResult.gitRoot}`);
    if (!hookResult.ok) {
      logger.error(hookResult.message);
      return hookResult;
    }

    if (installHook) {
      logger.log(hookResult.dryRun ? 'Pre-commit hook dry-run complete.' : 'Pre-commit hook installed.');
      logger.log(`Hook path: ${hookResult.hookPath}`);
      if (hookResult.backedUpExistingHook) {
        logger.log(`Existing hook backed up to: ${hookResult.backupPath}`);
      }
      if (hookResult.chainedBackupHook) {
        logger.log('AIOSON will chain the backed-up hook after the guard passes.');
      }
      return hookResult;
    }

    if (hookResult.removed || hookResult.dryRun) {
      logger.log(hookResult.dryRun ? 'Pre-commit hook uninstall dry-run complete.' : 'Pre-commit hook removed.');
      if (hookResult.restoredBackup) {
        logger.log(`Restored previous hook from: ${hookResult.backupPath}`);
      }
      return hookResult;
    }

    logger.log(hookResult.message);
    return hookResult;
  }

  let result;
  try {
    result = await inspectStagedChanges(targetDir, {
      allowWarnings,
      config: options.config
    });
  } catch (error) {
    process.exitCode = 1;
    const failure = {
      ok: false,
      error: 'git_guard_failed',
      message: error.message,
      projectDir: targetDir
    };
    if (!options.json) logger.error(`Commit guard failed: ${error.message}`);
    return failure;
  }

  const output = {
    ok: result.ok,
    projectDir: targetDir,
    gitRoot: result.gitRoot,
    strict: result.strict,
    policy: result.policy,
    stagedFiles: result.stagedFiles,
    files: result.files,
    errors: result.errors,
    warnings: result.warnings,
    suggestedCommands: result.suggestedCommands,
    summary: result.summary
  };

  if (!result.ok) process.exitCode = 1;

  if (options.json) return output;

  logger.log('');
  logger.log(`Commit guard — ${result.gitRoot}`);
  logger.log(`Staged files: ${result.summary.stagedCount}`);
  logger.log(`Policy: ${result.policy.loaded ? result.policy.path : 'default built-in policy (no project config found)'}`);

  if (result.summary.stagedCount === 0) {
    logger.error('No staged files found. Stage explicit files before committing.');
    return output;
  }

  if (result.ok) {
    logger.log('Commit guard passed.');
    return output;
  }

  logger.error('Commit guard blocked this commit.');
  if (result.errors.length > 0) {
    logger.error('Errors:');
    for (const finding of result.errors) {
      logger.error(formatFinding('  [ERROR]', finding));
    }
  }
  if (result.warnings.length > 0) {
    logger.error('Warnings:');
    for (const finding of result.warnings) {
      logger.error(formatFinding('  [WARN] ', finding));
    }
  }
  if (result.suggestedCommands.length > 0) {
    logger.error('Suggested next commands:');
    for (const command of result.suggestedCommands) {
      logger.error(`  ${command}`);
    }
  }

  return output;
}

module.exports = { runGitGuard };
