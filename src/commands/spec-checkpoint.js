'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { openRuntimeDb, appendRunEvent } = require('../runtime-store');

function nowIso() {
  return new Date().toISOString();
}

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const result = {};
  for (const line of match[1].split(/\r?\n/)) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    const value = line.slice(colonIdx + 1).trim().replace(/^["']|["']$/g, '');
    if (key) result[key] = value;
  }
  return result;
}

function extractLastCheckpoint(content) {
  // Try frontmatter first
  const fmMatch = content.match(/^---[\s\S]*?last_checkpoint:\s*(.+)/m);
  if (fmMatch) return fmMatch[1].trim().replace(/^["']|["']$/g, '');
  // Try section header
  const sectionMatch = content.match(/##\s+last_checkpoint[^\n]*\n([\s\S]*?)(?=\n##|\s*$)/i);
  if (sectionMatch) return sectionMatch[1].replace(/^[-*]\s*/, '').trim();
  return null;
}

function extractPhaseGates(content) {
  const fm = parseFrontmatter(content);
  if (!fm.phase_gates) return null;
  try {
    return JSON.parse(fm.phase_gates.replace(/'/g, '"'));
  } catch {
    return null;
  }
}

async function runSpecCheckpoint({ args, options = {}, logger }) {
  const targetDir = path.resolve(process.cwd(), args[0] || '.');
  const featureSlug = options.feature ? String(options.feature).trim() : null;
  const agentName = options.agent ? String(options.agent).trim() : 'dev';
  const contextDir = path.join(targetDir, '.aioson', 'context');

  if (!featureSlug) {
    if (!options.json) logger.log('Error: --feature=<slug> is required.');
    return { ok: false, reason: 'missing_feature' };
  }

  // Find spec file
  const candidates = [
    path.join(contextDir, `spec-${featureSlug}.md`),
    path.join(contextDir, 'spec.md')
  ];

  let specPath = null;
  let specContent = null;
  for (const candidate of candidates) {
    try {
      specContent = await fs.readFile(candidate, 'utf8');
      specPath = candidate;
      break;
    } catch { /* try next */ }
  }

  if (!specContent) {
    if (!options.json) logger.log(`No spec file found for feature: ${featureSlug}`);
    return { ok: false, reason: 'no_spec_file', featureSlug };
  }

  const lastCheckpoint = extractLastCheckpoint(specContent);
  const phaseGates = extractPhaseGates(specContent);

  if (!lastCheckpoint) {
    if (!options.json) logger.log(`No last_checkpoint found in ${path.basename(specPath)}.`);
    return { ok: false, reason: 'no_checkpoint', specPath };
  }

  const { db, dbPath } = await openRuntimeDb(targetDir, { mustExist: true });

  if (!db) {
    if (!options.json) logger.log('No runtime database found. Run aioson agent:done first.');
    return { ok: false, reason: 'no_db' };
  }

  try {
    // Find latest agent run for this feature
    const run = db.prepare(`
      SELECT r.run_key, r.status, r.summary, r.updated_at
      FROM agent_runs r
      WHERE r.agent_name = ?
        AND (r.run_key LIKE ? OR r.task_key LIKE ?)
      ORDER BY r.updated_at DESC
      LIMIT 1
    `).get(agentName, `%${featureSlug}%`, `%${featureSlug}%`);

    // If no run with feature slug, try latest run by agent name
    const activeRun = run || db.prepare(`
      SELECT run_key, status, summary, updated_at
      FROM agent_runs
      WHERE agent_name = ? AND status IN ('running', 'completed')
      ORDER BY updated_at DESC
      LIMIT 1
    `).get(agentName);

    if (!activeRun) {
      if (!options.json) {
        logger.log(`No active run found for agent @${agentName}.`);
        logger.log('Tip: run aioson runtime:start first, or specify --agent=<name>.');
      }
      return { ok: false, reason: 'no_run', featureSlug, agentName };
    }

    // Append checkpoint event
    appendRunEvent(db, {
      runKey: activeRun.run_key,
      eventType: 'plan_checkpoint',
      phase: 'spec',
      status: 'in_progress',
      message: lastCheckpoint,
      payload: phaseGates ? { phase_gates: phaseGates } : null,
      createdAt: nowIso()
    });

    // Update run summary to last_checkpoint if run is still in_progress
    if (activeRun.status !== 'completed') {
      db.prepare(
        'UPDATE agent_runs SET summary = ?, updated_at = ? WHERE run_key = ?'
      ).run(lastCheckpoint, nowIso(), activeRun.run_key);
    }

    if (options.json) {
      return {
        ok: true,
        featureSlug,
        specPath,
        lastCheckpoint,
        phaseGates,
        runKey: activeRun.run_key,
        dbPath
      };
    }

    logger.log(`Reading ${path.basename(specPath)}...`);
    logger.log(`last_checkpoint: "${lastCheckpoint}"`);
    if (phaseGates) {
      logger.log(`phase_gates: ${JSON.stringify(phaseGates)}`);
    }
    logger.log('');
    logger.log('Checkpoint registered:');
    logger.log(`  run_key: ${activeRun.run_key}`);
    logger.log(`  summary: "${lastCheckpoint}"`);
    logger.log(`  status: in_progress (checkpoint only — use agent:done to close)`);
    logger.log('');
    logger.log(`Next: continue with /${agentName} — start from last_checkpoint`);

    return {
      ok: true,
      featureSlug,
      specPath,
      lastCheckpoint,
      phaseGates,
      runKey: activeRun.run_key,
      dbPath
    };
  } finally {
    db.close();
  }
}

module.exports = { runSpecCheckpoint };
