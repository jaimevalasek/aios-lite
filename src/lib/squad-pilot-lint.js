'use strict';

/**
 * squad-pilot-lint — the deterministic half of the squad pilot contract.
 *
 * A deliverable-class squad (manifest `mode: software|mixed`) proves itself with
 * a pilot: one flagship deliverable of its domain, built by the squad's OWN
 * executors, frozen only by the USER via `aioson squad:pilot-approve`. This lint
 * checks everything checkable without judgment: pilot-block coherence in
 * `squad.manifest.json`, entrypoint containment and existence under
 * `output/{slug}/pilot/`, the PILOT.md evidence doc, placeholder hygiene across
 * the deliverable, lane-proportional deferral, and fingerprint freshness after
 * approval. Whether the pilot actually carries the domain signature stays with
 * the user — approval is never automated and this lint never issues one.
 */

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const PILOT_STATUSES = ['not_applicable', 'pending', 'draft', 'approved'];
const DELIVERABLE_MODES = ['software', 'mixed'];
const PILOT_DOC_SECTIONS = ['Pilot task', 'Validations', 'Binds', 'Does not bind'];

// The smallest-representative-vertical bound, expressed as a hard file cap: a
// pilot that needs more files than this is a product, not a pilot.
const MAX_PILOT_FILES = 2000;
const MAX_SCAN_BYTES = 512 * 1024;
const TEXT_EXTENSIONS = new Set([
  '.html', '.htm', '.css', '.js', '.mjs', '.cjs', '.ts', '.jsx', '.tsx',
  '.md', '.json', '.svg', '.txt', '.xml', '.vue'
]);
const SKIP_DIRS = new Set(['node_modules', '.git', 'target', 'dist']);

const HARD_PLACEHOLDER = /\bTODO\b|\bFIXME\b|Lorem ipsum/;
const COMMAND_RUNNER = /\b(?:npm|node|npx|pnpm|yarn|bun|cargo|pytest|python|go|dotnet|make|php|composer|mvn|gradle|curl|lighthouse|serve)\b/i;
const COMMAND_RESULT = /\b(?:PASS(?:ED)?|FAIL(?:ED)?|exit(?: code)?\s*[:=]?\s*\d+|success|error)\b/i;

function pilotDirRel(slug) {
  return `output/${slug}/pilot`;
}

/** Deterministic sorted walk of the pilot deliverable. Returns relative posix paths. */
function walkPilotFiles(absDir) {
  const files = [];
  const walk = (dir, rel) => {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    entries.sort((a, b) => a.name.localeCompare(b.name, 'en'));
    for (const entry of entries) {
      if (files.length > MAX_PILOT_FILES) return;
      const childRel = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) walk(path.join(dir, entry.name), childRel);
      } else if (entry.isFile()) {
        files.push(childRel);
      }
    }
  };
  walk(absDir, '');
  return files;
}

/**
 * Content fingerprint of the pilot deliverable tree: sha256 over sorted
 * `relpath\0sha256(content)\n` entries. Returns `{ fingerprint, files }` or
 * null when the directory is missing or empty. Shared by the lint (staleness)
 * and `squad:pilot-approve` (the freeze), so the two can never disagree.
 */
function computePilotFingerprint(targetDir, slug) {
  const absDir = path.resolve(targetDir, pilotDirRel(slug));
  const files = walkPilotFiles(absDir);
  if (files.length === 0) return null;
  const hash = crypto.createHash('sha256');
  for (const rel of files) {
    let content;
    try {
      content = fs.readFileSync(path.join(absDir, rel));
    } catch {
      content = Buffer.alloc(0);
    }
    const fileHash = crypto.createHash('sha256').update(content).digest('hex');
    hash.update(`${rel}\0${fileHash}\n`);
  }
  return { fingerprint: `sha256:${hash.digest('hex')}`, files: files.length };
}

function sectionBody(doc, section) {
  const pattern = new RegExp(`^##\\s+${section.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'm');
  const match = pattern.exec(doc);
  if (!match) return null;
  const start = match.index + match[0].length;
  const next = doc.slice(start).search(/^##\s+/m);
  return next === -1 ? doc.slice(start) : doc.slice(start, start + next);
}

/**
 * Analyze the pilot contract for one squad. `forApproval: true` validates an
 * `approved` pilot as if it were `draft` — `squad:pilot-approve` uses it so a
 * stale fingerprint (the exact thing re-approval fixes) does not block the
 * re-freeze while every real defect still does.
 */
function analyzeSquadPilot({ targetDir, slug, forApproval = false }) {
  const issues = [];
  const warnings = [];
  const metrics = { slug };

  const manifestRel = `.aioson/squads/${slug}/squad.manifest.json`;
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(path.resolve(targetDir, manifestRel), 'utf8'));
  } catch {
    issues.push(`squad manifest not found or unparseable: ${manifestRel}`);
    return { issues, warnings, metrics };
  }

  const mode = typeof manifest.mode === 'string' ? manifest.mode : '';
  const lane = typeof manifest.deliveryLane === 'string' && manifest.deliveryLane ? manifest.deliveryLane : 'standard';
  metrics.mode = mode;
  metrics.delivery_lane = lane;

  const pilot = manifest.pilot;
  if (!pilot || typeof pilot !== 'object' || Array.isArray(pilot)) {
    if (DELIVERABLE_MODES.includes(mode)) {
      issues.push(`deliverable-class squad (mode: ${mode}) has no pilot block in ${manifestRel}`);
    } else {
      warnings.push(`no pilot block; a ${mode || 'content'} squad may record pilot.status: not_applicable`);
    }
    metrics.status = null;
    return { issues, warnings, metrics };
  }

  const declaredStatus = typeof pilot.status === 'string' ? pilot.status : '';
  metrics.status = declaredStatus || null;
  if (!PILOT_STATUSES.includes(declaredStatus)) {
    issues.push(`pilot.status "${declaredStatus}" is invalid; expected one of: ${PILOT_STATUSES.join(', ')}`);
    return { issues, warnings, metrics };
  }

  if (declaredStatus === 'not_applicable') {
    if (DELIVERABLE_MODES.includes(mode)) {
      issues.push(`deliverable-class squad (mode: ${mode}) cannot record pilot.status: not_applicable`);
    }
    return { issues, warnings, metrics };
  }

  if (declaredStatus === 'pending') {
    const defer = typeof pilot.deferReason === 'string' ? pilot.deferReason.trim() : '';
    metrics.has_defer_reason = Boolean(defer);
    if (!defer) {
      issues.push('pilot pending — build the pilot, or (quick lane only) record a concrete pilot.deferReason');
    } else if (lane !== 'quick') {
      issues.push(`pilot deferred but deliveryLane "${lane}" cannot defer a pilot; only quick may`);
    } else {
      warnings.push(`pilot deferred: ${defer}`);
    }
    return { issues, warnings, metrics };
  }

  // draft | approved — the built-pilot checks.
  const status = forApproval && declaredStatus === 'approved' ? 'draft' : declaredStatus;

  if (typeof pilot.task !== 'string' || !pilot.task.trim()) {
    issues.push('pilot.task is empty — record the flagship task the pilot proves');
  }

  const entryRaw = typeof pilot.entrypoint === 'string' ? pilot.entrypoint.trim() : '';
  metrics.entrypoint = entryRaw || null;
  if (!entryRaw) {
    issues.push('pilot.entrypoint is empty');
  } else {
    const entry = entryRaw.replace(/\\/g, '/');
    if (entry.includes('..') || !entry.startsWith(`${pilotDirRel(slug)}/`)) {
      issues.push(`pilot.entrypoint must live under ${pilotDirRel(slug)}/ — got "${entryRaw}"`);
    } else if (!fs.existsSync(path.resolve(targetDir, entry))) {
      issues.push(`pilot.entrypoint does not exist on disk: ${entry}`);
    }
  }

  const docRel = `.aioson/squads/${slug}/docs/PILOT.md`;
  let doc = null;
  try {
    doc = fs.readFileSync(path.resolve(targetDir, docRel), 'utf8');
  } catch {
    issues.push(`pilot evidence doc not found: ${docRel}`);
  }
  const missingSections = [];
  if (doc !== null) {
    for (const section of PILOT_DOC_SECTIONS) {
      if (sectionBody(doc, section) === null) missingSections.push(section);
    }
    for (const section of missingSections) {
      issues.push(`PILOT.md is missing mandatory section: ## ${section}`);
    }
    const validations = sectionBody(doc, 'Validations');
    if (validations !== null && !(COMMAND_RUNNER.test(validations) && COMMAND_RESULT.test(validations))) {
      issues.push('PILOT.md ## Validations must record at least one exact executed command with its observed result');
    }
    if (HARD_PLACEHOLDER.test(doc)) {
      issues.push('PILOT.md contains placeholder content (TODO/FIXME/Lorem ipsum)');
    }
  }
  metrics.doc_sections_missing = missingSections;

  const absPilotDir = path.resolve(targetDir, pilotDirRel(slug));
  const files = walkPilotFiles(absPilotDir);
  metrics.deliverable_files = files.length;
  if (files.length === 0) {
    issues.push(`pilot deliverable is empty: ${pilotDirRel(slug)}/`);
  } else if (files.length > MAX_PILOT_FILES) {
    issues.push(`pilot exceeds ${MAX_PILOT_FILES} files — not a smallest representative vertical`);
  } else {
    const flagged = [];
    for (const rel of files) {
      if (!TEXT_EXTENSIONS.has(path.extname(rel).toLowerCase())) continue;
      let stat;
      try {
        stat = fs.statSync(path.join(absPilotDir, rel));
      } catch {
        continue;
      }
      if (stat.size > MAX_SCAN_BYTES) continue;
      let text;
      try {
        text = fs.readFileSync(path.join(absPilotDir, rel), 'utf8');
      } catch {
        continue;
      }
      if (HARD_PLACEHOLDER.test(text)) flagged.push(rel);
    }
    for (const rel of flagged.slice(0, 5)) {
      issues.push(`pilot deliverable contains placeholder content (TODO/FIXME/Lorem ipsum): ${pilotDirRel(slug)}/${rel}`);
    }
    if (flagged.length > 5) {
      issues.push(`pilot deliverable has placeholder content in ${flagged.length - 5} more file(s)`);
    }
  }

  const declaredFingerprint = typeof pilot.fingerprint === 'string' ? pilot.fingerprint.trim() : '';
  const current = files.length > 0 && files.length <= MAX_PILOT_FILES ? computePilotFingerprint(targetDir, slug) : null;
  metrics.fingerprint_ok = declaredFingerprint && current ? declaredFingerprint === current.fingerprint : null;

  if (status === 'approved') {
    if (typeof pilot.approved_at !== 'string' || !pilot.approved_at.trim()) {
      issues.push('approved pilot is missing approved_at');
    }
    if (!declaredFingerprint) {
      issues.push('approved pilot is missing its fingerprint — re-freeze with squad:pilot-approve');
    } else if (current && declaredFingerprint !== current.fingerprint) {
      issues.push('pilot fingerprint is stale — the deliverable changed after approval; re-approve with squad:pilot-approve');
    }
  } else if (declaredFingerprint && current && declaredFingerprint !== current.fingerprint) {
    warnings.push('draft pilot fingerprint does not match the current deliverable');
  }

  return { issues, warnings, metrics };
}

module.exports = {
  analyzeSquadPilot,
  computePilotFingerprint,
  PILOT_STATUSES,
  PILOT_DOC_SECTIONS,
  DELIVERABLE_MODES
};
