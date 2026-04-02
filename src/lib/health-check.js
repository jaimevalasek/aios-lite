'use strict';

/**
 * Ambient Intelligence Health Check — Phase 5.3
 *
 * Aggregates state from multiple SQLite tables and file-system checks
 * to produce a list of items awaiting attention.
 *
 * Used by:
 *   - live:start   → shows alert at session start
 *   - daemon:start → triggers automatic actions in the background loop
 */

const fs = require('node:fs/promises');
const path = require('node:path');
const { openRuntimeDb } = require('../runtime-store');

const MIN_LEARNINGS_FOR_EVOLVE = 5;
const MIN_LEARNING_FREQUENCY = 2;
const SQUAD_INACTIVE_DAYS = 30;
const TOOL_UNUSED_DAYS = 60;
const EVENT_STALE_HOURS = 24;

/**
 * Run all health checks and return a list of items.
 *
 * @param {string} projectDir
 * @returns {Promise<{ items: HealthItem[], ok: boolean }>}
 */
async function runHealthCheck(projectDir) {
  const handle = await openRuntimeDb(projectDir, { mustExist: true });
  if (!handle) return { items: [], ok: true };
  const { db } = handle;

  const items = [];

  try {
    // ── Check 1: Learnings ready for evolve ────────────────────────────────
    try {
      const learnings = db.prepare(`
        SELECT squad_slug, COUNT(*) as count
        FROM squad_learnings
        WHERE status = 'active' AND frequency >= ?
        GROUP BY squad_slug
        HAVING count >= ?
      `).all(MIN_LEARNING_FREQUENCY, MIN_LEARNINGS_FOR_EVOLVE);

      for (const row of learnings) {
        items.push({
          type: 'learnings_ready',
          priority: 'high',
          squad: row.squad_slug,
          count: row.count,
          message: `${row.count} learnings prontos para evoluir (squad: ${row.squad_slug})`,
          action: `aioson learning:evolve . --squad=${row.squad_slug} --auto-apply`
        });
      }
    } catch { /* table might not exist yet */ }

    // ── Check 2: Inactive squads ───────────────────────────────────────────
    try {
      const inactive = db.prepare(`
        SELECT squad_slug, updated_at
        FROM squads
        WHERE status = 'active'
          AND updated_at < datetime('now', '-${SQUAD_INACTIVE_DAYS} days')
      `).all();

      for (const row of inactive) {
        const daysSince = Math.round((Date.now() - new Date(row.updated_at).getTime()) / 86400000);
        items.push({
          type: 'squad_inactive',
          priority: 'low',
          squad: row.squad_slug,
          days: daysSince,
          message: `Squad "${row.squad_slug}" inativo há ${daysSince} dias`,
          action: null
        });
      }
    } catch { /* ok */ }

    // ── Check 3: Stale inter-squad events ─────────────────────────────────
    try {
      const stale = db.prepare(`
        SELECT id, from_squad, event, created_at
        FROM inter_squad_events
        WHERE datetime(created_at, '+${EVENT_STALE_HOURS} hours') < datetime('now')
          AND consumed_by = '[]'
      `).all();

      if (stale.length > 0) {
        items.push({
          type: 'stale_events',
          priority: 'medium',
          count: stale.length,
          message: `${stale.length} evento(s) inter-squad pendentes há mais de ${EVENT_STALE_HOURS}h sem consumidor`,
          action: null
        });
      }
    } catch { /* ok */ }

    // ── Check 4: Dynamic tools unused for a long time ─────────────────────
    try {
      const unusedTools = db.prepare(`
        SELECT t.name, t.squad_slug, t.registered_at
        FROM dynamic_squad_tools t
        WHERE t.registered_at < datetime('now', '-${TOOL_UNUSED_DAYS} days')
      `).all();

      if (unusedTools.length > 0) {
        items.push({
          type: 'unused_tools',
          priority: 'low',
          count: unusedTools.length,
          message: `${unusedTools.length} tool(s) dinâmico(s) sem uso há mais de ${TOOL_UNUSED_DAYS} dias`,
          action: `aioson squad:tool:register . --list --squad=<slug>`
        });
      }
    } catch { /* ok */ }
  } finally {
    db.close();
  }

  return { items, ok: true };
}

/**
 * Format health items for display in terminal (live:start alert).
 *
 * @param {HealthItem[]} items
 * @returns {string|null} Formatted alert string, or null if nothing to report
 */
function formatHealthAlert(items) {
  if (items.length === 0) return null;

  const high = items.filter((i) => i.priority === 'high');
  const medium = items.filter((i) => i.priority === 'medium');
  const low = items.filter((i) => i.priority === 'low');

  const lines = [
    `AIOSON — ${items.length} item(s) aguardam atenção:`
  ];

  for (const item of high) {
    lines.push(`  ● ${item.message}`);
    if (item.action) lines.push(`    → ${item.action}`);
  }
  for (const item of medium) {
    lines.push(`  ◐ ${item.message}`);
  }
  for (const item of low) {
    lines.push(`  ○ ${item.message}`);
  }

  return lines.join('\n');
}

module.exports = { runHealthCheck, formatHealthAlert };
