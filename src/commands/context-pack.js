'use strict';

const path = require('node:path');
const { createContextPack } = require('../context-memory');
const { resolveTargetDir } = require('../lib/project-root');

async function runContextPack({ args, options = {}, logger, t }) {
  const targetDir = resolveTargetDir(args);
  const agent = String(options.agent || '').trim();
  const goal = String(options.goal || '').trim();
  const module = String(options.module || options.folder || '').trim();

  const output = await createContextPack({
    targetDir,
    agent,
    goal,
    module,
    maxFiles: options['max-files']
  });

  if (options.json) {
    return output;
  }

  logger.log(t('context_pack.generated', { path: output.packPath }));
  if (output.selectedFiles.length === 0) {
    logger.log(t('context_pack.no_matches'));
    logger.log(t('context_pack.hint_use', { path: output.packPath }));
    return output;
  }

  logger.log(t('context_pack.selected_title'));
  output.selectedFiles.forEach((file, index) => {
    logger.log(t('context_pack.selected_line', {
      index: index + 1,
      path: file.path,
      reason: file.reason
    }));
  });
  logger.log(t('context_pack.hint_use', { path: output.packPath }));
  return output;
}

module.exports = {
  runContextPack
};
