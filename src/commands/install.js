'use strict';

const path = require('node:path');
const { detectFramework } = require('../detector');
const { installTemplate, readInstallProfile } = require('../installer');
const { applyAgentLocale, normalizeInteractionLanguage } = require('../locales');
const { resolvePromptTool } = require('../prompt-tool');
const { runInstallWizard } = require('../install-wizard');
const { renderRevealAnimation, renderInstallSummary, renderProgress } = require('../install-animation');
const { getCliVersion } = require('../version');

async function runInstall({ args, options, logger, t }) {
  const targetDir = path.resolve(process.cwd(), args[0] || '.');
  const force = Boolean(options.force);
  const dryRun = Boolean(options['dry-run']);
  const noInteractive = Boolean(options['no-interactive']);
  const reconfigure = Boolean(options.reconfigure);
  const requestedLanguage = options.lang || options.language;
  const promptTool = resolvePromptTool(options.tool);

  const detection = await detectFramework(targetDir);
  if (detection.installed) {
    logger.log(t('install.framework_detected', {
      framework: detection.framework,
      evidence: detection.evidence
    }));
  } else {
    logger.log(t('install.framework_not_detected'));
  }

  // Decide install profile
  let installProfile = null;
  const isTTY = process.stdin.isTTY && process.stdout.isTTY;

  if (!noInteractive && isTTY && !dryRun) {
    const existingProfile = await readInstallProfile(targetDir);
    if (!existingProfile || reconfigure) {
      installProfile = await runInstallWizard({
        noInteractive,
        existingProfile: reconfigure ? existingProfile : null,
        t
      });
      // null = user cancelled → fall back to full install
    } else {
      installProfile = existingProfile;
      logger.log(t('install.using_saved_profile'));
    }
  }

  // When reconfigure, we need overwrite=true so changed profile is reflected
  const overwrite = force || reconfigure;

  const result = await installTemplate(targetDir, {
    overwrite,
    dryRun,
    mode: 'install',
    frameworkDetection: detection.framework,
    installProfile,
    onProgress: isTTY && !dryRun ? renderProgress : null
  });

  // Locale: explicit --lang flag wins over profile, profile wins over nothing
  const effectiveLocale = requestedLanguage || (installProfile && installProfile.locale) || null;
  let localeApply = null;
  if (effectiveLocale) {
    localeApply = await applyAgentLocale(
      targetDir,
      normalizeInteractionLanguage(effectiveLocale),
      { dryRun }
    );
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
  } else {
    logger.log(t('install.done_at', { targetDir }));
    logger.log(t('install.files_copied', { count: result.copied.length }));
    logger.log(t('install.files_skipped', { count: result.skipped.length }));
    logger.log(t('install.next_steps'));
    logger.log(t('install.step_setup_context'));
    logger.log(t('install.step_agents'));
    logger.log(t('install.step_agent_prompt', { tool: promptTool }));
  }

  if (result.isExistingProject) {
    logger.log('');
    logger.log(t('install.existing_project_detected', { count: result.projectFileCount }));
    logger.log(t('install.existing_project_scan_hint'));
  }

  return {
    ok: true,
    targetDir,
    detection,
    ...result,
    localeApply,
    installProfile
  };
}

module.exports = {
  runInstall
};
