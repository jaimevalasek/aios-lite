'use strict';

const { detectFramework } = require('../detector');
const { detectExistingInstall } = require('../installer');
const { getCliVersion } = require('../version');
const { resolveTargetDir } = require('../lib/project-root');

async function runInfo({ args, options = {}, logger, t }) {
  const targetDir = resolveTargetDir(args);
  const jsonMode = Boolean(options.json);
  const version = await getCliVersion();

  const installed = await detectExistingInstall(targetDir);
  const detection = await detectFramework(targetDir);

  const result = {
    ok: true,
    version,
    targetDir,
    installed,
    detection
  };

  if (jsonMode) {
    return result;
  }

  logger.log(t('info.cli_version', { version }));
  logger.log(t('info.directory', { targetDir }));
  logger.log(t('info.installed_here', { value: installed ? t('info.yes') : t('info.no') }));
  logger.log(t('info.framework_detected', { framework: detection.framework || t('info.none') }));
  if (detection.evidence) {
    logger.log(t('info.evidence', { evidence: detection.evidence }));
  }

  return result;
}

module.exports = {
  runInfo
};
