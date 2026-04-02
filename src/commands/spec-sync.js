'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { openRuntimeDb } = require('../runtime-store');

function nowIso() {
  return new Date().toISOString();
}

function createLearningId() {
  return `learning-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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

function extractSection(content, sectionName) {
  const re = new RegExp(`^#{1,4}\\s+${sectionName}[\\s\\S]*?(?=^#{1,4}\\s|$)`, 'im');
  const match = content.match(re);
  if (!match) return '';
  return match[0].replace(/^#{1,4}\s+\S.*\n/, '').trim();
}

function extractLearnings(content) {
  const section = extractSection(content, 'Session Learnings');
  const learnings = [];
  for (const line of section.split(/\r?\n/)) {
    const trimmed = line.replace(/^[-*]\s*/, '').trim();
    if (!trimmed) continue;
    const typeMatch = trimmed.match(/^\[(process|domain|quality|preference)\]\s+(.+)/i);
    if (typeMatch) {
      learnings.push({ type: typeMatch[1].toLowerCase(), title: typeMatch[2].trim() });
    } else if (trimmed.length > 5) {
      learnings.push({ type: 'process', title: trimmed });
    }
  }
  return learnings;
}

function extractLastCheckpoint(content) {
  const section = extractSection(content, 'last_checkpoint');
  if (section) return section.replace(/^.*:\s*/, '').trim();
  const fmMatch = content.match(/^---[\s\S]*?last_checkpoint:\s*(.+)/m);
  return fmMatch ? fmMatch[1].trim().replace(/^["']|["']$/g, '') : null;
}

function upsertProjectLearning(db, { title, type, featureSlug, evidence, sourceSession }) {
  const existing = db.prepare(
    'SELECT learning_id, frequency FROM project_learnings WHERE title = ? AND feature_slug = ?'
  ).get(title, featureSlug || null);

  if (existing) {
    db.prepare(
      'UPDATE project_learnings SET frequency = ?, last_reinforced = ?, updated_at = ? WHERE learning_id = ?'
    ).run(existing.frequency + 1, nowIso(), nowIso(), existing.learning_id);
    return { action: 'updated', learningId: existing.learning_id };
  }

  const learningId = createLearningId();
  db.prepare(`
    INSERT INTO project_learnings
      (learning_id, feature_slug, type, title, confidence, frequency, last_reinforced,
       applies_to, source_session, evidence, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'medium', 1, ?, 'project', ?, ?, 'active', ?, ?)
  `).run(learningId, featureSlug || null, type, title, nowIso(), sourceSession || null, evidence || null, nowIso(), nowIso());
  return { action: 'inserted', learningId };
}

function syncPlanPhases(db, featureSlug, phaseGates) {
  if (!phaseGates || typeof phaseGates !== 'object') return 0;
  const plan = db.prepare(
    "SELECT plan_id FROM implementation_plans WHERE feature_slug = ? AND status != 'archived' ORDER BY created_at DESC LIMIT 1"
  ).get(featureSlug);
  if (!plan) return 0;

  let updated = 0;
  const gateMap = { plan: 1, requirements: 2, design: 3 };
  for (const [gate, status] of Object.entries(phaseGates)) {
    const phaseNum = gateMap[gate];
    if (!phaseNum) continue;
    const phase = db.prepare(
      'SELECT phase_number, status FROM plan_phases WHERE plan_id = ? AND phase_number = ?'
    ).get(plan.plan_id, phaseNum);
    if (!phase) continue;

    const newStatus = status === 'approved' ? 'completed' : (status === 'pending' ? 'pending' : phase.status);
    if (newStatus !== phase.status) {
      db.prepare(
        'UPDATE plan_phases SET status = ?, completed_at = ? WHERE plan_id = ? AND phase_number = ?'
      ).run(newStatus, newStatus === 'completed' ? nowIso() : null, plan.plan_id, phaseNum);
      updated++;
    }
  }
  return updated;
}

async function syncSpecFile(db, specPath, { verbose = false } = {}) {
  let content;
  try {
    content = await fs.readFile(specPath, 'utf8');
  } catch {
    return { skipped: true, reason: 'not_found' };
  }

  const filename = path.basename(specPath, '.md');
  const featureSlug = filename.startsWith('spec-') ? filename.slice(5) : null;
  const fm = parseFrontmatter(content);
  const phaseGates = fm.phase_gates ? JSON.parse(fm.phase_gates.replace(/'/g, '"')).catch?.() || null : null;

  const learnings = extractLearnings(content);
  const lastCheckpoint = extractLastCheckpoint(content);

  let learningsSynced = 0;
  for (const { type, title } of learnings) {
    upsertProjectLearning(db, { title, type, featureSlug, sourceSession: filename });
    learningsSynced++;
  }

  let phasesSynced = 0;
  if (featureSlug && fm.phase_gates) {
    try {
      const gates = JSON.parse(fm.phase_gates.replace(/'/g, '"'));
      phasesSynced = syncPlanPhases(db, featureSlug, gates);
    } catch { /* malformed phase_gates — skip */ }
  }

  return { featureSlug, learningsSynced, phasesSynced, lastCheckpoint };
}

async function runSpecSync({ args, options = {}, logger }) {
  const targetDir = path.resolve(process.cwd(), args[0] || '.');
  const contextDir = path.join(targetDir, '.aioson', 'context');

  let files;
  try {
    const entries = await fs.readdir(contextDir);
    files = entries.filter((f) => f.startsWith('spec') && f.endsWith('.md'));
  } catch {
    if (!options.json) logger.log('No .aioson/context/ directory found.');
    return { ok: false, reason: 'no_context_dir' };
  }

  const { db, dbPath } = await openRuntimeDb(targetDir);
  const results = [];

  try {
    for (const file of files) {
      const result = await syncSpecFile(db, path.join(contextDir, file), { verbose: options.verbose });
      if (!result.skipped) {
        results.push({ file, ...result });
      }
    }
  } finally {
    db.close();
  }

  const totalLearnings = results.reduce((s, r) => s + (r.learningsSynced || 0), 0);
  const totalPhases = results.reduce((s, r) => s + (r.phasesSynced || 0), 0);

  if (options.json) {
    return { ok: true, files: results, totalLearnings, totalPhases, dbPath };
  }

  logger.log(`Spec Sync — ${targetDir}`);
  logger.log('─'.repeat(50));
  for (const r of results) {
    logger.log(`${r.file}`);
    if (r.learningsSynced > 0) logger.log(`  Learnings synced: ${r.learningsSynced}`);
    if (r.phasesSynced > 0) logger.log(`  Plan phases updated: ${r.phasesSynced}`);
    if (r.lastCheckpoint) logger.log(`  last_checkpoint: "${r.lastCheckpoint}"`);
  }
  logger.log('─'.repeat(50));
  logger.log(`Summary: ${totalLearnings} learnings synced, ${totalPhases} plan phases updated`);

  return { ok: true, files: results, totalLearnings, totalPhases, dbPath };
}

module.exports = { runSpecSync };
