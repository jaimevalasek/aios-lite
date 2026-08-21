'use strict';

/**
 * The feature's browser evidence slot.
 *
 * `browser:run --slug={slug}` persists each walkthrough report to
 * `.aioson/context/features/{slug}/browser/{name}.json` (archived with the
 * dossier under `done/{slug}/dossier/browser/`). Prototype walkthroughs live
 * beside the briefing (`.aioson/briefings/{slug}/browser/`) and are never
 * read here: a prototype proves a promise, not a delivered acceptance
 * criterion.
 *
 * One reader, three consumers:
 *   - ac:test-audit counts an AC as covered when its latest walkthrough step
 *     passed (automated evidence, like a harness criterion);
 *   - feature completeness (Gate D / feature:close) flags a QA PASS row that
 *     contradicts a failed walkthrough for the same AC;
 *   - feature:trace shows QA whether the delivery was ever driven in a real
 *     browser, and which ids it proved.
 */

const fs = require('node:fs');
const path = require('node:path');

const BROWSER_EVIDENCE_DIR = 'browser';

function browserEvidenceDirs(targetDir, slug) {
  return [
    path.join(targetDir, '.aioson', 'context', 'features', slug, BROWSER_EVIDENCE_DIR),
    path.join(targetDir, '.aioson', 'context', 'done', slug, 'dossier', BROWSER_EVIDENCE_DIR)
  ];
}

function toRel(targetDir, file) {
  return path.relative(targetDir, file).split(path.sep).join('/');
}

function readReport(file) {
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!parsed || typeof parsed !== 'object' || parsed.schema !== 1 || !parsed.ids || typeof parsed.ids !== 'object') return null;
    if (parsed.scope && parsed.scope !== 'delivery') return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * @returns {{ reports: Array<object>, ids: Map<string, {status: string, report: string, name: string, finished_at: string, steps: number[], error: string|null}> }}
 */
function readBrowserEvidence(targetDir, slug) {
  const reports = [];
  for (const dir of browserEvidenceDirs(targetDir, slug)) {
    let entries = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.json')) continue;
      const file = path.join(dir, entry.name);
      const report = readReport(file);
      if (report) reports.push({ ...report, _file: toRel(targetDir, file) });
    }
    if (reports.length > 0) break; // live slot wins over the archive
  }
  reports.sort((a, b) => String(a.finished_at || '').localeCompare(String(b.finished_at || '')));

  // Latest measurement of an id wins, whichever walkthrough produced it.
  const ids = new Map();
  for (const report of reports) {
    for (const [rawId, row] of Object.entries(report.ids)) {
      const id = String(rawId).toUpperCase();
      if (!row || typeof row !== 'object') continue;
      const current = ids.get(id);
      const finishedAt = String(report.finished_at || '');
      if (current && String(current.finished_at).localeCompare(finishedAt) > 0) continue;
      ids.set(id, {
        status: String(row.status || 'unknown'),
        report: report._file,
        name: String(report.name || ''),
        finished_at: finishedAt,
        steps: Array.isArray(row.steps) ? row.steps : [],
        error: row.error || null
      });
    }
  }
  return { reports, ids };
}

/**
 * Evidence rows for one AC, in the ac:test-audit shape.
 */
function browserEvidenceFor(acId, evidence) {
  if (!evidence || !evidence.ids) return [];
  const row = evidence.ids.get(String(acId).toUpperCase());
  if (!row || row.status !== 'pass') return [];
  return [{
    kind: 'browser',
    file: row.report,
    evidence: `browser walkthrough "${row.name}" proved ${String(acId).toUpperCase()} on the real application (steps ${row.steps.join(', ')})`
  }];
}

/**
 * The feature:trace block — advisory, like the visual one.
 */
function browserEvidenceBlock(targetDir, slug) {
  const { reports, ids } = readBrowserEvidence(targetDir, slug);
  if (reports.length === 0) {
    return {
      measured: false,
      reason: `delivery never driven in a real browser — write a walkthrough and run: aioson browser:run . --script=<walkthrough.json> --url=<app url> --slug=${slug}`,
      reports: [],
      ids: {}
    };
  }
  const idsObject = {};
  for (const [id, row] of ids) idsObject[id] = { status: row.status, report: row.report, steps: row.steps };
  return {
    measured: true,
    reports: reports.map((report) => ({
      name: report.name,
      ok: report.ok === true,
      finished_at: report.finished_at || null,
      browser: report.browser && report.browser.label ? report.browser.label : null,
      target: report.target && report.target.url ? report.target.url : null,
      steps: Array.isArray(report.steps) ? report.steps.length : 0,
      stopped_at: report.stopped_at === undefined ? null : report.stopped_at,
      evidence: report._file
    })),
    ids: idsObject
  };
}

function formatBrowserEvidence(block) {
  if (!block) return null;
  if (!block.measured) return `browser evidence: ${block.reason}`;
  const passed = Object.values(block.ids).filter((row) => row.status === 'pass').length;
  const failed = Object.entries(block.ids).filter(([, row]) => row.status === 'fail').map(([id]) => id);
  const latest = block.reports[block.reports.length - 1];
  return `browser evidence: ${block.reports.length} walkthrough(s), ${passed} id(s) proven${failed.length > 0 ? `, FAILING: ${failed.join(', ')}` : ''} — latest "${latest.name}" ${latest.ok ? 'PASS' : 'FAIL'} on ${latest.browser || 'browser'} (${latest.evidence})`;
}

module.exports = {
  BROWSER_EVIDENCE_DIR,
  browserEvidenceDirs,
  readBrowserEvidence,
  browserEvidenceFor,
  browserEvidenceBlock,
  formatBrowserEvidence
};
