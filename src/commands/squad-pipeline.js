'use strict';

const path = require('node:path');
const {
  openRuntimeDb,
  runtimeStoreExists,
  listPipelines,
  getPipelineDAG,
  getTopologicalOrder
} = require('../runtime-store');

async function runSquadPipeline({ args = [], options = {}, logger = console } = {}) {
  const projectDir = path.resolve(process.cwd(), args[0] || '.');
  const subcommand = options.sub || args[1] || 'list';
  const slugArg = options.pipeline || args[2];

  const hasDb = await runtimeStoreExists(projectDir);
  if (!hasDb) {
    logger.error('Runtime store not initialized. Run: aioson runtime:init .');
    return { ok: false, error: 'runtime_not_initialized' };
  }

  const result = await openRuntimeDb(projectDir, { mustExist: true });
  if (!result) {
    logger.error('Could not open runtime store.');
    return { ok: false, error: 'db_open_failed' };
  }
  const { db } = result;

  try {
    if (subcommand === 'list') {
      const pipelines = listPipelines(db);
      if (pipelines.length === 0) {
        logger.log('No pipelines found. Create one with: aioson squad:pipeline show --sub=create');
        return { ok: true, pipelines: [] };
      }
      logger.log(`Pipelines (${pipelines.length}):`);
      for (const p of pipelines) {
        logger.log(`  ${p.slug}  [${p.status}]  ${p.name || ''}`);
      }
      return { ok: true, pipelines };
    }

    if (subcommand === 'show') {
      if (!slugArg) {
        logger.error('Usage: aioson squad:pipeline [path] --sub=show --pipeline=<slug>');
        return { ok: false, error: 'missing_slug' };
      }
      const dag = getPipelineDAG(db, slugArg);
      if (!dag) {
        logger.error(`Pipeline not found: ${slugArg}`);
        return { ok: false, error: 'not_found' };
      }
      const order = getTopologicalOrder(db, slugArg);
      logger.log(`Pipeline: ${dag.pipeline.name || dag.pipeline.slug}`);
      logger.log(`Status: ${dag.pipeline.status}  Trigger: ${dag.pipeline.trigger_mode}`);
      logger.log(`Nodes: ${dag.nodes.length}  Edges: ${dag.edges.length}`);
      if (order) {
        logger.log(`Topological order: ${order.join(' → ')}`);
      } else {
        logger.log('⚠️  Cycle detected — invalid pipeline.');
      }
      for (const edge of dag.edges) {
        logger.log(`  [${edge.source_squad}:${edge.source_port}] → [${edge.target_squad}:${edge.target_port}]`);
      }
      return { ok: true, dag, topologicalOrder: order };
    }

    if (subcommand === 'status') {
      if (!slugArg) {
        logger.error('Usage: aioson squad:pipeline [path] --sub=status --pipeline=<slug>');
        return { ok: false, error: 'missing_slug' };
      }
      const dag = getPipelineDAG(db, slugArg);
      if (!dag) {
        logger.error(`Pipeline not found: ${slugArg}`);
        return { ok: false, error: 'not_found' };
      }
      const handoffs = db
        .prepare('SELECT * FROM squad_handoffs WHERE pipeline_slug = ? ORDER BY created_at DESC')
        .all(slugArg);
      const pending = handoffs.filter(h => h.status === 'pending').length;
      const consumed = handoffs.filter(h => h.status === 'consumed').length;
      const failed = handoffs.filter(h => h.status === 'failed').length;
      logger.log(`Pipeline: ${dag.pipeline.slug}  Status: ${dag.pipeline.status}`);
      logger.log(`Handoffs — pending: ${pending}  consumed: ${consumed}  failed: ${failed}`);
      return { ok: true, pipeline: dag.pipeline, handoffs: { pending, consumed, failed } };
    }

    logger.error(`Unknown subcommand: ${subcommand}. Available: list, show, status`);
    return { ok: false, error: 'unknown_subcommand' };
  } finally {
    db.close();
  }
}

module.exports = { runSquadPipeline };
