#!/usr/bin/env node
/**
 * AIOSON Brain Query
 * Cross-references pattern nodes across brain files by tags, quality, verdict, and agent.
 *
 * Usage:
 *   node query.js --tags css,hover                    # nodes matching any of these tags
 *   node query.js --tags css,hover --match all        # nodes matching ALL tags (AND)
 *   node query.js --min-quality 4                     # quality >= 4 only
 *   node query.js --agent site-forge                  # brain files for this agent
 *   node query.js --verdict EXCELLENT,BEST_PRACTICE   # filter by verdict
 *   node query.js --avoid                             # show only AVOID nodes (anti-patterns)
 *   node query.js --id css-001,css-002                # fetch specific node IDs
 *   node query.js --tags animation --format compact   # one-line per node output
 *
 * Output: JSON array of matching nodes (default) or compact table (--format compact)
 */

const fs = require('fs');
const path = require('path');

const BRAINS_DIR = path.resolve(__dirname, '..');
const INDEX_PATH = path.join(BRAINS_DIR, '_index.json');

// --- Parse args ---
const args = process.argv.slice(2);
const get = (flag) => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : null; };
const has = (flag) => args.includes(flag);

const tagsRaw   = get('--tags');
const tags      = tagsRaw ? tagsRaw.split(',').map(t => t.trim()) : [];
const matchMode = get('--match') || 'any';       // 'any' | 'all'
const minQ      = parseInt(get('--min-quality') || '0', 10);
const agentFilter = get('--agent');
const verdictRaw  = get('--verdict');
const verdicts    = verdictRaw ? verdictRaw.split(',').map(v => v.trim().toUpperCase()) : [];
const idRaw       = get('--id');
const ids         = idRaw ? idRaw.split(',').map(i => i.trim()) : [];
const avoidOnly   = has('--avoid');
const format      = get('--format') || 'json';

// --- Load index ---
if (!fs.existsSync(INDEX_PATH)) {
  console.error('No _index.json found at', INDEX_PATH);
  process.exit(1);
}
const index = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8'));

// --- Determine which brain files to load ---
let brainFiles = index.brains;
if (agentFilter) {
  brainFiles = brainFiles.filter(b => b.agents.includes(agentFilter));
}
if (tags.length > 0) {
  brainFiles = brainFiles.filter(b => tags.some(t => b.tags.includes(t)));
}

// --- Load nodes ---
let nodes = [];
for (const brain of brainFiles) {
  const brainPath = path.isAbsolute(brain.path)
    ? brain.path
    : brain.path.startsWith('.aioson/brains/')
      ? path.join(BRAINS_DIR, '..', '..', brain.path)
      : path.join(BRAINS_DIR, brain.path);
  if (!fs.existsSync(brainPath)) {
    process.stderr.write(`Warning: brain file not found: ${brainPath}\n`);
    continue;
  }
  const data = JSON.parse(fs.readFileSync(brainPath, 'utf8'));
  nodes.push(...(data.nodes || []).map(n => ({ ...n, _brain: brain.id })));
}

// --- Filter nodes ---
if (ids.length > 0) {
  nodes = nodes.filter(n => ids.includes(n.id));
} else {
  if (tags.length > 0) {
    if (matchMode === 'all') {
      nodes = nodes.filter(n => tags.every(t => (n.tags || []).includes(t)));
    } else {
      nodes = nodes.filter(n => tags.some(t => (n.tags || []).includes(t)));
    }
  }
  if (minQ > 0) {
    nodes = nodes.filter(n => (n.q || 0) >= minQ);
  }
  if (verdicts.length > 0) {
    nodes = nodes.filter(n => verdicts.includes((n.v || '').toUpperCase()));
  }
  if (avoidOnly) {
    nodes = nodes.filter(n => n.v === 'AVOID' || n.v === 'BROKEN');
  }
}

// --- Output ---
if (format === 'compact') {
  const rows = nodes.map(n => `[${n.q}★ ${n.v}] ${n.id} — ${n.title}\n  ${n.s}`);
  console.log(rows.join('\n\n') || '(no matches)');
} else if (format === 'ids') {
  console.log(nodes.map(n => n.id).join('\n'));
} else {
  console.log(JSON.stringify(nodes, null, 2));
}

// --- Stats footer ---
process.stderr.write(`\n${nodes.length} node(s) matched across ${brainFiles.length} brain file(s)\n`);
