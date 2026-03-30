'use strict';

const path = require('node:path');
const { AgentLoader } = require('../agent-loader');

async function runAgentLoad({ args, options, logger }) {
  const agentId = args[0] || options.agent || '';
  const goal = options.goal || '';
  const cwd = path.resolve(process.cwd(), options.cwd || '.');
  const agentsDir = path.join(cwd, options['agents-dir'] || '.aioson/agents');
  const maxShards = Number(options['max-shards']) || 3;
  const maxTokens = Number(options['max-tokens']) || 2000;

  if (!agentId) {
    logger.error('Usage: aioson agent:load <agent-id> --goal="..." [--cwd=.]');
    return { ok: false, error: 'missing_agent' };
  }

  const loader = new AgentLoader();
  await loader.open();

  try {
    // Index agents dir if needed
    await loader.indexAgentsDir(agentsDir, { force: Boolean(options.force) });

    // Load relevant shards
    const result = await loader.loadRelevantShards(agentId, goal, { maxShards, maxTokens });

    if (result.shards.length === 0) {
      logger.log(`No shards found for agent: ${agentId}`);
      logger.log(`Make sure the agents directory exists: ${agentsDir}`);
      return { ok: true, agentId, shards: [], tokens: 0 };
    }

    if (options.json) {
      return { ok: true, ...result };
    }

    logger.log(`\n  Agent: ${agentId}  (${result.shards.length}/${result.totalShards} shards, ${result.tokens} tokens)\n`);
    for (const shard of result.shards) {
      logger.log(`  ## ${shard.heading}  (${shard.tokens} tokens)`);
    }
    logger.log('');

    if (options.print) {
      logger.log('\n---\n');
      logger.log(AgentLoader.buildContext(result.shards));
    }

    return { ok: true, ...result };
  } finally {
    loader.close();
  }
}

async function runAgentShardIndex({ args, options, logger }) {
  const cwd = path.resolve(process.cwd(), args[0] || '.');
  const agentsDir = path.join(cwd, options['agents-dir'] || '.aioson/agents');
  const force = Boolean(options.force);

  logger.log(`Indexing agent shards from: ${agentsDir}`);

  const loader = new AgentLoader();
  await loader.open();

  try {
    const result = await loader.indexAgentsDir(agentsDir, { force });
    const stats = loader.stats();

    if (options.json) {
      return { ok: true, ...result, stats };
    }

    logger.log(`  Agents indexed: ${result.agents}`);
    logger.log(`  Total shards: ${result.totalShards}`);
    logger.log(`  Index total docs: ${stats.totalDocs}`);
    logger.log('');

    return { ok: true, ...result, stats };
  } finally {
    loader.close();
  }
}

module.exports = { runAgentLoad, runAgentShardIndex };
