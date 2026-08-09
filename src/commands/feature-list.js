'use strict';

/**
 * aioson feature:list — enumerate the project's features so an agent (or the
 * user) can pick one instead of guessing a slug.
 *
 * `feature:current` answers "which feature is active right now"; this answers
 * "which features exist at all", which is what a scoped review (@pentester,
 * @tester, @qa on demand) needs before it can bind itself to a slug. Both read
 * the same `features.md` table, so neither invents a feature the project has
 * not registered.
 *
 * Usage:
 *   aioson feature:list .                        # readable list, active marked with *
 *   aioson feature:list . --json                 # { ok, active, total, features[] }
 *   aioson feature:list . --status=in_progress   # filter by one or more statuses
 *   aioson feature:list . --limit=0              # no truncation
 */

const path = require('node:path');
const { readFileSafe, contextDir } = require('../preflight-engine');
const { resolveActiveFeature } = require('./feature-current');

const DEFAULT_LIMIT = 25;
const EMPTY_CELL = new Set(['', '-', '—', 'n/a']);

/**
 * Parse the `features.md` table into full rows. `parseFeaturesMap` in
 * preflight-engine reads the same table but only keeps slug → status; listing
 * also needs the dates to order the result.
 */
function parseFeatureRows(content) {
  const rows = [];
  const seen = new Set();
  for (const line of String(content || '').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('|')) continue;
    const parts = trimmed.split('|').map((part) => part.trim());
    if (parts.length < 5) continue;
    const [, slug, status, started, completed] = parts;
    if (!slug || slug === 'slug' || /^-+$/.test(slug)) continue;
    if (seen.has(slug)) continue;
    seen.add(slug);
    rows.push({
      slug,
      status: status || 'unknown',
      started: EMPTY_CELL.has(started) ? null : started,
      completed: EMPTY_CELL.has(completed) ? null : completed
    });
  }
  return rows;
}

function parseStatusFilter(value) {
  return String(value === true ? '' : value || '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

function parseLimit(value) {
  if (value === undefined || value === null || value === true || value === '') return DEFAULT_LIMIT;
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed < 0) return DEFAULT_LIMIT;
  return parsed;
}

/** Newest first: rows without a start date keep their file order, at the end. */
function sortRows(rows) {
  return rows
    .map((row, index) => ({ row, index }))
    .sort((a, b) => {
      const left = a.row.started || '';
      const right = b.row.started || '';
      if (left && right && left !== right) return left < right ? 1 : -1;
      if (left && !right) return -1;
      if (!left && right) return 1;
      return b.index - a.index;
    })
    .map((entry) => entry.row);
}

async function runFeatureList({ args = [], options = {}, logger = console, t } = {}) {
  const targetDir = args[0] || options.dir || '.';
  const translate = typeof t === 'function' ? t : (key) => key;

  const content = await readFileSafe(path.join(contextDir(targetDir), 'features.md'));
  const all = sortRows(parseFeatureRows(content));
  const active = await resolveActiveFeature(targetDir);

  const statusFilter = parseStatusFilter(options.status);
  const filtered = statusFilter.length > 0
    ? all.filter((row) => statusFilter.includes(row.status.toLowerCase()))
    : all;

  const limit = parseLimit(options.limit);
  const features = (limit > 0 ? filtered.slice(0, limit) : filtered).map((row) => ({
    ...row,
    active: Boolean(active.slug) && row.slug === active.slug
  }));

  const payload = {
    ok: true,
    active: active.slug || '',
    active_source: active.source,
    active_ambiguous: Boolean(active.ambiguous),
    total: filtered.length,
    returned: features.length,
    features
  };

  if (!options.json) {
    if (features.length === 0) {
      logger.log(translate('feature_list.empty'));
    } else {
      logger.log(translate('feature_list.title', { count: filtered.length }));
      for (const feature of features) {
        logger.log(translate('feature_list.item', {
          marker: feature.active ? '*' : ' ',
          slug: feature.slug,
          status: feature.status,
          started: feature.started || '—'
        }));
      }
      if (features.length < filtered.length) {
        logger.log(translate('feature_list.truncated', { hidden: filtered.length - features.length }));
      }
    }
  }

  return payload;
}

module.exports = { runFeatureList, parseFeatureRows, DEFAULT_LIMIT };
