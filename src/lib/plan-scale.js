'use strict';

/**
 * The measured scale of an implementation plan — the number that decides
 * whether one context should carry it alone.
 *
 * Every gate around the orchestrated path asked one question: "is the roles
 * file unlocked?" — and nothing ever asked "how big is this plan?". A plan
 * touching 79 files in four chained phases was written for a single DEV
 * context, with no question to the owner, because the only trigger for the
 * question was a file nobody had created. This module measures the plan
 * itself: distinct files across the Implementation Delta, the Capability
 * Delivery Plan and the Execution Sequence; phases; waves and how many phases
 * actually share one; and the write areas the files fall into — raw material
 * for lanes, never lanes.
 *
 * `split_candidate` is charged on ONE number — distinct files at or above the
 * floor (12 by default, `AIOSON_EXECUTION_SPLIT_MIN_FILES` moves it). Phases,
 * waves and areas are reported so the question, when it is asked, carries the
 * evidence. The measurement never decides: the answer is the owner's.
 */

const {
  cleanCell,
  extractSection,
  mapColumns,
  normalizeLabel,
  parseFirstMarkdownTable
} = require('./feature-completeness-format');
const { parseImplementationDelta } = require('./gate-checkpoint');
const { parseExecutionWaves, groupByWave, parseDevelopmentLanes, splitPathCell } = require('../harness/plan-waves');

const DEFAULT_SPLIT_MIN_FILES = 12;
const SPLIT_MIN_FILES_ENV = 'AIOSON_EXECUTION_SPLIT_MIN_FILES';
const MAX_AREAS = 8;
const EXECUTION_CHOICES = ['single', 'orchestrated'];
const DELIVERY_HEADINGS = ['Capability Delivery Plan', 'Plano de Entrega de Capacidades', 'Matriz de Entrega de Capacidades'];
const PHASE_HEADING = /^#{2,4}\s+(?:phase|fase|etapa)\s+(\d+)\b/i;

function splitMinFiles(env = process.env) {
  const raw = parseInt(String(env[SPLIT_MIN_FILES_ENV] || ''), 10);
  return Number.isInteger(raw) && raw > 0 ? raw : DEFAULT_SPLIT_MIN_FILES;
}

/**
 * A cell entry that names a file: has a separator or an extension, no glob,
 * no placeholder, no directory. (`cleanCell` strips `**` as bold markup, so
 * a glob write path such as `src/ui/**` arrives here as `src/ui/` — a
 * directory, never a file.)
 */
function asFilePath(value) {
  const item = cleanCell(value).replace(/\\/g, '/').replace(/^\.\//, '').trim();
  if (!item || /^(\.{3}|-+|—|n\/a|none)$/i.test(item)) return null;
  if (/[*?{}[\]<>]/.test(item) || /\s/.test(item) || item.endsWith('/')) return null;
  if (!(/\//.test(item) || /\.[a-z0-9]{1,10}$/i.test(item))) return null;
  return item;
}

function phaseNumber(value) {
  const match = String(value || '').match(/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

/** `src/server/routes/x.ts` → `src/server`; `tests/x.test.ts` → `tests`; `README.md` → `.` */
function areaOf(file) {
  const parts = file.split('/').filter(Boolean);
  if (parts.length >= 3) return `${parts[0]}/${parts[1]}`;
  if (parts.length === 2) return parts[0];
  return '.';
}

function deliveryRows(content) {
  const section = extractSection(content, DELIVERY_HEADINGS);
  const table = section ? parseFirstMarkdownTable(section) : null;
  if (!table) return [];
  const columns = mapColumns(table, {
    phase: ['Phase', 'Fase'],
    files: ['Files', 'Paths', 'Arquivos', 'Caminhos']
  });
  if (columns.missing.length > 0) return [];
  return table.rows.map((row) => ({
    phase: phaseNumber(row[columns.indexes.phase]),
    files: splitPathCell(row[columns.indexes.files]).map(asFilePath).filter(Boolean)
  }));
}

/**
 * `{ files, create, modify, phases, waves, parallel_phases, bytes, areas,
 *    split_candidate, threshold: { min_files }, sources }`.
 * Never throws; an empty or table-less plan measures zero everywhere.
 */
function measurePlanScale(content, { minFiles = DEFAULT_SPLIT_MIN_FILES } = {}) {
  const text = String(content || '');
  const files = new Map(); // lowercase → first spelling seen
  const actions = new Map(); // lowercase → Set(action)
  const phases = new Set();
  const add = (file, action = null) => {
    const key = file.toLowerCase();
    if (!files.has(key)) files.set(key, file);
    if (action) {
      if (!actions.has(key)) actions.set(key, new Set());
      actions.get(key).add(action);
    }
  };

  const delta = parseImplementationDelta(text) || [];
  for (const item of delta) {
    const file = asFilePath(item.path);
    if (file) add(file, normalizeLabel(item.action));
  }
  const delivery = deliveryRows(text);
  for (const row of delivery) {
    if (Number.isInteger(row.phase)) phases.add(row.phase);
    for (const file of row.files) add(file);
  }
  const sequence = parseExecutionWaves(text) || [];
  for (const row of sequence) {
    const phase = phaseNumber(row.phase);
    if (Number.isInteger(phase)) phases.add(phase);
    for (const raw of row.files_raw || []) {
      const file = asFilePath(raw);
      if (file) add(file);
    }
  }
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(PHASE_HEADING);
    if (match) phases.add(parseInt(match[1], 10));
  }

  const waves = groupByWave(sequence);
  const parallelPhases = waves.reduce((sum, wave) => sum + (wave.phases.length > 1 ? wave.phases.length : 0), 0);
  const counts = new Map();
  for (const file of files.values()) {
    const area = areaOf(file);
    counts.set(area, (counts.get(area) || 0) + 1);
  }
  const areas = [...counts.entries()]
    .map(([prefix, count]) => ({ prefix, files: count }))
    .sort((a, b) => b.files - a.files || a.prefix.localeCompare(b.prefix))
    .slice(0, MAX_AREAS);
  const countAction = (name) => [...actions.values()].filter((set) => set.has(name)).length;

  return {
    files: files.size,
    create: countAction('create'),
    modify: countAction('modify'),
    phases: phases.size,
    waves: waves.length,
    parallel_phases: parallelPhases,
    bytes: Buffer.byteLength(text, 'utf8'),
    areas,
    split_candidate: files.size >= minFiles,
    threshold: { min_files: minFiles },
    sources: { delta: delta.length, delivery: delivery.length, sequence: sequence.length }
  };
}

/**
 * The execution choice the plan records: the `## Development execution lanes`
 * table means orchestrated; `execution: single | orchestrated` in the
 * frontmatter records the owner's answer without a table. `null` = never
 * recorded — the state the scale advisory fires on.
 */
function resolveExecutionChoice(content) {
  const text = String(content || '');
  if (parseDevelopmentLanes(text) !== null) return { choice: 'orchestrated', source: 'lanes_table' };
  const frontmatter = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (frontmatter) {
    const line = frontmatter[1].match(/^execution:\s*(.+)$/m);
    const value = line ? cleanCell(line[1]).toLowerCase() : '';
    if (EXECUTION_CHOICES.includes(value)) return { choice: value, source: 'frontmatter' };
  }
  return { choice: null, source: null };
}

/** `79 files (53 new) in 4 phases, 4 waves, 0 in parallel` */
function formatPlanScale(scale) {
  if (!scale) return 'no plan';
  return `${scale.files} file(s)${scale.create ? ` (${scale.create} new)` : ''} in ${scale.phases} phase(s), ${scale.waves} wave(s), ${scale.parallel_phases} in parallel`;
}

module.exports = {
  DEFAULT_SPLIT_MIN_FILES,
  EXECUTION_CHOICES,
  SPLIT_MIN_FILES_ENV,
  formatPlanScale,
  measurePlanScale,
  resolveExecutionChoice,
  splitMinFiles
};
