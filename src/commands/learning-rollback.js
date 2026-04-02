'use strict';

/**
 * aioson learning:rollback [projectDir] --evolution=<uuid> [--squad=<slug>]
 *
 * Reverts a specific evolution delta from evolution-log.jsonl.
 *
 * Steps:
 *   1. Find the evolution entry by UUID in .aioson/evolution/evolution-log.jsonl
 *   2. Revert the appended content from the target file
 *   3. Mark the entry as rolled_back in the log
 *   4. Mark source learnings as stale in SQLite
 *
 * Usage:
 *   aioson learning:rollback . --evolution=<uuid>
 *   aioson learning:rollback . --evolution=<uuid> --dry-run
 *   aioson learning:rollback . --list   (show applied evolutions)
 */

const fs = require('node:fs/promises');
const path = require('node:path');
const { openRuntimeDb } = require('../runtime-store');

const EVOLUTION_LOG = path.join('.aioson', 'evolution', 'evolution-log.jsonl');

async function readEvolutionLog(projectDir) {
  const logPath = path.resolve(projectDir, EVOLUTION_LOG);
  try {
    const content = await fs.readFile(logPath, 'utf8');
    return content.trim().split('\n')
      .filter(Boolean)
      .map((line) => {
        try { return JSON.parse(line); } catch { return null; }
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

async function writeEvolutionLog(projectDir, entries) {
  const logPath = path.resolve(projectDir, EVOLUTION_LOG);
  await fs.mkdir(path.dirname(logPath), { recursive: true });
  await fs.writeFile(logPath, entries.map((e) => JSON.stringify(e)).join('\n') + '\n', 'utf8');
}

async function runLearningRollback({ args = [], options = {}, logger = console } = {}) {
  const projectDir = path.resolve(process.cwd(), args[0] || '.');
  const dryRun = Boolean(options['dry-run'] || options.dry);

  // ── List mode ──────────────────────────────────────────────────────────────
  if (options.list) {
    const entries = await readEvolutionLog(projectDir);
    const applied = entries.filter((e) => e.status === 'applied');

    if (applied.length === 0) {
      logger.log('No applied evolutions found in evolution-log.jsonl');
      return { ok: true, entries: [] };
    }

    logger.log(`Applied evolutions (${applied.length}):`);
    for (const e of applied) {
      logger.log(`  ${e.id.slice(0, 8)}... ${e.ts.slice(0, 16)} → ${e.file}`);
      logger.log(`    ${e.learning_ids?.length || 0} learning(s) applied`);
      if (e.squad) logger.log(`    Squad: ${e.squad}`);
    }
    logger.log('');
    logger.log('Rollback: aioson learning:rollback . --evolution=<id>');

    return { ok: true, entries: applied };
  }

  // ── Rollback mode ──────────────────────────────────────────────────────────
  const evolutionId = String(options.evolution || '').trim();
  if (!evolutionId) {
    logger.error('Error: --evolution <uuid> is required (or --list to see applied evolutions)');
    return { ok: false, error: 'missing_evolution_id' };
  }

  const entries = await readEvolutionLog(projectDir);
  const entryIndex = entries.findIndex(
    (e) => e.id === evolutionId || e.id.startsWith(evolutionId)
  );

  if (entryIndex === -1) {
    logger.error(`Evolution "${evolutionId}" not found in evolution-log.jsonl`);
    logger.log('Run: aioson learning:rollback . --list');
    return { ok: false, error: 'evolution_not_found' };
  }

  const entry = entries[entryIndex];

  if (entry.status === 'rolled_back') {
    logger.log(`Evolution "${entry.id.slice(0, 8)}..." is already rolled back.`);
    return { ok: true, alreadyRolledBack: true };
  }

  if (entry.status !== 'applied') {
    logger.error(`Evolution "${entry.id.slice(0, 8)}..." has unexpected status: ${entry.status}`);
    return { ok: false, error: 'unexpected_status' };
  }

  logger.log(`Rolling back evolution: ${entry.id}`);
  logger.log(`  File: ${entry.file}`);
  logger.log(`  Content to remove (${entry.content?.length || 0} chars)`);

  if (dryRun) {
    logger.log('[dry-run] No changes applied.');
    return { ok: true, dryRun: true, entry };
  }

  // ── Revert file content ────────────────────────────────────────────────────
  if (entry.content && entry.file) {
    const filePath = path.isAbsolute(entry.file)
      ? entry.file
      : path.resolve(projectDir, entry.file);

    try {
      const current = await fs.readFile(filePath, 'utf8');
      // Remove the exact content that was appended
      const reverted = current.replace(entry.content, '').replace(/\n{3,}/g, '\n\n');
      await fs.writeFile(filePath, reverted, 'utf8');
      logger.log(`  ✓ Reverted: ${entry.file}`);
    } catch (err) {
      logger.error(`  ✗ Failed to revert ${entry.file}: ${err.message}`);
      return { ok: false, error: 'file_revert_failed', detail: err.message };
    }
  }

  // ── Mark entry as rolled_back ──────────────────────────────────────────────
  entries[entryIndex] = {
    ...entry,
    status: 'rolled_back',
    rollback_ts: new Date().toISOString(),
    rollback_reason: options.reason || 'user request'
  };
  await writeEvolutionLog(projectDir, entries);

  // ── Mark learnings as stale in SQLite ─────────────────────────────────────
  const learningIds = entry.learning_ids || [];
  if (learningIds.length > 0) {
    const handle = await openRuntimeDb(projectDir, { mustExist: true });
    if (handle) {
      const { db } = handle;
      try {
        for (const id of learningIds) {
          db.prepare(
            `UPDATE squad_learnings SET status = 'stale', updated_at = datetime('now') WHERE learning_id = ?`
          ).run(id);
        }
        logger.log(`  ✓ ${learningIds.length} learning(s) marked as stale`);
      } finally {
        db.close();
      }
    }
  }

  logger.log('');
  logger.log(`✓ Evolution rolled back: ${entry.id}`);

  return { ok: true, entry: entries[entryIndex] };
}

module.exports = { runLearningRollback };
