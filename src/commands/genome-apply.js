'use strict';

/**
 * aioson genome:apply — the runtime genome-binding compiler as a command.
 *
 * applyGenomeBindingsToSquad (compile → managed executor blocks →
 * squad.manifest.json + blueprint + docs/readiness.md) always existed as a
 * service with no CLI surface, so the @genome prompt narrated the whole bind
 * step by hand. The merge/precedence rules and the write set live here in src/;
 * the agent keeps only the semantic judgment — does the materialized delta
 * actually change behavior, and how do conflicting genomes rank.
 */

const path = require('node:path');
const { applyGenomeToExistingSquad } = require('../squads/apply-genome');

async function runGenomeApply({ args, options = {}, logger }) {
  const targetDir = path.resolve(process.cwd(), args[0] || '.');
  const genome = options.genome ? String(options.genome).trim() : null;
  const squadSlug = options.squad ? String(options.squad).trim() : null;
  const executor = options.executor ? String(options.executor).trim() : null;

  if (!genome || !squadSlug) {
    const failure = { ok: false, reason: 'missing_arguments' };
    if (options.json) return failure;
    logger.error('Usage: aioson genome:apply [path] --genome=<slug> --squad=<slug> [--executor=<slug>] [--json]');
    return { ...failure, exitCode: 1 };
  }

  try {
    const result = await applyGenomeToExistingSquad({
      projectRoot: targetDir,
      squadSlug,
      squad: executor ? [] : [genome],
      executors: executor ? { [executor]: [genome] } : {}
    });
    const relative = (p) => path.relative(targetDir, p).split(path.sep).join('/');
    const payload = {
      ok: true,
      squad: result.squadSlug,
      genome,
      executor: executor || null,
      genome_bindings: result.genomeBindings,
      compilation: result.compilation,
      written: [
        relative(result.paths.manifestPath),
        relative(result.paths.blueprintPath),
        relative(result.paths.readinessPath)
      ]
    };
    if (options.json) return payload;
    logger.log(`genome:apply — ${genome} → squad ${result.squadSlug}${executor ? ` (executor ${executor})` : ''}`);
    logger.log(`  compilation reports: ${Array.isArray(result.compilation) ? result.compilation.length : 0}`);
    for (const file of payload.written) logger.log(`  wrote ${file}`);
    logger.log('  judgment stays with the agent: inspect the materialized executor delta before treating the binding as ready.');
    return payload;
  } catch (error) {
    const failure = { ok: false, reason: 'apply_failed', error: error.message };
    if (options.json) return failure;
    logger.error(`genome:apply failed: ${error.message}`);
    return { ...failure, exitCode: 1 };
  }
}

module.exports = { runGenomeApply };
