'use strict';

/**
 * Static PRD linter — the deterministic half of Sheldon's approval contract.
 *
 * Every bullet of the contract that is mechanically checkable is checked here
 * so approval never rests on the model having remembered to check it: PROM
 * coverage against the briefing, the CAP→Current System Fit→Acceptance
 * Criteria chain, evidence cells that assert instead of prove, and prototype
 * binding coherence. Same trade as the visual telemetry: pure RegExp over the
 * text, issues are provable defects, warnings are measurements a reviewer
 * judges in context. What needs product judgment (is this capability the
 * right one?) deliberately stays with Sheldon.
 */

const fs = require('node:fs');
const path = require('node:path');

const PLACEHOLDER = /\bTODO\b|\bFIXME\b|\bTBD\b|Lorem ipsum/;

// An evidence cell that IS one of these words asserts completion instead of
// naming a verification mechanism. The kernel bans them explicitly.
const FORBIDDEN_EVIDENCE = new Set([
  'works', 'working', 'done', 'integrated', 'ok', 'ready', 'complete', 'completed',
  'funciona', 'funcionando', 'pronto', 'pronta', 'integrado', 'integrada', 'feito', 'feita', 'completo', 'completa'
]);

// A believable evidence cell names some verification mechanism. Bilingual on
// purpose: PRDs are written in the project's conversation language.
const VERIFICATION_MECHANISM = /test|teste|smoke|fixture|snapshot|hash|inspe[cç]|matriz|matrix|execu[cç]|suite|lint|telemetr|screenshot|verifica|manual|compara|diff|log|npm |\bci\b|gate|review/i;

// Repository-path-looking tokens inside a Current System Fit evidence cell.
const PATH_TOKEN = /[\w@.-]+(?:\/[\w@.-]+)+\.[a-z]{1,6}\b/g;

const MATERIAL_STATES = [
  { state: 'loading', re: /\bloading\b|\bcarregando\b|\bcarregamento\b|skeleton|spinner/i },
  { state: 'empty', re: /\bempty\b|\bvazio\b|\bvazia\b|no.results|nenhum|sem.resultados/i },
  { state: 'error', re: /\berror\b|\berro\b|\bfalha\b|\bfailure\b/i },
  { state: 'permission-denied', re: /permission|permiss[aã]o|sem.acesso|acesso.negado|denied|forbidden|unauthorized/i }
];

function parseFrontmatter(text) {
  const match = String(text || '').match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const out = {};
  if (!match) return out;
  for (const line of match[1].split(/\r?\n/)) {
    const kv = line.match(/^([\w-]+):\s*(.*)$/);
    if (kv) out[kv[1]] = kv[2].trim().replace(/^["']|["']$/g, '');
  }
  return out;
}

/** Body of the first `## <heading matching re>` section, or null. */
function sectionBody(text, re) {
  const lines = String(text || '').split(/\r?\n/);
  let start = -1;
  for (let i = 0; i < lines.length; i += 1) {
    const heading = lines[i].match(/^##\s+(.+)$/);
    if (start === -1 && heading && re.test(heading[1])) {
      start = i + 1;
      continue;
    }
    if (start !== -1 && /^##\s+/.test(lines[i])) {
      return lines.slice(start, i).join('\n');
    }
  }
  return start === -1 ? null : lines.slice(start).join('\n');
}

/** Data rows of the first markdown table in a section body (header and separator dropped). */
function tableRows(body) {
  const rows = [];
  let seenHeader = false;
  for (const line of String(body || '').split(/\r?\n/)) {
    if (!/^\s*\|/.test(line)) {
      if (seenHeader && rows.length > 0) break;
      continue;
    }
    const cells = line.split('|').slice(1, -1).map((cell) => cell.trim());
    if (cells.every((cell) => /^:?-{3,}:?$/.test(cell))) continue;
    if (!seenHeader) { seenHeader = true; continue; }
    rows.push(cells);
  }
  return rows;
}

function idsIn(text, prefix) {
  return [...new Set(String(text || '').match(new RegExp(`${prefix}-[A-Za-z0-9][\\w-]*`, 'g')) || [])];
}

function normalizeEvidence(cell) {
  return String(cell || '').toLowerCase().replace(/[`*_.!]/g, '').trim();
}

/**
 * Lint one PRD.
 *
 * @param {{prd: string, briefing?: string, targetDir?: string|null}} input
 * @returns {{issues: string[], warnings: string[], metrics: object}}
 */
function analyzePrd({ prd = '', briefing = '', targetDir = null } = {}) {
  const text = String(prd || '');
  const issues = [];
  const warnings = [];
  const frontmatter = parseFrontmatter(text);

  // ── capability map ───────────────────────────────────────────────────────
  const capBody = sectionBody(text, /feature capability map/i);
  const capRows = capBody === null ? [] : tableRows(capBody).filter((row) => /^CAP-/.test(row[0] || ''));
  const capIds = capRows.map((row) => (row[0].match(/CAP-[\w-]+/) || [row[0]])[0]);
  const requiredCaps = capRows
    .filter((row) => row.some((cell) => /\brequired\b|\bobrigat[oó]ri[ao]\b/i.test(cell)))
    .map((row) => (row[0].match(/CAP-[\w-]+/) || [row[0]])[0]);

  if (capBody === null) issues.push('missing section: ## Feature Capability Map');
  else if (capRows.length === 0) issues.push('Feature Capability Map has no CAP-* rows');
  else if (requiredCaps.length === 0) issues.push('Feature Capability Map has no required CAP-* — an approvable PRD names at least one');

  const duplicateCaps = capIds.filter((id, i) => capIds.indexOf(id) !== i);
  if (duplicateCaps.length > 0) issues.push(`duplicate CAP id(s): ${[...new Set(duplicateCaps)].join(', ')}`);

  // ── current system fit ───────────────────────────────────────────────────
  const fitBody = sectionBody(text, /current system fit/i);
  const fitRows = fitBody === null ? [] : tableRows(fitBody).filter((row) => /^CAP-/.test(row[0] || ''));
  const fitCaps = new Set(fitRows.map((row) => (row[0].match(/CAP-[\w-]+/) || [row[0]])[0]));

  if (requiredCaps.length > 0 && fitBody === null) {
    issues.push('missing section: ## Current System Fit — every required CAP needs a repository-backed row');
  } else {
    const uncovered = requiredCaps.filter((id) => !fitCaps.has(id));
    if (uncovered.length > 0) issues.push(`required CAP(s) with no Current System Fit row: ${uncovered.join(', ')}`);
  }

  let fitRowsWithoutPath = 0;
  const missingPaths = [];
  for (const row of fitRows) {
    const evidence = row[1] || '';
    const tokens = evidence.match(PATH_TOKEN) || [];
    if (tokens.length === 0) fitRowsWithoutPath += 1;
    else if (targetDir) {
      for (const token of tokens) {
        const cleaned = token.replace(/[`)*,;:]+$/, '');
        if (!fs.existsSync(path.join(targetDir, cleaned))) missingPaths.push(cleaned);
      }
    }
  }
  if (fitRowsWithoutPath > 0) {
    warnings.push(`${fitRowsWithoutPath} Current System Fit row(s) cite no repository path — evidence should point at the inspected files`);
  }
  if (missingPaths.length > 0) {
    const sample = [...new Set(missingPaths)].slice(0, 4).join(', ');
    warnings.push(`${missingPaths.length} cited path(s) not found in the repository (${sample}${missingPaths.length > 4 ? ', …' : ''}) — stale or guessed evidence`);
  }

  // ── acceptance criteria ──────────────────────────────────────────────────
  const acBody = sectionBody(text, /acceptance criteria/i);
  const acRows = acBody === null ? [] : tableRows(acBody).filter((row) => /^AC-/.test(row[0] || ''));
  const acIds = acRows.map((row) => (row[0].match(/AC-[\w-]+/) || [row[0]])[0]);

  if (acBody === null) issues.push('missing section: ## Acceptance Criteria');
  else if (acRows.length === 0) issues.push('Acceptance Criteria table has no AC-* rows');

  const duplicateAcs = acIds.filter((id, i) => acIds.indexOf(id) !== i);
  if (duplicateAcs.length > 0) issues.push(`duplicate AC id(s): ${[...new Set(duplicateAcs)].join(', ')}`);

  const citedCaps = new Set();
  let shortBehavior = 0;
  let weakEvidence = 0;
  const knownCaps = new Set(capIds);
  for (const row of acRows) {
    const rowCaps = idsIn(row[1] || '', 'CAP');
    for (const id of rowCaps) {
      citedCaps.add(id);
      if (knownCaps.size > 0 && !knownCaps.has(id)) {
        issues.push(`${row[0]} cites unknown capability ${id}`);
      }
    }
    if (rowCaps.length === 0) issues.push(`${row[0]} cites no CAP-* — every criterion belongs to a declared capability`);

    const behavior = (row[2] || '').trim();
    if (behavior.length > 0 && behavior.length < 20) shortBehavior += 1;

    const evidence = normalizeEvidence(row[3]);
    if (evidence.length === 0 || FORBIDDEN_EVIDENCE.has(evidence)) {
      issues.push(`${row[0]} evidence is "${row[3] || ''}" — "works/integrated/done" style assertions are not evidence`);
    } else if (!VERIFICATION_MECHANISM.test(evidence)) {
      weakEvidence += 1;
    }
  }
  const acUncovered = requiredCaps.filter((id) => !citedCaps.has(id));
  if (acRows.length > 0 && acUncovered.length > 0) {
    issues.push(`required CAP(s) with no acceptance criterion: ${acUncovered.join(', ')}`);
  }
  if (shortBehavior > 0) warnings.push(`${shortBehavior} acceptance row(s) with observable behavior under 20 chars — likely not observable`);
  if (weakEvidence > 0) warnings.push(`${weakEvidence} acceptance row(s) whose evidence names no verification mechanism (test, fixture, smoke, inspection, …)`);

  // ── PROM coverage against the briefing ───────────────────────────────────
  const proms = idsIn(briefing, 'PROM');
  const uncoveredProms = proms.filter((id) => !text.includes(id));
  if (uncoveredProms.length > 0) {
    issues.push(`briefing promise(s) with no PRD coverage decision: ${uncoveredProms.join(', ')}`);
  }

  // ── prototype binding coherence ──────────────────────────────────────────
  const proto = (frontmatter.prototype || '').toLowerCase();
  const protoStatus = (frontmatter.prototype_status || '').toLowerCase();
  const protoIsSet = proto && proto !== 'null' && proto !== 'none';
  if (protoStatus === 'current' && !protoIsSet) {
    issues.push('frontmatter: prototype_status is `current` but `prototype` names no file');
  }
  if (protoIsSet && (protoStatus === '' || protoStatus === 'none' || protoStatus === 'null')) {
    issues.push(`frontmatter: prototype is \`${frontmatter.prototype}\` but prototype_status is \`${frontmatter.prototype_status || '(absent)'}\``);
  }
  if (protoStatus === 'current' && protoIsSet && targetDir && !fs.existsSync(path.join(targetDir, frontmatter.prototype))) {
    issues.push(`frontmatter: bound prototype not found on disk: ${frontmatter.prototype}`);
  }

  // Material prototype states: each needs an acceptance criterion or a
  // recorded deferral somewhere in the PRD. Judgment call, so warning tier.
  const statesMissing = [];
  if (protoStatus === 'current') {
    for (const { state, re } of MATERIAL_STATES) {
      if (!re.test(text)) statesMissing.push(state);
    }
    if (statesMissing.length > 0) {
      warnings.push(`current prototype binding but no mention of material state(s): ${statesMissing.join(', ')} — a state the prototype renders and the PRD ignores is a silent loss`);
    }
  }

  // ── placeholders ─────────────────────────────────────────────────────────
  if (PLACEHOLDER.test(text)) issues.push('placeholder marker (TODO/FIXME/TBD/Lorem ipsum) still present in the PRD');

  const metrics = {
    caps_total: capIds.length,
    caps_required: requiredCaps.length,
    fit_rows: fitRows.length,
    ac_rows: acRows.length,
    proms_total: proms.length,
    proms_covered: proms.length - uncoveredProms.length,
    fit_rows_without_path: fitRowsWithoutPath,
    cited_paths_missing: missingPaths.length,
    weak_evidence_rows: weakEvidence,
    prototype_status: protoStatus || null,
    material_states_missing: statesMissing
  };

  return { issues, warnings, metrics };
}

module.exports = {
  analyzePrd,
  // exported for reuse / tests
  sectionBody,
  tableRows,
  parseFrontmatter
};
