'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { installTemplate } = require('../installer');
const { applyAgentLocale } = require('../locales');
const { resolvePromptTool } = require('../prompt-tool');
const { runInstallWizard } = require('../install-wizard');
const { renderRevealAnimation, renderInstallSummary, renderProgress } = require('../install-animation');
const { getCliVersion } = require('../version');

async function directoryIsEmpty(dirPath) {
  try {
    const entries = await fs.readdir(dirPath);
    return entries.length === 0;
  } catch (error) {
    if (error && error.code === 'ENOENT') return true;
    throw error;
  }
}

async function runInit({ args, options, logger, t }) {
  const projectName = args[0];
  if (!projectName) {
    throw new Error(t('init.usage_error'));
  }

  const targetDir = path.resolve(process.cwd(), projectName);
  const force = Boolean(options.force);
  const dryRun = Boolean(options['dry-run']);
  const noInteractive = Boolean(options['no-interactive']);
  const requestedLanguage = options.lang || options.language;
  const promptTool = resolvePromptTool(options.tool);

  await fs.mkdir(targetDir, { recursive: true });

  if (!(await directoryIsEmpty(targetDir)) && !force) {
    throw new Error(t('init.non_empty_dir', { targetDir }));
  }

  // Run wizard for new projects (TTY only)
  const isTTY = process.stdin.isTTY && process.stdout.isTTY;
  let installProfile = null;

  if (!noInteractive && !dryRun && isTTY) {
    installProfile = await runInstallWizard({ noInteractive });
    // null = user cancelled → fall back to full install
  }

  const result = await installTemplate(targetDir, {
    overwrite: true,
    dryRun,
    mode: 'init',
    installProfile,
    onProgress: isTTY && !dryRun ? renderProgress : null
  });

  const effectiveLocale = requestedLanguage || (installProfile && installProfile.locale) || null;
  let localeApply = null;
  if (effectiveLocale) {
    localeApply = await applyAgentLocale(targetDir, effectiveLocale, { dryRun });
    if (dryRun) {
      logger.log(t('locale_apply.dry_run_applied', { locale: localeApply.locale }));
    } else {
      logger.log(t('locale_apply.applied', { locale: localeApply.locale }));
    }
  }

  // Reveal animation + summary (TTY only, not dry-run)
  if (isTTY && !dryRun) {
    const version = await getCliVersion();
    await renderRevealAnimation(version);
    renderInstallSummary({ result, installProfile });
    logger.log('');
    logger.log(t('init.step_cd', { projectName }));
  } else {
    logger.log(t('init.created_at', { targetDir }));
    logger.log(t('init.files_copied', { count: result.copied.length }));
    if (result.skipped.length > 0) {
      logger.log(t('init.files_skipped', { count: result.skipped.length }));
    }
    logger.log(t('init.next_steps'));
    logger.log(t('init.step_cd', { projectName }));
    logger.log(t('init.step_setup'));
    logger.log(t('init.step_agents'));
    logger.log(t('init.step_agent_prompt', { tool: promptTool }));
  }

  return {
    ok: true,
    targetDir,
    ...result,
    localeApply,
    installProfile
  };
}

module.exports = {
  runInit,
  directoryIsEmpty
};
