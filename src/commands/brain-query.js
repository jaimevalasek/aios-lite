'use strict';

const { splitCsv, queryBrains, formatBrainNodesCompact, formatBrainNodesIndex } = require('../brain-query');
const { resolveTargetDir } = require('../lib/project-root');

async function runBrainQuery({ args, options = {}, logger }) {
  const targetDir = resolveTargetDir(args);
  const result = await queryBrains({
    targetDir,
    tags: splitCsv(options.tags),
    matchMode: options.match || 'any',
    minQuality: options['min-quality'] || options.minQuality || 0,
    agent: options.agent || '',
    verdicts: splitCsv(options.verdict),
    ids: splitCsv(options.id),
    avoidOnly: Boolean(options.avoid)
  });

  if (options.json) return result;

  if (!result.ok) {
    logger.log(result.warnings.join('\n') || result.reason || 'Brain query failed.');
    return result;
  }

  if (result.warnings.length > 0) {
    for (const warning of result.warnings) logger.log(`Warning: ${warning}`);
  }

  const format = options.format || 'compact';
  if (format === 'ids') {
    logger.log(result.nodes.map((node) => node.id).join('\n'));
  } else if (format === 'json') {
    logger.log(JSON.stringify(result.nodes, null, 2));
  } else if (format === 'index') {
    logger.log(formatBrainNodesIndex(result.nodes));
    if (result.nodes.length > 0) logger.log('full statement of one node: aioson brain:query . --id=<id> --format=compact');
  } else {
    logger.log(formatBrainNodesCompact(result.nodes));
  }
  logger.log(`${result.nodes.length} node(s) matched across ${result.brainFiles.length} brain file(s)`);
  return result;
}

module.exports = {
  runBrainQuery
};
