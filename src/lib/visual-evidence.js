'use strict';

/**
 * The feature's visual evidence slot.
 *
 * `verify:artifact --kind=visual` persists its latest run to
 * `.aioson/context/verify-artifact-visual.json` — one slot per kind, like
 * audit:code, so the refiner's prototype run, a squad's pilot run and a dev's
 * `--dir` run over the shipped front-end all overwrite each other. The numbers
 * a reviewer needs (craft floor, generation tells, materials, palette) were
 * therefore logged once and discarded: nothing downstream ever read them.
 *
 * A feature-owned measurement (pure `--slug` mode) is also written here, under
 * the feature's own directory, where nothing else overwrites it. feature:trace
 * surfaces it to QA and feature:close records it at closure — advisory in both
 * places: the numbers travel with the feature; they never grant or block a gate.
 */

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const VISUAL_EVIDENCE_FILE = 'visual-evidence.json';
// The implementation's measurement (the implementers' session end, held to the
// prototype's floor) — the other half of the feature's visual record.
const VISUAL_IMPLEMENTATION_FILE = 'visual-implementation.json';

function visualEvidencePath(targetDir, slug) {
  return path.join(targetDir, '.aioson', 'context', 'features', slug, VISUAL_EVIDENCE_FILE);
}

function prototypePath(targetDir, slug) {
  return path.join(targetDir, '.aioson', 'briefings', slug, 'prototype.html');
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function sha256File(file) {
  const hash = crypto.createHash('sha256');
  const buffer = Buffer.allocUnsafe(64 * 1024);
  const handle = fs.openSync(file, 'r');
  try {
    let offset = 0;
    let read = 0;
    do {
      read = fs.readSync(handle, buffer, 0, buffer.length, offset);
      if (read > 0) {
        hash.update(buffer.subarray(0, read));
        offset += read;
      }
    } while (read > 0);
  } finally {
    fs.closeSync(handle);
  }
  return hash.digest('hex');
}

function canonicalManifest(content) {
  return String(content || '')
    .replace(/^status\s*:\s*.*$/gmi, 'status: <lifecycle>')
    .replace(/^approved_at\s*:\s*.*$/gmi, 'approved_at: <lifecycle>')
    .replace(/(?:^|\n)##\s+Quality evidence[^\n]*((?:\n(?!##\s)[^\n]*)*)/i, '\n## Quality evidence\n<measurement projection>')
    .replace(/\r\n/g, '\n')
    .trim();
}

function safeRelative(targetDir, file) {
  const relative = path.relative(path.resolve(targetDir), path.resolve(file));
  return relative && !relative.startsWith('..') && !path.isAbsolute(relative) ? relative.replace(/\\/g, '/') : null;
}

function localReference(targetDir, baseDir, rawReference) {
  let ref = String(rawReference || '').trim().replace(/^['"]|['"]$/g, '');
  if (!ref || /^(?:data:|https?:|file:|javascript:|#|\/\/)/i.test(ref)) return null;
  ref = ref.split(/[?#]/)[0].trim();
  if (!ref) return null;
  try { ref = decodeURIComponent(ref); } catch { /* keep the literal path */ }
  const resolved = ref.startsWith('/')
    ? path.resolve(targetDir, ref.replace(/^[/\\]+/, ''))
    : path.resolve(baseDir, ref);
  return safeRelative(targetDir, resolved) ? resolved : null;
}

function linkedVisualInputs(targetDir, ownedDir, prototype) {
  const found = new Set();
  const enqueue = (baseDir, raw) => {
    const resolved = localReference(targetDir, baseDir, raw);
    if (resolved) found.add(resolved);
  };

  for (const match of String(prototype || '').matchAll(/\b(?:src|href|poster)\s*=\s*["']([^"']+)["']/gi)) {
    enqueue(ownedDir, match[1]);
  }
  for (const match of String(prototype || '').matchAll(/\bsrcset\s*=\s*["']([^"']+)["']/gi)) {
    if (/^\s*data:/i.test(match[1])) continue;
    for (const candidate of match[1].split(',')) enqueue(ownedDir, candidate.trim().split(/\s+/)[0]);
  }
  for (const match of String(prototype || '').matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi)) {
    enqueue(ownedDir, match[1]);
  }

  // Stylesheets can import other stylesheets and visual assets. Walk the
  // local graph so changing the image behind an unchanged url() invalidates
  // evidence just as changing prototype.html does.
  const queue = [...found];
  const inspected = new Set();
  while (queue.length > 0) {
    const file = queue.shift();
    if (inspected.has(file) || path.extname(file).toLowerCase() !== '.css') continue;
    inspected.add(file);
    let css;
    try {
      const stat = fs.statSync(file);
      if (!stat.isFile() || stat.size > 8 * 1024 * 1024) continue;
      css = fs.readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    const refs = [];
    for (const match of css.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi)) refs.push(match[1]);
    for (const match of css.matchAll(/@import\s+(?:url\(\s*)?["']?([^"')\s;]+)["']?/gi)) refs.push(match[1]);
    for (const ref of refs) {
      const resolved = localReference(targetDir, path.dirname(file), ref);
      if (!resolved || found.has(resolved)) continue;
      found.add(resolved);
      queue.push(resolved);
    }
  }
  return found;
}

/**
 * Content-address every input that can alter the visual contract. Lifecycle
 * fields and the Quality evidence projection are canonicalized out so approval
 * and recording the report do not invalidate their own evidence.
 */
function computeVisualInputFingerprint(targetDir, slug) {
  const root = path.resolve(targetDir);
  const owned = path.join(root, '.aioson', 'briefings', slug);
  const manifestFile = path.join(owned, 'prototype-manifest.md');
  const candidates = new Set([
    path.join(owned, 'prototype.html'),
    manifestFile,
    path.join(owned, 'identity.md'),
    path.join(owned, 'briefings.md')
  ]);

  let prototype = '';
  try { prototype = fs.readFileSync(path.join(owned, 'prototype.html'), 'utf8'); } catch { /* absent is represented by no file */ }
  for (const linked of linkedVisualInputs(root, owned, prototype)) candidates.add(linked);

  try {
    const manifest = fs.readFileSync(manifestFile, 'utf8');
    const identity = manifest.match(/^identity\s*:\s*(.+)$/mi);
    if (identity) {
      const ref = identity[1].trim().replace(/^['"]|['"]$/g, '');
      if (ref && !/^(?:none|null|~)$/i.test(ref)) {
        const resolved = path.resolve(root, ref);
        if (safeRelative(root, resolved)) candidates.add(resolved);
      }
    }
  } catch { /* missing manifest is represented by no file */ }

  const files = [];
  for (const file of [...candidates]) {
    let stat;
    try { stat = fs.statSync(file); } catch { continue; }
    if (!stat.isFile()) continue;
    const relative = safeRelative(root, file);
    if (!relative) continue;
    const digest = path.resolve(file) === path.resolve(manifestFile)
      ? sha256(Buffer.from(canonicalManifest(fs.readFileSync(file, 'utf8'))))
      : sha256File(file);
    files.push({ path: relative, sha256: digest });
  }
  files.sort((a, b) => a.path.localeCompare(b.path));
  return {
    algorithm: 'sha256',
    digest: sha256(files.map((file) => `${file.path}\0${file.sha256}`).join('\n')),
    files
  };
}

function changedFingerprintFiles(before, after) {
  const oldFiles = new Map(((before && before.files) || []).map((file) => [file.path, file.sha256]));
  const newFiles = new Map(((after && after.files) || []).map((file) => [file.path, file.sha256]));
  return [...new Set([...oldFiles.keys(), ...newFiles.keys()])]
    .filter((file) => oldFiles.get(file) !== newFiles.get(file));
}

function readVisualReport(file) {
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    return parsed && parsed.kind === 'visual' ? parsed : null;
  } catch {
    return null;
  }
}

/** The persisted kind=visual report of a feature's prototype, or null. */
function readVisualEvidence(targetDir, slug) {
  return readVisualReport(visualEvidencePath(targetDir, slug));
}

/** The persisted kind=visual report of a feature's implementation, or null. */
function readVisualImplementation(targetDir, slug) {
  return readVisualReport(path.join(targetDir, '.aioson', 'context', 'features', slug, VISUAL_IMPLEMENTATION_FILE));
}

/** One line of the numbers a reviewer needs — the verdict of the measurement, not its prose. */
function summarizeVisualEvidence(report) {
  const m = (report && report.metrics) || {};
  const parts = [];
  if (m.craft && m.craft.measured) {
    parts.push(`craft ${m.craft.active_levers}/${m.craft.lever_count || 5}`, `materials ${m.craft.material_depth ?? 0}/7`);
  }
  parts.push(`tells ${m.tells ? m.tells.active : 0}`);
  if (m.palette && m.palette.accent_hue != null && m.palette.ground) {
    parts.push(`accent ~${m.palette.accent_hue}° on ${m.palette.ground.pole}`);
  }
  if (m.runtime && m.runtime.available) parts.push('runtime measured');
  parts.push(`${(report.issues || []).length} issue(s)`, `${(report.warnings || []).length} warning(s)`);
  return parts.join(' | ');
}

/**
 * The reviewer-facing visual block for a feature: the persisted measurement,
 * or the named reason none exists. `null` when the feature has no visible
 * surface — the absence of a prototype is a state, not a finding.
 */
function visualEvidenceBlock(targetDir, slug) {
  const proto = prototypePath(targetDir, slug);
  const hasPrototype = fs.existsSync(proto);
  const report = readVisualEvidence(targetDir, slug);
  const implementationReport = readVisualImplementation(targetDir, slug);
  const conformance = (implementationReport && implementationReport.metrics && implementationReport.metrics.conformance) || null;
  const implementation = implementationReport
    ? {
      measured_at: implementationReport.measured_at || null,
      summary: summarizeVisualEvidence(implementationReport),
      regressed: (conformance && conformance.regressed) || [],
      // No regressions on zero compared axes is silence, not a pass. The
      // reviewer line carries which state this actually is.
      conformance_state: (conformance && conformance.state) || 'not-compared',
      not_compared: (conformance && conformance.not_compared) || [],
      conformance_reason: (conformance && conformance.reason) || null,
      evidence: `.aioson/context/features/${slug}/${VISUAL_IMPLEMENTATION_FILE}`
    }
    : null;
  if (!report && !hasPrototype && !implementation) return null;
  if (!report) {
    return {
      measured: false,
      prototype: hasPrototype,
      stale: false,
      reason: hasPrototype
        ? `prototype present but never measured — run: aioson verify:artifact . --kind=visual --slug=${slug} --advisory`
        : 'no prototype recorded for this feature',
      summary: null,
      implementation
    };
  }
  // A prototype edited after its measurement carries numbers for a surface
  // that no longer exists.
  let stale = false;
  let staleFiles = [];
  if (report.input_fingerprint && report.input_fingerprint.digest) {
    const current = computeVisualInputFingerprint(targetDir, slug);
    stale = current.digest !== report.input_fingerprint.digest;
    if (stale) staleFiles = changedFingerprintFiles(report.input_fingerprint, current);
  } else if (hasPrototype && report.measured_at) {
    // Legacy reports predate content-addressed evidence.
    try { stale = fs.statSync(proto).mtimeMs > Date.parse(report.measured_at) + 1000; } catch { stale = false; }
  }
  return {
    measured: true,
    prototype: hasPrototype,
    stale,
    stale_files: staleFiles,
    measured_at: report.measured_at || null,
    ok: Boolean(report.ok),
    issues: (report.issues || []).length,
    warnings: (report.warnings || []).length,
    summary: summarizeVisualEvidence(report),
    evidence: `.aioson/context/features/${slug}/${VISUAL_EVIDENCE_FILE}`,
    implementation
  };
}

/**
 * What the implementation's comparison to the prototype actually says. An
 * empty `regressed` list on a comparison that never ran is not a floor held —
 * the reviewer reads which of the two it is.
 */
function conformanceVerdict(implementation) {
  if (implementation.regressed.length > 0) return ` — REGRESSED vs prototype: ${implementation.regressed.join(', ')}`;
  if (implementation.conformance_state === 'not-compared') {
    return ` — NOT compared to a prototype floor${implementation.conformance_reason ? `: ${implementation.conformance_reason}` : ''}`;
  }
  if (implementation.not_compared.length > 0) return ` — holds the prototype floor (${implementation.not_compared.join(', ')} not compared)`;
  return '';
}

/** Human line for the block — the same text in feature:trace and feature:close. */
function formatVisualEvidence(block) {
  if (!block) return null;
  const implementation = block.implementation
    ? ` | implementation: ${block.implementation.summary}${conformanceVerdict(block.implementation)}`
    : '';
  if (!block.measured) return `visual evidence: ${block.reason}${implementation}`;
  const changed = block.stale_files && block.stale_files.length > 0 ? ` (${block.stale_files.join(', ')})` : '';
  return `visual evidence: ${block.summary}${block.stale ? ` — STALE: visual inputs changed after this measurement${changed}; re-run kind=visual` : ''} (${block.evidence})${implementation}`;
}

module.exports = {
  VISUAL_EVIDENCE_FILE,
  VISUAL_IMPLEMENTATION_FILE,
  visualEvidencePath,
  computeVisualInputFingerprint,
  changedFingerprintFiles,
  canonicalManifest,
  readVisualEvidence,
  readVisualImplementation,
  summarizeVisualEvidence,
  visualEvidenceBlock,
  formatVisualEvidence
};
