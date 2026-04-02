'use strict';

const { runLearningExport } = require('./learning-export');

/**
 * aioson devlog:export-brains [targetDir] [--min-frequency=N] [--json]
 *
 * Exports high-frequency project_learnings to .aioson/brains/ as Zettelkasten nodes.
 * This is a focused wrapper over learning:export, intended to be run after devlog:process.
 */
async function runDevlogExportBrains({ args, options = {}, logger }) {
  // Default min-frequency to 2 for devlog pipeline (lower than the general export default of 1)
  const minFrequency = options['min-frequency'] != null ? options['min-frequency'] : options.minFrequency ?? 2;
  const result = await runLearningExport({
    args,
    options: { ...options, 'min-frequency': minFrequency },
    logger
  });

  if (result.ok && !options.json && result.exported > 0) {
    logger.log('Run: aioson learning:evolve to promote high-frequency nodes to genome.');
  }

  return result;
}

module.exports = { runDevlogExportBrains };
